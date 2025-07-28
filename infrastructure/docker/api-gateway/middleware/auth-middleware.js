/**
 * Atlas Financial API Gateway - Authentication Middleware
 * Unified authentication for the consolidated API Gateway
 */

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.HASURA_GRAPHQL_JWT_SECRET;
const DATABASE_URL = process.env.HASURA_GRAPHQL_DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL || 'redis://atlas-data:6379';

// Initialize connections
const pool = new Pool({ connectionString: DATABASE_URL });
const redisClient = redis.createClient({ url: REDIS_URL });

class AuthMiddleware {
  constructor() {
    this.db = pool;
    this.cache = redisClient;
    this.jwtSecret = JWT_SECRET;
  }

  /**
   * Extract JWT token from request headers
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return authHeader;
  }

  /**
   * Verify JWT token and extract user information
   */
  async verifyToken(token) {
    try {
      // First try to verify with our JWT secret
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      // If that fails, try to fetch from SuperTokens verification endpoint
      try {
        const response = await fetch('http://atlas-core:3000/auth/jwt/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        });

        if (response.ok) {
          const result = await response.json();
          return result.payload;
        }
      } catch (supertokensError) {
        console.error('SuperTokens verification failed:', supertokensError);
      }

      throw new Error('Invalid token');
    }
  }

  /**
   * Get user information from database
   */
  async getUserInfo(userId) {
    const cacheKey = `user:${userId}`;
    
    // Check cache first
    let userInfo = await this.cache.get(cacheKey);
    if (userInfo) {
      return JSON.parse(userInfo);
    }

    try {
      const result = await this.db.query(
        `SELECT u.*, array_agg(r.name) as roles 
         FROM auth.users u
         LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
         LEFT JOIN auth.roles r ON ur.role_id = r.id
         WHERE u.id = $1 OR u.supertokens_user_id = $1
         GROUP BY u.id`,
        [userId]
      );

      if (!result.rows[0]) {
        throw new Error('User not found');
      }

      userInfo = {
        id: result.rows[0].id,
        supertokensUserId: result.rows[0].supertokens_user_id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        emailVerified: result.rows[0].email_verified,
        roles: result.rows[0].roles.filter(role => role !== null),
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        lastLoginAt: result.rows[0].last_login_at
      };

      // Cache for 15 minutes
      await this.cache.setex(cacheKey, 900, JSON.stringify(userInfo));
      
      return userInfo;

    } catch (error) {
      console.error('Failed to get user info:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Check if user has required permissions
   */
  async checkPermissions(userId, requiredPermissions = []) {
    if (!requiredPermissions.length) {
      return true;
    }

    try {
      const result = await this.db.query(
        `SELECT DISTINCT jsonb_array_elements_text(r.permissions) as permission
         FROM auth.users u
         JOIN auth.user_roles ur ON u.id = ur.user_id
         JOIN auth.roles r ON ur.role_id = r.id
         WHERE u.id = $1`,
        [userId]
      );

      const userPermissions = result.rows.map(row => row.permission);
      
      // Check if user has all required permissions
      return requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Authentication middleware function
   */
  authenticate(options = {}) {
    const {
      required = true,
      permissions = [],
      roles = []
    } = options;

    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          if (required) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'MISSING_TOKEN'
            });
          }
          // If auth is not required, continue without user context
          return next();
        }

        // Verify token
        const tokenPayload = await this.verifyToken(token);
        
        if (!tokenPayload || !tokenPayload.sub) {
          return res.status(401).json({
            error: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          });
        }

        // Get user information
        const user = await this.getUserInfo(tokenPayload.sub);

        if (!user.isActive) {
          return res.status(403).json({
            error: 'Account is inactive',
            code: 'ACCOUNT_INACTIVE'
          });
        }

        // Check role requirements
        if (roles.length > 0) {
          const hasRequiredRole = roles.some(role => user.roles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({
              error: 'Insufficient role permissions',
              code: 'INSUFFICIENT_ROLE',
              required: roles,
              current: user.roles
            });
          }
        }

        // Check permission requirements
        if (permissions.length > 0) {
          const hasPermissions = await this.checkPermissions(user.id, permissions);
          if (!hasPermissions) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              required: permissions
            });
          }
        }

        // Update last login timestamp
        await this.db.query(
          'UPDATE auth.users SET last_login_at = NOW() WHERE id = $1',
          [user.id]
        );

        // Add user context to request
        req.user = user;
        req.token = token;
        req.tokenPayload = tokenPayload;

        // Set user context for PostgreSQL RLS
        await this.db.query('SET app.current_user_id = $1', [user.id]);

        next();

      } catch (error) {
        console.error('Authentication middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          });
        }

        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Authentication token expired',
            code: 'TOKEN_EXPIRED'
          });
        }

        return res.status(500).json({
          error: 'Authentication system error',
          code: 'AUTH_SYSTEM_ERROR'
        });
      }
    };
  }

  /**
   * Rate limiting middleware
   */
  rateLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 1000,
      keyGenerator = (req) => req.ip || 'unknown'
    } = options;

    return async (req, res, next) => {
      try {
        const key = `rate_limit:${keyGenerator(req)}`;
        const current = await this.cache.incr(key);
        
        if (current === 1) {
          await this.cache.expire(key, Math.ceil(windowMs / 1000));
        }

        const remaining = Math.max(0, maxRequests - current);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': remaining,
          'X-RateLimit-Reset': Date.now() + windowMs
        });

        if (current > maxRequests) {
          return res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        next();

      } catch (error) {
        console.error('Rate limiter error:', error);
        // Continue on rate limiter errors to not break the application
        next();
      }
    };
  }

  /**
   * CORS middleware for Atlas Financial
   */
  cors(options = {}) {
    const {
      origins = ['http://localhost:3000', 'https://atlas-financial.app'],
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers = ['Content-Type', 'Authorization', 'X-Requested-With']
    } = options;

    return (req, res, next) => {
      const origin = req.headers.origin;
      
      if (origins.includes(origin) || origins.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      
      res.header('Access-Control-Allow-Methods', methods.join(', '));
      res.header('Access-Control-Allow-Headers', headers.join(', '));
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Security headers for Atlas Financial
      res.set({
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      });

      next();
    };
  }

  /**
   * Request logging middleware
   */
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        console.log({
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        });
      });

      next();
    };
  }
}

// Export singleton instance
module.exports = new AuthMiddleware();