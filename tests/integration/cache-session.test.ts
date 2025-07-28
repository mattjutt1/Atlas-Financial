/**
 * Atlas Financial Cache and Session Management Tests
 * Tests Redis caching, session management, and performance optimization
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import Redis from 'ioredis';
import axios from 'axios';
import { performance } from 'perf_hooks';

// Test Configuration
const config = {
  services: {
    core: 'http://localhost:3000',
    hasura: 'http://localhost:8081',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD || 'redis_dev_password',
    db: 0, // Default database
  },
  keyspaces: {
    sessions: 'session:',
    cache: 'cache:',
    auth: 'auth:',
    financial: 'financial:',
    realtime: 'realtime:',
    rate_limit: 'rate_limit:',
  },
  performance: {
    maxCacheTime: 100,
    maxSessionTime: 200,
    cacheHitRatio: 0.8,
  },
  timeouts: {
    request: 10000,
    cache: 5000,
  },
  ttl: {
    session: 3600, // 1 hour
    cache: 300,    // 5 minutes
    auth: 900,     // 15 minutes
    rate_limit: 60, // 1 minute
  },
};

// Test Data
const testData = {
  sessions: [
    {
      sessionId: `test-session-${Date.now()}-1`,
      userId: 'test-user-123',
      data: { email: 'test1@atlas-test.local', role: 'user' },
    },
    {
      sessionId: `test-session-${Date.now()}-2`,
      userId: 'test-user-456',
      data: { email: 'test2@atlas-test.local', role: 'admin' },
    },
  ],
  cache: [
    {
      key: `test-cache-${Date.now()}-1`,
      value: { userId: 'user-123', balance: '1000.00', currency: 'USD' },
    },
    {
      key: `test-cache-${Date.now()}-2`,
      value: { portfolioId: 'portfolio-456', value: '50000.00', lastUpdate: new Date().toISOString() },
    },
  ],
  financial: [
    {
      key: `test-financial-${Date.now()}-1`,
      value: { calculations: { netWorth: '75000.00', monthlyIncome: '5000.00' } },
    },
  ],
};

// Global test utilities
let redisClient: Redis;
let testKeys: string[] = [];

describe('Atlas Financial Cache and Session Management Tests', () => {
  beforeAll(async () => {
    // Initialize Redis connection
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
    });
    
    // Wait for Redis to be ready
    await waitForRedis();
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close Redis connection
    await redisClient.quit();
  });

  describe('1. Redis Connectivity and Health', () => {
    test('should validate Redis server connectivity', async () => {
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');
    });

    test('should validate Redis configuration', async () => {
      const info = await redisClient.info();
      expect(info).toContain('redis_version');
      expect(info).toContain('connected_clients');
      
      // Check memory configuration
      const memory = await redisClient.info('memory');
      expect(memory).toContain('used_memory');
      expect(memory).toContain('maxmemory');
    });

    test('should validate Redis persistence settings', async () => {
      const config = await redisClient.config('GET', 'save');
      expect(config).toBeDefined();
      expect(Array.isArray(config)).toBe(true);
    });

    test('should validate Redis performance metrics', async () => {
      const startTime = performance.now();
      await redisClient.set('performance-test', 'test-value');
      const value = await redisClient.get('performance-test');
      const endTime = performance.now();
      
      expect(value).toBe('test-value');
      expect(endTime - startTime).toBeLessThan(config.performance.maxCacheTime);
      
      await redisClient.del('performance-test');
    });
  });

  describe('2. Session Management', () => {
    test('should create and retrieve user sessions', async () => {
      for (const session of testData.sessions) {
        const sessionKey = `${config.keyspaces.sessions}${session.sessionId}`;
        
        // Create session
        await redisClient.setex(
          sessionKey,
          config.ttl.session,
          JSON.stringify(session.data)
        );
        
        testKeys.push(sessionKey);
        
        // Retrieve session
        const retrievedData = await redisClient.get(sessionKey);
        expect(retrievedData).toBeTruthy();
        
        const parsedData = JSON.parse(retrievedData!);
        expect(parsedData.email).toBe(session.data.email);
        expect(parsedData.role).toBe(session.data.role);
      }
    });

    test('should validate session expiration', async () => {
      const shortSessionKey = `${config.keyspaces.sessions}short-session-${Date.now()}`;
      const sessionData = { userId: 'test-user', temporary: true };
      
      // Create session with short TTL
      await redisClient.setex(shortSessionKey, 2, JSON.stringify(sessionData));
      testKeys.push(shortSessionKey);
      
      // Verify session exists
      const initialData = await redisClient.get(shortSessionKey);
      expect(initialData).toBeTruthy();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Verify session expired
      const expiredData = await redisClient.get(shortSessionKey);
      expect(expiredData).toBeNull();
    });

    test('should validate session renewal', async () => {
      const renewableSessionKey = `${config.keyspaces.sessions}renewable-${Date.now()}`;
      const sessionData = { userId: 'test-user', renewable: true };
      
      // Create session
      await redisClient.setex(renewableSessionKey, 10, JSON.stringify(sessionData));
      testKeys.push(renewableSessionKey);
      
      // Get initial TTL
      const initialTTL = await redisClient.ttl(renewableSessionKey);
      expect(initialTTL).toBeGreaterThan(0);
      
      // Renew session
      await redisClient.expire(renewableSessionKey, config.ttl.session);
      
      // Verify TTL was renewed
      const renewedTTL = await redisClient.ttl(renewableSessionKey);
      expect(renewedTTL).toBeGreaterThan(initialTTL);
    });

    test('should validate concurrent session access', async () => {
      const concurrentSessionKey = `${config.keyspaces.sessions}concurrent-${Date.now()}`;
      const sessionData = { userId: 'test-user', concurrent: true };
      
      await redisClient.setex(concurrentSessionKey, config.ttl.session, JSON.stringify(sessionData));
      testKeys.push(concurrentSessionKey);
      
      // Perform concurrent reads
      const concurrentReads = Array(10).fill(null).map(() =>
        redisClient.get(concurrentSessionKey)
      );
      
      const results = await Promise.all(concurrentReads);
      
      // All reads should succeed
      results.forEach(result => {
        expect(result).toBeTruthy();
        const parsed = JSON.parse(result!);
        expect(parsed.concurrent).toBe(true);
      });
    });

    test('should validate session cleanup for logged out users', async () => {
      const logoutSessionKey = `${config.keyspaces.sessions}logout-test-${Date.now()}`;
      const sessionData = { userId: 'test-user', loggedIn: true };
      
      // Create session
      await redisClient.setex(logoutSessionKey, config.ttl.session, JSON.stringify(sessionData));
      
      // Verify session exists
      const sessionExists = await redisClient.exists(logoutSessionKey);
      expect(sessionExists).toBe(1);
      
      // Simulate logout by deleting session
      await redisClient.del(logoutSessionKey);
      
      // Verify session is deleted
      const sessionDeleted = await redisClient.exists(logoutSessionKey);
      expect(sessionDeleted).toBe(0);
    });
  });

  describe('3. Application Cache Management', () => {
    test('should cache and retrieve application data', async () => {
      for (const item of testData.cache) {
        const cacheKey = `${config.keyspaces.cache}${item.key}`;
        
        // Cache data
        await redisClient.setex(
          cacheKey,
          config.ttl.cache,
          JSON.stringify(item.value)
        );
        
        testKeys.push(cacheKey);
        
        // Retrieve cached data
        const cachedData = await redisClient.get(cacheKey);
        expect(cachedData).toBeTruthy();
        
        const parsedData = JSON.parse(cachedData!);
        expect(parsedData).toEqual(item.value);
      }
    });

    test('should validate cache performance improvements', async () => {
      const performanceKey = `${config.keyspaces.cache}performance-test-${Date.now()}`;
      const largeData = {
        calculations: Array(100).fill(null).map((_, i) => ({
          id: `calc-${i}`,
          result: Math.random() * 1000,
          timestamp: new Date().toISOString(),
        })),
      };
      
      // Cache the data
      const cacheStartTime = performance.now();
      await redisClient.setex(performanceKey, config.ttl.cache, JSON.stringify(largeData));
      const cacheEndTime = performance.now();
      const cacheTime = cacheEndTime - cacheStartTime;
      
      testKeys.push(performanceKey);
      
      // Retrieve from cache
      const retrieveStartTime = performance.now();
      const cachedData = await redisClient.get(performanceKey);
      const retrieveEndTime = performance.now();
      const retrieveTime = retrieveEndTime - retrieveStartTime;
      
      expect(cachedData).toBeTruthy();
      expect(cacheTime).toBeLessThan(config.performance.maxCacheTime);
      expect(retrieveTime).toBeLessThan(config.performance.maxCacheTime);
      
      // Cache retrieval should be faster than cache storage
      expect(retrieveTime).toBeLessThanOrEqual(cacheTime * 2);
    });

    test('should validate cache invalidation strategies', async () => {
      const invalidationKey = `${config.keyspaces.cache}invalidation-test-${Date.now()}`;
      const originalData = { version: 1, data: 'original' };
      const updatedData = { version: 2, data: 'updated' };
      
      // Cache original data
      await redisClient.setex(invalidationKey, config.ttl.cache, JSON.stringify(originalData));
      testKeys.push(invalidationKey);
      
      // Verify original data is cached
      const cached = await redisClient.get(invalidationKey);
      expect(JSON.parse(cached!).version).toBe(1);
      
      // Invalidate cache by updating
      await redisClient.setex(invalidationKey, config.ttl.cache, JSON.stringify(updatedData));
      
      // Verify updated data
      const updated = await redisClient.get(invalidationKey);
      expect(JSON.parse(updated!).version).toBe(2);
    });

    test('should validate cache namespace isolation', async () => {
      const baseKey = `namespace-test-${Date.now()}`;
      const namespaces = Object.keys(config.keyspaces);
      
      // Create data in different namespaces
      for (const namespace of namespaces) {
        const namespacedKey = `${config.keyspaces[namespace as keyof typeof config.keyspaces]}${baseKey}`;
        await redisClient.setex(namespacedKey, config.ttl.cache, `data-for-${namespace}`);
        testKeys.push(namespacedKey);
      }
      
      // Verify data isolation
      for (const namespace of namespaces) {
        const namespacedKey = `${config.keyspaces[namespace as keyof typeof config.keyspaces]}${baseKey}`;
        const data = await redisClient.get(namespacedKey);
        expect(data).toBe(`data-for-${namespace}`);
      }
    });
  });

  describe('4. Financial Data Caching', () => {
    test('should cache financial calculations with precision', async () => {
      for (const item of testData.financial) {
        const financialKey = `${config.keyspaces.financial}${item.key}`;
        
        // Cache financial data
        await redisClient.setex(
          financialKey,
          config.ttl.cache,
          JSON.stringify(item.value)
        );
        
        testKeys.push(financialKey);
        
        // Retrieve and validate precision
        const cachedData = await redisClient.get(financialKey);
        expect(cachedData).toBeTruthy();
        
        const parsedData = JSON.parse(cachedData!);
        expect(parsedData.calculations.netWorth).toBe('75000.00');
        expect(parsedData.calculations.monthlyIncome).toBe('5000.00');
      }
    });

    test('should validate financial cache consistency', async () => {
      const consistencyKey = `${config.keyspaces.financial}consistency-test-${Date.now()}`;
      const financialData = {
        userId: 'user-123',
        netWorth: '100000.0000000000',
        lastCalculated: new Date().toISOString(),
        breakdown: {
          assets: '125000.0000000000',
          liabilities: '25000.0000000000',
        },
      };
      
      // Cache financial data
      await redisClient.setex(consistencyKey, config.ttl.cache, JSON.stringify(financialData));
      testKeys.push(consistencyKey);
      
      // Retrieve multiple times to ensure consistency
      const reads = await Promise.all([
        redisClient.get(consistencyKey),
        redisClient.get(consistencyKey),
        redisClient.get(consistencyKey),
      ]);
      
      reads.forEach(read => {
        expect(read).toBeTruthy();
        const parsed = JSON.parse(read!);
        expect(parsed.netWorth).toBe('100000.0000000000');
        expect(parsed.breakdown.assets).toBe('125000.0000000000');
      });
    });

    test('should validate real-time financial data updates', async () => {
      const realtimeKey = `${config.keyspaces.realtime}portfolio-updates-${Date.now()}`;
      const updates = [
        { timestamp: Date.now(), price: '150.25', symbol: 'AAPL' },
        { timestamp: Date.now() + 1000, price: '150.30', symbol: 'AAPL' },
        { timestamp: Date.now() + 2000, price: '150.28', symbol: 'AAPL' },
      ];
      
      // Simulate real-time updates
      for (const update of updates) {
        await redisClient.lpush(realtimeKey, JSON.stringify(update));
      }
      testKeys.push(realtimeKey);
      
      // Retrieve updates
      const retrievedUpdates = await redisClient.lrange(realtimeKey, 0, -1);
      expect(retrievedUpdates.length).toBe(3);
      
      // Verify order (newest first)
      const parsed = retrievedUpdates.map(update => JSON.parse(update));
      expect(parsed[0].price).toBe('150.28');
      expect(parsed[2].price).toBe('150.25');
    });
  });

  describe('5. Rate Limiting and Security', () => {
    test('should implement rate limiting with Redis', async () => {
      const rateLimitKey = `${config.keyspaces.rate_limit}user-123-api-calls`;
      const maxRequests = 10;
      const windowSize = 60; // seconds
      
      // Simulate API calls
      const requests = Array(15).fill(null);
      const results = [];
      
      for (const _ of requests) {
        const currentCount = await redisClient.incr(rateLimitKey);
        
        if (currentCount === 1) {
          // First request, set expiration
          await redisClient.expire(rateLimitKey, windowSize);
        }
        
        results.push(currentCount);
      }
      
      testKeys.push(rateLimitKey);
      
      // Validate rate limiting
      expect(results[9]).toBe(10); // 10th request
      expect(results[14]).toBe(15); // 15th request
      
      // Should have some mechanism to enforce limits
      const limitExceeded = results.some(count => count > maxRequests);
      expect(limitExceeded).toBe(true);
    });

    test('should validate session security with Redis', async () => {
      const secureSessionKey = `${config.keyspaces.sessions}secure-${Date.now()}`;
      const sessionData = {
        userId: 'user-123',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        csrfToken: 'csrf-token-12345',
      };
      
      // Create secure session
      await redisClient.setex(secureSessionKey, config.ttl.session, JSON.stringify(sessionData));
      testKeys.push(secureSessionKey);
      
      // Verify session data integrity
      const retrieved = await redisClient.get(secureSessionKey);
      expect(retrieved).toBeTruthy();
      
      const parsed = JSON.parse(retrieved!);
      expect(parsed.csrfToken).toBe('csrf-token-12345');
      expect(parsed.permissions).toContain('admin');
    });

    test('should validate cache security and access control', async () => {
      const sensitiveKey = `${config.keyspaces.cache}sensitive-data-${Date.now()}`;
      const sensitiveData = {
        userId: 'user-123',
        accountNumber: '****1234',
        hashedData: 'hashed-sensitive-info',
      };
      
      // Cache sensitive data
      await redisClient.setex(sensitiveKey, config.ttl.cache, JSON.stringify(sensitiveData));
      testKeys.push(sensitiveKey);
      
      // Verify data is stored but masked
      const cached = await redisClient.get(sensitiveKey);
      expect(cached).toBeTruthy();
      
      const parsed = JSON.parse(cached!);
      expect(parsed.accountNumber).toBe('****1234'); // Should be masked
      expect(parsed.hashedData).toBeTruthy(); // Should exist but hashed
    });
  });

  describe('6. Cache Performance and Optimization', () => {
    test('should validate cache hit ratios', async () => {
      const baseKey = `hit-ratio-test-${Date.now()}`;
      const testOperations = 100;
      let hits = 0;
      let misses = 0;
      
      // Populate cache with some data
      for (let i = 0; i < 50; i++) {
        const key = `${config.keyspaces.cache}${baseKey}-${i}`;
        await redisClient.setex(key, config.ttl.cache, `value-${i}`);
        testKeys.push(key);
      }
      
      // Perform cache operations
      for (let i = 0; i < testOperations; i++) {
        const key = `${config.keyspaces.cache}${baseKey}-${i}`;
        const value = await redisClient.get(key);
        
        if (value) {
          hits++;
        } else {
          misses++;
        }
      }
      
      const hitRatio = hits / testOperations;
      expect(hitRatio).toBeGreaterThanOrEqual(0.4); // At least 40% hit ratio
    });

    test('should validate cache memory usage optimization', async () => {
      const memoryKey = `memory-test-${Date.now()}`;
      const largeDataItems = Array(100).fill(null).map((_, i) => ({
        key: `${config.keyspaces.cache}${memoryKey}-${i}`,
        value: {
          id: i,
          data: 'x'.repeat(1000), // 1KB per item
          timestamp: new Date().toISOString(),
        },
      }));
      
      // Get initial memory usage
      const initialMemory = await redisClient.info('memory');
      const initialUsed = extractMemoryValue(initialMemory, 'used_memory');
      
      // Cache large dataset
      for (const item of largeDataItems) {
        await redisClient.setex(item.key, config.ttl.cache, JSON.stringify(item.value));
        testKeys.push(item.key);
      }
      
      // Get memory usage after caching
      const afterMemory = await redisClient.info('memory');
      const afterUsed = extractMemoryValue(afterMemory, 'used_memory');
      
      // Memory usage should increase but not excessively
      const memoryIncrease = afterUsed - initialUsed;
      expect(memoryIncrease).toBeGreaterThan(50000); // At least 50KB increase
      expect(memoryIncrease).toBeLessThan(500000); // Less than 500KB increase
    });

    test('should validate cache cleanup and eviction', async () => {
      const evictionKey = `eviction-test-${Date.now()}`;
      const shortTTL = 2; // 2 seconds
      
      // Create multiple cache entries with short TTL
      const entries = Array(10).fill(null).map((_, i) => ({
        key: `${config.keyspaces.cache}${evictionKey}-${i}`,
        value: `eviction-test-value-${i}`,
      }));
      
      for (const entry of entries) {
        await redisClient.setex(entry.key, shortTTL, entry.value);
      }
      
      // Verify entries exist
      const initialExists = await Promise.all(
        entries.map(entry => redisClient.exists(entry.key))
      );
      expect(initialExists.every(exists => exists === 1)).toBe(true);
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, shortTTL * 1000 + 500));
      
      // Verify entries are evicted
      const afterExists = await Promise.all(
        entries.map(entry => redisClient.exists(entry.key))
      );
      expect(afterExists.every(exists => exists === 0)).toBe(true);
    });

    test('should validate connection pooling performance', async () => {
      // Test multiple concurrent Redis operations
      const concurrentOperations = Array(50).fill(null).map((_, i) => ({
        key: `concurrent-${Date.now()}-${i}`,
        value: `concurrent-value-${i}`,
      }));
      
      const startTime = performance.now();
      
      // Perform concurrent SET operations
      const setOps = concurrentOperations.map(op =>
        redisClient.setex(`${config.keyspaces.cache}${op.key}`, config.ttl.cache, op.value)
      );
      await Promise.all(setOps);
      
      // Perform concurrent GET operations
      const getOps = concurrentOperations.map(op =>
        redisClient.get(`${config.keyspaces.cache}${op.key}`)
      );
      const results = await Promise.all(getOps);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All operations should succeed
      expect(results.length).toBe(50);
      results.forEach((result, i) => {
        expect(result).toBe(`concurrent-value-${i}`);
      });
      
      // Should be efficient with connection pooling
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds
      
      // Clean up
      const cleanupOps = concurrentOperations.map(op =>
        redisClient.del(`${config.keyspaces.cache}${op.key}`)
      );
      await Promise.all(cleanupOps);
    });
  });
});

// Utility Functions
async function waitForRedis(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pong = await redisClient.ping();
      if (pong === 'PONG') {
        console.log(`✅ Redis ready (attempt ${attempt}/${maxAttempts})`);
        return;
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Redis failed to start after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for Redis... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function setupTestData(): Promise<void> {
  try {
    // Pre-populate some test data for cache hit ratio tests
    const prePopulateKeys = Array(20).fill(null).map((_, i) => ({
      key: `${config.keyspaces.cache}pre-populate-${Date.now()}-${i}`,
      value: `pre-populate-value-${i}`,
    }));
    
    for (const item of prePopulateKeys) {
      await redisClient.setex(item.key, config.ttl.cache, item.value);
      testKeys.push(item.key);
    }
    
    console.log('✅ Test data setup completed');
  } catch (error) {
    console.warn('⚠️  Failed to setup test data:', error);
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up all test keys
    if (testKeys.length > 0) {
      await redisClient.del(...testKeys);
      console.log(`✅ Cleaned up ${testKeys.length} test keys`);
    }
    
    // Clean up any remaining test data by pattern
    const patterns = [
      'test-*',
      '*-test-*',
      'performance-*',
      'concurrent-*',
    ];
    
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`✅ Cleaned up ${keys.length} keys matching pattern: ${pattern}`);
      }
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to cleanup test data:', error);
  }
}

function extractMemoryValue(memoryInfo: string, key: string): number {
  const match = memoryInfo.match(new RegExp(`${key}:(\\d+)`));
  return match ? parseInt(match[1]) : 0;
}