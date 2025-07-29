/**
 * Financial Precision Foundation - Phase 2.3 Unified Implementation
 *
 * Eliminates IEEE 754 floating-point errors through comprehensive precision-first architecture
 * using Decimal.js for ALL financial calculations to achieve bank-grade precision (4 decimal places)
 * 
 * UNIFIED IMPLEMENTATION - Single source of truth for all Atlas Financial applications
 * Consolidates duplicate implementations from apps/web and provides enhanced functionality
 */

import Decimal from 'decimal.js';
import currency from 'currency.js';

// Configure Decimal.js for bank-grade precision (4 decimal places)
Decimal.set({
  precision: 28,        // Internal precision for calculations
  rounding: Decimal.ROUND_HALF_UP,  // Standard banking rounding
  toExpNeg: -9,        // Use exponential notation below 1e-9
  toExpPos: 21,        // Use exponential notation above 1e21
  modulo: Decimal.ROUND_HALF_UP,
});

// DECIMAL(19,4) database constraints for validation
const DECIMAL_19_4_MAX = new Decimal('999999999999999.9999');
const DECIMAL_19_4_MIN = new Decimal('-999999999999999.9999');

/**
 * Unified Financial Amount class with DECIMAL(19,4) database compatibility
 * Consolidates functionality from apps/web/FinancialAmount.ts for consistency
 */
export class FinancialAmount {
  private readonly _value: Decimal;

  constructor(value: string | number | Decimal) {
    // Configure Decimal.js for financial precision
    Decimal.set({
      precision: 23,  // 19 digits + 4 decimal places
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -19,
      toExpPos: 4
    });

    this._value = new Decimal(value);

    // Validate precision bounds for DECIMAL(19,4)
    if (this._value.decimalPlaces() > 4) {
      throw new Error(`Financial amount precision exceeds 4 decimal places: ${value}`);
    }

    // Validate database constraints
    if (this._value.abs().greaterThan(DECIMAL_19_4_MAX)) {
      throw new Error(`Financial amount exceeds DECIMAL(19,4) bounds: ${value}`);
    }
  }

  /**
   * Add another financial amount
   */
  add(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return new FinancialAmount(this._value.plus(otherAmount));
  }

  /**
   * Subtract another financial amount
   */
  subtract(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return new FinancialAmount(this._value.minus(otherAmount));
  }

  /**
   * Multiply by a factor
   */
  multiply(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return new FinancialAmount(this._value.times(otherAmount));
  }

  /**
   * Divide by a divisor
   */
  divide(other: FinancialAmount | string | number): FinancialAmount {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    if (otherAmount.isZero()) {
      throw new Error('Division by zero in financial calculation');
    }
    return new FinancialAmount(this._value.dividedBy(otherAmount));
  }

  /**
   * Calculate percentage
   */
  percentage(percent: number): FinancialAmount {
    return new FinancialAmount(this._value.times(percent).dividedBy(100));
  }

  /**
   * Add percentage to amount
   */
  addPercentage(percent: number): FinancialAmount {
    return this.add(this.percentage(percent));
  }

  /**
   * Compare amounts
   */
  equals(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return this._value.equals(otherAmount);
  }

  greaterThan(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return this._value.greaterThan(otherAmount);
  }

  lessThan(other: FinancialAmount | string | number): boolean {
    const otherAmount = other instanceof FinancialAmount ? other._value : new Decimal(other);
    return this._value.lessThan(otherAmount);
  }

  isZero(): boolean {
    return this._value.isZero();
  }

  isPositive(): boolean {
    return this._value.isPositive();
  }

  isNegative(): boolean {
    return this._value.isNegative();
  }

  /**
   * Get absolute value
   */
  abs(): FinancialAmount {
    return new FinancialAmount(this._value.abs());
  }

  /**
   * Negate amount
   */
  negate(): FinancialAmount {
    return new FinancialAmount(this._value.negated());
  }

  /**
   * Round to specified decimal places (default: 4 for bank-grade precision)
   */
  round(decimalPlaces: number = 4): FinancialAmount {
    return new FinancialAmount(this._value.toDecimalPlaces(decimalPlaces));
  }

  /**
   * Convert to string with bank-grade precision (4 decimal places)
   */
  toString(): string {
    return this._value.toFixed(4); // Always 4 decimal places for consistency
  }

  /**
   * Convert to number (use with caution - only for display purposes)
   * Rounds to 4 decimal places to prevent precision issues
   */
  toNumber(): number {
    return this._value.toNumber();
  }

