import { Decimal } from 'decimal.js'
import currency from 'currency.js'

/**
 * FinancialAmount - Bank-grade financial precision class
 *
 * Provides DECIMAL(19,4) precision for all financial calculations,
 * eliminating IEEE 754 floating-point errors completely.
 *
 * Usage:
 * - All financial data should flow through this class
 * - Database stores values as DECIMAL(19,4)
 * - GraphQL returns string values for precision preservation
 * - UI displays formatted currency values
 */
export class FinancialAmount {
  private readonly _value: Decimal

  constructor(value: string | number | Decimal) {
    // Configure Decimal.js for financial precision
    Decimal.set({
      precision: 23,  // 19 digits + 4 decimal places
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -19,
      toExpPos: 4
    })

    this._value = new Decimal(value)

    // Validate precision bounds for DECIMAL(19,4)
    if (this._value.decimalPlaces() > 4) {
      throw new Error(`Financial amount precision exceeds 4 decimal places: ${value}`)
    }

    const maxValue = new Decimal('999999999999999.9999') // DECIMAL(19,4) max
    if (this._value.abs().greaterThan(maxValue)) {
      throw new Error(`Financial amount exceeds DECIMAL(19,4) bounds: ${value}`)
    }
  }

  // Core arithmetic operations
  add(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return new FinancialAmount(this._value.plus(otherAmount))
  }

  subtract(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return new FinancialAmount(this._value.minus(otherAmount))
  }

  multiply(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return new FinancialAmount(this._value.times(otherAmount))
  }

  divide(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    if (otherAmount.isZero()) {
      throw new Error('Division by zero in financial calculation')
    }
    return new FinancialAmount(this._value.dividedBy(otherAmount))
  }

  // Percentage calculations
  percentage(percent: number): FinancialAmount {
    return new FinancialAmount(this._value.times(percent).dividedBy(100))
  }

  addPercentage(percent: number): FinancialAmount {
    return this.add(this.percentage(percent))
  }

  // Comparison operations
  equals(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return this._value.equals(otherAmount)
  }

  greaterThan(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return this._value.greaterThan(otherAmount)
  }

  lessThan(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other)
    return this._value.lessThan(otherAmount)
  }

  isZero(): boolean {
    return this._value.isZero()
  }

  isPositive(): boolean {
    return this._value.isPositive()
  }

  isNegative(): boolean {
    return this._value.isNegative()
  }

  // Utility methods
  abs(): FinancialAmount {
    return new FinancialAmount(this._value.abs())
  }

  negate(): FinancialAmount {
    return new FinancialAmount(this._value.negated())
  }

  // Output formats
  toString(): string {
    return this._value.toFixed(4) // Always 4 decimal places for consistency
  }

  toNumber(): number {
    return this._value.toNumber()
  }

  toCurrency(currencyCode: string = 'USD', locale: string = 'en-US'): string {
    return currency(this._value.toNumber(), {
      precision: 2 // Display precision for currency
    }).format()
  }

  toCurrencyCompact(currencyCode: string = 'USD', locale: string = 'en-US'): string {
    const value = this._value.toNumber()
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  // GraphQL serialization - always return string for precision
  toGraphQL(): string {
    return this.toString()
  }

  // Database serialization - DECIMAL(19,4) string
  toDatabase(): string {
    return this.toString()
  }

  // Static factory methods
  static fromString(value: string): FinancialAmount {
    return new FinancialAmount(value)
  }

  static fromNumber(value: number): FinancialAmount {
    return new FinancialAmount(value)
  }

  static fromCurrency(currencyString: string): FinancialAmount {
    // Parse currency string removing symbols: "$1,234.56" -> "1234.56"
    const numericValue = currencyString.replace(/[^0-9.-]+/g, '')
    return new FinancialAmount(numericValue)
  }

  static zero(): FinancialAmount {
    return new FinancialAmount('0.0000')
  }

  // Validation helpers
  static isValidAmount(value: string | number): boolean {
    try {
      new FinancialAmount(value)
      return true
    } catch {
      return false
    }
  }

  // Array operations for financial calculations
  static sum(amounts: FinancialAmount[]): FinancialAmount {
    return amounts.reduce((acc, amount) => acc.add(amount), FinancialAmount.zero())
  }

  static average(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero()
    return FinancialAmount.sum(amounts).divide(amounts.length)
  }

  static max(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero()
    return amounts.reduce((max, current) =>
      current.greaterThan(max) ? current : max
    )
  }

  static min(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero()
    return amounts.reduce((min, current) =>
      current.lessThan(min) ? current : min
    )
  }
}

// Type guards for TypeScript
export const isFinancialAmount = (value: any): value is FinancialAmount => {
  return value instanceof FinancialAmount
}

// Helper type for GraphQL responses
export type FinancialAmountString = string

// Utility functions for common patterns
export const createFinancialAmount = (value: string | number | Decimal): FinancialAmount => {
  return new FinancialAmount(value)
}

export const formatFinancialAmount = (
  amount: FinancialAmount | string | number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string => {
  const financialAmount = amount instanceof FinancialAmount
    ? amount
    : new FinancialAmount(amount)
  return financialAmount.toCurrency(currencyCode, locale)
}
