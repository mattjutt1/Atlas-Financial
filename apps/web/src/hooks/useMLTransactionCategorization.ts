'use client'

import { useSubscription, useQuery, useMutation } from '@apollo/client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION,
  SUBSCRIBE_ML_CATEGORY_SUGGESTIONS,
  SUBSCRIBE_ML_PROCESSING_STATUS,
  SUBSCRIBE_ML_CATEGORY_INSIGHTS,
  SUBSCRIBE_ML_MODEL_METRICS
} from '@/lib/graphql/subscriptions'
import {
  Transaction,
  MLCategorySuggestion,
  MLProcessingJob,
  MLCategoryInsight,
  MLModelMetrics
} from '@/types/graphql'
import { FinancialAmount } from '@/lib/financial/FinancialAmount'

interface UseMLTransactionCategorizationOptions {
  userId: number
  transactionId?: number
  enableRealtime?: boolean
  confidenceThreshold?: number
  maxSuggestions?: number
}

interface MLCategorizationState {
  transactions: Transaction[]
  suggestions: MLCategorySuggestion[]
  processingJobs: MLProcessingJob[]
  insights: MLCategoryInsight[]
  modelMetrics: MLModelMetrics | null
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  lastUpdate: Date | null
}

interface MLCategorizationActions {
  acceptSuggestion: (transactionId: number, category: string) => Promise<void>
  rejectSuggestion: (transactionId: number, suggestionId: string) => Promise<void>
  provideFeedback: (transactionId: number, correctCategory: string, confidence: number) => Promise<void>
  retryProcessing: (transactionId: number) => Promise<void>
  refreshModelMetrics: () => Promise<void>
}

/**
 * Real-time ML Transaction Categorization Hook
 *
 * Provides live updates for ML-powered transaction categorization with:
 * - Real-time subscription to categorization updates
 * - Financial precision integration with FinancialAmount
 * - Error handling and connection state management
 * - Performance optimizations and caching
 * - User feedback and model improvement actions
 */
