/**
 * Market Data Service Main Entry Point
 * Orchestrates WebSocket server, market data pipeline, AI integration, and GraphQL API
 */

import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import Redis from 'ioredis';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Internal imports
import { MarketDataWebSocketServer } from './websocket/server';
import { MarketDataPipeline, MarketDataConfig } from './market-data/pipeline';
import { AlphaVantageProvider } from './market-data/providers/alphavantage-provider';
import { IEXCloudProvider } from './market-data/providers/iex-provider';
import { RealTimePortfolioAnalyzer } from './ai-integration/realtime-analyzer';
import { HealthChecker } from './monitoring/health-checker';
import { typeDefs, resolvers, pubsub, SUBSCRIPTION_EVENTS } from './graphql/schema';
import { logger } from './utils/logger';

class MarketDataService {
  private app: express.Application;
  private server: any;
  private apolloServer: ApolloServer;
  private wsServer: MarketDataWebSocketServer;
  private pipeline: MarketDataPipeline;
  private analyzer: RealTimePortfolioAnalyzer;
  private healthChecker: HealthChecker;
  private redis: Redis;
  
  private readonly PORT = parseInt(process.env.PORT || '4000');
  private readonly WS_PORT = parseInt(process.env.WS_PORT || '8080');
  private readonly NODE_ENV = process.env.NODE_ENV || 'development';

  constructor() {
    this.app = express();
    this.setupRedis();
    this.setupExpress();
    this.setupServices();
  }

