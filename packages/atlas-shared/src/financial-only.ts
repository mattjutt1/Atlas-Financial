/**
 * Financial-only export for Atlas Financial apps
 * Temporary solution to bypass build issues while maintaining functionality
 */

// Re-export financial precision
export {
  FinancialAmount,
  FinancialCalculations,
  FinancialValidation,
  FinancialPerformance,
  Decimal,
  isFinancialAmount,
  createFinancialAmount,
  formatFinancialAmount
} from './financial/precision'

// Re-export currency utilities
export {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyPrecise,
  parseCurrencyAmount,
  getCurrencySymbol,
  getCurrencyName,
  isValidCurrencyCode,
  createMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  compareMoney,
  isEqualMoney,
  adjustMoneyPrecision,
  formatMoney,
  calculatePercentage,
  roundMoney,
  absoluteMoney,
  negateMoney,
  isPositiveMoney,
  isNegativeMoney,
  isZeroMoney,
  sumMoney,
  minMoney,
  maxMoney,
  averageMoney,
  CURRENCY_INFO,
  getCurrencyInfo
} from './utils/currency'

// Re-export date utilities
export {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isToday,
  isThisWeek,
  isThisMonth
} from './utils/date'

// Helper type for GraphQL responses
export type FinancialAmountString = string

// Library version
export const ATLAS_SHARED_VERSION = '1.0.0'
