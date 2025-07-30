/**
 * Rust Financial Engine Bridge - Phase 1.5
 *
 * This module provides seamless integration between TypeScript FinancialAmount
 * and Rust Financial Engine's Money type, ensuring precision is maintained
 * across the boundary between JavaScript and Rust.
 */

import { FinancialAmount, Decimal } from './precision';

/**
 * Supported currencies matching the Rust Financial Engine enum
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  JPY = 'JPY',
  CHF = 'CHF',
  CNY = 'CNY'
}

/**
 * Rust Money type representation for API calls
 */
export interface RustMoney {
  amount: string; // Decimal as string to preserve precision
  currency: Currency;
}

/**
 * Rust Rate type representation
 */
export interface RustRate {
  percentage: string; // Decimal as string
  period: 'Annual' | 'Monthly' | 'Daily';
}

/**
 * Rust calculation request/response types
 */
export interface CompoundInterestRequest {
  principal: RustMoney;
  annual_rate: string; // Decimal as string
  compounding_frequency: number;
  years: number;
}

export interface MonthlyPaymentRequest {
  principal: RustMoney;
  annual_rate: string;
  term_months: number;
}

export interface DebtInfo {
  name: string;
  balance: RustMoney;
  minimum_payment: RustMoney;
  interest_rate: string; // Decimal as string
}

export interface DebtOptimizationRequest {
  debts: DebtInfo[];
  extra_payment: RustMoney;
  strategy: 'Snowball' | 'Avalanche';
}

/**
 * Bridge class for converting between TypeScript and Rust types
 */
export class RustFinancialBridge {
  private static readonly API_BASE_URL = process.env.RUST_FINANCIAL_API_URL || 'http://localhost:8080/graphql';

  /**
   * Convert FinancialAmount to RustMoney for API calls
   */
  static toRustMoney(amount: FinancialAmount, currency: Currency = Currency.USD): RustMoney {
    // Use toString() to maintain exact precision
    return {
      amount: amount.getDecimal().toString(),
      currency
    };
  }

  /**
   * Convert RustMoney to FinancialAmount from API responses
   */
  static fromRustMoney(rustMoney: RustMoney): FinancialAmount {
    // Create from string to maintain precision
    return new FinancialAmount(rustMoney.amount);
  }

  /**
   * Convert interest rate percentage to Rust format
   */
  static toRustRate(rate: number, period: 'Annual' | 'Monthly' | 'Daily' = 'Annual'): RustRate {
    return {
      percentage: new Decimal(rate).toString(),
      period
    };
  }

  /**
   * Call Rust Financial Engine for compound interest calculation
   */
  static async calculateCompoundInterest(
    principal: FinancialAmount,
    annualRate: number,
    compoundingFrequency: number,
    years: number,
    currency: Currency = Currency.USD
  ): Promise<FinancialAmount> {
    const request: CompoundInterestRequest = {
      principal: this.toRustMoney(principal, currency),
      annual_rate: new Decimal(annualRate).toString(),
      compounding_frequency: compoundingFrequency,
      years
    };

    const response = await this.callRustAPI('calculateCompoundInterest', request);
    return this.fromRustMoney(response);
  }

  /**
   * Call Rust Financial Engine for monthly payment calculation
   */
  static async calculateMonthlyPayment(
    principal: FinancialAmount,
    annualRate: number,
    termMonths: number,
    currency: Currency = Currency.USD
  ): Promise<FinancialAmount> {
    const request: MonthlyPaymentRequest = {
      principal: this.toRustMoney(principal, currency),
      annual_rate: new Decimal(annualRate).toString(),
      term_months: termMonths
    };

    const response = await this.callRustAPI('calculateMonthlyPayment', request);
    return this.fromRustMoney(response);
  }

  /**
   * Call Rust Financial Engine for debt optimization
   */
  static async optimizeDebtPayment(
    debts: Array<{
      name: string;
      balance: FinancialAmount;
      minimumPayment: FinancialAmount;
      interestRate: number;
    }>,
    extraPayment: FinancialAmount,
    strategy: 'Snowball' | 'Avalanche',
    currency: Currency = Currency.USD
  ): Promise<{
    optimizedOrder: Array<{ name: string; order: number; monthsToPayoff: number }>;
    totalInterestSaved: FinancialAmount;
    payoffTime: number;
  }> {
    const request: DebtOptimizationRequest = {
      debts: debts.map(debt => ({
        name: debt.name,
        balance: this.toRustMoney(debt.balance, currency),
        minimum_payment: this.toRustMoney(debt.minimumPayment, currency),
        interest_rate: new Decimal(debt.interestRate).toString()
      })),
      extra_payment: this.toRustMoney(extraPayment, currency),
      strategy
    };

    const response = await this.callRustAPI('optimizeDebtPayment', request);

    return {
      optimizedOrder: response.optimized_order,
      totalInterestSaved: this.fromRustMoney(response.total_interest_saved),
      payoffTime: response.payoff_time
    };
  }