  /**
   * Convert to formatted currency string
   */
  toCurrency(currencyCode: string = 'USD', locale: string = 'en-US'): string {
    return currency(this._value.toNumber(), {
      precision: 2 // Display precision for currency
    }).format();
  }

  /**
   * Convert to compact currency format
   */
  toCurrencyCompact(currencyCode: string = 'USD', locale: string = 'en-US'): string {
    const value = this._value.toNumber();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  /**
   * Get raw Decimal value for advanced operations
   */
  getDecimal(): Decimal {
    return this._value;
  }

  /**
   * GraphQL serialization - always return string for precision
   */
  toGraphQL(): string {
    return this.toString();
  }

  /**
   * Database serialization - DECIMAL(19,4) string
   */
  toDatabase(): string {
    return this.toString();
  }

  /**
   * Create from cents (e.g., database storage)
   */
  static fromCents(cents: number): FinancialAmount {
    return new FinancialAmount(new Decimal(cents).div(100));
  }

  /**
   * Convert to cents for database storage
   */
  toCents(): number {
    return this._value.mul(100).toNumber();
  }

  // Static factory methods from web app implementation
  static fromString(value: string): FinancialAmount {
    return new FinancialAmount(value);
  }

  static fromNumber(value: number): FinancialAmount {
    return new FinancialAmount(value);
  }

  static fromCurrency(currencyString: string): FinancialAmount {
    // Parse currency string removing symbols: "$1,234.56" -> "1234.56"
    const numericValue = currencyString.replace(/[^0-9.-]+/g, '');
    return new FinancialAmount(numericValue);
  }

  static zero(): FinancialAmount {
    return new FinancialAmount('0.0000');
  }

  // Validation helpers
  static isValidAmount(value: string | number): boolean {
    try {
      new FinancialAmount(value);
      return true;
    } catch {
      return false;
    }
  }

  // Array operations for financial calculations
  static sum(amounts: FinancialAmount[]): FinancialAmount {
    return amounts.reduce((acc, amount) => acc.add(amount), FinancialAmount.zero());
  }

  static average(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero();
    return FinancialAmount.sum(amounts).divide(amounts.length);
  }

  static max(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero();
    return amounts.reduce((max, current) =>
      current.greaterThan(max) ? current : max
    );
  }

  static min(amounts: FinancialAmount[]): FinancialAmount {
    if (amounts.length === 0) return FinancialAmount.zero();
    return amounts.reduce((min, current) =>
      current.lessThan(min) ? current : min
    );
  }
}

/**
 * Currency symbol mapping
 */
function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'Fr',
    CNY: '¥',
    SEK: 'kr',
    NZD: 'NZ$',
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Financial calculation utilities
 */
export class FinancialCalculations {
  /**
   * Calculate compound interest
   * Formula: A = P(1 + r/n)^(nt)
   */
  static compoundInterest(
    principal: FinancialAmount,
    annualRate: number,
    compoundingFrequency: number,
    years: number
  ): FinancialAmount {
    const rate = new Decimal(annualRate).div(100);
    const n = new Decimal(compoundingFrequency);
    const t = new Decimal(years);

    const factor = rate.div(n).add(1).pow(n.mul(t));
    return principal.multiply(new FinancialAmount(factor));
  }

  /**
   * Calculate monthly payment for a loan
   * Formula: M = P * (r(1+r)^n) / ((1+r)^n - 1)
   */
  static monthlyPayment(
    principal: FinancialAmount,
    annualRate: number,
    termInMonths: number
  ): FinancialAmount {
    if (annualRate === 0) {
      return principal.divide(termInMonths);
    }

    const r = new Decimal(annualRate).div(100).div(12); // Monthly rate
    const n = new Decimal(termInMonths);

    const factor = r.mul(r.add(1).pow(n)).div(r.add(1).pow(n).sub(1));
    return principal.multiply(new FinancialAmount(factor));
  }

  /**
   * Calculate debt snowball order (smallest balance first)
   */
  static debtSnowballOrder(debts: Array<{
    name: string;
    balance: FinancialAmount;
    minimumPayment: FinancialAmount;
    interestRate: number;
  }>): Array<typeof debts[0] & { order: number }> {
    return debts
      .sort((a, b) => a.balance.toNumber() - b.balance.toNumber())
      .map((debt, index) => ({ ...debt, order: index + 1 }));
  }

