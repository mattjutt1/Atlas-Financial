/**
 * Atlas Financial End-to-End User Workflow Tests
 * Tests complete user journeys through the modular monolith architecture
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
    hasura: 'http://localhost:8081',
    prometheus: 'http://localhost:9090',
    grafana: 'http://localhost:3001',
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
  testUser: {
    email: `e2e-test-user-${Date.now()}@atlas-test.local`,
    password: 'E2ETestPassword123!',
    firstName: 'E2E',
    lastName: 'Test User',
  },
  timeouts: {
    request: 15000,
    workflow: 30000,
  },
  performance: {
    maxWorkflowTime: 10000,
    maxStepTime: 3000,
  },
};

// Test Scenarios
const testScenarios = {
  newUser: {
    accounts: [
      {
        name: 'Primary Checking',
        type: 'CHECKING',
        balance: '5000.0000000000',
        currency: 'USD',
      },
      {
        name: 'Savings Account',
        type: 'SAVINGS',
        balance: '25000.0000000000',
        currency: 'USD',
      },
    ],
    transactions: [
      { amount: '3000.0000000000', description: 'Salary Deposit', category: 'income' },
      { amount: '-1200.0000000000', description: 'Rent Payment', category: 'housing' },
      { amount: '-300.0000000000', description: 'Groceries', category: 'food' },
      { amount: '-150.0000000000', description: 'Gas', category: 'transportation' },
    ],
    portfolio: {
      name: 'Investment Portfolio',
      assets: [
        { symbol: 'AAPL', quantity: '50.0000000000', price: '150.0000000000' },
        { symbol: 'GOOGL', quantity: '10.0000000000', price: '2800.0000000000' },
      ],
    },
    debts: [
      {
        name: 'Credit Card',
        balance: '3500.0000000000',
        interestRate: '0.1899000000',
        minimumPayment: '105.0000000000',
        type: 'CREDIT_CARD',
      },
    ],
  },
};

// Global test utilities
let dbPool: Pool;
let redisClient: Redis;
let testUserId: string;
let accessToken: string;
let testDataIds: { [key: string]: string[] } = {};

describe('Atlas Financial End-to-End User Workflow Tests', () => {
  beforeAll(async () => {
    // Initialize connections
    dbPool = new Pool(config.database);
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
    
    // Wait for all services
    await waitForAllServices();
  }, config.timeouts.workflow);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close connections
    await dbPool.end();
    await redisClient.quit();
  });

  describe('1. Complete New User Onboarding Journey', () => {
    test('should complete full user registration workflow', async () => {
      const workflowStartTime = performance.now();
      
      // Step 1: Access application homepage
      const homepageResponse = await axios.get(
        `${config.services.core}`,
        { timeout: config.timeouts.request }
      );
      expect(homepageResponse.status).toBe(200);
      
      // Step 2: Register new user
      const registrationData = {
        email: config.testUser.email,
        password: config.testUser.password,
        firstName: config.testUser.firstName,
        lastName: config.testUser.lastName,
      };
      
      const registrationResponse = await axios.post(
        `${config.services.core}/auth/signup`,
        registrationData,
        {
          timeout: config.timeouts.request,
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(registrationResponse.status).toBeLessThanOrEqual(201);
      
      // Step 3: Verify user in database
      const userCheck = await dbPool.query(
        'SELECT id, email FROM auth.users WHERE email = $1',
        [config.testUser.email]
      );
      
      expect(userCheck.rows.length).toBe(1);
      testUserId = userCheck.rows[0].id;
      
      // Step 4: Login user
      const loginResponse = await axios.post(
        `${config.services.core}/auth/signin`,
        {
          email: config.testUser.email,
          password: config.testUser.password,
        },
        {
          timeout: config.timeouts.request,
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(loginResponse.status).toBeLessThanOrEqual(200);
      
      // Extract session/token information
      if (loginResponse.data?.tokens?.accessToken) {
        accessToken = loginResponse.data.tokens.accessToken;
      } else if (loginResponse.headers['set-cookie']) {
        // Extract from cookies if using cookie-based auth
        const sessionCookie = loginResponse.headers['set-cookie']
          .find(cookie => cookie.includes('sAccessToken'));
        if (sessionCookie) {
          accessToken = sessionCookie.split('=')[1].split(';')[0];
        }
      }
      
      // Step 5: Access authenticated dashboard
      const dashboardResponse = await axios.get(
        `${config.services.core}/dashboard`,
        {
          timeout: config.timeouts.request,
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(dashboardResponse.status).toBeLessThanOrEqual(200);
      
      const workflowEndTime = performance.now();
      const workflowTime = workflowEndTime - workflowStartTime;
      
      expect(workflowTime).toBeLessThan(config.performance.maxWorkflowTime);
    });

    test('should complete user profile setup', async () => {
      if (!testUserId) {
        console.warn('No test user ID available for profile setup');
        return;
      }
      
      const profileData = {
        firstName: config.testUser.firstName,
        lastName: config.testUser.lastName,
        phoneNumber: '+1-555-0123',
        timezone: 'America/New_York',
        currency: 'USD',
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
      };
      
      const profileResponse = await axios.post(
        `${config.services.core}/api/user/profile`,
        profileData,
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(profileResponse.status).toBeLessThanOrEqual(201);
    });
  });

  describe('2. Financial Account Management Workflow', () => {
    test('should complete account creation and management workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for account management');
        return;
      }
      
      testDataIds.accounts = [];
      
      // Create multiple accounts
      for (const accountData of testScenarios.newUser.accounts) {
        const createAccountResponse = await axios.post(
          `${config.services.core}/api/accounts`,
          {
            ...accountData,
            userId: testUserId,
          },
          {
            timeout: config.timeouts.request,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            validateStatus: (status) => status < 500,
          }
        );
        
        if (createAccountResponse.status <= 201 && createAccountResponse.data?.id) {
          testDataIds.accounts.push(createAccountResponse.data.id);
        }
        
        expect(createAccountResponse.status).toBeLessThanOrEqual(201);
      }
      
      // Verify accounts in database
      const accountsCheck = await dbPool.query(
        'SELECT id, name, account_type, balance FROM financial.accounts WHERE user_id = $1',
        [testUserId]
      );
      
      expect(accountsCheck.rows.length).toBeGreaterThanOrEqual(1);
      
      // Test account balance update
      if (testDataIds.accounts.length > 0) {
        const updateBalanceResponse = await axios.patch(
          `${config.services.core}/api/accounts/${testDataIds.accounts[0]}`,
          { balance: '5500.0000000000' },
          {
            timeout: config.timeouts.request,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            validateStatus: (status) => status < 500,
          }
        );
        
        expect(updateBalanceResponse.status).toBeLessThanOrEqual(200);
      }
    });

    test('should complete transaction management workflow', async () => {
      if (!testUserId || !accessToken || testDataIds.accounts?.length === 0) {
        console.warn('No accounts available for transaction management');
        return;
      }
      
      testDataIds.transactions = [];
      const accountId = testDataIds.accounts[0];
      
      // Add transactions
      for (const transactionData of testScenarios.newUser.transactions) {
        const createTransactionResponse = await axios.post(
          `${config.services.core}/api/transactions`,
          {
            ...transactionData,
            accountId,
            date: new Date().toISOString(),
          },
          {
            timeout: config.timeouts.request,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            validateStatus: (status) => status < 500,
          }
        );
        
        if (createTransactionResponse.status <= 201 && createTransactionResponse.data?.id) {
          testDataIds.transactions.push(createTransactionResponse.data.id);
        }
        
        expect(createTransactionResponse.status).toBeLessThanOrEqual(201);
      }
      
      // Verify transactions in database
      const transactionsCheck = await dbPool.query(
        'SELECT id, amount, description FROM financial.transactions WHERE account_id = $1',
        [accountId]
      );
      
      expect(transactionsCheck.rows.length).toBeGreaterThanOrEqual(1);
      
      // Test transaction categorization
      if (testDataIds.transactions.length > 0) {
        const categorizationResponse = await axios.patch(
          `${config.services.core}/api/transactions/${testDataIds.transactions[0]}`,
          { category: 'updated_category' },
          {
            timeout: config.timeouts.request,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            validateStatus: (status) => status < 500,
          }
        );
        
        expect(categorizationResponse.status).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('3. Investment Portfolio Management Workflow', () => {
    test('should complete portfolio creation and management workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for portfolio management');
        return;
      }
      
      // Create investment portfolio
      const portfolioData = {
        ...testScenarios.newUser.portfolio,
        userId: testUserId,
      };
      
      const createPortfolioResponse = await axios.post(
        `${config.services.core}/api/portfolios`,
        portfolioData,
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(createPortfolioResponse.status).toBeLessThanOrEqual(201);
      
      if (createPortfolioResponse.data?.id) {
        testDataIds.portfolios = [createPortfolioResponse.data.id];
      }
      
      // Test portfolio valuation calculation
      const valuationResponse = await axios.get(
        `${config.services.core}/api/portfolios/${testDataIds.portfolios?.[0]}/valuation`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      if (testDataIds.portfolios?.[0]) {
        expect(valuationResponse.status).toBeLessThanOrEqual(200);
        
        if (valuationResponse.status === 200) {
          expect(valuationResponse.data).toHaveProperty('totalValue');
          expect(valuationResponse.data).toHaveProperty('allocations');
        }
      }
      
      // Test portfolio optimization recommendations
      const optimizationResponse = await axios.post(
        `${config.services.core}/api/portfolios/${testDataIds.portfolios?.[0]}/optimize`,
        { targetRisk: 'moderate' },
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      if (testDataIds.portfolios?.[0]) {
        expect(optimizationResponse.status).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('4. Debt Management Workflow', () => {
    test('should complete debt tracking and optimization workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for debt management');
        return;
      }
      
      testDataIds.debts = [];
      
      // Add debt accounts
      for (const debtData of testScenarios.newUser.debts) {
        const createDebtResponse = await axios.post(
          `${config.services.core}/api/debts`,
          {
            ...debtData,
            userId: testUserId,
          },
          {
            timeout: config.timeouts.request,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            validateStatus: (status) => status < 500,
          }
        );
        
        if (createDebtResponse.status <= 201 && createDebtResponse.data?.id) {
          testDataIds.debts.push(createDebtResponse.data.id);
        }
        
        expect(createDebtResponse.status).toBeLessThanOrEqual(201);
      }
      
      // Test debt payoff strategies
      const strategiesResponse = await axios.post(
        `${config.services.core}/api/debts/strategies`,
        {
          debts: testDataIds.debts,
          extraPayment: '500.0000000000',
        },
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(strategiesResponse.status).toBeLessThanOrEqual(200);
      
      if (strategiesResponse.status === 200) {
        expect(strategiesResponse.data).toHaveProperty('avalanche');
        expect(strategiesResponse.data).toHaveProperty('snowball');
      }
    });
  });

  describe('5. Financial Insights and AI Analysis Workflow', () => {
    test('should complete AI-powered financial insights workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for AI insights');
        return;
      }
      
      // Request spending analysis
      const spendingAnalysisResponse = await axios.get(
        `${config.services.core}/api/ai/spending-analysis`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(spendingAnalysisResponse.status).toBeLessThanOrEqual(200);
      
      // Request budget recommendations
      const budgetRecommendationsResponse = await axios.post(
        `${config.services.core}/api/ai/budget-recommendations`,
        {
          income: '5000.0000000000',
          goals: ['emergency_fund', 'debt_payoff'],
        },
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(budgetRecommendationsResponse.status).toBeLessThanOrEqual(200);
      
      // Request investment insights
      const investmentInsightsResponse = await axios.get(
        `${config.services.core}/api/ai/investment-insights`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(investmentInsightsResponse.status).toBeLessThanOrEqual(200);
    });
  });

  describe('6. Dashboard and Reporting Workflow', () => {
    test('should complete comprehensive dashboard workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for dashboard');
        return;
      }
      
      // Access main dashboard
      const dashboardResponse = await axios.get(
        `${config.services.core}/api/dashboard`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(dashboardResponse.status).toBeLessThanOrEqual(200);
      
      if (dashboardResponse.status === 200) {
        expect(dashboardResponse.data).toHaveProperty('summary');
      }
      
      // Get net worth calculation
      const netWorthResponse = await axios.get(
        `${config.services.core}/api/dashboard/net-worth`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(netWorthResponse.status).toBeLessThanOrEqual(200);
      
      // Get cash flow analysis
      const cashFlowResponse = await axios.get(
        `${config.services.core}/api/dashboard/cash-flow`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(cashFlowResponse.status).toBeLessThanOrEqual(200);
      
      // Generate financial report
      const reportResponse = await axios.post(
        `${config.services.core}/api/reports/generate`,
        {
          type: 'monthly',
          period: '2025-01',
        },
        {
          timeout: config.timeouts.request,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(reportResponse.status).toBeLessThanOrEqual(200);
    });
  });

  describe('7. Data Export and Integration Workflow', () => {
    test('should complete data export workflow', async () => {
      if (!testUserId || !accessToken) {
        console.warn('No user authentication available for data export');
        return;
      }
      
      // Export account data
      const exportResponse = await axios.get(
        `${config.services.core}/api/export/accounts`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(exportResponse.status).toBeLessThanOrEqual(200);
      
      // Export transaction history
      const transactionExportResponse = await axios.get(
        `${config.services.core}/api/export/transactions`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            format: 'csv',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(transactionExportResponse.status).toBeLessThanOrEqual(200);
    });

    test('should validate Firefly III integration workflow', async () => {
      // Test external integration endpoint
      const fireflyIntegrationResponse = await axios.get(
        `${config.services.core}/api/integrations/firefly/status`,
        {
          timeout: config.timeouts.request,
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(fireflyIntegrationResponse.status).toBeLessThanOrEqual(200);
    });
  });

  describe('8. User Session and Security Workflow', () => {
    test('should complete secure session management workflow', async () => {
      if (!accessToken) {
        console.warn('No access token available for session management');
        return;
      }
      
      // Validate current session
      const sessionResponse = await axios.get(
        `${config.services.core}/api/auth/session`,
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(sessionResponse.status).toBeLessThanOrEqual(200);
      
      // Test session refresh
      const refreshResponse = await axios.post(
        `${config.services.core}/api/auth/refresh`,
        {},
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(refreshResponse.status).toBeLessThanOrEqual(200);
      
      // Test secure logout
      const logoutResponse = await axios.post(
        `${config.services.core}/api/auth/logout`,
        {},
        {
          timeout: config.timeouts.request,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: (status) => status < 500,
        }
      );
      
      expect(logoutResponse.status).toBeLessThanOrEqual(200);
    });
  });

  describe('9. Performance and Monitoring Workflow', () => {
    test('should validate monitoring and metrics workflow', async () => {
      // Check application metrics
      const metricsResponse = await axios.get(
        `${config.services.core}/api/metrics`,
        { timeout: config.timeouts.request }
      );
      
      expect(metricsResponse.status).toBe(200);
      
      // Check Prometheus metrics
      const prometheusResponse = await axios.get(
        `${config.services.prometheus}/metrics`,
        { timeout: config.timeouts.request }
      );
      
      expect(prometheusResponse.status).toBe(200);
      
      // Check Grafana health
      const grafanaResponse = await axios.get(
        `${config.services.grafana}/api/health`,
        { timeout: config.timeouts.request }
      );
      
      expect(grafanaResponse.status).toBe(200);
    });
  });
});

// Utility Functions
async function waitForAllServices(): Promise<void> {
  const services = Object.entries(config.services);
  const maxAttempts = 30;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const healthChecks = await Promise.allSettled(
        services.map(async ([name, url]) => {
          const healthEndpoint = name === 'hasura' ? `${url}/healthz` :
                                name === 'grafana' ? `${url}/api/health` :
                                name === 'prometheus' ? `${url}/-/healthy` :
                                `${url}/api/health`;
          
          const response = await axios.get(healthEndpoint, { timeout: 5000 });
          return { name, status: response.status };
        })
      );
      
      const failedServices = healthChecks
        .filter(result => result.status === 'rejected')
        .map((_, index) => services[index][0]);
      
      if (failedServices.length === 0) {
        console.log(`✅ All services ready for E2E tests (attempt ${attempt}/${maxAttempts})`);
        return;
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`Services failed to start: ${failedServices.join(', ')}`);
      }
      
      console.log(`⏳ Waiting for services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      console.log(`⏳ Service check failed, retrying... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    if (testUserId) {
      // Clean up user and all related data
      const cleanupQueries = [
        'DELETE FROM financial.transactions WHERE account_id IN (SELECT id FROM financial.accounts WHERE user_id = $1)',
        'DELETE FROM financial.portfolios WHERE user_id = $1',
        'DELETE FROM financial.debt_accounts WHERE user_id = $1',
        'DELETE FROM financial.accounts WHERE user_id = $1',
        'DELETE FROM auth.user_profiles WHERE user_id = $1',
        'DELETE FROM auth.users WHERE id = $1',
      ];
      
      for (const query of cleanupQueries) {
        try {
          await dbPool.query(query, [testUserId]);
        } catch (error) {
          console.warn('Cleanup query failed:', error);
        }
      }
    }
    
    // Clean up any test users by email pattern
    await dbPool.query(
      'DELETE FROM auth.users WHERE email LIKE $1',
      ['%atlas-test.local']
    );
    
    // Clean up Redis test data
    const testPatterns = ['e2e-*', 'test-*', '*-test-*'];
    for (const pattern of testPatterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
    
    console.log('✅ E2E test data cleanup completed');
  } catch (error) {
    console.warn('⚠️  Failed to cleanup E2E test data:', error);
  }
}