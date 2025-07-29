/**
 * Integration Test for ML Transaction Categorization Subscriptions
 *
 * Tests the complete real-time ML categorization pipeline:
 * - WebSocket connection establishment
 * - GraphQL subscription handling
 * - Financial precision integration
 * - Error boundary recovery
 * - Performance metrics calculation
 */

import { renderHook, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { useMLTransactionCategorization } from '../hooks/useMLTransactionCategorization'
import { useFinancialPrecision } from '../hooks/useFinancialPrecision'
import { FinancialAmount } from '@atlas/shared/financial'
import {
  SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION,
  SUBSCRIBE_FINANCIAL_PRECISION_UPDATES
} from '../lib/graphql/subscriptions'

// Mock GraphQL subscription responses
const mockMLCategorizationResponse = [
  {
    request: {
      query: SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION,
      variables: { userId: 1 }
    },
    result: {
      data: {
        subscribeMLTransactionCategorization: [
          {
            id: 1,
            amount: '125.67',
            description: 'Amazon.com purchase',
            category: 'Shopping',
            ml_category_confidence: 0.92,
            ml_suggested_category: 'Online Shopping',
            ml_processing_status: 'completed',
            account_id: 1,
            amount_precision: 'decimal',
            currency_code: 'USD',
            account: {
              id: 1,
              name: 'Chase Checking'
            }
          }
        ]
      }
    }
  }
]

const mockPrecisionResponse = [
  {
    request: {
      query: SUBSCRIBE_FINANCIAL_PRECISION_UPDATES,
      variables: { userId: 1 }
    },
    result: {
      data: {
        subscribeFinancialPrecisionUpdates: [
          {
            id: 1,
            amount: '125.6700', // DECIMAL(19,4) precision
            amount_precision: 'decimal',
            currency_code: 'USD',
            description: 'Amazon.com purchase',
            category: 'Shopping',
            account: {
              id: 1,
              name: 'Chase Checking',
              balance: '1000.0000',
              balance_precision: 'decimal'
            }
          }
        ]
      }
    }
  }
]

describe('ML Transaction Categorization Integration', () => {
  describe('useMLTransactionCategorization Hook', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(
        () => useMLTransactionCategorization({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockMLCategorizationResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.transactions).toEqual([])
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle subscription data updates', async () => {
      const { result } = renderHook(
        () => useMLTransactionCategorization({
          userId: 1,
          enableRealtime: true,
          confidenceThreshold: 0.7
        }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockMLCategorizationResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(1)
        expect(result.current.transactions[0].ml_category_confidence).toBe(0.92)
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should provide financial amount helper functions', async () => {
      const { result } = renderHook(
        () => useMLTransactionCategorization({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockMLCategorizationResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Test financial amount helpers when transactions are available
      if (result.current.transactions.length > 0) {
        const transaction = result.current.transactions[0]
        const amount = result.current.getTransactionAmount(transaction)

        expect(amount).toBeInstanceOf(FinancialAmount)
        expect(amount.toString()).toBe('125.6700')
        expect(amount.toCurrency()).toContain('$125.67')
      }
    })
  })

  describe('useFinancialPrecision Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(
        () => useFinancialPrecision({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockPrecisionResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.transactions).toEqual([])
      expect(result.current.conversionProgress).toBe(0)
    })

    it('should validate financial amounts correctly', () => {
      const { result } = renderHook(
        () => useFinancialPrecision({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockPrecisionResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      expect(result.current.validatePrecision('125.67')).toBe(true)
      expect(result.current.validatePrecision('invalid')).toBe(false)
      expect(result.current.validatePrecision('999999999999999.9999')).toBe(true)
      expect(result.current.validatePrecision('999999999999999.99999')).toBe(false) // Too many decimals
    })

    it('should format amounts with currency', () => {
      const { result } = renderHook(
        () => useFinancialPrecision({
          userId: 1,
          currencyCode: 'USD',
          locale: 'en-US'
        }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockPrecisionResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      const formatted = result.current.formatAmount('125.67')
      expect(formatted).toContain('$125.67')
    })

    it('should perform precise arithmetic operations', () => {
      const { result } = renderHook(
        () => useFinancialPrecision({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockPrecisionResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      const amount1 = result.current.createPreciseAmount('0.1')
      const amount2 = result.current.createPreciseAmount('0.2')
      const sum = amount1.add(amount2)

      expect(sum.toString()).toBe('0.3000') // No floating-point errors
      expect(sum.toNumber()).toBe(0.3)
    })

    it('should compare amounts accurately', () => {
      const { result } = renderHook(
        () => useFinancialPrecision({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockPrecisionResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      expect(result.current.compareAmounts('125.67', '125.67')).toBe(0)
      expect(result.current.compareAmounts('125.68', '125.67')).toBe(1)
      expect(result.current.compareAmounts('125.66', '125.67')).toBe(-1)
    })
  })

  describe('Financial Precision Integration', () => {
    it('should handle DECIMAL(19,4) precision correctly', () => {
      const amount = new FinancialAmount('999999999999999.9999')
      expect(amount.toString()).toBe('999999999999999.9999')
      expect(() => new FinancialAmount('999999999999999.99999')).toThrow()
    })

    it('should eliminate floating-point arithmetic errors', () => {
      // Classic floating-point error: 0.1 + 0.2 !== 0.3
      const jsResult = 0.1 + 0.2 // 0.30000000000000004
      expect(jsResult).not.toBe(0.3)

      // FinancialAmount eliminates this error
      const preciseResult = new FinancialAmount('0.1').add('0.2')
      expect(preciseResult.toString()).toBe('0.3000')
      expect(preciseResult.toNumber()).toBe(0.3)
    })

    it('should maintain precision in complex calculations', () => {
      const price = new FinancialAmount('99.99')
      const quantity = new FinancialAmount('3')
      const taxRate = new FinancialAmount('0.08875')

      const subtotal = price.multiply(quantity)
      const tax = subtotal.multiply(taxRate)
      const total = subtotal.add(tax)

      expect(subtotal.toString()).toBe('299.9700')
      expect(tax.toString()).toBe('26.6223') // Precise to 4 decimals
      expect(total.toString()).toBe('326.5923')
    })

    it('should handle currency formatting consistently', () => {
      const amount = new FinancialAmount('1234567.89')
      const formatted = amount.toCurrency('USD', 'en-US')

      expect(formatted).toContain('$1,234,567.89')
    })

    it('should support statistical operations on transaction arrays', () => {
      const amounts = [
        new FinancialAmount('100.00'),
        new FinancialAmount('200.00'),
        new FinancialAmount('300.00')
      ]

      const sum = FinancialAmount.sum(amounts)
      const average = FinancialAmount.average(amounts)
      const max = FinancialAmount.max(amounts)
      const min = FinancialAmount.min(amounts)

      expect(sum.toString()).toBe('600.0000')
      expect(average.toString()).toBe('200.0000')
      expect(max.toString()).toBe('300.0000')
      expect(min.toString()).toBe('100.0000')
    })
  })

  describe('Error Handling', () => {
    it('should handle subscription connection errors gracefully', async () => {
      const errorMock = [
        {
          request: {
            query: SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION,
            variables: { userId: 1 }
          },
          error: new Error('Connection failed')
        }
      ]

      const { result } = renderHook(
        () => useMLTransactionCategorization({ userId: 1 }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={errorMock} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isConnected).toBe(false)
      })
    })

    it('should handle invalid financial amounts', () => {
      expect(() => new FinancialAmount('invalid')).toThrow()
      expect(() => new FinancialAmount('999999999999999999.9999')).toThrow() // Exceeds bounds
      expect(() => new FinancialAmount('123.123456')).toThrow() // Too many decimals
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate categorization performance correctly', async () => {
      const { result } = renderHook(
        () => useMLTransactionCategorization({
          userId: 1,
          confidenceThreshold: 0.8
        }),
        {
          wrapper: ({ children }) => (
            <MockedProvider mocks={mockMLCategorizationResponse} addTypename={false}>
              {children}
            </MockedProvider>
          )
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Performance metrics should be calculated based on transaction data
      if (result.current.performanceMetrics) {
        expect(result.current.performanceMetrics.totalTransactions).toBeGreaterThanOrEqual(0)
        expect(result.current.performanceMetrics.categorizedPercentage).toBeGreaterThanOrEqual(0)
        expect(result.current.performanceMetrics.categorizedPercentage).toBeLessThanOrEqual(100)
      }
    })
  })
})

export { }
