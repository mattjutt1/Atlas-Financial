// GraphQL types matching the actual Hasura schema with ML and precision enhancements

import { FinancialAmountString } from '../lib/financial/FinancialAmount'

export interface User {
  id: number
  email: string
}

export interface AccountType {
  id: number
  type: string
  created_at?: string
  updated_at?: string
}

export interface Account {
  id: number
  name: string
  account_type?: AccountType
  virtual_balance?: FinancialAmountString | null
  native_virtual_balance?: FinancialAmountString | null
  iban?: string | null
  active: boolean
  encrypted: boolean
  created_at?: string
  updated_at?: string
  user_id: number
  transactions?: Transaction[]
  // Financial precision metadata
  balance_precision?: 'decimal' | 'legacy'
  currency_code?: string
}

export interface Transaction {
  id: number
  amount: FinancialAmountString
  description?: string | null
  balance_before?: FinancialAmountString | null
  balance_after?: FinancialAmountString | null
  foreign_amount?: FinancialAmountString | null
  native_amount?: FinancialAmountString | null
  reconciled: boolean
  created_at?: string
  updated_at?: string
  account_id: number
  account?: Account

  // Financial precision metadata
  amount_precision?: 'decimal' | 'legacy'
  currency_code?: string

  // ML Categorization fields
  ml_category_confidence?: number
  ml_suggested_category?: string
  ml_category_suggestions?: MLCategorySuggestion[]
  ml_processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'updated'
  ml_last_updated?: string
  ml_version?: string
  category?: string // User-assigned or ML-suggested category
}

// ML Transaction Categorization Types
export interface MLCategorySuggestion {
  id: string
  transaction_id: number
  suggested_category: string
  confidence_score: number
  reasoning: string
  model_version: string
  created_at: string
  transaction: Transaction
}

export interface MLProcessingJob {
  id: string
  user_id: number
  job_type: 'categorization' | 'batch_update' | 'model_training' | 'accuracy_check'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress_percentage: number
  transactions_processed: number
  total_transactions: number
  error_message?: string
  started_at: string
  completed_at?: string
  estimated_completion?: string
}

export interface MLCategoryInsight {
  id: string
  user_id: number
  insight_type: 'accuracy_improvement' | 'new_pattern' | 'category_optimization' | 'user_feedback'
  category: string
  confidence_improvement: number
  accuracy_score: number
  suggestions_count: number
  user_feedback_score: number
  insight_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MLModelMetrics {
  id: string
  user_id: number
  model_version: string
  accuracy_score: number
  precision_score: number
  recall_score: number
  f1_score: number
  total_predictions: number
  correct_predictions: number
  user_corrections: number
  timestamp: string
  performance_trend: 'improving' | 'stable' | 'declining'
}

// Real-time subscription data types
export interface MLTransactionCategorizationUpdate {
  transaction: Transaction
  previous_category?: string
  confidence_change?: number
  processing_time_ms: number
}

export interface MLCategoryInsightUpdate {
  insight: MLCategoryInsight
  affected_transactions: number[]
  improvement_percentage: number
}

export interface MLModelPerformanceUpdate {
  metrics: MLModelMetrics
  comparison_period: string
  performance_change: number
  recommendations: string[]
}

// GraphQL subscription result types
export interface SubscribeMLTransactionCategorizationResult {
  subscribeMLTransactionCategorization: Transaction[]
}

export interface SubscribeMLCategorySuggestionsResult {
  subscribeMLCategorySuggestions: MLCategorySuggestion[]
}

export interface SubscribeMLProcessingStatusResult {
  subscribeMLProcessingStatus: MLProcessingJob[]
}

export interface SubscribeMLCategoryInsightsResult {
  subscribeMLCategoryInsights: MLCategoryInsight[]
}

export interface SubscribeMLModelMetricsResult {
  subscribeMLModelMetrics: MLModelMetrics[]
}

export interface SubscribeFinancialPrecisionUpdatesResult {
  subscribeFinancialPrecisionUpdates: Transaction[]
}

// Utility types for derived data
export interface AccountSummary {
  totalAssets: FinancialAmountString
  totalLiabilities: FinancialAmountString
  netWorth: FinancialAmountString
  currency: string
  precision: 'decimal' | 'legacy'
}
