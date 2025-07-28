import { gql } from '@apollo/client'

// Fragment for ML categorization data
const ML_CATEGORIZATION_FRAGMENT = gql`
  fragment MLCategorizationFragment on transactions {
    id
    ml_category_confidence
    ml_suggested_category
    ml_category_suggestions
    ml_processing_status
    ml_last_updated
    ml_version
  }
`

// Fragment for financial amount precision
const FINANCIAL_AMOUNT_FRAGMENT = gql`
  fragment FinancialAmountFragment on transactions {
    amount
    amount_precision
    currency_code
  }
`

// Real-time subscription for account balance updates
export const SUBSCRIBE_ACCOUNT_BALANCE = gql`
  subscription SubscribeAccountBalance($userId: uuid!) {
    accounts(where: { user_id: { _eq: $userId } }) {
      id
      name
      balance
      updated_at
    }
  }
`

// Real-time subscription for new transactions
export const SUBSCRIBE_NEW_TRANSACTIONS = gql`
  subscription SubscribeNewTransactions($userId: uuid!) {
    transactions(
      where: { account: { user_id: { _eq: $userId } } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      id
      amount
      description
      category
      date
      type
      account {
        id
        name
      }
      created_at
    }
  }
`

// Real-time subscription for budget updates
export const SUBSCRIBE_BUDGET_UPDATES = gql`
  subscription SubscribeBudgetUpdates($userId: uuid!) {
    budgets(where: { user_id: { _eq: $userId } }) {
      id
      name
      category
      allocated_amount
      spent_amount
      period_start
      period_end
      updated_at
    }
  }
`

// Real-time subscription for debt balance changes
export const SUBSCRIBE_DEBT_UPDATES = gql`
  subscription SubscribeDebtUpdates($userId: uuid!) {
    debts(where: { user_id: { _eq: $userId } }) {
      id
      name
      balance
      minimum_payment
      updated_at
    }
  }
`

// Real-time subscription for investment price updates
export const SUBSCRIBE_INVESTMENT_UPDATES = gql`
  subscription SubscribeInvestmentUpdates($userId: uuid!) {
    investments(where: { user_id: { _eq: $userId } }) {
      id
      symbol
      current_price
      total_value
      gain_loss
      gain_loss_percentage
      updated_at
    }
  }
`

// Real-time subscription for new financial insights
export const SUBSCRIBE_FINANCIAL_INSIGHTS = gql`
  subscription SubscribeFinancialInsights($userId: uuid!) {
    financial_insights(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 5
    ) {
      id
      insight_type
      title
      description
      severity
      actionable_steps
      created_at
    }
  }
`

// ML Transaction Categorization Subscriptions

// Real-time subscription for ML transaction categorization updates
export const SUBSCRIBE_ML_TRANSACTION_CATEGORIZATION = gql`
  ${ML_CATEGORIZATION_FRAGMENT}
  ${FINANCIAL_AMOUNT_FRAGMENT}
  subscription SubscribeMLTransactionCategorization($userId: uuid!) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } }
        ml_processing_status: { _in: ["processing", "completed", "updated"] }
      }
      order_by: { ml_last_updated: desc }
    ) {
      ...MLCategorizationFragment
      ...FinancialAmountFragment
      description
      date
      category
      account {
        id
        name
      }
      created_at
      updated_at
    }
  }
`

// Real-time subscription for ML category suggestions on new transactions
export const SUBSCRIBE_ML_CATEGORY_SUGGESTIONS = gql`
  ${ML_CATEGORIZATION_FRAGMENT}
  subscription SubscribeMLCategorySuggestions($userId: uuid!, $transactionId: uuid) {
    ml_category_suggestions(
      where: {
        transaction: {
          account: { user_id: { _eq: $userId } }
          id: { _eq: $transactionId }
        }
      }
      order_by: { confidence_score: desc }
    ) {
      id
      transaction_id
      suggested_category
      confidence_score
      reasoning
      model_version
      created_at
      transaction {
        ...MLCategorizationFragment
        description
        amount
      }
    }
  }
`

// Real-time subscription for ML processing pipeline status
export const SUBSCRIBE_ML_PROCESSING_STATUS = gql`
  subscription SubscribeMLProcessingStatus($userId: uuid!) {
    ml_processing_jobs(
      where: {
        user_id: { _eq: $userId }
        status: { _in: ["running", "completed", "failed"] }
      }
      order_by: { started_at: desc }
      limit: 10
    ) {
      id
      job_type
      status
      progress_percentage
      transactions_processed
      total_transactions
      error_message
      started_at
      completed_at
      estimated_completion
    }
  }
`

// Real-time subscription for ML category insights and improvements
export const SUBSCRIBE_ML_CATEGORY_INSIGHTS = gql`
  subscription SubscribeMLCategoryInsights($userId: uuid!) {
    ml_category_insights(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      insight_type
      category
      confidence_improvement
      accuracy_score
      suggestions_count
      user_feedback_score
      insight_data
      created_at
      updated_at
    }
  }
`

// Real-time subscription for ML model performance metrics
export const SUBSCRIBE_ML_MODEL_METRICS = gql`
  subscription SubscribeMLModelMetrics($userId: uuid!) {
    ml_model_metrics(
      where: { user_id: { _eq: $userId } }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      id
      model_version
      accuracy_score
      precision_score
      recall_score
      f1_score
      total_predictions
      correct_predictions
      user_corrections
      timestamp
      performance_trend
    }
  }
`

// Real-time subscription for transaction amount precision updates
export const SUBSCRIBE_FINANCIAL_PRECISION_UPDATES = gql`
  ${FINANCIAL_AMOUNT_FRAGMENT}
  subscription SubscribeFinancialPrecisionUpdates($userId: uuid!) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } }
        amount_precision: { _neq: "legacy" }
      }
      order_by: { updated_at: desc }
    ) {
      ...FinancialAmountFragment
      id
      description
      category
      date
      account {
        id
        name
        balance
        balance_precision
      }
      created_at
      updated_at
    }
  }
`
