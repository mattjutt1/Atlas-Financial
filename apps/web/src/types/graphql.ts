// GraphQL types matching the actual Hasura schema with ML and precision enhancements

import { FinancialAmountString } from '@atlas/shared/financial'

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

// Financial Goals Types
export interface FinancialGoal {
  id: string
  user_id: string
  name: string
  description?: string
  goal_type: GoalType
  target_amount: FinancialAmountString
  current_amount: FinancialAmountString
  target_date?: string
  monthly_contribution?: FinancialAmountString
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string

  // Calculated fields
  progress_percentage: number
  monthly_required?: FinancialAmountString
  projected_completion_date?: string
  is_on_track: boolean
  is_overdue: boolean
  days_remaining?: number
  milestones?: GoalMilestone[]
}

export type GoalType =
  | 'emergency_fund'
  | 'vacation'
  | 'house_down_payment'
  | 'debt_payoff'
  | 'retirement'
  | 'car_purchase'
  | 'education'
  | 'wedding'
  | 'home_improvement'
  | 'custom'

export interface GoalMilestone {
  id: string
  goal_id: string
  name: string
  target_amount: FinancialAmountString
  target_date?: string
  is_achieved: boolean
  achieved_date?: string
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: FinancialAmountString
  contribution_date: string
  description?: string
  source?: 'manual' | 'automatic' | 'budget_allocation'
  transaction_id?: string
  created_at: string
}

export interface GoalTemplate {
  id: string
  goal_type: GoalType
  name: string
  description: string
  suggested_amount?: FinancialAmountString
  suggested_timeframe_months?: number
  icon: string
  color: string
  tips: string[]
  milestones?: Omit<GoalMilestone, 'id' | 'goal_id' | 'created_at'>[]
}

export interface GoalAllocation {
  id: string
  goal_id: string
  budget_category_id?: string
  account_id?: string
  allocation_percentage: number
  allocation_amount?: FinancialAmountString
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  next_allocation_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GoalInsight {
  id: string
  goal_id: string
  insight_type: 'behind_schedule' | 'ahead_of_schedule' | 'increase_contribution' | 'milestone_achieved' | 'completion_projection'
  title: string
  description: string
  severity: 'info' | 'warning' | 'success' | 'critical'
  action_items: string[]
  is_dismissed: boolean
  created_at: string
}

// Goal Analytics Types
export interface GoalAnalytics {
  total_goals: number
  active_goals: number
  completed_goals: number
  total_target_amount: FinancialAmountString
  total_current_amount: FinancialAmountString
  overall_progress_percentage: number
  on_track_goals: number
  behind_schedule_goals: number
  projected_completion_months?: number
  monthly_contribution_total: FinancialAmountString
  goals_by_type: Record<GoalType, number>
  progress_trend: 'improving' | 'stable' | 'declining'
}

// Utility types for derived data
export interface AccountSummary {
  totalAssets: FinancialAmountString
  totalLiabilities: FinancialAmountString
  netWorth: FinancialAmountString
  currency: string
  precision: 'decimal' | 'legacy'
}
