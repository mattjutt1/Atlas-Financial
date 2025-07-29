import { gql } from '@apollo/client'

// User fragments
export const USER_BASIC_FIELDS = gql`
  fragment UserBasicFields on users {
    id
    email
  }
`

// Account fragments
export const ACCOUNT_BASIC_FIELDS = gql`
  fragment AccountBasicFields on accounts {
    id
    name
    account_type {
      id
      type
    }
    virtual_balance
    native_virtual_balance
    iban
    active
    encrypted
    created_at
    updated_at
  }
`

export const ACCOUNT_WITH_TRANSACTIONS = gql`
  fragment AccountWithTransactions on accounts {
    ...AccountBasicFields
    transactions(order_by: { date: desc }, limit: 50) {
      ...TransactionBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

// Transaction fragments
export const TRANSACTION_BASIC_FIELDS = gql`
  fragment TransactionBasicFields on transactions {
    id
    amount
    description
    balance_before
    balance_after
    foreign_amount
    native_amount
    reconciled
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
      }
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

// Available fragments for current schema
// Note: Many fragments removed as tables don't exist in current Hasura setup
// These can be re-added as the backend schema evolves

// Account type fragments
export const ACCOUNT_TYPE_FIELDS = gql`
  fragment AccountTypeFields on account_types {
    id
    type
    created_at
    updated_at
  }
`

// Financial Goal fragments
export const FINANCIAL_GOAL_BASIC_FIELDS = gql`
  fragment FinancialGoalBasicFields on financial_goals {
    id
    user_id
    name
    description
    goal_type
    target_amount
    current_amount
    target_date
    monthly_contribution
    priority
    is_active
    created_at
    updated_at
  }
`

export const GOAL_MILESTONE_FIELDS = gql`
  fragment GoalMilestoneFields on goal_milestones {
    id
    goal_id
    name
    target_amount
    target_date
    is_achieved
    achieved_date
    created_at
  }
`

export const GOAL_CONTRIBUTION_FIELDS = gql`
  fragment GoalContributionFields on goal_contributions {
    id
    goal_id
    amount
    contribution_date
    description
    source
    transaction_id
    created_at
  }
`

export const GOAL_ALLOCATION_FIELDS = gql`
  fragment GoalAllocationFields on goal_allocations {
    id
    goal_id
    budget_category_id
    account_id
    allocation_percentage
    allocation_amount
    frequency
    next_allocation_date
    is_active
    created_at
    updated_at
  }
`

export const GOAL_INSIGHT_FIELDS = gql`
  fragment GoalInsightFields on goal_insights {
    id
    goal_id
    insight_type
    title
    description
    severity
    action_items
    is_dismissed
    created_at
  }
`

export const FINANCIAL_GOAL_WITH_DETAILS = gql`
  fragment FinancialGoalWithDetails on financial_goals {
    ...FinancialGoalBasicFields
    milestones {
      ...GoalMilestoneFields
    }
    contributions(order_by: { contribution_date: desc }, limit: 5) {
      ...GoalContributionFields
    }
    allocations(where: { is_active: { _eq: true } }) {
      ...GoalAllocationFields
    }
    insights(where: { is_dismissed: { _eq: false } }, order_by: { created_at: desc }, limit: 3) {
      ...GoalInsightFields
    }
  }
  ${FINANCIAL_GOAL_BASIC_FIELDS}
  ${GOAL_MILESTONE_FIELDS}
  ${GOAL_CONTRIBUTION_FIELDS}
  ${GOAL_ALLOCATION_FIELDS}
  ${GOAL_INSIGHT_FIELDS}
`

// Portfolio and Investment fragments
export const PORTFOLIO_BASIC_FIELDS = gql`
  fragment PortfolioBasicFields on portfolios {
    id
    user_id
    name
    portfolio_type
    total_value
    currency
    provider
    account_number
    is_active
    created_at
    updated_at
  }
`

export const HOLDING_BASIC_FIELDS = gql`
  fragment HoldingBasicFields on holdings {
    id
    portfolio_id
    symbol
    name
    asset_type
    shares
    average_cost
    current_price
    market_value
    currency
    last_price_update
    created_at
    updated_at
  }
`

export const PORTFOLIO_WITH_HOLDINGS = gql`
  fragment PortfolioWithHoldings on portfolios {
    ...PortfolioBasicFields
    holdings {
      ...HoldingBasicFields
    }
  }
  ${PORTFOLIO_BASIC_FIELDS}
  ${HOLDING_BASIC_FIELDS}
`
