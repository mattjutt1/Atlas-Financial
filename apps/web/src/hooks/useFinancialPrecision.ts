'use client'

import { useSubscription } from '@apollo/client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { SUBSCRIBE_FINANCIAL_PRECISION_UPDATES } from '@/lib/graphql/subscriptions'
import { Transaction, Account } from '@/types/graphql'
import { FinancialAmount, createFinancialAmount, formatFinancialAmount } from '@/lib/financial/FinancialAmount'

interface UseFinancialPrecisionOptions {
  userId: number
  enableRealtime?: boolean
  precision?: 'decimal' | 'legacy' | 'both'
  currencyCode?: string
  locale?: string
}

interface FinancialPrecisionState {
  transactions: Transaction[]
  accounts: Account[]
  totalPrecisionTransactions: number
  legacyTransactions: number
  conversionProgress: number
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  lastUpdate: Date | null
  precisionStats: PrecisionStats
}

interface PrecisionStats {
  decimalTransactions: number
  legacyTransactions: number
  conversionPercentage: number
  averageAmount: FinancialAmount
  totalAmount: FinancialAmount
  largestAmount: FinancialAmount
  smallestAmount: FinancialAmount
  precisionGains: number // Number of calculations that benefited from precision
}

interface FinancialPrecisionActions {
  convertToDecimal: (transactionIds: number[]) => Promise<void>
  validatePrecision: (amount: string | number) => boolean
  formatAmount: (amount: string | number, compact?: boolean) => string
  createPreciseAmount: (amount: string | number) => FinancialAmount
  calculateSum: (transactions: Transaction[]) => FinancialAmount
  calculateAverage: (transactions: Transaction[]) => FinancialAmount
  compareAmounts: (amount1: string | number, amount2: string | number) => number
}

/**
 * Financial Precision Real-time Hook
 *
 * Manages DECIMAL(19,4) precision for financial calculations with:
 * - Real-time subscription to precision updates
 * - Bank-grade financial arithmetic operations
 * - Legacy to decimal conversion tracking
 * - Precision validation and error handling
 * - Performance metrics and statistics
 */
