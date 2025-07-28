/**
 * Financial Precision Foundation - Phase 1.5
 *
 * Eliminates IEEE 754 floating-point errors through comprehensive precision-first architecture
 * using Decimal.js for ALL financial calculations to achieve bank-grade precision (4 decimal places)
 */
import Decimal from 'decimal.js';
import currency from 'currency.js';
// Configure Decimal.js for bank-grade precision (4 decimal places)
Decimal.set({
    precision: 28, // Internal precision for calculations
    rounding: Decimal.ROUND_HALF_UP, // Standard banking rounding
    toExpNeg: -9, // Use exponential notation below 1e-9
    toExpPos: 21, // Use exponential notation above 1e21
    modulo: Decimal.ROUND_HALF_UP,
});
/**
 * Financial amount type that guarantees precision
 */
export class FinancialAmount {
    constructor(amount) {
        this.value = new Decimal(amount);
    }
    /**
     * Add another financial amount
     */
    add(other) {
        const otherValue = other instanceof FinancialAmount ? other.value : new Decimal(other);
        return new FinancialAmount(this.value.add(otherValue));
    }
    /**
     * Subtract another financial amount
     */
    subtract(other) {
        const otherValue = other instanceof FinancialAmount ? other.value : new Decimal(other);
        return new FinancialAmount(this.value.sub(otherValue));
    }
    /**
     * Multiply by a factor
     */
    multiply(factor) {
        const factorValue = factor instanceof FinancialAmount ? factor.value : new Decimal(factor);
        return new FinancialAmount(this.value.mul(factorValue));
    }
    /**
     * Divide by a divisor
     */
    divide(divisor) {
        const divisorValue = divisor instanceof FinancialAmount ? divisor.value : new Decimal(divisor);
        return new FinancialAmount(this.value.div(divisorValue));
    }
    /**
     * Calculate percentage
     */
    percentage(percent) {
        return this.multiply(new Decimal(percent).div(100));
    }
    /**
     * Compare amounts
     */
    equals(other) {
        const otherValue = other instanceof FinancialAmount ? other.value : new Decimal(other);
        return this.value.equals(otherValue);
    }
    greaterThan(other) {
        const otherValue = other instanceof FinancialAmount ? other.value : new Decimal(other);
        return this.value.greaterThan(otherValue);
    }
    lessThan(other) {
        const otherValue = other instanceof FinancialAmount ? other.value : new Decimal(other);
        return this.value.lessThan(otherValue);
    }
    /**
     * Get absolute value
     */
    abs() {
        return new FinancialAmount(this.value.abs());
    }
    /**
     * Round to specified decimal places (default: 4 for bank-grade precision)
     */
    round(decimalPlaces = 4) {
        return new FinancialAmount(this.value.toDecimalPlaces(decimalPlaces));
    }
    /**
     * Convert to string with bank-grade precision (4 decimal places)
     */
    toString() {
        return this.value.toFixed(4);
    }
    /**
     * Convert to number (use with caution - only for display purposes)
     * Rounds to 4 decimal places to prevent precision issues
     */
    toNumber() {
        return this.value.toDecimalPlaces(4).toNumber();
    }
    /**
     * Convert to formatted currency string
     */
    toCurrency(currencyCode = 'USD') {
        return currency(this.toNumber(), {
            symbol: getCurrencySymbol(currencyCode),
            precision: 2,
        }).format();
    }
    /**
     * Get raw Decimal value for advanced operations
     */
    getDecimal() {
        return this.value;
    }
    /**
     * Create from cents (e.g., database storage)
     */
    static fromCents(cents) {
        return new FinancialAmount(new Decimal(cents).div(100));
    }
    /**
     * Convert to cents for database storage
     */
    toCents() {
        return this.value.mul(100).toNumber();
    }
}
/**
 * Currency symbol mapping
 */
function getCurrencySymbol(currencyCode) {
    const symbols = {
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
    static compoundInterest(principal, annualRate, compoundingFrequency, years) {
        const rate = new Decimal(annualRate).div(100);
        const n = new Decimal(compoundingFrequency);
        const t = new Decimal(years);
        const factor = rate.div(n).add(1).pow(n.mul(t));
        return principal.multiply(factor);
    }
    /**
     * Calculate monthly payment for a loan
     * Formula: M = P * (r(1+r)^n) / ((1+r)^n - 1)
     */
    static monthlyPayment(principal, annualRate, termInMonths) {
        if (annualRate === 0) {
            return principal.divide(termInMonths);
        }
        const r = new Decimal(annualRate).div(100).div(12); // Monthly rate
        const n = new Decimal(termInMonths);
        const factor = r.mul(r.add(1).pow(n)).div(r.add(1).pow(n).sub(1));
        return principal.multiply(factor);
    }
    /**
     * Calculate debt snowball order (smallest balance first)
     */
    static debtSnowballOrder(debts) {
        return debts
            .sort((a, b) => a.balance.toNumber() - b.balance.toNumber())
            .map((debt, index) => ({ ...debt, order: index + 1 }));
    }
    /**
     * Calculate debt avalanche order (highest interest rate first)
     */
    static debtAvalancheOrder(debts) {
        return debts
            .sort((a, b) => b.interestRate - a.interestRate)
            .map((debt, index) => ({ ...debt, order: index + 1 }));
    }
    /**
     * Calculate 75/15/10 budget breakdown
     * 75% needs, 15% wants, 10% savings
     */
    static budgetBreakdown(income) {
        return {
            needs: income.percentage(75),
            wants: income.percentage(15),
            savings: income.percentage(10),
        };
    }
    /**
     * Calculate emergency fund target (3-6 months of expenses)
     */
    static emergencyFundTarget(monthlyExpenses, months = 6) {
        return monthlyExpenses.multiply(months);
    }
}
/**
 * Performance validation utilities for financial operations
 */
export class FinancialPerformance {
    /**
     * Validate that an operation completes within bank-grade performance target
     */
    static async validatePerformance(operation, maxDurationMs = FinancialPerformance.PERFORMANCE_TARGET_MS) {
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
    static async benchmark(operation, iterations = 1000) {
        const durations = [];
        const results = [];
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
 * Bank-grade performance target: <100ms for complex operations
 */
FinancialPerformance.PERFORMANCE_TARGET_MS = 100;
/**
 * Validation utilities for financial data
 */
export class FinancialValidation {
    /**
     * Validate that an amount is positive
     */
    static isPositive(amount) {
        return amount.greaterThan(0);
    }
    /**
     * Validate that an amount is within reasonable bounds
     */
    static isReasonableAmount(amount, maxAmount = 1000000) {
        return amount.greaterThan(0) && amount.lessThan(maxAmount);
    }
    /**
     * Validate interest rate (0-100%)
     */
    static isValidInterestRate(rate) {
        return rate >= 0 && rate <= 100;
    }
    /**
     * Validate that precision is maintained (no floating-point errors)
     */
    static validatePrecision(amount) {
        // Check if amount has more than 4 decimal places
        const decimalString = amount.getDecimal().toString();
        const decimalIndex = decimalString.indexOf('.');
        if (decimalIndex === -1) {
            return true; // No decimal places, always precise
        }
        const decimalPlaces = decimalString.length - decimalIndex - 1;
        return decimalPlaces <= 4;
    }
}
// Export utilities for easy imports
export { Decimal };
export default FinancialAmount;
//# sourceMappingURL=precision.js.map