  private setupRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  private setupExpress(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: this.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/graphql', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthChecker.getCurrentHealth();
        const status = health?.overall === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        res.status(503).json({ error: 'Health check failed' });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = {
          pipeline: this.pipeline.getMetrics(),
          websocket: this.wsServer.getStats(),
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
          },
        };
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });
  }

  private setupServices(): void {
    // Initialize health checker
    this.healthChecker = new HealthChecker(this.redis);

    // Initialize market data pipeline
    const pipelineConfig: MarketDataConfig = {
      providers: {
        primary: 'alphavantage',
        fallback: ['iex'],
      },
      updateIntervals: {
        realtime: 15000, // 15 seconds for real-time data
        historical: 3600000, // 1 hour for historical data
      },
      symbols: this.getWatchedSymbols(),
      validation: {
        priceChangeThreshold: 0.5, // 50% max change considered valid
        volumeChangeThreshold: 10, // 10x volume change threshold
        timeoutMs: 10000,
      },
      storage: {
        enableRedis: true,
        enablePersistence: true,
        retentionDays: 365,
      },
    };

    this.pipeline = new MarketDataPipeline(pipelineConfig, this.redis);

    // Initialize real-time portfolio analyzer
    this.analyzer = new RealTimePortfolioAnalyzer(this.redis);

    // Initialize WebSocket server
    this.wsServer = new MarketDataWebSocketServer(
      this.WS_PORT,
      process.env.JWT_SECRET || 'default-secret'
    );

    // Register components with health checker
    this.healthChecker.registerPipeline(this.pipeline);
    this.healthChecker.registerAnalyzer(this.analyzer);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Pipeline events
    this.pipeline.on('data:ready', (data) => {
      // Broadcast to WebSocket clients
      this.wsServer.broadcastMarketData(data.symbol, data);
      
      // Publish to GraphQL subscriptions
      pubsub.publish(SUBSCRIPTION_EVENTS.MARKET_DATA_UPDATED, {
        marketDataUpdated: data,
      });

      // Update analyzer
      this.analyzer.emit('market:data', data);
    });

    this.pipeline.on('pipeline:started', () => {
      logger.info('Market data pipeline started successfully');
    });

    this.pipeline.on('pipeline:stopped', () => {
      logger.info('Market data pipeline stopped');
    });

    // Analyzer events
    this.analyzer.on('insights:generated', (data) => {
      pubsub.publish(SUBSCRIPTION_EVENTS.PORTFOLIO_INSIGHTS_UPDATED, {
        portfolioInsightsUpdated: data,
      });
    });

    this.analyzer.on('rebalancing:recommendations', (data) => {
      pubsub.publish(SUBSCRIPTION_EVENTS.REBALANCE_RECOMMENDATIONS_UPDATED, {
        rebalanceRecommendationsUpdated: data,
      });
    });

    this.analyzer.on('alert:generated', (alert) => {
      pubsub.publish(SUBSCRIPTION_EVENTS.PORTFOLIO_ALERT_TRIGGERED, {
        portfolioAlertsTriggered: alert,
      });
    });

    // Health checker events
    this.healthChecker.on('health:updated', (status) => {
      pubsub.publish(SUBSCRIPTION_EVENTS.MARKET_STATUS_UPDATED, {
        marketStatusUpdated: {
          healthy: status.overall === 'healthy',
          connectedProviders: status.components
            .filter(c => c.name.startsWith('provider_') && c.healthy)
            .map(c => c.name.replace('provider_', '')),
          totalSymbolsTracked: this.getWatchedSymbols().length,
          lastUpdate: new Date().toISOString(),
          latency: status.metrics.averageResponseTime,
        },
      });
    });

    // WebSocket server events  
    this.wsServer.on('connection:authenticated', (data) => {
      logger.info(`WebSocket client authenticated: ${data.userId}`);
    });

    // Process events
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  private getWatchedSymbols(): string[] {
    // Default symbols to track - in production, this would come from database
    const defaultSymbols = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
      'SPY', 'QQQ', 'IWM', 'VTI', 'BTC-USD', 'ETH-USD'
    ];

    const envSymbols = process.env.WATCHED_SYMBOLS?.split(',') || [];
    return [...new Set([...defaultSymbols, ...envSymbols])];
  }

  private async setupGraphQL(): Promise<void> {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    this.apolloServer = new ApolloServer({
      schema,
      context: ({ req, connection }) => {
        if (connection) {
          // WebSocket connection context
          return {
            ...connection.context,
            redis: this.redis,
            pipeline: this.pipeline,
            analyzer: this.analyzer,
            healthChecker: this.healthChecker,
          };
        } else {
          // HTTP request context
          return {
            req,
            redis: this.redis,
            pipeline: this.pipeline,
            analyzer: this.analyzer,
            healthChecker: this.healthChecker,
          };
        }
      },
      subscriptions: {
        path: '/graphql',
        onConnect: (connectionParams, webSocket, context) => {
          logger.info('GraphQL subscription connected');
          return {
            redis: this.redis,
            pipeline: this.pipeline,
            analyzer: this.analyzer,
          };
        },
        onDisconnect: (webSocket, context) => {
          logger.info('GraphQL subscription disconnected');
        },
      },
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.debug(`GraphQL operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL errors:', requestContext.errors);
              },
            };
          },
        },
      ],
    });

    await this.apolloServer.start();
    this.apolloServer.applyMiddleware({ app: this.app });
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Market Data Service...');

      // Connect to Redis
      await this.redis.connect();

      // Start health checker
      await this.healthChecker.start();

      // Set up GraphQL server
      await this.setupGraphQL();

      // Start HTTP server
      this.server = createServer(this.app);
      
      // Set up GraphQL subscriptions
      const subscriptionServer = SubscriptionServer.create(
        {
          schema: makeExecutableSchema({ typeDefs, resolvers }),
          execute,
          subscribe,
          onConnect: (connectionParams, webSocket) => {
            logger.info('GraphQL WebSocket connected');
            return { redis: this.redis };
          },
          onDisconnect: () => {
            logger.info('GraphQL WebSocket disconnected');
          },
        },
        {
          server: this.server,
          path: this.apolloServer.graphqlPath,
        }
      );

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.server.listen(this.PORT, () => {
          logger.info(`🚀 Server ready at http://localhost:${this.PORT}${this.apolloServer.graphqlPath}`);
          logger.info(`🚀 Subscriptions ready at ws://localhost:${this.PORT}${this.apolloServer.graphqlPath}`);
          resolve();
        });
      });

      // Start WebSocket server
      await this.wsServer.start();

      // Start market data pipeline
      await this.pipeline.start();

      // Start portfolio analyzer
      await this.analyzer.start();

      logger.info('✅ Market Data Service started successfully');
      logger.info(`Environment: ${this.NODE_ENV}`);
      logger.info(`GraphQL endpoint: http://localhost:${this.PORT}${this.apolloServer.graphqlPath}`);
      logger.info(`WebSocket endpoint: ws://localhost:${this.WS_PORT}`);
      logger.info(`Health check: http://localhost:${this.PORT}/health`);
      logger.info(`Metrics: http://localhost:${this.PORT}/metrics`);

    } catch (error) {
      logger.error('Failed to start Market Data Service:', error);
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, starting graceful shutdown...');

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close();
      }

      // Stop services in reverse order
      if (this.analyzer) {
        await this.analyzer.stop();
      }

      if (this.pipeline) {
        await this.pipeline.stop();
      }

      if (this.wsServer) {
        await this.wsServer.shutdown();
      }

      if (this.healthChecker) {
        await this.healthChecker.stop();
      }

      if (this.apolloServer) {
        await this.apolloServer.stop();
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
      }

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start the service if this file is run directly
if (require.main === module) {
  const service = new MarketDataService();
  
  service.start().catch((error) => {
    logger.error('Failed to start service:', error);
    process.exit(1);
  });
}

export { MarketDataService };