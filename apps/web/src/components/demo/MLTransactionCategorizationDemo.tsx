'use client'

import { useState, useEffect } from 'react'
import { useMLTransactionCategorization } from '@/hooks/useMLTransactionCategorization'
import { useFinancialPrecision } from '@/hooks/useFinancialPrecision'
import { WebSocketErrorBoundary } from '@/components/common/WebSocketErrorBoundary'
import { FinancialAmount } from '@/lib/financial/FinancialAmount'
import { Transaction, MLCategorySuggestion } from '@/types/graphql'

interface MLTransactionCategorizationDemoProps {
  userId: number
  className?: string
}

/**
 * Demo Component for ML Transaction Categorization
 *
 * Demonstrates real-time ML categorization with:
 * - Live subscription updates
 * - Financial precision integration
 * - Error handling and recovery
 * - Performance metrics
 * - User interaction capabilities
 */
export function MLTransactionCategorizationDemo({
  userId,
  className = ''
}: MLTransactionCategorizationDemoProps) {
  // ML Categorization hook
  const {
    transactions,
    suggestions,
    processingJobs,
    insights,
    modelMetrics,
    isLoading,
    isConnected,
    error,
    acceptSuggestion,
    rejectSuggestion,
    provideFeedback,
    // performanceMetrics,
    // getCategoryTotals
  } = useMLTransactionCategorization({
    userId,
    enableRealtime: true,
    confidenceThreshold: 0.7,
    maxSuggestions: 5
  })

  // Financial Precision hook
  const {
    // precisionInsights,
    // performanceMetrics: precisionMetrics,
    formatAmount,
    validatePrecision,
    calculateSum
  } = useFinancialPrecision({
    userId,
    enableRealtime: true,
    precision: 'decimal'
  })

  // Local state for demo controls
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [confidenceLevel, setConfidenceLevel] = useState(0.8)

  // Demo data for testing when no real data is available
  const demoTransactions: Transaction[] = [
    {
      id: 1,
      amount: '125.67',
      description: 'Amazon.com purchase',
      category: 'Shopping',
      ml_category_confidence: 0.92,
      ml_suggested_category: 'Online Shopping',
      ml_processing_status: 'completed',
      account_id: 1,
      amount_precision: 'decimal',
      currency_code: 'USD',
      reconciled: false,
      created_at: new Date().toISOString(),
      account: {
        id: 1,
        name: 'Chase Checking',
        user_id: userId,
        active: true,
        encrypted: false
      }
    },
    {
      id: 2,
      amount: '45.23',
      description: 'Starbucks Coffee',
      category: 'Food & Drink',
      ml_category_confidence: 0.85,
      ml_suggested_category: 'Coffee Shops',
      ml_processing_status: 'completed',
      account_id: 1,
      amount_precision: 'decimal',
      currency_code: 'USD',
      reconciled: false,
      created_at: new Date().toISOString(),
      account: {
        id: 1,
        name: 'Chase Checking',
        user_id: userId,
        active: true,
        encrypted: false
      }
    }
  ]

  // Use demo data if no real transactions available
  const displayTransactions = transactions.length > 0 ? transactions : demoTransactions

  // Handle suggestion acceptance
  const handleAcceptSuggestion = async (transactionId: number, category: string) => {
    try {
      await acceptSuggestion(transactionId, category)
      console.log(`Accepted suggestion: ${category} for transaction ${transactionId}`)
    } catch (error) {
      console.error('Failed to accept suggestion:', error)
    }
  }

  // Handle suggestion rejection
  const handleRejectSuggestion = async (transactionId: number, suggestionId: string) => {
    try {
      await rejectSuggestion(transactionId, suggestionId)
      console.log(`Rejected suggestion ${suggestionId} for transaction ${transactionId}`)
    } catch (error) {
      console.error('Failed to reject suggestion:', error)
    }
  }

  // Handle custom feedback
  const handleProvideFeedback = async () => {
    if (!selectedTransactionId || !customCategory) return

    try {
      await provideFeedback(selectedTransactionId, customCategory, confidenceLevel)
      setCustomCategory('')
      setSelectedTransactionId(null)
      console.log(`Provided feedback: ${customCategory} with confidence ${confidenceLevel}`)
    } catch (error) {
      console.error('Failed to provide feedback:', error)
    }
  }

  // Calculate category totals with precision manually since hook doesn't expose this yet
  const categoryTotals = new Map<string, FinancialAmount>()
  displayTransactions.forEach(transaction => {
    const category = transaction.category || 'Uncategorized'
    const amount = new FinancialAmount(transaction.amount)
    const currentTotal = categoryTotals.get(category) || FinancialAmount.zero()
    categoryTotals.set(category, currentTotal.add(amount))
  })

  // Mock performance metrics for demo
  const performanceMetrics = {
    totalTransactions: displayTransactions.length,
    categorizedTransactions: displayTransactions.filter(t => t.category && t.category !== 'Uncategorized').length,
    highConfidenceTransactions: displayTransactions.filter(t =>
      t.ml_category_confidence && t.ml_category_confidence >= 0.7
    ).length,
    categorizedPercentage: displayTransactions.length > 0 ?
      (displayTransactions.filter(t => t.category && t.category !== 'Uncategorized').length / displayTransactions.length) * 100 : 0,
    highConfidencePercentage: displayTransactions.length > 0 ?
      (displayTransactions.filter(t => t.ml_category_confidence && t.ml_category_confidence >= 0.7).length / displayTransactions.length) * 100 : 0,
    averageConfidence: displayTransactions.reduce((acc, t) =>
      acc + (t.ml_category_confidence || 0), 0
    ) / displayTransactions.length || 0
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2 mb-4">
      <div className={`h-3 w-3 rounded-full ${
        isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`} />
      <span className={`text-sm font-medium ${
        isConnected ? 'text-green-600' : 'text-red-600'
      }`}>
        {isConnected ? 'Live Updates Active' : 'Connection Issues'}
      </span>
      {error && (
        <span className="text-xs text-gray-500">
          ({error.message})
        </span>
      )}
    </div>
  )

  // Performance metrics display
  const PerformanceMetrics = () => (
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {performanceMetrics.totalTransactions}
          </div>
          <div className="text-sm text-gray-600">Total Transactions</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {Math.round(performanceMetrics.categorizedPercentage)}%
          </div>
          <div className="text-sm text-gray-600">Categorized</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(performanceMetrics.highConfidencePercentage)}%
          </div>
          <div className="text-sm text-gray-600">High Confidence</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">
            {Math.round(performanceMetrics.averageConfidence * 100)}%
          </div>
          <div className="text-sm text-gray-600">Avg Confidence</div>
        </div>
      </div>
    </div>
  )

  // Transaction list with ML categorization
  const TransactionList = () => (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions with ML Categorization
        </h3>
        <div className="space-y-4">
          {displayTransactions.map((transaction) => {
            const amount = new FinancialAmount(transaction.amount)
            const confidence = transaction.ml_category_confidence || 0

            return (
              <div key={transaction.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">
                      {transaction.description}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatAmount(transaction.amount)} • {transaction.account?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                      confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(confidence * 100)}% confident
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {transaction.category || transaction.ml_suggested_category || 'Uncategorized'}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    {transaction.ml_suggested_category && (
                      <>
                        <button
                          onClick={() => handleAcceptSuggestion(transaction.id, transaction.ml_suggested_category!)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectSuggestion(transaction.id, `suggestion-${transaction.id}`)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedTransactionId(transaction.id)}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Provide Feedback
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Category totals display
  const CategoryTotals = () => (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Totals</h3>
        <div className="space-y-3">
          {Array.from(categoryTotals.entries()).map(([category, total]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">{category}</span>
              <span className="text-sm text-gray-600">{total.toCurrency()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Feedback form modal
  const FeedbackModal = () => (
    selectedTransactionId && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Provide Category Feedback
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Category
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter correct category"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Level: {Math.round(confidenceLevel * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setSelectedTransactionId(null)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleProvideFeedback}
              disabled={!customCategory}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ML Transaction Categorization Demo
        </h2>

        <ConnectionStatus />

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading real-time data...</span>
          </div>
        )}

        {!isLoading && (
          <>
            <PerformanceMetrics />
            <TransactionList />
            <CategoryTotals />
          </>
        )}

        <FeedbackModal />
      </div>
    </div>
  )
}

// Wrapped version with error boundary
export function MLTransactionCategorizationDemoWithErrorBoundary(
  props: MLTransactionCategorizationDemoProps
) {
  return (
    <WebSocketErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ML Categorization Demo Error:', error, errorInfo)
      }}
      onReconnect={() => {
        console.log('ML Categorization Demo reconnecting...')
      }}
      maxReconnectAttempts={5}
      enableLogging={true}
    >
      <MLTransactionCategorizationDemo {...props} />
    </WebSocketErrorBoundary>
  )
}
