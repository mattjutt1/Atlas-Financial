/**
 * Real-time Market Data WebSocket Server
 * High-performance WebSocket infrastructure for live market data streaming
 */

import WebSocket from 'ws';
import { createServer } from 'http';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { RateLimiter } from './rate-limiter';
import { ConnectionManager } from './connection-manager';
import { MarketDataBroadcaster } from './broadcaster';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../monitoring/metrics';
import { WebSocketAuthenticationHardening } from '../middleware/websocket-auth-hardening';

interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  subscriptions: Set<string>;
  lastActivity: number;
  rateLimiter: RateLimiter;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'heartbeat' | 'authenticate';
  symbol?: string;
  symbols?: string[];
  token?: string;
  data?: any;
}

export class MarketDataWebSocketServer {
  private server: WebSocket.Server;
  private httpServer: any;
  private redis: Redis;
  private connectionManager: ConnectionManager;
  private broadcaster: MarketDataBroadcaster;
  private metrics: MetricsCollector;
  private authHardening: WebSocketAuthenticationHardening;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private readonly MAX_CONNECTIONS = 10000;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  
  constructor(
    private port: number = 8080,
    private jwtSecret: string = process.env.JWT_SECRET
  ) {
    // SECURITY: Fail fast if JWT secret is not properly configured
    if (!this.jwtSecret || this.jwtSecret === 'default-secret') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be set to a secure value');
    }
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    this.connectionManager = new ConnectionManager(this.redis);
    this.broadcaster = new MarketDataBroadcaster(this.redis);
    this.metrics = new MetricsCollector();
    this.authHardening = new WebSocketAuthenticationHardening();
  }

  async start(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis for WebSocket server');

      // Create HTTP server for WebSocket upgrade
      this.httpServer = createServer();
      
      // Create WebSocket server with hardened security
      this.server = new WebSocket.Server({
        server: this.httpServer,
        verifyClient: this.authHardening.verifyClient.bind(this.authHardening),
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 6,
            concurrency: 10,
          },
        },
      });

      // Setup WebSocket event handlers
      this.server.on('connection', this.handleConnection.bind(this));
      this.server.on('error', this.handleServerError.bind(this));
      
      // Setup heartbeat mechanism
      this.setupHeartbeat();
      
      // Setup broadcaster
      await this.broadcaster.initialize();
      
      // Start HTTP server
      this.httpServer.listen(this.port, () => {
        logger.info(`Market Data WebSocket Server started on port ${this.port}`);
        this.metrics.recordServerStart();
      });

    } catch (error) {
      logger.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  // REMOVED: verifyClient is now handled by WebSocketAuthenticationHardening

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // Check connection limits
    if (this.server.clients.size >= this.MAX_CONNECTIONS) {
      logger.warn(`Connection limit exceeded from ${clientIp}`);
      ws.close(1013, 'Server overloaded');
      return;
    }

    // SECURITY: Validate upgrade request and extract token
    const upgradeValidation = this.authHardening.validateUpgradeRequest(req);
    if (!upgradeValidation.isValid) {
      logger.warn('WebSocket upgrade validation failed', { clientIp, error: upgradeValidation.error });
      ws.close(1008, upgradeValidation.error);
      return;
    }

    // SECURITY: Validate JWT token immediately on connection
    const authResult = await this.authHardening.validateJWTToken(upgradeValidation.token!, clientIp);
    if (!authResult.isValid) {
      logger.warn('WebSocket authentication failed', { clientIp, error: authResult.error });
      ws.close(1008, authResult.error);
      return;
    }

    const authWs = ws as AuthenticatedWebSocket;
    authWs.userId = authResult.userId!; // Set immediately on connection
    authWs.subscriptions = new Set();
    authWs.lastActivity = Date.now();
    authWs.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    
    logger.info(`Authenticated WebSocket connection`, { userId: authWs.userId, clientIp });
    this.metrics.incrementConnections();

    // Setup message handler
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        await this.handleMessage(authWs, data);
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        this.sendError(authWs, 'Internal server error');
      }
    });

    // Setup close handler
    ws.on('close', (code: number, reason: string) => {
      this.handleDisconnection(authWs, code, reason);
    });

    // Setup error handler
    ws.on('error', (error: Error) => {
      logger.error('WebSocket connection error:', error);
      this.metrics.incrementErrors('connection_error');
    });

    // Send welcome message
    this.sendMessage(authWs, {
      type: 'welcome',
      message: 'Connected to Atlas Financial Market Data Service',
      timestamp: new Date().toISOString(),
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, data: WebSocket.Data): Promise<void> {
    // Rate limiting check
    if (!ws.rateLimiter.tryRequest()) {
      this.sendError(ws, 'Rate limit exceeded');
      return;
    }

    ws.lastActivity = Date.now();
    
    let message: WebSocketMessage;
    
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      this.sendError(ws, 'Invalid JSON message');
      return;
    }

    this.metrics.incrementMessages(message.type);

    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(ws, message);
        break;
        
      case 'subscribe':
        await this.handleSubscription(ws, message);
        break;
        
      case 'unsubscribe':
        await this.handleUnsubscription(ws, message);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(ws);
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuthentication(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    if (!message.token) {
      this.sendError(ws, 'Authentication token required');
      return;
    }

    try {
      const decoded = jwt.verify(message.token, this.jwtSecret) as any;
      ws.userId = decoded.sub || decoded.userId;
      
      // Register connection
      await this.connectionManager.registerConnection(ws.userId, {
        connectionId: this.generateConnectionId(),
        subscriptions: [],
        connectedAt: new Date().toISOString(),
      });

      this.sendMessage(ws, {
        type: 'authenticated',
        userId: ws.userId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`User ${ws.userId} authenticated successfully`);
      this.metrics.incrementAuthenticatedConnections();
      
    } catch (error) {
      logger.warn('Authentication failed:', error);
      this.sendError(ws, 'Invalid authentication token');
      ws.close(1008, 'Authentication failed');
    }
  }

  private async handleSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required before subscription');
      return;
    }

    const symbols = message.symbols || (message.symbol ? [message.symbol] : []);
    
    if (symbols.length === 0) {
      this.sendError(ws, 'No symbols specified for subscription');
      return;
    }

    // Validate symbols
    const validSymbols = await this.validateSymbols(symbols);
    
    for (const symbol of validSymbols) {
      ws.subscriptions.add(symbol);
      await this.broadcaster.addSubscriber(symbol, ws.userId);
    }

    // Update connection manager
    await this.connectionManager.updateSubscriptions(ws.userId, Array.from(ws.subscriptions));

    this.sendMessage(ws, {
      type: 'subscribed',
      symbols: validSymbols,
      count: ws.subscriptions.size,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User ${ws.userId} subscribed to ${validSymbols.length} symbols`);
    this.metrics.incrementSubscriptions(validSymbols.length);
  }

  private async handleUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    if (!ws.userId) {
      this.sendError(ws, 'Authentication required');
      return;
    }

    const symbols = message.symbols || (message.symbol ? [message.symbol] : []);
    
    for (const symbol of symbols) {
      ws.subscriptions.delete(symbol);
      await this.broadcaster.removeSubscriber(symbol, ws.userId);
    }

    // Update connection manager
    await this.connectionManager.updateSubscriptions(ws.userId, Array.from(ws.subscriptions));

    this.sendMessage(ws, {
      type: 'unsubscribed',
      symbols,
      remainingCount: ws.subscriptions.size,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User ${ws.userId} unsubscribed from ${symbols.length} symbols`);
  }

  private handleHeartbeat(ws: AuthenticatedWebSocket): void {
    ws.lastActivity = Date.now();
    this.sendMessage(ws, {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnection(ws: AuthenticatedWebSocket, code: number, reason: string): void {
    logger.info(`WebSocket disconnected: ${code} - ${reason}`);
    
    if (ws.userId) {
      // Clean up subscriptions
      ws.subscriptions.forEach(async (symbol) => {
        await this.broadcaster.removeSubscriber(symbol, ws.userId);
      });
      
      // Remove from connection manager
      this.connectionManager.removeConnection(ws.userId);
      
      logger.info(`User ${ws.userId} disconnected`);
    }
    
    this.metrics.decrementConnections();
  }

  private handleServerError(error: Error): void {
    logger.error('WebSocket server error:', error);
    this.metrics.incrementErrors('server_error');
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.server.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        
        if (now - authWs.lastActivity > this.CONNECTION_TIMEOUT) {
          logger.info(`Terminating inactive connection for user ${authWs.userId}`);
          ws.terminate();
          return;
        }
        
        // Send ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
      
      this.metrics.recordHeartbeat(this.server.clients.size);
    }, this.HEARTBEAT_INTERVAL);
  }

  private async validateSymbols(symbols: string[]): Promise<string[]> {
    // Basic symbol validation - in production, validate against supported symbols
    const validSymbols = symbols.filter(symbol => 
      /^[A-Z]{1,5}$/.test(symbol) || /^[A-Z]+\.[A-Z]+$/.test(symbol)
    );
    
    if (validSymbols.length !== symbols.length) {
      logger.warn(`Invalid symbols filtered out: ${symbols.filter(s => !validSymbols.includes(s))}`);
    }
    
    return validSymbols;
  }

  private sendMessage(ws: AuthenticatedWebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
      }
    }
  }

  private sendError(ws: AuthenticatedWebSocket, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Broadcast market data to subscribers
  async broadcastMarketData(symbol: string, data: any): Promise<void> {
    const subscribers = await this.broadcaster.getSubscribers(symbol);
    let sentCount = 0;
    
    this.server.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      
      if (authWs.userId && subscribers.includes(authWs.userId) && authWs.subscriptions.has(symbol)) {
        this.sendMessage(authWs, {
          type: 'market_data',
          symbol,
          data,
          timestamp: new Date().toISOString(),
        });
        sentCount++;
      }
    });
    
    this.metrics.recordBroadcast(symbol, sentCount);
  }

  // Get server statistics
  getStats(): any {
    return {
      connections: this.server.clients.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: this.metrics.getMetrics(),
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Market Data WebSocket Server');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    this.server.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    
    // Close server
    if (this.server) {
      this.server.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    // Close Redis connection
    await this.redis.quit();
    
    logger.info('Market Data WebSocket Server shutdown complete');
  }
}