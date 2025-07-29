/**
 * Financial Precision Foundation - Phase 1.5
 *
 * This module provides bank-grade financial precision through Decimal.js integration,
 * eliminating IEEE 754 floating-point errors and ensuring DECIMAL(19,4) database compatibility.
 *
 * Key Features:
 * - 100% elimination of floating-point errors
 * - Bank-grade precision (4 decimal places)
 * - <100ms performance guarantee
 * - DECIMAL(19,4) database compatibility
 * - Comprehensive validation and testing
 */

// Core financial precision classes
export { default as FinancialAmount } from './precision';
export {
  FinancialCalculations,
  FinancialValidation,
  FinancialPerformance
} from './precision';

// Type definitions for financial operations
export interface FinancialConfig {
  precision: number;
  rounding: number;
  performanceTargetMs: number;
}

export interface DebtInfo {
  name: string;
  balance: import('./precision').default;
  minimumPayment: import('./precision').default;
  interestRate: number;
}

export interface BudgetBreakdown {
  needs: import('./precision').default;
  wants: import('./precision').default;
  savings: import('./precision').default;
}

export interface PerformanceResult<T> {
  result: T;
  durationMs: number;
  withinTarget: boolean;
}

export interface BenchmarkResult<T> {
  averageDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  withinTarget: boolean;
  results: T[];
}

// Financial operation utilities
export const FINANCIAL_CONSTANTS = {
  DECIMAL_PRECISION: 4,
  PERFORMANCE_TARGET_MS: 100,
  MAX_SAFE_VALUE: '999999999999999.9999',
  MIN_SAFE_VALUE: '-999999999999999.9999'
} as const;

// Database integration helpers
export const DatabaseHelpers = {
  /**
   * Format financial amount for DECIMAL(19,4) database storage
   */
  formatForDatabase(amount: import('./precision').default): string {
    return amount.toString();
  },

  /**
   * Parse financial amount from database DECIMAL(19,4) value
   */
  parseFromDatabase(value: string | number): import('./precision').default {
    const FinancialAmount = require('./precision').default;
    return new FinancialAmount(value.toString());
  },

  /**
   * Validate that amount fits in DECIMAL(19,4) constraints
   */
  validateDatabaseConstraints(amount: import('./precision').default): boolean {
    const { Decimal } = require('./precision');
    const value = amount.getDecimal();
    const maxValue = new Decimal(FINANCIAL_CONSTANTS.MAX_SAFE_VALUE);
    const minValue = new Decimal(FINANCIAL_CONSTANTS.MIN_SAFE_VALUE);

    return value.lte(maxValue) && value.gte(minValue);
  }
} as const;

// Rust Financial Engine Integration
export {
  RustFinancialBridge,
  FallbackCalculations,
  Currency
} from './rust-bridge';

export type {
  RustMoney,
  RustRate,
  CompoundInterestRequest,
  MonthlyPaymentRequest,
  DebtOptimizationRequest
} from './rust-bridge';

// Re-export Decimal for direct use when needed
export { Decimal } from './precision';
