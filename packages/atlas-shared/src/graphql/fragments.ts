/**
 * Consolidated GraphQL Fragments for Atlas Financial
 * Eliminates duplicate fragment definitions across applications
 */

import { gql } from '@apollo/client'

// User fragments
export const USER_BASIC_FIELDS = gql`
  fragment UserBasicFields on users {
    id
    email
    firstName
    lastName
    emailVerified
    createdAt
    updatedAt
  }
`

export const USER_FULL_FIELDS = gql`
  fragment UserFullFields on users {
    ...UserBasicFields
    roles
    permissions
    lastLoginAt
    metadata
  }
  ${USER_BASIC_FIELDS}
`

// Account fragments
export const ACCOUNT_BASIC_FIELDS = gql`
  fragment AccountBasicFields on accounts {
    id
    name
    account_type {
      id
      type
      category
    }
    virtual_balance
    native_virtual_balance
    iban
    active
    encrypted
    user_id
    created_at
    updated_at
  }
`

export const ACCOUNT_WITH_TYPE = gql`
  fragment AccountWithType on accounts {
    ...AccountBasicFields
    account_type {
      id
      type
      category
      description
      created_at
      updated_at
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const ACCOUNT_WITH_TRANSACTIONS = gql`
  fragment AccountWithTransactions on accounts {
    ...AccountWithType
    transactions(order_by: { date: desc }, limit: 50) {
      ...TransactionBasicFields
    }
    transaction_aggregate {
      aggregate {
        count
        sum {
          amount
          native_amount
        }
      }
    }
  }
  ${ACCOUNT_WITH_TYPE}
`

// Transaction fragments
export const TRANSACTION_BASIC_FIELDS = gql`
  fragment TransactionBasicFields on transactions {
    id
    account_id
    amount
    description
    balance_before
    balance_after
    foreign_amount
    native_amount
    reconciled
    category
    tags
    date
    created_at
    updated_at
  }
