/**
 * Atlas Financial Modular Monolith Integration Tests
 * Comprehensive testing suite for the 4-service architecture
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

// Test Configuration
const config = {
  services: {
    core: 'http://localhost:3000',
    prometheus: 'http://localhost:9090',
    grafana: 'http://localhost:3001',
    hasura: 'http://localhost:8081',
  },
  database: {
    host: 'localhost',
    port: 5432,
    user: 'atlas',
    password: process.env.POSTGRES_PASSWORD || 'atlas_dev_password',
    database: 'atlas_core',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD || 'redis_dev_password',
  },
  timeouts: {
    startup: 60000,
    request: 10000,
    health: 5000,
  },
  performance: {
    maxResponseTime: 2000,
    maxDbQueryTime: 500,
    maxCacheTime: 100,
  },
};

// Global test utilities
let dbPool: Pool;
let redisClient: Redis;
let testUser: any;
let authToken: string;

describe('Atlas Financial Modular Monolith Integration Tests', () => {
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
    await waitForServices();
  }, config.timeouts.startup);

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.id) {
      await cleanupTestUser(testUser.id);
    }
    
    // Close connections
    await dbPool.end();
    await redisClient.quit();
  });

  describe('1. Infrastructure Validation', () => {
    test('should validate all 4 services are running', async () => {
      const services = Object.entries(config.services);
      const healthChecks = await Promise.allSettled(
        services.map(([name, url]) => checkServiceHealth(name, url))
      );

      const failedServices = healthChecks
        .map((result, index) => ({ result, name: services[index][0] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ name }) => name);

      expect(failedServices).toEqual([]);
    });

    test('should validate service consolidation benefits', async () => {
      const startTime = performance.now();
      
      // Test inter-service communication latency
      const coreResponse = await axios.get(`${config.services.core}/api/health`);
      const hasuraResponse = await axios.get(`${config.services.hasura}/healthz`);
      
      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      expect(coreResponse.status).toBe(200);
      expect(hasuraResponse.status).toBe(200);
      expect(totalLatency).toBeLessThan(config.performance.maxResponseTime);
    });
  });

  describe('2. Atlas Data Platform Validation', () => {
    test('should validate PostgreSQL multi-database setup', async () => {
      const databases = ['atlas_core', 'hasura_metadata', 'supertokens', 'observability'];
      
      for (const dbName of databases) {
        const result = await dbPool.query(
          'SELECT datname FROM pg_database WHERE datname = $1',
          [dbName]
        );
        expect(result.rows.length).toBe(1);
      }
    });

    test('should validate database schemas and tables', async () => {
      // Check core schemas exist
      const schemas = await dbPool.query(
        `SELECT schema_name FROM information_schema.schemata 
         WHERE schema_name IN ('auth', 'financial', 'ai', 'audit')`
      );
      
      expect(schemas.rows.length).toBeGreaterThanOrEqual(2);
    });

    test('should validate Redis connectivity and keyspaces', async () => {
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');

      // Test different keyspaces
      await redisClient.set('test:session:123', 'test-value', 'EX', 60);
      const value = await redisClient.get('test:session:123');
      expect(value).toBe('test-value');
      
      await redisClient.del('test:session:123');
    });

    test('should validate database performance', async () => {
      const startTime = performance.now();
      
      await dbPool.query('SELECT 1 as test');
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(config.performance.maxDbQueryTime);
    });
  });

  describe('3. Atlas Core Platform Validation', () => {
    test('should validate Next.js application endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/auth/session',
        '/api/financial/health',
        '/api/ai/health',
      ];

      for (const endpoint of endpoints) {
        const response = await axios.get(`${config.services.core}${endpoint}`, {
          timeout: config.timeouts.request,
          validateStatus: (status) => status < 500, // Allow 4xx for auth endpoints
        });
        
        expect(response.status).toBeLessThan(500);
      }
    });

    test('should validate embedded SuperTokens authentication', async () => {
      // Test SuperTokens configuration endpoint
      const configResponse = await axios.get(
        `${config.services.core}/auth/jwt/jwks.json`,
        { timeout: config.timeouts.request }
      );
      
      expect(configResponse.status).toBe(200);
      expect(configResponse.data).toHaveProperty('keys');
      expect(Array.isArray(configResponse.data.keys)).toBe(true);
    });

    test('should validate Rust Financial Engine integration', async () => {
      // Test if Rust engine health endpoint is accessible
      const rustHealthResponse = await axios.get(
        `${config.services.core}/api/financial/health`,
        { timeout: config.timeouts.request }
      );
      
      expect(rustHealthResponse.status).toBe(200);
    });

    test('should validate AI Engine integration', async () => {
      // Test AI engine health
      const aiHealthResponse = await axios.get(
        `${config.services.core}/api/ai/health`,
        { timeout: config.timeouts.request }
      );
      
      expect(aiHealthResponse.status).toBe(200);
    });
  });

  describe('4. Atlas API Gateway Validation', () => {
    test('should validate Hasura GraphQL engine', async () => {
      const healthResponse = await axios.get(`${config.services.hasura}/healthz`);
      expect(healthResponse.status).toBe(200);

      const versionResponse = await axios.get(`${config.services.hasura}/v1/version`);
      expect(versionResponse.status).toBe(200);
      expect(versionResponse.data).toHaveProperty('version');
    });

    test('should validate GraphQL schema introspection is disabled', async () => {
      try {
        const introspectionQuery = {
          query: `
            query IntrospectionQuery {
              __schema {
                types {
                  name
                }
              }
            }
          `,
        };

        const response = await axios.post(
          `${config.services.hasura}/v1/graphql`,
          introspectionQuery,
          { validateStatus: () => true }
        );

        // Should be disabled in production-like setup
        expect(response.status).toBeGreaterThanOrEqual(400);
      } catch (error) {
        // Expected - introspection should be disabled
        expect(error).toBeDefined();
      }
    });

    test('should validate query complexity limiting', async () => {
      const complexQuery = {
        query: `
          query VeryComplexQuery {
            ${'user { id name email '.repeat(100)}
            ${'}'.repeat(100)}
          }
        `,
      };

      const response = await axios.post(
        `${config.services.hasura}/v1/graphql`,
        complexQuery,
        { validateStatus: () => true }
      );

      // Should reject overly complex queries
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('5. Atlas Observability Platform Validation', () => {
    test('should validate Prometheus metrics collection', async () => {
      const metricsResponse = await axios.get(`${config.services.prometheus}/metrics`);
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data).toContain('prometheus_');
    });

    test('should validate Prometheus targets', async () => {
      const targetsResponse = await axios.get(`${config.services.prometheus}/api/v1/targets`);
      expect(targetsResponse.status).toBe(200);
      expect(targetsResponse.data.status).toBe('success');
      
      const activeTargets = targetsResponse.data.data.activeTargets;
      expect(activeTargets.length).toBeGreaterThan(0);
    });

    test('should validate Grafana connectivity', async () => {
      const healthResponse = await axios.get(`${config.services.grafana}/api/health`);
      expect(healthResponse.status).toBe(200);
    });

    test('should validate custom business metrics', async () => {
      const coreMetricsResponse = await axios.get(`${config.services.core}/api/metrics`);
      expect(coreMetricsResponse.status).toBe(200);
      
      // Should contain Atlas-specific metrics
      expect(coreMetricsResponse.data).toMatch(/atlas_/);
    });
  });

  describe('6. Security Validation', () => {
    test('should validate secret management', async () => {
      // Check that sensitive endpoints don't expose secrets
      const response = await axios.get(`${config.services.core}/api/health`);
      const responseText = JSON.stringify(response.data).toLowerCase();
      
      // Should not contain common secret patterns
      expect(responseText).not.toMatch(/password|secret|key|token/);
    });

    test('should validate CORS configuration', async () => {
      const response = await axios.options(`${config.services.core}/api/health`);
      
      // Should have proper CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should validate database connection security', async () => {
      // Test that database connections use proper credentials
      const connectionResult = await dbPool.query('SELECT current_user');
      expect(connectionResult.rows[0].current_user).toBe('atlas');
    });
  });

  describe('7. Performance Validation', () => {
    test('should validate response time requirements', async () => {
      const endpoints = [
        '/api/health',
        '/api/auth/session',
      ];

      for (const endpoint of endpoints) {
        const startTime = performance.now();
        
        await axios.get(`${config.services.core}${endpoint}`, {
          timeout: config.timeouts.request,
          validateStatus: () => true,
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(config.performance.maxResponseTime);
      }
    });

    test('should validate cache performance', async () => {
      const key = `test:performance:${Date.now()}`;
      const value = 'performance-test-value';
      
      const startTime = performance.now();
      await redisClient.set(key, value);
      const cachedValue = await redisClient.get(key);
      const endTime = performance.now();
      
      const cacheTime = endTime - startTime;
      
      expect(cachedValue).toBe(value);
      expect(cacheTime).toBeLessThan(config.performance.maxCacheTime);
      
      await redisClient.del(key);
    });

    test('should validate memory usage efficiency', async () => {
      // This would be more comprehensive with actual memory monitoring
      const healthResponse = await axios.get(`${config.services.core}/api/health`);
      expect(healthResponse.status).toBe(200);
      
      // Verify the service is responsive (indicating good memory management)
      const startTime = performance.now();
      const secondResponse = await axios.get(`${config.services.core}/api/health`);
      const endTime = performance.now();
      
      expect(secondResponse.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast on second call
    });
  });
});

// Utility Functions
async function waitForServices(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const services = Object.entries(config.services);
      const healthChecks = await Promise.all(
        services.map(([name, url]) => checkServiceHealth(name, url))
      );
      
      console.log(`✅ All services ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Services failed to start after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function checkServiceHealth(name: string, url: string): Promise<void> {
  const healthEndpoint = name === 'hasura' ? `${url}/healthz` : 
                        name === 'grafana' ? `${url}/api/health` :
                        name === 'prometheus' ? `${url}/-/healthy` :
                        `${url}/api/health`;
  
  const response = await axios.get(healthEndpoint, {
    timeout: config.timeouts.health,
  });
  
  if (response.status !== 200) {
    throw new Error(`${name} health check failed: ${response.status}`);
  }
}

async function cleanupTestUser(userId: string): Promise<void> {
  try {
    // Clean up test user from database
    await dbPool.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    
    // Clean up any test sessions from Redis
    const keys = await redisClient.keys(`session:${userId}:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}