export function useMLTransactionCategorization(
  options: UseMLTransactionCategorizationOptions
): MLCategorizationState & MLCategorizationActions {
  const {
    userId,
    transactionId,
    enableRealtime = true,
    confidenceThreshold = 0.7,
    maxSuggestions = 5
  } = options

  // Local state for aggregating subscription data
  const [state, setState] = useState<MLCategorizationState>({
    transactions: [],
    suggestions: [],
    processingJobs: [],
    insights: [],
    modelMetrics: null,
    isLoading: true,
    isConnected: false,
    error: null,
    lastUpdate: null
  })

  // Real-time subscription for ML transaction categorization updates
  const {
    data: categorizationData,
    loading: categorizationLoading,
    error: categorizationError
  } = useSubscription(SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION, {
    variables: { userId },
    skip: !enableRealtime,
    errorPolicy: 'all',
    onError: (error) => {
      console.error('ML Categorization subscription error:', error)
      setState(prev => ({ ...prev, error, isConnected: false }))
    },
    onData: ({ data }) => {
      if (data.data?.subscribeMLTransactionCategorization) {
        setState(prev => ({
          ...prev,
          transactions: data.data.subscribeMLTransactionCategorization,
          isConnected: true,
          lastUpdate: new Date(),
          error: null
        }))
      }
    }
  })

  // Real-time subscription for ML category suggestions
  const {
    data: suggestionsData,
    error: suggestionsError
  } = useSubscription(SUBSCRIBE_ML_CATEGORY_SUGGESTIONS, {
    variables: { userId, transactionId },
    skip: !enableRealtime || !transactionId,
    errorPolicy: 'all',
    onData: ({ data }) => {
      if (data.data?.subscribeMLCategorySuggestions) {
        const filteredSuggestions = data.data.subscribeMLCategorySuggestions
          .filter((s: MLCategorySuggestion) => s.confidence_score >= confidenceThreshold)
          .slice(0, maxSuggestions)

        setState(prev => ({
          ...prev,
          suggestions: filteredSuggestions,
          lastUpdate: new Date()
        }))
      }
    }
  })

  // Real-time subscription for ML processing status
  const {
    data: processingData,
    error: processingError
  } = useSubscription(SUBSCRIBE_ML_PROCESSING_STATUS, {
    variables: { userId },
    skip: !enableRealtime,
    errorPolicy: 'all',
    onData: ({ data }) => {
      if (data.data?.subscribeMLProcessingStatus) {
        setState(prev => ({
          ...prev,
          processingJobs: data.data.subscribeMLProcessingStatus,
          lastUpdate: new Date()
        }))
      }
    }
  })

  // Real-time subscription for ML category insights
  const {
    data: insightsData,
    error: insightsError
  } = useSubscription(SUBSCRIBE_ML_CATEGORY_INSIGHTS, {
    variables: { userId },
    skip: !enableRealtime,
    errorPolicy: 'all',
    onData: ({ data }) => {
      if (data.data?.subscribeMLCategoryInsights) {
        setState(prev => ({
          ...prev,
          insights: data.data.subscribeMLCategoryInsights,
          lastUpdate: new Date()
        }))
      }
    }
  })

  // Real-time subscription for ML model metrics
  const {
    data: metricsData,
    error: metricsError
  } = useSubscription(SUBSCRIBE_ML_MODEL_METRICS, {
    variables: { userId },
    skip: !enableRealtime,
    errorPolicy: 'all',
    onData: ({ data }) => {
      if (data.data?.subscribeMLModelMetrics?.[0]) {
        setState(prev => ({
          ...prev,
          modelMetrics: data.data.subscribeMLModelMetrics[0],
          lastUpdate: new Date()
        }))
      }
    }
  })

  // Aggregate loading state
  const isLoading = categorizationLoading

  // Aggregate error state
  const aggregatedError = useMemo(() => {
    return categorizationError || suggestionsError || processingError || insightsError || metricsError
  }, [categorizationError, suggestionsError, processingError, insightsError, metricsError])

  // Update loading and error states
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading,
      error: aggregatedError || null,
      isConnected: !aggregatedError && enableRealtime
    }))
  }, [isLoading, aggregatedError, enableRealtime])

  // Action: Accept ML suggestion and update transaction category
  const acceptSuggestion = useCallback(async (transactionId: number, category: string) => {
    try {
      // TODO: Implement mutation to accept ML suggestion
      // This would update the transaction's category and provide positive feedback to the ML model
      console.log(`Accepting ML suggestion for transaction ${transactionId}: ${category}`)

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === transactionId
            ? { ...t, category, ml_category_confidence: 1.0 }
            : t
        )
      }))
    } catch (error) {
      console.error('Error accepting ML suggestion:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Action: Reject ML suggestion and provide negative feedback
  const rejectSuggestion = useCallback(async (transactionId: number, suggestionId: string) => {
    try {
      // TODO: Implement mutation to reject ML suggestion
      console.log(`Rejecting ML suggestion ${suggestionId} for transaction ${transactionId}`)

      // Remove suggestion from local state
      setState(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(s => s.id !== suggestionId)
      }))
    } catch (error) {
      console.error('Error rejecting ML suggestion:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Action: Provide explicit feedback to improve ML model
  const provideFeedback = useCallback(async (
    transactionId: number,
    correctCategory: string,
    confidence: number
  ) => {
    try {
      // TODO: Implement mutation to provide ML feedback
      console.log(`Providing feedback for transaction ${transactionId}: ${correctCategory} (${confidence})`)

      // Update local state with user-provided category
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === transactionId
            ? {
                ...t,
                category: correctCategory,
                ml_category_confidence: confidence,
                ml_processing_status: 'updated' as const
              }
            : t
        )
      }))
    } catch (error) {
      console.error('Error providing ML feedback:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Action: Retry ML processing for a transaction
  const retryProcessing = useCallback(async (transactionId: number) => {
    try {
      // TODO: Implement mutation to retry ML processing
      console.log(`Retrying ML processing for transaction ${transactionId}`)

      // Update processing status optimistically
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === transactionId
            ? { ...t, ml_processing_status: 'processing' as const }
            : t
        )
      }))
    } catch (error) {
      console.error('Error retrying ML processing:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Action: Refresh model metrics
  const refreshModelMetrics = useCallback(async () => {
    try {
      // TODO: Implement query to refresh model metrics
      console.log('Refreshing ML model metrics')
    } catch (error) {
      console.error('Error refreshing model metrics:', error)
      setState(prev => ({ ...prev, error: error as Error }))
    }
  }, [])

  // Helper functions for transaction data with financial precision
  const getTransactionAmount = useCallback((transaction: Transaction): FinancialAmount => {
    return new FinancialAmount(transaction.amount)
  }, [])

  const getTransactionsByCategory = useCallback((category: string): Transaction[] => {
    return state.transactions.filter(t => t.category === category)
  }, [state.transactions])

  const getCategoryTotals = useCallback(() => {
    const categoryTotals = new Map<string, FinancialAmount>()

    state.transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized'
      const amount = getTransactionAmount(transaction)
      const currentTotal = categoryTotals.get(category) || FinancialAmount.zero()
      categoryTotals.set(category, currentTotal.add(amount))
    })

    return categoryTotals
  }, [state.transactions, getTransactionAmount])

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const totalTransactions = state.transactions.length
    const categorizedTransactions = state.transactions.filter(t => t.category && t.category !== 'Uncategorized').length
    const highConfidenceTransactions = state.transactions.filter(t =>
      t.ml_category_confidence && t.ml_category_confidence >= confidenceThreshold
    ).length

    return {
      totalTransactions,
      categorizedTransactions,
      highConfidenceTransactions,
      categorizedPercentage: totalTransactions > 0 ? (categorizedTransactions / totalTransactions) * 100 : 0,
      highConfidencePercentage: totalTransactions > 0 ? (highConfidenceTransactions / totalTransactions) * 100 : 0,
      averageConfidence: state.transactions.reduce((acc, t) =>
        acc + (t.ml_category_confidence || 0), 0
      ) / totalTransactions || 0
    }
  }, [state.transactions, confidenceThreshold])

  return {
    // State
    ...state,

    // Actions
    acceptSuggestion,
    rejectSuggestion,
    provideFeedback,
    retryProcessing,
    refreshModelMetrics,

    // Helper methods (exposed for convenience)
    getTransactionAmount,
    getTransactionsByCategory,
    getCategoryTotals,
    performanceMetrics
  } as MLCategorizationState & MLCategorizationActions & {
    getTransactionAmount: (transaction: Transaction) => FinancialAmount
    getTransactionsByCategory: (category: string) => Transaction[]
    getCategoryTotals: () => Map<string, FinancialAmount>
    performanceMetrics: {
      totalTransactions: number
      categorizedTransactions: number
      highConfidenceTransactions: number
      categorizedPercentage: number
      highConfidencePercentage: number
      averageConfidence: number
    }
  }
}
