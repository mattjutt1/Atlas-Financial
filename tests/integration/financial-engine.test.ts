/**
 * Atlas Financial Engine Integration Tests
 * Tests Rust financial calculations and precision validation
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import axios from 'axios';
import { Pool } from 'pg';
import { performance } from 'perf_hooks';
import Decimal from 'decimal.js';

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
    calculation: 5000,
  },
  performance: {
    maxCalculationTime: 1000,
    precisionDigits: 10,
  },
};

// Test Data
const testFinancialData = {
  portfolios: [
    {
      name: 'Test Portfolio 1',
      assets: [
        { symbol: 'AAPL', quantity: '100.0000000000', price: '150.2500000000' },
        { symbol: 'GOOGL', quantity: '50.0000000000', price: '2800.7500000000' },
        { symbol: 'TSLA', quantity: '25.0000000000', price: '180.5000000000' },
      ],
    },
  ],
  debtAccounts: [
    {
      name: 'Test Credit Card',
      balance: '5000.0000000000',
      interestRate: '0.1999000000',
      minimumPayment: '100.0000000000',
      debtType: 'CREDIT_CARD',
    },
    {
      name: 'Test Student Loan',
      balance: '25000.0000000000',
      interestRate: '0.0650000000',
      minimumPayment: '300.0000000000',
      debtType: 'STUDENT_LOAN',
    },
  ],
  transactions: [
    { amount: '1000.0000000000', category: 'income', description: 'Salary' },
    { amount: '-500.0000000000', category: 'housing', description: 'Rent' },
    { amount: '-200.0000000000', category: 'food', description: 'Groceries' },
    { amount: '-150.0000000000', category: 'transportation', description: 'Gas' },
  ],
};

// Global test utilities
let dbPool: Pool;
let testUserId: string;
let accessToken: string;

describe('Atlas Financial Engine Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database connection
    dbPool = new Pool(config.database);
    
    // Wait for services to be ready
    await waitForFinancialServices();
    
    // Create test user and authenticate if needed
    await setupTestUser();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close connections
    await dbPool.end();
  });

  describe('1. Rust Financial Engine Health', () => {
    test('should validate Rust engine is embedded and accessible', async () => {
      const response = await axios.get(
        `${config.services.core}/api/financial/health`,
        { timeout: config.timeouts.request }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('engine', 'rust');
      expect(response.data).toHaveProperty('precision');
    });

    test('should validate financial precision configuration', async () => {
      const response = await axios.get(
        `${config.services.core}/api/financial/precision`,
        { timeout: config.timeouts.request }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('decimalPlaces');
      expect(response.data.decimalPlaces).toBeGreaterThanOrEqual(10);
      expect(response.data).toHaveProperty('roundingMode');
    });

    test('should validate currency support', async () => {
      const response = await axios.get(
        `${config.services.core}/api/financial/currencies`,
        { timeout: config.timeouts.request }
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.currencies)).toBe(true);
      expect(response.data.currencies).toContain('USD');
      expect(response.data.currencies.length).toBeGreaterThan(10);
    });
  });

  describe('2. Portfolio Calculations', () => {
    test('should calculate portfolio value with exact precision', async () => {
      const portfolio = testFinancialData.portfolios[0];
      
      const response = await axios.post(
        `${config.services.core}/api/financial/portfolio/calculate`,
        portfolio,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalValue');
      
      // Calculate expected value manually for precision validation
      const expectedValue = new Decimal('100')
        .mul('150.2500000000')
        .plus(new Decimal('50').mul('2800.7500000000'))
        .plus(new Decimal('25').mul('180.5000000000'));
      
      const actualValue = new Decimal(response.data.totalValue);
      expect(actualValue.toString()).toBe(expectedValue.toString());
    });

    test('should calculate portfolio allocation percentages', async () => {
      const portfolio = testFinancialData.portfolios[0];
      
      const response = await axios.post(
        `${config.services.core}/api/financial/portfolio/allocation`,
        portfolio,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('allocations');
      expect(Array.isArray(response.data.allocations)).toBe(true);
      
      // Validate allocations sum to 100%
      const totalAllocation = response.data.allocations.reduce(
        (sum: number, allocation: any) => sum + parseFloat(allocation.percentage),
        0
      );
      
      expect(Math.abs(totalAllocation - 100)).toBeLessThan(0.0001);
    });

    test('should calculate portfolio risk metrics', async () => {
      const portfolio = testFinancialData.portfolios[0];
      
      const response = await axios.post(
        `${config.services.core}/api/financial/portfolio/risk`,
        portfolio,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('volatility');
      expect(response.data).toHaveProperty('sharpeRatio');
      expect(response.data).toHaveProperty('betaCoefficient');
      
      // Validate risk metrics are reasonable numbers
      expect(parseFloat(response.data.volatility)).toBeGreaterThan(0);
      expect(parseFloat(response.data.volatility)).toBeLessThan(2);
    });

    test('should calculate portfolio optimization suggestions', async () => {
      const portfolio = testFinancialData.portfolios[0];
      
      const response = await axios.post(
        `${config.services.core}/api/financial/portfolio/optimize`,
        { ...portfolio, targetRisk: 'moderate' },
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('optimizedAllocation');
      expect(response.data).toHaveProperty('expectedReturn');
      expect(response.data).toHaveProperty('expectedRisk');
    });
  });

  describe('3. Debt Management Calculations', () => {
    test('should calculate debt avalanche strategy', async () => {
      const debts = testFinancialData.debtAccounts;
      
      const response = await axios.post(
        `${config.services.core}/api/financial/debt/avalanche`,
        { debts, extraPayment: '500.0000000000' },
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('paymentStrategy');
      expect(response.data).toHaveProperty('totalInterestSaved');
      expect(response.data).toHaveProperty('payoffTimeline');
      
      // Validate the strategy prioritizes higher interest rate debt
      const strategy = response.data.paymentStrategy;
      expect(Array.isArray(strategy)).toBe(true);
      
      if (strategy.length > 1) {
        expect(parseFloat(strategy[0].interestRate)).toBeGreaterThanOrEqual(
          parseFloat(strategy[1].interestRate)
        );
      }
    });

    test('should calculate debt snowball strategy', async () => {
      const debts = testFinancialData.debtAccounts;
      
      const response = await axios.post(
        `${config.services.core}/api/financial/debt/snowball`,
        { debts, extraPayment: '500.0000000000' },
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('paymentStrategy');
      expect(response.data).toHaveProperty('payoffTimeline');
      
      // Validate the strategy prioritizes smaller balances
      const strategy = response.data.paymentStrategy;
      expect(Array.isArray(strategy)).toBe(true);
      
      if (strategy.length > 1) {
        expect(parseFloat(strategy[0].balance)).toBeLessThanOrEqual(
          parseFloat(strategy[1].balance)
        );
      }
    });

    test('should calculate debt consolidation options', async () => {
      const debts = testFinancialData.debtAccounts;
      
      const response = await axios.post(
        `${config.services.core}/api/financial/debt/consolidation`,
        { debts, consolidationRate: '0.0750000000' },
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('consolidatedBalance');
      expect(response.data).toHaveProperty('monthlySavings');
      expect(response.data).toHaveProperty('totalSavings');
      
      // Validate consolidation calculations
      const expectedBalance = testFinancialData.debtAccounts.reduce(
        (sum, debt) => sum.plus(debt.balance),
        new Decimal(0)
      );
      
      const actualBalance = new Decimal(response.data.consolidatedBalance);
      expect(actualBalance.toString()).toBe(expectedBalance.toString());
    });
  });

  describe('4. Time Value of Money Calculations', () => {
    test('should calculate present value correctly', async () => {
      const calculation = {
        futureValue: '10000.0000000000',
        rate: '0.0500000000',
        periods: 10,
      };
      
      const response = await axios.post(
        `${config.services.core}/api/financial/tvm/present-value`,
        calculation,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('presentValue');
      
      // Validate PV calculation: PV = FV / (1 + r)^n
      const expectedPV = new Decimal(calculation.futureValue)
        .div(new Decimal(1).plus(calculation.rate).pow(calculation.periods));
      
      const actualPV = new Decimal(response.data.presentValue);
      const difference = actualPV.minus(expectedPV).abs();
      
      expect(difference.lt('0.0001')).toBe(true);
    });

    test('should calculate future value correctly', async () => {
      const calculation = {
        presentValue: '10000.0000000000',
        rate: '0.0500000000',
        periods: 10,
      };
      
      const response = await axios.post(
        `${config.services.core}/api/financial/tvm/future-value`,
        calculation,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('futureValue');
      
      // Validate FV calculation: FV = PV * (1 + r)^n
      const expectedFV = new Decimal(calculation.presentValue)
        .mul(new Decimal(1).plus(calculation.rate).pow(calculation.periods));
      
      const actualFV = new Decimal(response.data.futureValue);
      const difference = actualFV.minus(expectedFV).abs();
      
      expect(difference.lt('0.0001')).toBe(true);
    });

    test('should calculate annuity payments correctly', async () => {
      const calculation = {
        principalAmount: '100000.0000000000',
        rate: '0.0400000000',
        periods: 360, // 30 years monthly
        paymentType: 'ordinary',
      };
      
      const response = await axios.post(
        `${config.services.core}/api/financial/tvm/annuity-payment`,
        calculation,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('paymentAmount');
      expect(response.data).toHaveProperty('totalInterest');
      expect(response.data).toHaveProperty('amortizationSchedule');
      
      // Validate payment amount is reasonable for a mortgage
      const paymentAmount = parseFloat(response.data.paymentAmount);
      expect(paymentAmount).toBeGreaterThan(400);
      expect(paymentAmount).toBeLessThan(600);
    });
  });

  describe('5. Budget and Cash Flow Analysis', () => {
    test('should analyze spending patterns', async () => {
      const transactions = testFinancialData.transactions;
      
      const response = await axios.post(
        `${config.services.core}/api/financial/budget/analyze`,
        { transactions, period: 'monthly' },
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalIncome');
      expect(response.data).toHaveProperty('totalExpenses');
      expect(response.data).toHaveProperty('netCashFlow');
      expect(response.data).toHaveProperty('categoryBreakdown');
      
      // Validate calculations
      const expectedIncome = new Decimal('1000.0000000000');
      const expectedExpenses = new Decimal('850.0000000000');
      const expectedNet = expectedIncome.minus(expectedExpenses);
      
      expect(response.data.totalIncome).toBe(expectedIncome.toString());
      expect(response.data.totalExpenses).toBe(expectedExpenses.toString());
      expect(response.data.netCashFlow).toBe(expectedNet.toString());
    });

    test('should generate budget recommendations', async () => {
      const budgetData = {
        income: '5000.0000000000',
        expenses: testFinancialData.transactions.filter(t => 
          parseFloat(t.amount) < 0
        ),
        goals: ['emergency_fund', 'debt_payoff'],
      };
      
      const response = await axios.post(
        `${config.services.core}/api/financial/budget/recommend`,
        budgetData,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('recommendations');
      expect(response.data).toHaveProperty('allocations');
      expect(response.data).toHaveProperty('savingsRate');
      
      expect(Array.isArray(response.data.recommendations)).toBe(true);
    });
  });

  describe('6. Financial Precision Validation', () => {
    test('should handle floating-point precision correctly', async () => {
      // Test problematic floating-point calculations
      const testCases = [
        { a: '0.1000000000', b: '0.2000000000', operation: 'add' },
        { a: '1.0000000000', b: '0.9999999999', operation: 'subtract' },
        { a: '0.3333333333', b: '3.0000000000', operation: 'multiply' },
        { a: '1.0000000000', b: '3.0000000000', operation: 'divide' },
      ];
      
      for (const testCase of testCases) {
        const response = await axios.post(
          `${config.services.core}/api/financial/precision/calculate`,
          testCase,
          {
            timeout: config.timeouts.calculation,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
        expect(response.data).toHaveProperty('precision');
        
        // Validate no floating-point errors
        const result = response.data.result;
        expect(result).not.toMatch(/0{15,}|9{15,}/);
      }
    });

    test('should maintain precision across currency conversions', async () => {
      const conversion = {
        amount: '1000.0000000000',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        exchangeRate: '0.8500000000',
      };
      
      const response = await axios.post(
        `${config.services.core}/api/financial/currency/convert`,
        conversion,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('convertedAmount');
      expect(response.data).toHaveProperty('exchangeRate');
      
      // Validate precision in conversion
      const expectedAmount = new Decimal(conversion.amount)
        .mul(conversion.exchangeRate);
      
      const actualAmount = new Decimal(response.data.convertedAmount);
      expect(actualAmount.toString()).toBe(expectedAmount.toString());
    });

    test('should validate rounding behavior', async () => {
      const roundingTests = [
        { value: '10.125000000000', decimals: 2, mode: 'half_up' },
        { value: '10.124999999999', decimals: 2, mode: 'half_up' },
        { value: '10.125000000000', decimals: 2, mode: 'half_even' },
      ];
      
      for (const test of roundingTests) {
        const response = await axios.post(
          `${config.services.core}/api/financial/precision/round`,
          test,
          {
            timeout: config.timeouts.calculation,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('roundedValue');
        expect(response.data).toHaveProperty('roundingMode');
        
        // Validate consistent rounding behavior
        const rounded = response.data.roundedValue;
        const decimalPlaces = (rounded.split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(test.decimals);
      }
    });
  });

  describe('7. Performance Validation', () => {
    test('should calculate portfolio metrics within performance targets', async () => {
      const portfolio = {
        ...testFinancialData.portfolios[0],
        assets: Array(100).fill(null).map((_, i) => ({
          symbol: `STOCK${i}`,
          quantity: '10.0000000000',
          price: `${100 + i}.5000000000`,
        })),
      };
      
      const startTime = performance.now();
      
      const response = await axios.post(
        `${config.services.core}/api/financial/portfolio/calculate`,
        portfolio,
        {
          timeout: config.timeouts.calculation,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(calculationTime).toBeLessThan(config.performance.maxCalculationTime);
    });

    test('should handle concurrent calculations efficiently', async () => {
      const calculations = Array(10).fill(null).map((_, i) => ({
        futureValue: `${1000 * (i + 1)}.0000000000`,
        rate: '0.0500000000',
        periods: 10 + i,
      }));
      
      const startTime = performance.now();
      
      const responses = await Promise.all(
        calculations.map(calc =>
          axios.post(
            `${config.services.core}/api/financial/tvm/present-value`,
            calc,
            {
              timeout: config.timeouts.calculation,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        )
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All calculations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Concurrent execution should be efficient
      expect(totalTime).toBeLessThan(config.performance.maxCalculationTime * 5);
    });
  });
});

// Utility Functions
async function waitForFinancialServices(): Promise<void> {
  const maxAttempts = 20;
  const delay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${config.services.core}/api/financial/health`, { timeout: 5000 });
      
      console.log(`✅ Financial services ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Financial services failed to start after ${maxAttempts} attempts`);
      }
      
      console.log(`⏳ Waiting for financial services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function setupTestUser(): Promise<void> {
  try {
    // Create a test user in the database if needed
    const userResult = await dbPool.query(`
      INSERT INTO auth.users (id, email, name, created_at) 
      VALUES (gen_random_uuid(), $1, $2, NOW()) 
      ON CONFLICT (email) DO UPDATE SET name = $2
      RETURNING id
    `, [
      `financial-test-${Date.now()}@atlas-test.local`,
      'Financial Test User'
    ]);
    
    if (userResult.rows.length > 0) {
      testUserId = userResult.rows[0].id;
    }
  } catch (error) {
    console.warn('Failed to setup test user:', error);
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up test user and related data
    if (testUserId) {
      await dbPool.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }
    
    // Clean up any test data
    await dbPool.query(`
      DELETE FROM auth.users 
      WHERE email LIKE '%atlas-test.local'
    `);
    
  } catch (error) {
    console.warn('Failed to cleanup test data:', error);
  }
}