export function useFinancialPrecision(
  options: UseFinancialPrecisionOptions
): FinancialPrecisionState & FinancialPrecisionActions {
  const {
    userId,
    enableRealtime = true,
    precision = 'decimal',
    currencyCode = 'USD',
    locale = 'en-US'
  } = options

  // Local state for precision tracking
  const [state, setState] = useState<FinancialPrecisionState>({
    transactions: [],
    accounts: [],
    totalPrecisionTransactions: 0,
    legacyTransactions: 0,
    conversionProgress: 0,
    isLoading: true,
    isConnected: false,
    error: null,
    lastUpdate: null,
    precisionStats: {
      decimalTransactions: 0,
      legacyTransactions: 0,
      conversionPercentage: 0,
      averageAmount: FinancialAmount.zero(),
      totalAmount: FinancialAmount.zero(),
      largestAmount: FinancialAmount.zero(),
      smallestAmount: FinancialAmount.zero(),
      precisionGains: 0
    }
  })

  // Real-time subscription for financial precision updates
  const {
    data: precisionData,
    loading: precisionLoading,
    error: precisionError
  } = useSubscription(SUBSCRIBE_FINANCIAL_PRECISION_UPDATES, {
    variables: { userId },
    skip: !enableRealtime,
    errorPolicy: 'all',
    onError: (error) => {
      console.error('Financial precision subscription error:', error)
      setState(prev => ({ ...prev, error, isConnected: false }))
    },
    onData: ({ data }) => {
      if (data.data?.subscribeFinancialPrecisionUpdates) {
        const transactions = data.data.subscribeFinancialPrecisionUpdates

        // Process transactions and update state
        setState(prev => {
          const newStats = calculatePrecisionStats(transactions)
          const accounts = extractAccountsFromTransactions(transactions)

          return {
            ...prev,
            transactions,
            accounts,
            totalPrecisionTransactions: transactions.length,
            legacyTransactions: transactions.filter((t: Transaction) => t.amount_precision === 'legacy').length,
            conversionProgress: newStats.conversionPercentage,
            precisionStats: newStats,
            isConnected: true,
            lastUpdate: new Date(),
            error: null
          }
        })
      }
    }
  })

  // Helper function to calculate precision statistics
  const calculatePrecisionStats = useCallback((transactions: Transaction[]): PrecisionStats => {
    if (transactions.length === 0) {
      return {
        decimalTransactions: 0,
        legacyTransactions: 0,
        conversionPercentage: 0,
        averageAmount: FinancialAmount.zero(),
        totalAmount: FinancialAmount.zero(),
        largestAmount: FinancialAmount.zero(),
        smallestAmount: FinancialAmount.zero(),
        precisionGains: 0
      }
    }

    const decimalTransactions = transactions.filter(t => t.amount_precision === 'decimal').length
    const legacyTransactions = transactions.filter(t => t.amount_precision === 'legacy').length
    const conversionPercentage = (decimalTransactions / transactions.length) * 100

    // Calculate amounts using FinancialAmount for precision
    const amounts = transactions.map(t => createFinancialAmount(t.amount))
    const totalAmount = FinancialAmount.sum(amounts)
    const averageAmount = FinancialAmount.average(amounts)
    const largestAmount = FinancialAmount.max(amounts)
    const smallestAmount = FinancialAmount.min(amounts)

    // Estimate precision gains (transactions that would have floating-point errors)
    const precisionGains = transactions.filter(t => {
      const amount = parseFloat(t.amount)
      return amount !== Math.round(amount * 10000) / 10000 // Would have precision issues
    }).length

    return {
      decimalTransactions,
      legacyTransactions,
      conversionPercentage,
      averageAmount,
      totalAmount,
      largestAmount,
      smallestAmount,
      precisionGains
    }
  }, [])

  // Helper function to extract unique accounts from transactions
  const extractAccountsFromTransactions = useCallback((transactions: Transaction[]): Account[] => {
    const accountMap = new Map<number, Account>()

    transactions.forEach(transaction => {
      if (transaction.account && !accountMap.has(transaction.account.id)) {
        accountMap.set(transaction.account.id, transaction.account)
      }
    })

    return Array.from(accountMap.values())
  }, [])

  // Update loading state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: precisionLoading,
      error: precisionError || null,
      isConnected: !precisionError && enableRealtime
    }))
  }, [precisionLoading, precisionError, enableRealtime])

  // Action: Convert transactions to decimal precision
  const convertToDecimal = useCallback(async (transactionIds: number[]) => {
    try {
      // TODO: Implement mutation to convert transactions to decimal precision
      console.log(`Converting ${transactionIds.length} transactions to decimal precision`)

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t =>
          transactionIds.includes(t.id)
            ? { ...t, amount_precision: 'decimal' as const }
            : t
        )
      }))
    } catch (error) {
      console.error('Error converting to decimal precision:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Action: Validate precision for financial amounts
  const validatePrecision = useCallback((amount: string | number): boolean => {
    try {
      return FinancialAmount.isValidAmount(amount)
    } catch {
      return false
    }
  }, [])

  // Action: Format amount with precision and currency
  const formatAmount = useCallback((amount: string | number, compact: boolean = false): string => {
    try {
      return formatFinancialAmount(amount, currencyCode, locale)
    } catch (error) {
      console.error('Error formatting amount:', error)
      return 'Invalid Amount'
    }
  }, [currencyCode, locale])

  // Action: Create precise financial amount
  const createPreciseAmount = useCallback((amount: string | number): FinancialAmount => {
    return createFinancialAmount(amount)
  }, [])

  // Action: Calculate sum of transaction amounts
  const calculateSum = useCallback((transactions: Transaction[]): FinancialAmount => {
    const amounts = transactions.map(t => createFinancialAmount(t.amount))
    return FinancialAmount.sum(amounts)
  }, [])

  // Action: Calculate average of transaction amounts
  const calculateAverage = useCallback((transactions: Transaction[]): FinancialAmount => {
    const amounts = transactions.map(t => createFinancialAmount(t.amount))
    return FinancialAmount.average(amounts)
  }, [])

  // Action: Compare two amounts precisely
  const compareAmounts = useCallback((amount1: string | number, amount2: string | number): number => {
    const amt1 = createFinancialAmount(amount1)
    const amt2 = createFinancialAmount(amount2)

    if (amt1.equals(amt2)) return 0
    return amt1.greaterThan(amt2) ? 1 : -1
  }, [])

  // Memoized precision insights
  const precisionInsights = useMemo(() => {
    const { precisionStats } = state

    return {
      isFullyConverted: precisionStats.conversionPercentage === 100,
      hasLegacyTransactions: precisionStats.legacyTransactions > 0,
      precisionBenefit: precisionStats.precisionGains > 0,
      conversionRecommendation: precisionStats.legacyTransactions > 0 ?
        `Convert ${precisionStats.legacyTransactions} legacy transactions for full precision` :
        'All transactions use decimal precision',
      totalValue: precisionStats.totalAmount.toCurrency(currencyCode, locale),
      averageValue: precisionStats.averageAmount.toCurrency(currencyCode, locale),
      precisionScore: Math.round(precisionStats.conversionPercentage)
    }
  }, [state.precisionStats, currencyCode, locale])

  // Performance tracking
  const performanceMetrics = useMemo(() => {
    return {
      totalTransactions: state.transactions.length,
      decimalTransactions: state.precisionStats.decimalTransactions,
      legacyTransactions: state.precisionStats.legacyTransactions,
      conversionProgress: state.precisionStats.conversionPercentage,
      precisionGains: state.precisionStats.precisionGains,
      memoryEfficiency: state.transactions.length > 0 ?
        (state.precisionStats.decimalTransactions / state.transactions.length) * 100 : 0,
      calculationAccuracy: 100 - (state.precisionStats.precisionGains * 2) // Estimated accuracy improvement
    }
  }, [state])

  return {
    // State
    ...state,

    // Actions
    convertToDecimal,
    validatePrecision,
    formatAmount,
    createPreciseAmount,
    calculateSum,
    calculateAverage,
    compareAmounts,

    // Additional insights and utilities
    precisionInsights,
    performanceMetrics
  } as FinancialPrecisionState & FinancialPrecisionActions & {
    precisionInsights: {
      isFullyConverted: boolean
      hasLegacyTransactions: boolean
      precisionBenefit: boolean
      conversionRecommendation: string
      totalValue: string
      averageValue: string
      precisionScore: number
    }
    performanceMetrics: {
      totalTransactions: number
      decimalTransactions: number
      legacyTransactions: number
      conversionProgress: number
      precisionGains: number
      memoryEfficiency: number
      calculationAccuracy: number
    }
  }
}