`

export const TRANSACTION_WITH_ACCOUNT = gql`
  fragment TransactionWithAccount on transactions {
    ...TransactionBasicFields
    account {
      id
      name
      account_type {
        type
        category
      }
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

export const TRANSACTION_FULL_DETAILS = gql`
  fragment TransactionFullDetails on transactions {
    ...TransactionWithAccount
    metadata
    external_id
    source_system
    import_batch_id
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

// Account type fragments
export const ACCOUNT_TYPE_FIELDS = gql`
  fragment AccountTypeFields on account_types {
    id
    type
    category
    description
    created_at
    updated_at
  }
`

// Portfolio fragments
export const PORTFOLIO_BASIC_FIELDS = gql`
  fragment PortfolioBasicFields on portfolios {
    id
    user_id
    name
    description
    total_value
    currency
    created_at
    updated_at
  }
`

export const PORTFOLIO_WITH_ALLOCATIONS = gql`
  fragment PortfolioWithAllocations on portfolios {
    ...PortfolioBasicFields
    allocations {
      id
      asset_class
      target_percentage
      current_percentage
      value
      currency
    }
    risk_profile {
      level
      score
      tolerance
      time_horizon
    }
  }
  ${PORTFOLIO_BASIC_FIELDS}
`

export const PORTFOLIO_FULL_DETAILS = gql`
  fragment PortfolioFullDetails on portfolios {
    ...PortfolioWithAllocations
    performance_metrics {
      id
      period
      return_percentage
      volatility
      sharpe_ratio
      max_drawdown
      calculated_at
    }
    rebalancing_suggestions {
      id
      asset_class
      current_percentage
      target_percentage
      suggested_action
      amount
      priority
      created_at
    }
  }
  ${PORTFOLIO_WITH_ALLOCATIONS}
`

// Debt account fragments
export const DEBT_ACCOUNT_BASIC_FIELDS = gql`
  fragment DebtAccountBasicFields on debt_accounts {
    id
    user_id
    name
    type
    balance
    currency
    interest_rate
    minimum_payment
    due_date
    creditor
    account_number
    created_at
    updated_at
  }
`

export const DEBT_ACCOUNT_WITH_PAYMENTS = gql`
  fragment DebtAccountWithPayments on debt_accounts {
    ...DebtAccountBasicFields
    payments(order_by: { payment_date: desc }, limit: 12) {
      id
      amount
      principal_amount
      interest_amount
      payment_date
      payment_method
      status
    }
    payment_schedule {
      id
      scheduled_amount
      due_date
      status
    }
  }
  ${DEBT_ACCOUNT_BASIC_FIELDS}
`

// Debt strategy fragments
export const DEBT_STRATEGY_FIELDS = gql`
  fragment DebtStrategyFields on debt_strategies {
    id
    user_id
    strategy_type
    total_debt
    monthly_payment
    estimated_payoff_date
    total_interest_saved
    created_at
    updated_at
  }
`

export const DEBT_STRATEGY_WITH_ACCOUNTS = gql`
  fragment DebtStrategyWithAccounts on debt_strategies {
    ...DebtStrategyFields
    debt_accounts {
      ...DebtAccountBasicFields
      priority_order
      recommended_payment
    }
    milestones {
      id
      debt_account_id
      estimated_payoff_date
      total_payments
      total_interest
    }
  }
  ${DEBT_STRATEGY_FIELDS}
  ${DEBT_ACCOUNT_BASIC_FIELDS}
`

// Budget fragments
export const BUDGET_BASIC_FIELDS = gql`
  fragment BudgetBasicFields on budgets {
    id
    user_id
    name
    period_type
    start_date
    end_date
    total_income
    total_expenses
    total_allocated
    remaining_balance
    currency
    created_at
    updated_at
  }
`

export const BUDGET_WITH_CATEGORIES = gql`
  fragment BudgetWithCategories on budgets {
    ...BudgetBasicFields
    categories {
      id
      name
      type
      allocated_amount
      spent_amount
      remaining_amount
      percentage_used
    }
    income_sources {
      id
      name
      amount
      frequency
      actual_amount
    }
  }
  ${BUDGET_BASIC_FIELDS}
`

// Financial goal fragments
export const FINANCIAL_GOAL_FIELDS = gql`
  fragment FinancialGoalFields on financial_goals {
    id
    user_id
    name
    description
    goal_type
    target_amount
    current_amount
    target_date
    priority
    status
    currency
    created_at
    updated_at
  }
`

export const FINANCIAL_GOAL_WITH_PROGRESS = gql`
  fragment FinancialGoalWithProgress on financial_goals {
    ...FinancialGoalFields
    progress_percentage
    monthly_contribution_needed
    on_track
    milestones {
      id
      name
      target_amount
      target_date
      achieved
      achieved_date
    }
  }
  ${FINANCIAL_GOAL_FIELDS}
`

// Investment fragments
export const INVESTMENT_BASIC_FIELDS = gql`
  fragment InvestmentBasicFields on investments {
    id
    user_id
    symbol
    name
    type
    quantity
    purchase_price
    current_price
    currency
    purchase_date
    created_at
    updated_at
  }
`

export const INVESTMENT_WITH_PERFORMANCE = gql`
  fragment InvestmentWithPerformance on investments {
    ...InvestmentBasicFields
    current_value
    total_return
    total_return_percentage
    unrealized_gain_loss
    realized_gain_loss
    dividend_yield
    last_updated
  }
  ${INVESTMENT_BASIC_FIELDS}
`

// Insight fragments
export const INSIGHT_BASIC_FIELDS = gql`
  fragment InsightBasicFields on insights {
    id
    user_id
    type
    category
    title
    description
    priority
    status
    created_at
    updated_at
  }
`

export const INSIGHT_FULL_DETAILS = gql`
  fragment InsightFullDetails on insights {
    ...InsightBasicFields
    data
    recommendations
    impact_score
    confidence_level
    related_accounts
    related_goals
    expiry_date
    viewed_at
  }
  ${INSIGHT_BASIC_FIELDS}
`

// Notification fragments
export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on notifications {
    id
    user_id
    type
    title
    message
    priority
    read
    action_url
    metadata
    created_at
    read_at
  }
`

// Audit log fragments
export const AUDIT_LOG_FIELDS = gql`
  fragment AuditLogFields on audit_logs {
    id
    user_id
    action
    resource_type
    resource_id
    old_values
    new_values
    ip_address
    user_agent
    created_at
  }
`

// Common utility fragments
export const PAGINATION_INFO = gql`
  fragment PaginationInfo on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`

export const AGGREGATE_FIELDS = gql`
  fragment AggregateFields on aggregate {
    count
    sum
    avg
    min
    max
  }
`

// Error fragments for GraphQL errors
export const ERROR_FIELDS = gql`
  fragment ErrorFields on Error {
    message
    code
    path
    locations {
      line
      column
    }
  }
`
