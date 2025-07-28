/**
 * Financial Precision Foundation - Phase 1.5
 *
 * Eliminates IEEE 754 floating-point errors through comprehensive precision-first architecture
 * using Decimal.js for ALL financial calculations to achieve bank-grade precision (4 decimal places)
 */
import Decimal from 'decimal.js';
/**
 * Financial amount type that guarantees precision
 */
export declare class FinancialAmount {
    private readonly value;
    constructor(amount: string | number | Decimal);
    /**
     * Add another financial amount
     */
    add(other: FinancialAmount | string | number): FinancialAmount;
    /**
     * Subtract another financial amount
     */
    subtract(other: FinancialAmount | string | number): FinancialAmount;
    /**
     * Multiply by a factor
     */
    multiply(factor: FinancialAmount | string | number): FinancialAmount;
    /**
     * Divide by a divisor
     */
    divide(divisor: FinancialAmount | string | number): FinancialAmount;
    /**
     * Calculate percentage
     */
    percentage(percent: number): FinancialAmount;
    /**
     * Compare amounts
     */
    equals(other: FinancialAmount | string | number): boolean;
    greaterThan(other: FinancialAmount | string | number): boolean;
    lessThan(other: FinancialAmount | string | number): boolean;
    /**
     * Get absolute value
     */
    abs(): FinancialAmount;
    /**
     * Round to specified decimal places (default: 4 for bank-grade precision)
     */
    round(decimalPlaces?: number): FinancialAmount;
    /**
     * Convert to string with bank-grade precision (4 decimal places)
     */
    toString(): string;
    /**
     * Convert to number (use with caution - only for display purposes)
     * Rounds to 4 decimal places to prevent precision issues
     */
    toNumber(): number;
    /**
     * Convert to formatted currency string
     */
    toCurrency(currencyCode?: string): string;
    /**
     * Get raw Decimal value for advanced operations
     */
    getDecimal(): Decimal;
    /**
     * Create from cents (e.g., database storage)
     */
    static fromCents(cents: number): FinancialAmount;
    /**
     * Convert to cents for database storage
     */
    toCents(): number;
}
/**
 * Financial calculation utilities
 */
export declare class FinancialCalculations {
    /**
     * Calculate compound interest
     * Formula: A = P(1 + r/n)^(nt)
     */
    static compoundInterest(principal: FinancialAmount, annualRate: number, compoundingFrequency: number, years: number): FinancialAmount;
    /**
     * Calculate monthly payment for a loan
     * Formula: M = P * (r(1+r)^n) / ((1+r)^n - 1)
     */
    static monthlyPayment(principal: FinancialAmount, annualRate: number, termInMonths: number): FinancialAmount;
    /**
     * Calculate debt snowball order (smallest balance first)
     */
    static debtSnowballOrder(debts: Array<{
        name: string;
        balance: FinancialAmount;
        minimumPayment: FinancialAmount;
        interestRate: number;
    }>): Array<typeof debts[0] & {
        order: number;
    }>;
    /**
     * Calculate debt avalanche order (highest interest rate first)
     */
    static debtAvalancheOrder(debts: Array<{
        name: string;
        balance: FinancialAmount;
        minimumPayment: FinancialAmount;
        interestRate: number;
    }>): Array<typeof debts[0] & {
        order: number;
    }>;
    /**
     * Calculate 75/15/10 budget breakdown
     * 75% needs, 15% wants, 10% savings
     */
    static budgetBreakdown(income: FinancialAmount): {
        needs: FinancialAmount;
        wants: FinancialAmount;
        savings: FinancialAmount;
    };
    /**
     * Calculate emergency fund target (3-6 months of expenses)
     */
    static emergencyFundTarget(monthlyExpenses: FinancialAmount, months?: number): FinancialAmount;
}
/**
 * Performance validation utilities for financial operations
 */
export declare class FinancialPerformance {
    /**
     * Bank-grade performance target: <100ms for complex operations
     */
    static readonly PERFORMANCE_TARGET_MS = 100;
    /**
     * Validate that an operation completes within bank-grade performance target
     */
    static validatePerformance<T>(operation: () => T, maxDurationMs?: number): Promise<{
        result: T;
        durationMs: number;
        withinTarget: boolean;
    }>;
    /**
     * Benchmark a financial operation multiple times
     */
    static benchmark<T>(operation: () => T, iterations?: number): Promise<{
        averageDurationMs: number;
        minDurationMs: number;
        maxDurationMs: number;
        withinTarget: boolean;
        results: T[];
    }>;
}
/**
 * Validation utilities for financial data
 */
export declare class FinancialValidation {
    /**
     * Validate that an amount is positive
     */
    static isPositive(amount: FinancialAmount): boolean;
    /**
     * Validate that an amount is within reasonable bounds
     */
    static isReasonableAmount(amount: FinancialAmount, maxAmount?: number): boolean;
    /**
     * Validate interest rate (0-100%)
     */
    static isValidInterestRate(rate: number): boolean;
    /**
     * Validate that precision is maintained (no floating-point errors)
     */
    static validatePrecision(amount: FinancialAmount): boolean;
}
export { Decimal };
export default FinancialAmount;
//# sourceMappingURL=precision.d.ts.map
