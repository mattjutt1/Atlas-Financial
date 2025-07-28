/**
 * Unit Tests for Financial Precision Implementation
 *
 * Tests the FinancialAmount class and precision utilities:
 * - DECIMAL(19,4) precision validation
 * - Floating-point error elimination
 * - Currency formatting
 * - Arithmetic operations
 * - Boundary condition handling
 */

import { FinancialAmount } from '../lib/financial/FinancialAmount'

describe('FinancialAmount Class', () => {
  describe('Construction and Validation', () => {
    it('should create valid financial amounts', () => {
      expect(() => new FinancialAmount('125.67')).not.toThrow()
      expect(() => new FinancialAmount('0.0001')).not.toThrow()
      expect(() => new FinancialAmount('999999999999999.9999')).not.toThrow()
    })

    it('should reject invalid amounts', () => {
      expect(() => new FinancialAmount('invalid')).toThrow()
      expect(() => new FinancialAmount('999999999999999.99999')).toThrow() // Too many decimals
      expect(() => new FinancialAmount('9999999999999999.9999')).toThrow() // Exceeds bounds
    })

    it('should handle different input types', () => {
      const fromString = new FinancialAmount('125.67')
      const fromNumber = new FinancialAmount(125.67)

      expect(fromString.toString()).toBe('125.6700')
      expect(fromNumber.toString()).toBe('125.6700')
    })
  })

  describe('Arithmetic Operations', () => {
    it('should add amounts precisely', () => {
      const a = new FinancialAmount('0.1')
      const b = new FinancialAmount('0.2')
      const result = a.add(b)

      expect(result.toString()).toBe('0.3000')
      expect(result.toNumber()).toBe(0.3)
    })

    it('should subtract amounts precisely', () => {
      const a = new FinancialAmount('1.0')
      const b = new FinancialAmount('0.3')
      const result = a.subtract(b)

      expect(result.toString()).toBe('0.7000')
    })

    it('should multiply amounts precisely', () => {
      const price = new FinancialAmount('99.99')
      const quantity = new FinancialAmount('3')
      const result = price.multiply(quantity)

      expect(result.toString()).toBe('299.9700')
    })

    it('should divide amounts precisely', () => {
      const total = new FinancialAmount('100.00')
      const parts = new FinancialAmount('3')
      const result = total.divide(parts)

      expect(result.toString()).toBe('33.3333')
    })

    it('should handle division by zero', () => {
      const amount = new FinancialAmount('100.00')
      expect(() => amount.divide('0')).toThrow('Division by zero')
    })
  })

  describe('Percentage Calculations', () => {
    it('should calculate percentages correctly', () => {
      const amount = new FinancialAmount('100.00')
      const result = amount.percentage(15)

      expect(result.toString()).toBe('15.0000')
    })

    it('should add percentages correctly', () => {
      const amount = new FinancialAmount('100.00')
      const result = amount.addPercentage(8.875) // Tax calculation

      expect(result.toString()).toBe('108.8750')
    })
  })

  describe('Comparison Operations', () => {
    it('should compare amounts correctly', () => {
      const a = new FinancialAmount('125.67')
      const b = new FinancialAmount('125.67')
      const c = new FinancialAmount('125.68')

      expect(a.equals(b)).toBe(true)
      expect(a.equals(c)).toBe(false)
      expect(c.greaterThan(a)).toBe(true)
      expect(a.lessThan(c)).toBe(true)
    })

    it('should handle zero comparisons', () => {
      const zero = FinancialAmount.zero()
      const positive = new FinancialAmount('1.00')
      const negative = new FinancialAmount('-1.00')

      expect(zero.isZero()).toBe(true)
      expect(positive.isPositive()).toBe(true)
      expect(negative.isNegative()).toBe(true)
    })
  })

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      const amount = new FinancialAmount('1234.56')
      const formatted = amount.toCurrency()

      expect(formatted).toContain('$1,234.56')
    })

    it('should format compact currency', () => {
      const amount = new FinancialAmount('1234567.89')
      const formatted = amount.toCurrencyCompact()

      expect(formatted).toContain('$1.2M')
    })
  })

  describe('Static Factory Methods', () => {
    it('should create amounts from various sources', () => {
      const fromString = FinancialAmount.fromString('125.67')
      const fromNumber = FinancialAmount.fromNumber(125.67)
      const fromCurrency = FinancialAmount.fromCurrency('$125.67')
      const zero = FinancialAmount.zero()

      expect(fromString.toString()).toBe('125.6700')
      expect(fromNumber.toString()).toBe('125.6700')
      expect(fromCurrency.toString()).toBe('125.6700')
      expect(zero.toString()).toBe('0.0000')
    })
  })

  describe('Array Operations', () => {
    const amounts = [
      new FinancialAmount('100.00'),
      new FinancialAmount('200.00'),
      new FinancialAmount('300.00')
    ]

    it('should calculate sum correctly', () => {
      const sum = FinancialAmount.sum(amounts)
      expect(sum.toString()).toBe('600.0000')
    })

    it('should calculate average correctly', () => {
      const average = FinancialAmount.average(amounts)
      expect(average.toString()).toBe('200.0000')
    })

    it('should find maximum correctly', () => {
      const max = FinancialAmount.max(amounts)
      expect(max.toString()).toBe('300.0000')
    })

    it('should find minimum correctly', () => {
      const min = FinancialAmount.min(amounts)
      expect(min.toString()).toBe('100.0000')
    })

    it('should handle empty arrays', () => {
      const emptySum = FinancialAmount.sum([])
      const emptyAverage = FinancialAmount.average([])

      expect(emptySum.toString()).toBe('0.0000')
      expect(emptyAverage.toString()).toBe('0.0000')
    })
  })

  describe('Floating-Point Error Elimination', () => {
    it('should eliminate classic floating-point errors', () => {
      // Classic JavaScript floating-point error
      const jsResult = 0.1 + 0.2
      expect(jsResult).not.toBe(0.3) // JavaScript fails this test
      expect(jsResult).toBe(0.30000000000000004)

      // FinancialAmount eliminates the error
      const preciseResult = new FinancialAmount('0.1').add('0.2')
      expect(preciseResult.toString()).toBe('0.3000')
      expect(preciseResult.toNumber()).toBe(0.3)
    })

    it('should handle complex calculations precisely', () => {
      // Complex calculation that would have precision issues in JavaScript
      const price = new FinancialAmount('99.99')
      const quantity = new FinancialAmount('3')
      const taxRate = new FinancialAmount('0.08875')

      const subtotal = price.multiply(quantity)
      const tax = subtotal.multiply(taxRate)
      const total = subtotal.add(tax)

      expect(subtotal.toString()).toBe('299.9700')
      expect(tax.toString()).toBe('26.6223')
      expect(total.toString()).toBe('326.5923')
    })

    it('should maintain precision in repeated operations', () => {
      let amount = new FinancialAmount('0.1')

      // Add 0.1 ten times (should equal 1.0)
      for (let i = 0; i < 9; i++) {
        amount = amount.add('0.1')
      }

      expect(amount.toString()).toBe('1.0000')
      expect(amount.equals('1.0')).toBe(true)
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle maximum DECIMAL(19,4) value', () => {
      const maxValue = new FinancialAmount('999999999999999.9999')
      expect(maxValue.toString()).toBe('999999999999999.9999')
    })

    it('should handle minimum precision', () => {
      const minPrecision = new FinancialAmount('0.0001')
      expect(minPrecision.toString()).toBe('0.0001')
    })

    it('should handle negative values', () => {
      const negative = new FinancialAmount('-125.67')
      expect(negative.toString()).toBe('-125.6700')
      expect(negative.isNegative()).toBe(true)

      const positive = negative.abs()
      expect(positive.toString()).toBe('125.6700')
      expect(positive.isPositive()).toBe(true)
    })
  })

  describe('Integration with GraphQL', () => {
    it('should serialize for GraphQL correctly', () => {
      const amount = new FinancialAmount('125.67')
      const graphqlValue = amount.toGraphQL()

      expect(graphqlValue).toBe('125.6700')
      expect(typeof graphqlValue).toBe('string')
    })

    it('should serialize for database correctly', () => {
      const amount = new FinancialAmount('125.67')
      const dbValue = amount.toDatabase()

      expect(dbValue).toBe('125.6700')
      expect(typeof dbValue).toBe('string')
    })
  })

  describe('Utility Functions', () => {
    it('should validate amounts correctly', () => {
      expect(FinancialAmount.isValidAmount('125.67')).toBe(true)
      expect(FinancialAmount.isValidAmount('invalid')).toBe(false)
      expect(FinancialAmount.isValidAmount('999999999999999.99999')).toBe(false)
    })
  })
})

