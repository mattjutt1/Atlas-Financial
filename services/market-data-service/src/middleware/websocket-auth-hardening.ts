/**
 * WebSocket Authentication Security Hardening
 * Fixes authentication bypass vulnerabilities and implements proper JWT validation
 */

import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { RateLimiter } from './rate-limiter';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../monitoring/metrics';

interface JWTPayload {
  sub?: string;
  userId?: string;
  exp?: number;
  iat?: number;
  aud?: string;
  iss?: string;
  scopes?: string[];
}

interface AuthResult {
  isValid: boolean;
  userId?: string;
  scopes?: string[];
  error?: string;
  riskScore: number;
}

export class WebSocketAuthenticationHardening {
  private metrics: MetricsCollector;
  private authAttemptLimiter: RateLimiter;
  private connectionLimiter: RateLimiter;
  private readonly JWT_SECRET: string;
  private readonly ALLOWED_ORIGINS: string[];
  private readonly MAX_AUTH_ATTEMPTS = 3;
  private readonly AUTH_ATTEMPT_WINDOW = 300000; // 5 minutes
  
  constructor() {
    this.metrics = new MetricsCollector();
    this.authAttemptLimiter = new RateLimiter(this.MAX_AUTH_ATTEMPTS, this.AUTH_ATTEMPT_WINDOW);
    this.connectionLimiter = new RateLimiter(100, 60000); // 100 connections per minute per IP
    
    this.JWT_SECRET = process.env.JWT_SECRET;
    if (!this.JWT_SECRET || this.JWT_SECRET === 'default-secret') {
      throw new Error('CRITICAL: JWT_SECRET must be set to a secure value');
    }
    
    this.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (this.ALLOWED_ORIGINS.includes('*')) {
      logger.warn('SECURITY WARNING: Wildcard origins allowed in production');
    }
  }

  /**
   * Enhanced client verification with security hardening
   */
  verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    const clientIp = this.getClientIP(info.req);
    
