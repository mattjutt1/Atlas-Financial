/**
 * Consolidated Currency Utilities for Atlas Financial
 * Eliminates duplicate currency formatting and calculation patterns
 */
import type { Money } from '../types';
/**
 * Format currency amount with proper localization
 */
export declare const formatCurrency: (amount: number, currency?: string, locale?: string) => string;
/**
 * Format currency in compact notation (e.g., $1.2K, $1.5M)
 */
export declare const formatCurrencyCompact: (amount: number, currency?: string, locale?: string) => string;
/**
 * Format currency with custom precision
 */
export declare const formatCurrencyPrecise: (amount: number, currency?: string, locale?: string, decimalPlaces?: number) => string;
/**
 * Parse currency string to number
 */
export declare const parseCurrencyAmount: (currencyString: string) => number;
/**
 * Get currency symbol for a given currency code
 */
export declare const getCurrencySymbol: (currency?: string, locale?: string) => string;
/**
 * Get currency name for a given currency code
 */
export declare const getCurrencyName: (currency?: string, locale?: string) => string;
/**
 * Validate currency code format (ISO 4217)
 */
export declare const isValidCurrencyCode: (currency: string) => boolean;
/**
 * Create Money object with validation
 */
export declare const createMoney: (amount: number, currency?: string, precision?: number) => Money;
/**
 * Add two Money amounts (must be same currency)
 */
export declare const addMoney: (money1: Money, money2: Money) => Money;
/**
 * Subtract two Money amounts (must be same currency)
 */
export declare const subtractMoney: (money1: Money, money2: Money) => Money;
/**
 * Multiply Money by a factor
 */
export declare const multiplyMoney: (money: Money, factor: number) => Money;
/**
 * Divide Money by a factor
 */
export declare const divideMoney: (money: Money, divisor: number) => Money;
/**
 * Compare two Money amounts
 */
export declare const compareMoney: (money1: Money, money2: Money) => number;
/**
 * Check if two Money amounts are equal
 */
export declare const isEqualMoney: (money1: Money, money2: Money) => boolean;
/**
 * Convert Money to different precision
 */
export declare const adjustMoneyPrecision: (money: Money, newPrecision: number) => Money;
/**
 * Format Money object to string
 */
export declare const formatMoney: (money: Money, locale?: string) => string;
/**
 * Calculate percentage of Money amount
 */
export declare const calculatePercentage: (money: Money, percentage: number) => Money;
/**
 * Round Money to nearest cent (or currency unit)
 */
export declare const roundMoney: (money: Money) => Money;
/**
 * Get absolute value of Money
 */
export declare const absoluteMoney: (money: Money) => Money;
/**
 * Negate Money amount
 */
export declare const negateMoney: (money: Money) => Money;
/**
 * Check if Money amount is positive
 */
export declare const isPositiveMoney: (money: Money) => boolean;
/**
 * Check if Money amount is negative
 */
export declare const isNegativeMoney: (money: Money) => boolean;
/**
 * Check if Money amount is zero
 */
export declare const isZeroMoney: (money: Money) => boolean;
/**
 * Sum array of Money amounts (must all be same currency)
 */
export declare const sumMoney: (moneyArray: Money[]) => Money;
/**
 * Find minimum Money amount in array
 */
export declare const minMoney: (moneyArray: Money[]) => Money;
/**
 * Find maximum Money amount in array
 */
export declare const maxMoney: (moneyArray: Money[]) => Money;
/**
 * Calculate average of Money amounts
 */
export declare const averageMoney: (moneyArray: Money[]) => Money;
/**
 * Common currency codes and their properties
 */
export declare const CURRENCY_INFO: {
    readonly USD: {
        readonly name: "US Dollar";
        readonly symbol: "$";
        readonly decimals: 2;
    };
    readonly EUR: {
        readonly name: "Euro";
        readonly symbol: "€";
        readonly decimals: 2;
    };
    readonly GBP: {
        readonly name: "British Pound";
        readonly symbol: "£";
        readonly decimals: 2;
    };
    readonly JPY: {
        readonly name: "Japanese Yen";
        readonly symbol: "¥";
        readonly decimals: 0;
    };
    readonly CAD: {
        readonly name: "Canadian Dollar";
        readonly symbol: "C$";
        readonly decimals: 2;
    };
    readonly AUD: {
        readonly name: "Australian Dollar";
        readonly symbol: "A$";
        readonly decimals: 2;
    };
    readonly CHF: {
        readonly name: "Swiss Franc";
        readonly symbol: "CHF";
        readonly decimals: 2;
    };
    readonly CNY: {
        readonly name: "Chinese Yuan";
        readonly symbol: "¥";
        readonly decimals: 2;
    };
    readonly INR: {
        readonly name: "Indian Rupee";
        readonly symbol: "₹";
        readonly decimals: 2;
    };
    readonly BTC: {
        readonly name: "Bitcoin";
        readonly symbol: "₿";
        readonly decimals: 8;
    };
    readonly ETH: {
        readonly name: "Ethereum";
        readonly symbol: "Ξ";
        readonly decimals: 18;
    };
};
/**
 * Get currency info by code
 */
export declare const getCurrencyInfo: (currency: string) => {
    readonly name: "US Dollar";
    readonly symbol: "$";
    readonly decimals: 2;
} | {
    readonly name: "Euro";
    readonly symbol: "€";
    readonly decimals: 2;
} | {
    readonly name: "British Pound";
    readonly symbol: "£";
    readonly decimals: 2;
} | {
    readonly name: "Japanese Yen";
    readonly symbol: "¥";
    readonly decimals: 0;
} | {
    readonly name: "Canadian Dollar";
    readonly symbol: "C$";
    readonly decimals: 2;
} | {
    readonly name: "Australian Dollar";
    readonly symbol: "A$";
    readonly decimals: 2;
} | {
    readonly name: "Swiss Franc";
    readonly symbol: "CHF";
    readonly decimals: 2;
} | {
    readonly name: "Chinese Yuan";
    readonly symbol: "¥";
    readonly decimals: 2;
} | {
    readonly name: "Indian Rupee";
    readonly symbol: "₹";
    readonly decimals: 2;
} | {
    readonly name: "Bitcoin";
    readonly symbol: "₿";
    readonly decimals: 8;
} | {
    readonly name: "Ethereum";
    readonly symbol: "Ξ";
    readonly decimals: 18;
};
//# sourceMappingURL=currency.d.ts.map
