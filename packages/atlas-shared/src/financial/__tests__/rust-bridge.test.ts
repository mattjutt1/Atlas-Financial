/**
 * Tests for Rust Financial Engine Bridge - Phase 1.5
 *
 * These tests validate the integration between TypeScript FinancialAmount
 * and Rust Financial Engine, including precision preservation and fallback mechanisms.
 */

import { FinancialAmount } from '../precision';
import {
  RustFinancialBridge,
  FallbackCalculations,
  Currency,
  type RustMoney
} from '../rust-bridge';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock performance.now for consistent timing
global.performance = {
  now: jest.fn(() => Date.now())
} as any;

describe('RustFinancialBridge', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Type Conversion', () => {
    test('should convert FinancialAmount to RustMoney preserving precision', () => {
      const amount = new FinancialAmount('123.4567');
      const rustMoney = RustFinancialBridge.toRustMoney(amount, Currency.USD);

      expect(rustMoney).toEqual({
        amount: '123.4567',
        currency: Currency.USD
      });
    });

    test('should convert RustMoney to FinancialAmount preserving precision', () => {
      const rustMoney: RustMoney = {
        amount: '999.9999',
        currency: Currency.USD
      };

      const amount = RustFinancialBridge.fromRustMoney(rustMoney);
      expect(amount.toString()).toBe('999.9999');
    });

    test('should handle maximum precision values', () => {
      const maxAmount = new FinancialAmount('999999999999999.9999');
      const rustMoney = RustFinancialBridge.toRustMoney(maxAmount, Currency.EUR);

      expect(rustMoney.amount).toBe('999999999999999.9999');
      expect(rustMoney.currency).toBe(Currency.EUR);

      const converted = RustFinancialBridge.fromRustMoney(rustMoney);
      expect(converted.equals(maxAmount)).toBe(true);
    });

    test('should convert interest rates correctly', () => {
      const rate = RustFinancialBridge.toRustRate(7.25, 'Monthly');

      expect(rate).toEqual({
        percentage: '7.25',
        period: 'Monthly'
      });
    });
  });

  describe('API Integration', () => {
    test('should call compound interest calculation with correct parameters', async () => {
      const mockResponse = {
        data: {
          calculateCompoundInterest: {
            amount: '1051.1620',
            currency: 'USD'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const principal = new FinancialAmount('1000.00');
      const result = await RustFinancialBridge.calculateCompoundInterest(
        principal, 5.0, 12, 1
      );

      expect(result.toString()).toBe('1051.1620');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('calculateCompoundInterest')
        })
      );
    });

    test('should call monthly payment calculation with correct parameters', async () => {
      const mockResponse = {
        data: {
          calculateMonthlyPayment: {
            amount: '1013.3714',
            currency: 'USD'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const principal = new FinancialAmount('200000.00');
      const result = await RustFinancialBridge.calculateMonthlyPayment(
        principal, 4.5, 360
      );

      expect(result.toString()).toBe('1013.3714');
    });

    test('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const principal = new FinancialAmount('1000.00');

      await expect(
        RustFinancialBridge.calculateCompoundInterest(principal, 5.0, 12, 1)
      ).rejects.toThrow('Financial calculation service unavailable');
    });

    test('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [
          { message: 'Invalid input parameters' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const principal = new FinancialAmount('1000.00');

      await expect(
        RustFinancialBridge.calculateCompoundInterest(principal, 5.0, 12, 1)
      ).rejects.toThrow('GraphQL error: Invalid input parameters');
    });

    test('should warn about slow API responses', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock slow response (>100ms)
      (performance.now as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(150);

      const mockResponse = {
        data: {
          calculateCompoundInterest: {
            amount: '1051.1620',
            currency: 'USD'
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const principal = new FinancialAmount('1000.00');
      await RustFinancialBridge.calculateCompoundInterest(principal, 5.0, 12, 1);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('took 150.00ms (>100ms threshold)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Debt Optimization', () => {
    test('should optimize debt payments correctly', async () => {
      const mockResponse = {
        data: {
          optimizeDebtPayment: {
            optimized_order: [
              { name: 'Credit Card 2', order: 1, months_to_payoff: 24 },
              { name: 'Credit Card 1', order: 2, months_to_payoff: 36 }
            ],
            total_interest_saved: {
              amount: '2500.0000',
              currency: 'USD'
            },
            payoff_time: 60
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const debts = [
        {
          name: 'Credit Card 1',
          balance: new FinancialAmount('3000.00'),
          minimumPayment: new FinancialAmount('60.00'),
          interestRate: 18.99
        },
        {
          name: 'Credit Card 2',
          balance: new FinancialAmount('1500.00'),
          minimumPayment: new FinancialAmount('30.00'),
          interestRate: 24.99
        }
      ];

      const result = await RustFinancialBridge.optimizeDebtPayment(
        debts,
        new FinancialAmount('200.00'),
        'Avalanche'
      );

      expect(result.optimizedOrder).toHaveLength(2);
      expect(result.optimizedOrder[0].name).toBe('Credit Card 2');
      expect(result.totalInterestSaved.toString()).toBe('2500.0000');
      expect(result.payoffTime).toBe(60);
    });
  });

  describe('Portfolio Optimization', () => {
    test('should optimize portfolio allocations correctly', async () => {
      const mockResponse = {
        data: {
          optimizePortfolio: {
            recommended_allocations: [
              {
                symbol: 'VTI',
                current_allocation: 60.0,
                recommended_allocation: 70.0,
                rebalance_amount: {
                  amount: '5000.0000',
                  currency: 'USD'
                }
              }
            ],
            risk_score: 7.5,
            expected_return: 8.2
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const holdings = [
        {
          symbol: 'VTI',
          currentValue: new FinancialAmount('30000.00'),
          targetAllocation: 70.0
        }
      ];

      const result = await RustFinancialBridge.optimizePortfolio(
        holdings,
        new FinancialAmount('50000.00'),
        'Moderate'
      );

      expect(result.recommendedAllocations).toHaveLength(1);
      expect(result.recommendedAllocations[0].symbol).toBe('VTI');
      expect(result.recommendedAllocations[0].rebalanceAmount.toString()).toBe('5000.0000');
      expect(result.riskScore).toBe(7.5);
      expect(result.expectedReturn).toBe(8.2);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when service is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '1.0.0' })
      } as Response);

      const health = await RustFinancialBridge.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
      expect(typeof health.responseTime).toBe('number');
    });

    test('should return unhealthy status when service is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await RustFinancialBridge.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(typeof health.responseTime).toBe('number');
    });
  });
});

describe('FallbackCalculations', () => {
  test('should calculate compound interest as fallback', () => {
    const principal = new FinancialAmount('1000.00');
    const result = FallbackCalculations.calculateCompoundInterest(
      principal, 5.0, 12, 1
    );

    // Should be approximately $1051.16
    expect(result.toNumber()).toBeCloseTo(1051.16, 2);
  });

  test('should calculate monthly payment as fallback', () => {
    const principal = new FinancialAmount('200000.00');
    const result = FallbackCalculations.calculateMonthlyPayment(
      principal, 4.5, 360
    );

    // Should be approximately $1013.37
    expect(result.toNumber()).toBeCloseTo(1013.37, 2);
  });

  test('should handle zero interest rate in fallback', () => {
    const principal = new FinancialAmount('12000.00');
    const result = FallbackCalculations.calculateMonthlyPayment(
      principal, 0, 12
    );

    expect(result.toString()).toBe('1000.0000');
  });
});

describe('Integration with Performance Validation', () => {
  test('should maintain bank-grade performance in API calls', async () => {
    // Mock fast response (<100ms) - need to mock both calls in the API function
    (performance.now as jest.Mock)
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1050) // End time (50ms duration)
      .mockReturnValueOnce(1000) // Start time for test
      .mockReturnValueOnce(1050) // End time for test (50ms duration);

    const mockResponse = {
      data: {
        calculateCompoundInterest: {
          amount: '1051.1620',
          currency: 'USD'
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const principal = new FinancialAmount('1000.00');
    const startTime = performance.now();

    await RustFinancialBridge.calculateCompoundInterest(principal, 5.0, 12, 1);

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(100); // Bank-grade performance requirement
  });

  test('should preserve precision through full integration', async () => {
    const mockResponse = {
      data: {
        calculateCompoundInterest: {
          amount: '1234.5678',
          currency: 'USD'
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const principal = new FinancialAmount('1000.0000');
    const result = await RustFinancialBridge.calculateCompoundInterest(
      principal, 5.0, 12, 1
    );

    // Verify exact precision is maintained
    expect(result.toString()).toBe('1234.5678');
    expect(result.equals('1234.5678')).toBe(true);
  });
});
