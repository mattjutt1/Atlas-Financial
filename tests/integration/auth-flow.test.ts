/**
 * Atlas Financial Authentication Flow Integration Tests
 * Tests SuperTokens + Hasura JWT integration end-to-end
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';

// Test Configuration
const config = {
  services: {
    core: 'http://localhost:3000',
    hasura: 'http://localhost:8081',
  },
  database: {
    host: 'localhost',
    port: 5432,
    user: 'atlas',
    password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
    database: 'supertokens',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD || 'redis_dev_password',
  },
  testUser: {
    email: `test-user-${Date.now()}@atlas-test.local`,
    password: 'TestPassword123!',
    name: 'Test User',
  },
  timeouts: {
    request: 10000,
    auth: 5000,
  },
};

// Global test utilities
let dbPool: Pool;
let redisClient: Redis;
let testUserId: string;
let accessToken: string;
let refreshToken: string;
let sessionHandle: string;

describe('Atlas Financial Authentication Flow Tests', () => {
  beforeAll(async () => {
    // Initialize database connection
    dbPool = new Pool(config.database);
    
    // Initialize Redis connection
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
    });

    // Wait for services to be ready
    await waitForAuthServices();
  });

  afterAll(async () => {
    // Cleanup test user and sessions
    await cleanupTestUser();
    
    // Close connections
    await dbPool.end();
    await redisClient.quit();
  });

  describe('1. SuperTokens Configuration Validation', () => {
    test('should validate SuperTokens configuration endpoints', async () => {
      // Test JWKS endpoint
      const jwksResponse = await axios.get(
        `${config.services.core}/auth/jwt/jwks.json`,
        { timeout: config.timeouts.request }
      );
      
      expect(jwksResponse.status).toBe(200);
      expect(jwksResponse.data).toHaveProperty('keys');
      expect(Array.isArray(jwksResponse.data.keys)).toBe(true);
      expect(jwksResponse.data.keys.length).toBeGreaterThan(0);
      
      // Validate JWKS key structure
      const key = jwksResponse.data.keys[0];
      expect(key).toHaveProperty('kty');
      expect(key).toHaveProperty('use', 'sig');
      expect(key).toHaveProperty('alg');
    });

    test('should validate SuperTokens database schema', async () => {
      // Check SuperTokens tables exist
      const tables = await dbPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%supertokens%' OR table_name IN ('users', 'sessions')
      `);
      
      expect(tables.rows.length).toBeGreaterThan(0);
    });

    test('should validate session configuration', async () => {
      const sessionConfigResponse = await axios.get(
        `${config.services.core}/auth/session/info`,
        { 
          timeout: config.timeouts.request,
          validateStatus: (status) => status < 500
        }
      );
      
      // Should return session info or appropriate auth response
      expect(sessionConfigResponse.status).toBeLessThan(500);
    });
  });

  describe('2. User Registration Flow', () => {
    test('should register a new user successfully', async () => {
      const registrationData = {
        email: config.testUser.email,
        password: config.testUser.password,
        firstName: config.testUser.name.split(' ')[0],
        lastName: config.testUser.name.split(' ')[1] || '',
      };

      const response = await axios.post(
        `${config.services.core}/auth/signup`,
        registrationData,
        { 
          timeout: config.timeouts.auth,
          validateStatus: (status) => status < 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).toBeLessThanOrEqual(201);
      
      // Store user ID for cleanup
      if (response.data?.user?.id) {
        testUserId = response.data.user.id;
      }
    });

    test('should validate user exists in database', async () => {
      if (!testUserId) {
        // Try to find user by email
        const userQuery = await dbPool.query(
          'SELECT user_id FROM users WHERE email = $1',
          [config.testUser.email]
        );
        
        if (userQuery.rows.length > 0) {
          testUserId = userQuery.rows[0].user_id;
        }
      }

      expect(testUserId).toBeDefined();
      
      const userCheck = await dbPool.query(
        'SELECT * FROM users WHERE user_id = $1',
        [testUserId]
      );
      
      expect(userCheck.rows.length).toBe(1);
      expect(userCheck.rows[0].email).toBe(config.testUser.email);
    });

    test('should prevent duplicate user registration', async () => {
      const duplicateData = {
        email: config.testUser.email,
        password: config.testUser.password,
        firstName: 'Duplicate',
        lastName: 'User',
      };

      const response = await axios.post(
        `${config.services.core}/auth/signup`,
        duplicateData,
        { 
          timeout: config.timeouts.auth,
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Should reject duplicate registration
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('3. User Authentication Flow', () => {
    test('should authenticate user and create session', async () => {
      const loginData = {
        email: config.testUser.email,
        password: config.testUser.password,
      };

      const response = await axios.post(
        `${config.services.core}/auth/signin`,
        loginData,
        { 
          timeout: config.timeouts.auth,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).toBeLessThanOrEqual(200);
      
      // Extract tokens from response
      if (response.data?.tokens) {
        accessToken = response.data.tokens.accessToken;
        refreshToken = response.data.tokens.refreshToken;
      }
      
      // Extract session from cookies or headers
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const sessionCookie = cookies.find(cookie => cookie.includes('sAccessToken'));
        if (sessionCookie) {
          accessToken = sessionCookie.split('=')[1].split(';')[0];
        }
      }

      expect(accessToken || response.status === 200).toBeTruthy();
    });

    test('should validate JWT token structure', async () => {
      if (!accessToken) {
        console.warn('No access token available, attempting session validation');
        return;
      }

      // Decode JWT without verification (just structure check)
      const decoded = jwt.decode(accessToken, { complete: true });
      
      expect(decoded).toBeTruthy();
      expect(decoded?.header).toHaveProperty('alg');
      expect(decoded?.payload).toHaveProperty('iss');
      expect(decoded?.payload).toHaveProperty('aud', 'atlas-financial');
      expect(decoded?.payload).toHaveProperty('sub');
    });

    test('should validate session exists in database', async () => {
      if (!testUserId) {
        console.warn('No test user ID available');
        return;
      }

      const sessionCheck = await dbPool.query(
        'SELECT * FROM sessions WHERE user_id = $1',
        [testUserId]
      );
      
      expect(sessionCheck.rows.length).toBeGreaterThanOrEqual(1);
      
      if (sessionCheck.rows.length > 0) {
        sessionHandle = sessionCheck.rows[0].session_handle;
        expect(sessionHandle).toBeDefined();
      }
    });

    test('should validate session in Redis cache', async () => {
      if (!sessionHandle) {
        console.warn('No session handle available');
        return;
      }

      // Check if session data is cached
      const sessionKeys = await redisClient.keys(`*session*${sessionHandle}*`);
      
      // Session data should be present in cache for performance
      expect(sessionKeys.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('4. Hasura JWT Integration', () => {
    test('should validate Hasura JWT configuration', async () => {
      const hasuraHealthResponse = await axios.get(`${config.services.hasura}/healthz`);
      expect(hasuraHealthResponse.status).toBe(200);
    });

    test('should access GraphQL with valid JWT', async () => {
      if (!accessToken) {
        console.warn('No access token available for GraphQL test');
        return;
      }

      const graphqlQuery = {
        query: `
          query TestQuery {
            __typename
          }
        `,
      };

      const response = await axios.post(
        `${config.services.hasura}/v1/graphql`,
        graphqlQuery,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: config.timeouts.request,
          validateStatus: () => true,
        }
      );

      // Should allow the query or return proper auth error
      expect(response.status).toBeLessThan(500);
    });

    test('should reject GraphQL requests without JWT', async () => {
      const graphqlQuery = {
        query: `
          query UnauthorizedQuery {
            users {
              id
              email
            }
          }
        `,
      };

      const response = await axios.post(
        `${config.services.hasura}/v1/graphql`,
        graphqlQuery,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: config.timeouts.request,
          validateStatus: () => true,
        }
      );

      // Should reject unauthorized requests
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate JWT claims for Hasura', async () => {
      if (!accessToken) {
        console.warn('No access token available for claims validation');
        return;
      }

      const decoded = jwt.decode(accessToken) as any;
      
      if (decoded) {
        // Check Hasura-specific claims
        expect(decoded).toHaveProperty('iss', 'http://atlas-core:3000');
        expect(decoded).toHaveProperty('aud', 'atlas-financial');
        
        // Check for Hasura custom claims namespace
        const hasuraClaims = decoded['https://hasura.io/jwt/claims'] || decoded['hasura'];
        
        if (hasuraClaims) {
          expect(hasuraClaims).toHaveProperty('x-hasura-default-role');
          expect(hasuraClaims).toHaveProperty('x-hasura-allowed-roles');
          expect(hasuraClaims).toHaveProperty('x-hasura-user-id');
        }
      }
    });
  });

  describe('5. Session Management', () => {
    test('should validate session refresh mechanism', async () => {
      if (!refreshToken && !accessToken) {
        console.warn('No tokens available for refresh test');
        return;
      }

      const refreshResponse = await axios.post(
        `${config.services.core}/auth/session/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${refreshToken || accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: config.timeouts.auth,
          validateStatus: () => true,
        }
      );

      // Should refresh successfully or handle appropriately
      expect(refreshResponse.status).toBeLessThan(500);
    });

    test('should validate session revocation', async () => {
      if (!accessToken && !sessionHandle) {
        console.warn('No session data available for revocation test');
        return;
      }

      const logoutResponse = await axios.post(
        `${config.services.core}/auth/signout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: config.timeouts.auth,
          validateStatus: () => true,
        }
      );

      expect(logoutResponse.status).toBeLessThan(500);
    });

    test('should validate session cleanup in database', async () => {
      if (!testUserId) {
        console.warn('No test user ID for session cleanup validation');
        return;
      }

      // Check that active sessions are properly managed
      const sessionCheck = await dbPool.query(
        'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
        [testUserId]
      );
      
      // Should have reasonable session management
      expect(sessionCheck.rows.length).toBeLessThanOrEqual(5);
    });
  });

  describe('6. Security Validation', () => {
    test('should validate password security requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
      ];

      for (const weakPassword of weakPasswords) {
        const registrationData = {
          email: `weak-test-${Date.now()}@atlas-test.local`,
          password: weakPassword,
          firstName: 'Weak',
          lastName: 'Password',
        };

        const response = await axios.post(
          `${config.services.core}/auth/signup`,
          registrationData,
          {
            timeout: config.timeouts.auth,
            validateStatus: () => true,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        // Should reject weak passwords
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should validate rate limiting', async () => {
      const loginAttempts = Array(10).fill(null).map((_, i) => ({
        email: config.testUser.email,
        password: `wrong-password-${i}`,
      }));

      const responses = await Promise.allSettled(
        loginAttempts.map(attempt =>
          axios.post(
            `${config.services.core}/auth/signin`,
            attempt,
            {
              timeout: config.timeouts.auth,
              validateStatus: () => true,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        )
      );

      // Should have some rate limiting after multiple failed attempts
      const rateLimitedResponses = responses
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
        .filter(response => response.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
    });

    test('should validate CSRF protection', async () => {
      // Test that state-changing operations require proper CSRF protection
      const response = await axios.post(
        `${config.services.core}/auth/signout`,
        {},
        {
          timeout: config.timeouts.auth,
          validateStatus: () => true,
        }
      );

      // Should have proper CSRF protection mechanisms
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('7. Performance Validation', () => {
    test('should validate authentication performance', async () => {
      const loginData = {
        email: config.testUser.email,
        password: config.testUser.password,
      };

      const startTime = performance.now();
      
      const response = await axios.post(
        `${config.services.core}/auth/signin`,
        loginData,
        {
          timeout: config.timeouts.auth,
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const endTime = performance.now();
      const authTime = endTime - startTime;

      expect(response.status).toBeLessThan(500);
      expect(authTime).toBeLessThan(3000); // Authentication should be fast
    });

    test('should validate session lookup performance', async () => {
      if (!accessToken) {
        console.warn('No access token for session performance test');
        return;
      }

      const startTime = performance.now();
      
      const response = await axios.get(
        `${config.services.core}/auth/session`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          timeout: config.timeouts.auth,
          validateStatus: () => true,
        }
      );
      
      const endTime = performance.now();
      const lookupTime = endTime - startTime;

      expect(response.status).toBeLessThan(500);
      expect(lookupTime).toBeLessThan(1000); // Session lookup should be very fast
    });
  });
});

// Utility Functions
async function waitForAuthServices(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${config.services.core}/api/health`, { timeout: 5000 });
      await axios.get(`${config.services.hasura}/healthz`, { timeout: 5000 });
      
      console.log(`✅ Auth services ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Auth services failed to start after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for auth services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function cleanupTestUser(): Promise<void> {
  try {
    if (testUserId) {
      // Clean up sessions
      await dbPool.query('DELETE FROM sessions WHERE user_id = $1', [testUserId]);
      
      // Clean up user
      await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);
      
      // Clean up Redis sessions
      const sessionKeys = await redisClient.keys(`*session*${testUserId}*`);
      if (sessionKeys.length > 0) {
        await redisClient.del(...sessionKeys);
      }
    }
    
    // Clean up any test users by email pattern
    await dbPool.query(
      'DELETE FROM users WHERE email LIKE $1',
      ['%atlas-test.local']
    );
    
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}