    // Rate limit connections per IP
    if (!this.connectionLimiter.tryRequest(clientIp)) {
      logger.warn('Connection rate limit exceeded', { clientIp });
      this.metrics.incrementRateLimitBlocks('connection');
      return false;
    }
    
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production' && !info.secure) {
      logger.warn('Non-HTTPS connection rejected in production', { clientIp });
      this.metrics.incrementSecurityBlocks('non_https');
      return false;
    }
    
    // Strict origin validation - NO wildcards in production
    if (process.env.NODE_ENV === 'production') {
      if (!this.ALLOWED_ORIGINS.length || this.ALLOWED_ORIGINS.includes('*')) {
        logger.error('SECURITY VIOLATION: No allowed origins configured in production');
        return false;
      }
      
      if (!info.origin || !this.ALLOWED_ORIGINS.includes(info.origin)) {
        logger.warn('Origin blocked', { origin: info.origin, clientIp });
        this.metrics.incrementSecurityBlocks('invalid_origin');
        return false;
      }
    }
    
    // Additional security headers validation
    const userAgent = info.req.headers['user-agent'];
    if (!userAgent || this.isBlockedUserAgent(userAgent)) {
      logger.warn('Blocked user agent', { userAgent, clientIp });
      this.metrics.incrementSecurityBlocks('blocked_user_agent');
      return false;
    }
    
    logger.info('WebSocket client verified', { origin: info.origin, clientIp });
    return true;
  }

  /**
   * Enhanced JWT token validation with comprehensive security checks
   */
  async validateJWTToken(token: string, clientIp: string): Promise<AuthResult> {
    // Rate limit authentication attempts per IP
    if (!this.authAttemptLimiter.tryRequest(clientIp)) {
      logger.warn('Authentication rate limit exceeded', { clientIp });
      this.metrics.incrementRateLimitBlocks('auth');
      return {
        isValid: false,
        error: 'Authentication rate limit exceeded',
        riskScore: 0.9
      };
    }
    
    try {
      // Decode and verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256', 'RS256'], // Explicitly specify allowed algorithms
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        maxAge: '1h' // Maximum token age
      }) as JWTPayload;
      
      // Extract user ID
      const userId = decoded.sub || decoded.userId;
      if (!userId) {
        logger.warn('JWT token missing user ID', { clientIp });
        this.metrics.incrementAuthFailures('missing_user_id');
        return {
          isValid: false,
          error: 'Invalid token: missing user ID',
          riskScore: 0.8
        };
      }
      
      // Validate user ID format
      if (!this.isValidUserId(userId)) {
        logger.warn('Invalid user ID format', { userId, clientIp });
        this.metrics.incrementAuthFailures('invalid_user_id');
        return {
          isValid: false,
          error: 'Invalid user ID format',
          riskScore: 0.8
        };
      }
      
      // Check token freshness
      const tokenAge = Date.now() / 1000 - (decoded.iat || 0);
      if (tokenAge > 3600) { // 1 hour
        logger.warn('Token too old', { userId, tokenAge, clientIp });
        this.metrics.incrementAuthFailures('token_too_old');
        return {
          isValid: false,
          error: 'Token expired',
          riskScore: 0.6
        };
      }
      
      // Validate scopes for market data access
      const scopes = decoded.scopes || [];
      if (!scopes.includes('market-data:read')) {
        logger.warn('Insufficient permissions for market data', { userId, scopes, clientIp });
        this.metrics.incrementAuthFailures('insufficient_permissions');
        return {
          isValid: false,
          error: 'Insufficient permissions',
          riskScore: 0.7
        };
      }
      
      logger.info('JWT token validated successfully', { userId, clientIp });
      this.metrics.incrementAuthSuccesses();
      
      return {
        isValid: true,
        userId,
        scopes,
        riskScore: 0.0
      };
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('JWT token expired', { clientIp, error: error.message });
        this.metrics.incrementAuthFailures('token_expired');
        return {
          isValid: false,
          error: 'Token expired',
          riskScore: 0.5
        };
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT token', { clientIp, error: error.message });
        this.metrics.incrementAuthFailures('invalid_token');
        return {
          isValid: false,
          error: 'Invalid token',
          riskScore: 0.8
        };
      }
      
      logger.error('JWT validation error', { clientIp, error: error.message });
      this.metrics.incrementAuthFailures('validation_error');
      return {
        isValid: false,
        error: 'Authentication failed',
        riskScore: 0.9
      };
    }
  }

  /**
   * Validate connection upgrade request
   */
  validateUpgradeRequest(req: IncomingMessage): { isValid: boolean; token?: string; error?: string } {
    const url = new URL(req.url || '', 'ws://localhost');
    const token = url.searchParams.get('token') || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return {
        isValid: false,
        error: 'Authentication token required'
      };
    }
    
    // Basic token format validation
    if (!this.isValidTokenFormat(token)) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }
    
    return {
      isValid: true,
      token
    };
  }

  /**
   * Enhanced message validation for authenticated connections
   */
  validateMessage(message: any, userId: string): { isValid: boolean; error?: string; riskScore: number } {
    let riskScore = 0.0;
    
    // Validate message structure
    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message format',
        riskScore: 0.7
      };
    }
    
    // Validate message type
    const allowedTypes = ['subscribe', 'unsubscribe', 'heartbeat'];
    if (!allowedTypes.includes(message.type)) {
      riskScore += 0.5;
      if (!['ping', 'pong'].includes(message.type)) { // Allow connection keepalive
        return {
          isValid: false,
          error: `Invalid message type: ${message.type}`,
          riskScore: 0.8
        };
      }
    }
    
    // Validate symbols for subscription messages
    if (['subscribe', 'unsubscribe'].includes(message.type)) {
      const symbols = message.symbols || (message.symbol ? [message.symbol] : []);
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return {
          isValid: false,
          error: 'Symbols required for subscription operations',
          riskScore: 0.6
        };
      }
      
      // Validate each symbol
      for (const symbol of symbols) {
        if (!this.isValidSymbol(symbol)) {
          riskScore += 0.3;
          return {
            isValid: false,
            error: `Invalid symbol format: ${symbol}`,
            riskScore: Math.min(riskScore, 0.9)
          };
        }
      }
      
      // Limit number of symbols per request
      if (symbols.length > 100) {
        return {
          isValid: false,
          error: 'Too many symbols in single request',
          riskScore: 0.8
        };
      }
    }
    
    return {
      isValid: true,
      riskScore
    };
  }

  /**
   * Get real client IP address considering proxies
   */
  private getClientIP(req: IncomingMessage): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (typeof xRealIP === 'string') {
      return xRealIP.trim();
    }
    
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Check if user agent is blocked
   */
  private isBlockedUserAgent(userAgent: string): boolean {
    const blockedPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /node-fetch/i
    ];
    
    return blockedPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Validate user ID format
   */
  private isValidUserId(userId: string): boolean {
    // UUID format or alphanumeric with length limits
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const alphanumericPattern = /^[a-zA-Z0-9_-]{1,36}$/;
    
    return uuidPattern.test(userId) || alphanumericPattern.test(userId);
  }

  /**
   * Validate JWT token format
   */
  private isValidTokenFormat(token: string): boolean {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Each part should be base64url encoded
    for (const part of parts) {
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate market symbol format
   */
  private isValidSymbol(symbol: string): boolean {
    // Allow typical stock symbols: AAPL, BRK.A, MSFT, etc.
    return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol);
  }

  /**
   * Generate secure connection ID
   */
  generateSecureConnectionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const hash = require('crypto').createHash('sha256')
      .update(`${timestamp}_${random}_${this.JWT_SECRET}`)
      .digest('hex')
      .substring(0, 16);
    
    return `conn_${timestamp}_${hash}`;
  }

  /**
   * Get authentication metrics
   */
  getAuthMetrics(): any {
    return {
      authSuccesses: this.metrics.getAuthSuccesses(),
      authFailures: this.metrics.getAuthFailures(),
      rateLimitBlocks: this.metrics.getRateLimitBlocks(),
      securityBlocks: this.metrics.getSecurityBlocks(),
      activeConnections: this.connectionLimiter.getActiveRequests()
    };
  }
}