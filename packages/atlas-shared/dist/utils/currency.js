/**
 * Consolidated Currency Utilities for Atlas Financial
 * Eliminates duplicate currency formatting and calculation patterns
 */
/**
 * Format currency amount with proper localization
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(amount);
    }
    catch (error) {
        // Fallback for invalid currency codes
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
};
/**
 * Format currency in compact notation (e.g., $1.2K, $1.5M)
 */
export const formatCurrencyCompact = (amount, currency = 'USD', locale = 'en-US') => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(amount);
    }
    catch (error) {
        // Fallback for invalid currency codes
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(amount);
    }
};
/**
 * Format currency with custom precision
 */
export const formatCurrencyPrecise = (amount, currency = 'USD', locale = 'en-US', decimalPlaces = 2) => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(amount);
    }
    catch (error) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(amount);
    }
};
/**
 * Parse currency string to number
 */
export const parseCurrencyAmount = (currencyString) => {
    if (!currencyString || typeof currencyString !== 'string') {
        return 0;
    }
    // Remove all non-numeric characters except decimal point and minus sign
    const cleaned = currencyString.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};
/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currency = 'USD', locale = 'en-US') => {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).formatToParts(0).find(part => part.type === 'currency')?.value || '$';
    }
    catch (error) {
        return '$'; // Default fallback
    }
};
/**
 * Get currency name for a given currency code
 */
export const getCurrencyName = (currency = 'USD', locale = 'en-US') => {
    try {
        return new Intl.DisplayNames([locale], { type: 'currency' }).of(currency) || currency;
    }
    catch (error) {
        return currency;
    }
};
/**
 * Validate currency code format (ISO 4217)
 */
export const isValidCurrencyCode = (currency) => {
    if (!currency || typeof currency !== 'string') {
        return false;
    }
    // Check if it's a 3-letter currency code
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(currency.toUpperCase());
};
/**
 * Create Money object with validation
 */
export const createMoney = (amount, currency = 'USD', precision) => {
    if (!isValidCurrencyCode(currency)) {
        throw new Error(`Invalid currency code: ${currency}`);
    }
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error(`Invalid amount: ${amount}`);
    }
    return {
        amount: Number(amount.toFixed(precision || 2)),
        currency: currency.toUpperCase(),
        precision: precision || 2
    };
};
/**
 * Add two Money amounts (must be same currency)
 */
export const addMoney = (money1, money2) => {
    if (money1.currency !== money2.currency) {
        throw new Error(`Currency mismatch: ${money1.currency} vs ${money2.currency}`);
    }
    const precision = Math.max(money1.precision || 2, money2.precision || 2);
    const result = money1.amount + money2.amount;
    return createMoney(result, money1.currency, precision);
};
/**
 * Subtract two Money amounts (must be same currency)
 */
export const subtractMoney = (money1, money2) => {
    if (money1.currency !== money2.currency) {
        throw new Error(`Currency mismatch: ${money1.currency} vs ${money2.currency}`);
    }
    const precision = Math.max(money1.precision || 2, money2.precision || 2);
    const result = money1.amount - money2.amount;
    return createMoney(result, money1.currency, precision);
};
/**
 * Multiply Money by a factor
 */
export const multiplyMoney = (money, factor) => {
    if (typeof factor !== 'number' || isNaN(factor)) {
        throw new Error(`Invalid factor: ${factor}`);
    }
    const result = money.amount * factor;
    return createMoney(result, money.currency, money.precision);
};
/**
 * Divide Money by a factor
 */
export const divideMoney = (money, divisor) => {
    if (typeof divisor !== 'number' || isNaN(divisor) || divisor === 0) {
        throw new Error(`Invalid divisor: ${divisor}`);
    }
    const result = money.amount / divisor;
    return createMoney(result, money.currency, money.precision);
};
/**
 * Compare two Money amounts
 */
export const compareMoney = (money1, money2) => {
    if (money1.currency !== money2.currency) {
        throw new Error(`Currency mismatch: ${money1.currency} vs ${money2.currency}`);
    }
    if (money1.amount > money2.amount)
        return 1;
    if (money1.amount < money2.amount)
        return -1;
    return 0;
};
/**
 * Check if two Money amounts are equal
 */