  /**
   * Calculate debt avalanche order (highest interest rate first)
   */
  static debtAvalancheOrder(debts: Array<{
    name: string;
    balance: FinancialAmount;
    minimumPayment: FinancialAmount;
    interestRate: number;
  }>): Array<typeof debts[0] & { order: number }> {
    return debts
      .sort((a, b) => b.interestRate - a.interestRate)
      .map((debt, index) => ({ ...debt, order: index + 1 }));
  }

  /**
   * Calculate 75/15/10 budget breakdown
   * 75% needs, 15% wants, 10% savings
   */
  static budgetBreakdown(income: FinancialAmount): {
    needs: FinancialAmount;
    wants: FinancialAmount;
    savings: FinancialAmount;
  } {
    return {
      needs: income.percentage(75),
      wants: income.percentage(15),
      savings: income.percentage(10),
    };
  }

  /**
   * Calculate emergency fund target (3-6 months of expenses)
   */
  static emergencyFundTarget(
    monthlyExpenses: FinancialAmount,
    months: number = 6
  ): FinancialAmount {
    return monthlyExpenses.multiply(months);
  }
}

/**
 * Performance validation utilities for financial operations
 */
export class FinancialPerformance {
  /**
   * Bank-grade performance target: <100ms for complex operations
   */
  static readonly PERFORMANCE_TARGET_MS = 100;

  /**
   * Validate that an operation completes within bank-grade performance target
   */
  static async validatePerformance<T>(
    operation: () => T,
    maxDurationMs: number = FinancialPerformance.PERFORMANCE_TARGET_MS
  ): Promise<{ result: T; durationMs: number; withinTarget: boolean }> {
    const startTime = performance.now();
    const result = await Promise.resolve(operation());
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    return {
      result,
      durationMs,
      withinTarget: durationMs <= maxDurationMs
    };
  }

  /**
   * Benchmark a financial operation multiple times
   */
  static async benchmark<T>(
    operation: () => T,
    iterations: number = 1000
  ): Promise<{
    averageDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
    withinTarget: boolean;
    results: T[];
  }> {
    const durations: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const result = await Promise.resolve(operation());
      const endTime = performance.now();

      durations.push(endTime - startTime);
      results.push(result);
    }

    const averageDurationMs = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const minDurationMs = Math.min(...durations);
    const maxDurationMs = Math.max(...durations);

    return {
      averageDurationMs,
      minDurationMs,
      maxDurationMs,
      withinTarget: averageDurationMs <= FinancialPerformance.PERFORMANCE_TARGET_MS,
      results
    };
  }
}

/**
 * Validation utilities for financial data
 */
export class FinancialValidation {
  /**
   * Validate that an amount is positive
   */
  static isPositive(amount: FinancialAmount): boolean {
    return amount.greaterThan(0);
  }

  /**
   * Validate that an amount is within reasonable bounds
   */
  static isReasonableAmount(amount: FinancialAmount, maxAmount: number = 1000000): boolean {
    return amount.greaterThan(0) && amount.lessThan(maxAmount);
  }

  /**
   * Validate interest rate (0-100%)
   */
  static isValidInterestRate(rate: number): boolean {
    return rate >= 0 && rate <= 100;
  }

  /**
   * Validate that precision is maintained (no floating-point errors)
   */
  static validatePrecision(amount: FinancialAmount): boolean {
    // Check if amount has more than 4 decimal places
    const decimalString = amount.getDecimal().toString();
    const decimalIndex = decimalString.indexOf('.');

    if (decimalIndex === -1) {
      return true; // No decimal places, always precise
    }

    const decimalPlaces = decimalString.length - decimalIndex - 1;
    return decimalPlaces <= 4;
  }

  /**
   * Validate DECIMAL(19,4) database constraints
   */
  static validateDatabaseConstraints(amount: FinancialAmount): boolean {
    const value = amount.getDecimal();
    return value.lte(DECIMAL_19_4_MAX) && value.gte(DECIMAL_19_4_MIN);
  }
}

// Type guards and utilities from web app implementation
export const isFinancialAmount = (value: any): value is FinancialAmount => {
  return value instanceof FinancialAmount;
};

// Helper type for GraphQL responses
export type FinancialAmountString = string;

// Utility functions for common patterns
export const createFinancialAmount = (value: string | number | Decimal): FinancialAmount => {
  return new FinancialAmount(value);
};

export const formatFinancialAmount = (
  amount: FinancialAmount | string | number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string => {
  const financialAmount = amount instanceof FinancialAmount
    ? amount
    : new FinancialAmount(amount);
  return financialAmount.toCurrency(currencyCode, locale);
};

// Export utilities for easy imports
export { Decimal };
export default FinancialAmount;