  /**
   * Call Rust Financial Engine for portfolio optimization
   */
  static async optimizePortfolio(
    holdings: Array<{
      symbol: string;
      currentValue: FinancialAmount;
      targetAllocation: number;
    }>,
    totalValue: FinancialAmount,
    riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive',
    currency: Currency = Currency.USD
  ): Promise<{
    recommendedAllocations: Array<{
      symbol: string;
      currentAllocation: number;
      recommendedAllocation: number;
      rebalanceAmount: FinancialAmount;
    }>;
    riskScore: number;
    expectedReturn: number;
  }> {
    const request = {
      holdings: holdings.map(holding => ({
        symbol: holding.symbol,
        current_value: this.toRustMoney(holding.currentValue, currency),
        target_allocation: new Decimal(holding.targetAllocation).toString()
      })),
      total_value: this.toRustMoney(totalValue, currency),
      risk_tolerance: riskTolerance
    };

    const response = await this.callRustAPI('optimizePortfolio', request);

    return {
      recommendedAllocations: response.recommended_allocations.map((allocation: any) => ({
        symbol: allocation.symbol,
        currentAllocation: allocation.current_allocation,
        recommendedAllocation: allocation.recommended_allocation,
        rebalanceAmount: this.fromRustMoney(allocation.rebalance_amount)
      })),
      riskScore: response.risk_score,
      expectedReturn: response.expected_return
    };
  }

  /**
   * Generic method to call Rust Financial Engine API
   */
  private static async callRustAPI(operation: string, variables: any): Promise<any> {
    const startTime = performance.now();

    try {
      const graphqlQuery = this.buildGraphQLQuery(operation, variables);

      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add authentication headers as needed
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      const duration = performance.now() - startTime;

      // Log performance for monitoring
      if (duration > 100) { // Bank-grade performance threshold
        console.warn(`Rust API call ${operation} took ${duration.toFixed(2)}ms (>100ms threshold)`);
      }

      return result.data[operation];

    } catch (error) {
      console.error(`Rust Financial Engine API call failed for ${operation}:`, error);
      throw new Error(`Financial calculation service unavailable: ${error}`);
    }
  }

  /**
   * Build GraphQL query string for the operation
   */
  private static buildGraphQLQuery(operation: string, variables: any): string {
    switch (operation) {
      case 'calculateCompoundInterest':
        return `
          query CalculateCompoundInterest($principal: MoneyInput!, $annual_rate: String!, $compounding_frequency: Int!, $years: Int!) {
            calculateCompoundInterest(principal: $principal, annualRate: $annual_rate, compoundingFrequency: $compounding_frequency, years: $years) {
              amount
              currency
            }
          }
        `;

      case 'calculateMonthlyPayment':
        return `
          query CalculateMonthlyPayment($principal: MoneyInput!, $annual_rate: String!, $term_months: Int!) {
            calculateMonthlyPayment(principal: $principal, annualRate: $annual_rate, termMonths: $term_months) {
              amount
              currency
            }
          }
        `;

      case 'optimizeDebtPayment':
        return `
          query OptimizeDebtPayment($debts: [DebtInput!]!, $extra_payment: MoneyInput!, $strategy: DebtStrategy!) {
            optimizeDebtPayment(debts: $debts, extraPayment: $extra_payment, strategy: $strategy) {
              optimized_order {
                name
                order
                months_to_payoff
              }
              total_interest_saved {
                amount
                currency
              }
              payoff_time
            }
          }
        `;

      case 'optimizePortfolio':
        return `
          query OptimizePortfolio($holdings: [HoldingInput!]!, $total_value: MoneyInput!, $risk_tolerance: RiskLevel!) {
            optimizePortfolio(holdings: $holdings, totalValue: $total_value, riskTolerance: $risk_tolerance) {
              recommended_allocations {
                symbol
                current_allocation
                recommended_allocation
                rebalance_amount {
                  amount
                  currency
                }
              }
              risk_score
              expected_return
            }
          }
        `;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Health check for Rust Financial Engine
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    version?: string;
  }> {
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.API_BASE_URL.replace('/graphql', '/health')}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = performance.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          responseTime,
          version: data.version
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime
        };
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime
      };
    }
  }
}

/**
 * Fallback implementations when Rust engine is unavailable
 * These use the TypeScript FinancialCalculations for reliability
 */
export class FallbackCalculations {
  /**
   * Fallback compound interest calculation using TypeScript implementation
   */
  static calculateCompoundInterest(
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
   * Fallback monthly payment calculation using TypeScript implementation
   */
  static calculateMonthlyPayment(
    principal: FinancialAmount,
    annualRate: number,
    termInMonths: number
  ): FinancialAmount {
    if (annualRate === 0) {
      return principal.divide(termInMonths);
    }

    const r = new Decimal(annualRate).div(100).div(12);
    const n = new Decimal(termInMonths);

    const factor = r.mul(r.add(1).pow(n)).div(r.add(1).pow(n).sub(1));
    return principal.multiply(new FinancialAmount(factor));
  }
}

// Types are already exported as interfaces above