export const isEqualMoney = (money1, money2) => {
    return money1.currency === money2.currency &&
        Math.abs(money1.amount - money2.amount) < 0.001; // Account for floating point precision
};
/**
 * Convert Money to different precision
 */
export const adjustMoneyPrecision = (money, newPrecision) => {
    return createMoney(money.amount, money.currency, newPrecision);
};
/**
 * Format Money object to string
 */
export const formatMoney = (money, locale = 'en-US') => {
    return formatCurrencyPrecise(money.amount, money.currency, locale, money.precision);
};
/**
 * Calculate percentage of Money amount
 */
export const calculatePercentage = (money, percentage) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) {
        throw new Error(`Invalid percentage: ${percentage}`);
    }
    return multiplyMoney(money, percentage / 100);
};
/**
 * Round Money to nearest cent (or currency unit)
 */
export const roundMoney = (money) => {
    const multiplier = Math.pow(10, money.precision || 2);
    const rounded = Math.round(money.amount * multiplier) / multiplier;
    return createMoney(rounded, money.currency, money.precision);
};
/**
 * Get absolute value of Money
 */
export const absoluteMoney = (money) => {
    return createMoney(Math.abs(money.amount), money.currency, money.precision);
};
/**
 * Negate Money amount
 */
export const negateMoney = (money) => {
    return createMoney(-money.amount, money.currency, money.precision);
};
/**
 * Check if Money amount is positive
 */
export const isPositiveMoney = (money) => {
    return money.amount > 0;
};
/**
 * Check if Money amount is negative
 */
export const isNegativeMoney = (money) => {
    return money.amount < 0;
};
/**
 * Check if Money amount is zero
 */
export const isZeroMoney = (money) => {
    return Math.abs(money.amount) < Math.pow(10, -(money.precision || 2));
};
/**
 * Sum array of Money amounts (must all be same currency)
 */
export const sumMoney = (moneyArray) => {
    if (moneyArray.length === 0) {
        throw new Error('Cannot sum empty array of Money');
    }
    const currency = moneyArray[0].currency;
    const precision = Math.max(...moneyArray.map(m => m.precision || 2));
    // Validate all currencies match
    for (const money of moneyArray) {
        if (money.currency !== currency) {
            throw new Error(`Currency mismatch in array: expected ${currency}, got ${money.currency}`);
        }
    }
    const total = moneyArray.reduce((sum, money) => sum + money.amount, 0);
    return createMoney(total, currency, precision);
};
/**
 * Find minimum Money amount in array
 */
export const minMoney = (moneyArray) => {
    if (moneyArray.length === 0) {
        throw new Error('Cannot find min of empty array');
    }
    return moneyArray.reduce((min, current) => compareMoney(current, min) < 0 ? current : min);
};
/**
 * Find maximum Money amount in array
 */
export const maxMoney = (moneyArray) => {
    if (moneyArray.length === 0) {
        throw new Error('Cannot find max of empty array');
    }
    return moneyArray.reduce((max, current) => compareMoney(current, max) > 0 ? current : max);
};
/**
 * Calculate average of Money amounts
 */
export const averageMoney = (moneyArray) => {
    if (moneyArray.length === 0) {
        throw new Error('Cannot calculate average of empty array');
    }
    const total = sumMoney(moneyArray);
    return divideMoney(total, moneyArray.length);
};
/**
 * Common currency codes and their properties
 */
export const CURRENCY_INFO = {
    USD: { name: 'US Dollar', symbol: '$', decimals: 2 },
    EUR: { name: 'Euro', symbol: '€', decimals: 2 },
    GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
    JPY: { name: 'Japanese Yen', symbol: '¥', decimals: 0 },
    CAD: { name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
    AUD: { name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
    CHF: { name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
    CNY: { name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
    INR: { name: 'Indian Rupee', symbol: '₹', decimals: 2 },
    BTC: { name: 'Bitcoin', symbol: '₿', decimals: 8 },
    ETH: { name: 'Ethereum', symbol: 'Ξ', decimals: 18 }
};
/**
 * Get currency info by code
 */
export const getCurrencyInfo = (currency) => {
    return CURRENCY_INFO[currency.toUpperCase()] || {
        name: currency,
        symbol: currency,
        decimals: 2
    };
};
//# sourceMappingURL=currency.js.map
