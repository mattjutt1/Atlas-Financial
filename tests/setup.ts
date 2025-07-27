/**
 * Atlas Financial - Test Setup Configuration
 * Configures testing environment with financial precision validation
 */

import '@testing-library/jest-dom';

// Financial Precision Testing Utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeExactDecimal(expected: string): R;
      toHaveFinancialPrecision(): R;
      toBeValidCurrency(currency: string): R;
    }
  }
}

// Custom Matcher: Exact Decimal Precision
expect.extend({
  toBeExactDecimal(received: any, expected: string) {
    const pass = received.toString() === expected;
    if (pass) {
      return {
        message: () => `expected ${received} not to be exactly ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be exactly ${expected}`,
        pass: false,
      };
    }
  },

  toHaveFinancialPrecision(received: any) {
    // Check for floating-point precision errors
    const stringValue = received.toString();
    const hasFloatingPointError = stringValue.includes('0000000') || 
                                 stringValue.includes('9999999') ||
                                 stringValue.match(/\.\d{15,}/);
    
    if (!hasFloatingPointError) {
      return {
        message: () => `expected ${received} to have floating-point precision errors`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to maintain financial precision without floating-point errors`,
        pass: false,
      };
    }
  },

  toBeValidCurrency(received: any, expectedCurrency: string) {
    const isValid = received.currency === expectedCurrency;
    if (isValid) {
      return {
        message: () => `expected ${received} not to have currency ${expectedCurrency}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have currency ${expectedCurrency}, but got ${received.currency}`,
        pass: false,
      };
    }
  },
});

// Mock External Services
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useSubscription: jest.fn(),
}));

// Environment Variables for Testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_HASURA_URL = 'http://localhost:8081/v1/graphql';
process.env.NEXT_PUBLIC_SUPERTOKENS_URL = 'http://localhost:3567';

// Silence console errors in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
}

// Global Test Utilities
global.testUtils = {
  // Financial Test Data Factory
  createTestMoney: (amount: string, currency = 'USD') => ({
    amount,
    currency,
    toString: () => amount,
  }),

  // Portfolio Test Data Factory
  createTestPortfolio: (assets = []) => ({
    id: 'test-portfolio-123',
    name: 'Test Portfolio',
    assets,
    createdAt: new Date().toISOString(),
  }),

  // Debt Account Test Data Factory
  createTestDebtAccount: (balance: string, interestRate: string) => ({
    id: 'test-debt-123',
    name: 'Test Credit Card',
    balance: { amount: balance, currency: 'USD' },
    interestRate: { percentage: { value: interestRate }, period: 'ANNUAL' },
    minimumPayment: { amount: '100.00', currency: 'USD' },
    debtType: 'CREDIT_CARD',
  }),

  // User Test Data Factory
  createTestUser: (email = 'test@atlas.local') => ({
    id: 'test-user-123',
    email,
    name: 'Test User',
    createdAt: new Date().toISOString(),
  }),

  // GraphQL Response Mock
  mockGraphQLResponse: (data: any, errors: any[] = []) => ({
    data,
    errors,
    loading: false,
    networkStatus: 7,
  }),
};

// Increase timeout for integration tests
jest.setTimeout(30000);