// Additional integration tests for ML categorization scenario
describe('ML Transaction Categorization Integration', () => {
  it('should handle transaction amounts with ML confidence scores', () => {
    const transactionAmount = new FinancialAmount('125.67')
    const confidence = 0.92

    // Simulate ML categorization scenario
    const categoryTotal = new FinancialAmount('500.00')
    const updatedTotal = categoryTotal.add(transactionAmount)

    expect(updatedTotal.toString()).toBe('625.6700')
    expect(confidence).toBeGreaterThan(0.9) // High confidence threshold
  })

  it('should aggregate transactions by category precisely', () => {
    const transactions = [
      { amount: new FinancialAmount('125.67'), category: 'Food' },
      { amount: new FinancialAmount('89.43'), category: 'Food' },
      { amount: new FinancialAmount('200.00'), category: 'Transportation' }
    ]

    const categoryTotals = new Map<string, FinancialAmount>()

    transactions.forEach(({ amount, category }) => {
      const currentTotal = categoryTotals.get(category) || FinancialAmount.zero()
      categoryTotals.set(category, currentTotal.add(amount))
    })

    expect(categoryTotals.get('Food')?.toString()).toBe('215.1000')
    expect(categoryTotals.get('Transportation')?.toString()).toBe('200.0000')
  })
})

export { }
