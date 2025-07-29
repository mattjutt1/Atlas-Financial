import { gql } from '@apollo/client'
import {
  USER_BASIC_FIELDS,
  ACCOUNT_BASIC_FIELDS,
  ACCOUNT_WITH_TRANSACTIONS,
  TRANSACTION_WITH_ACCOUNT,
  ACCOUNT_TYPE_FIELDS,
  FINANCIAL_GOAL_BASIC_FIELDS,
  FINANCIAL_GOAL_WITH_DETAILS,
  GOAL_MILESTONE_FIELDS,
  GOAL_CONTRIBUTION_FIELDS,
  GOAL_ALLOCATION_FIELDS,
  GOAL_INSIGHT_FIELDS,
  PORTFOLIO_BASIC_FIELDS,
  PORTFOLIO_WITH_HOLDINGS,
  HOLDING_BASIC_FIELDS
} from './fragments'

// User Queries - Simplified for debugging
export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }) {
      id
      email
    }
  }
`

// Account Queries - Simplified for debugging
export const GET_USER_ACCOUNTS = gql`
  query GetUserAccounts($userId: Int!) {
    accounts(where: { user_id: { _eq: $userId } }) {
      id
      name
      virtual_balance
      account_type {
        id
        type
      }
    }
  }
`

export const GET_ACCOUNT_DETAILS = gql`
  query GetAccountDetails($accountId: Int!) {
    accounts_by_pk(id: $accountId) {
      ...AccountWithTransactions
    }
  }
  ${ACCOUNT_WITH_TRANSACTIONS}
`

// Transaction Queries
export const GET_TRANSACTIONS = gql`
  query GetTransactions(
    $userId: Int!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...TransactionWithAccount
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

// Account Types Query
export const GET_ACCOUNT_TYPES = gql`
  query GetAccountTypes {
    account_types {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`

// Note: Budget, Debt, Investment, and Financial Insights queries removed
// as these tables don't exist in the current Hasura schema.
// They can be re-added as the backend evolves.

// Financial Goal Queries
export const GET_USER_FINANCIAL_GOALS = gql`
  query GetUserFinancialGoals($userId: uuid!) {
    financial_goals(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
      order_by: { priority: asc, created_at: desc }
    ) {
      ...FinancialGoalWithDetails
    }
  }
  ${FINANCIAL_GOAL_WITH_DETAILS}
`

export const GET_FINANCIAL_GOAL_DETAILS = gql`
  query GetFinancialGoalDetails($goalId: uuid!) {
    financial_goals_by_pk(id: $goalId) {
      ...FinancialGoalWithDetails
    }
  }
  ${FINANCIAL_GOAL_WITH_DETAILS}
`

export const GET_GOAL_ANALYTICS = gql`
  query GetGoalAnalytics($userId: uuid!) {
    financial_goals_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
        sum {
          target_amount
          current_amount
        }
      }
    }
    active_goals: financial_goals_aggregate(where: { user_id: { _eq: $userId }, is_active: { _eq: true } }) {
      aggregate {
        count
      }
    }
    completed_goals: financial_goals_aggregate(
      where: {
        user_id: { _eq: $userId },
        current_amount: { _gte: { target_amount: {} } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_GOAL_CONTRIBUTIONS = gql`
  query GetGoalContributions($goalId: uuid!, $limit: Int = 20, $offset: Int = 0) {
    goal_contributions(
      where: { goal_id: { _eq: $goalId } }
      order_by: { contribution_date: desc }
      limit: $limit
      offset: $offset
    ) {
      ...GoalContributionFields
    }
  }
  ${GOAL_CONTRIBUTION_FIELDS}
`

export const GET_GOAL_INSIGHTS = gql`
  query GetGoalInsights($userId: uuid!) {
    goal_insights(
      where: {
        goal: { user_id: { _eq: $userId } },
        is_dismissed: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 10
    ) {
      ...GoalInsightFields
      goal {
        name
        goal_type
      }
    }
  }
  ${GOAL_INSIGHT_FIELDS}
`

export const GET_GOAL_ALLOCATIONS = gql`
  query GetGoalAllocations($userId: uuid!) {
    goal_allocations(
      where: {
        goal: { user_id: { _eq: $userId } },
        is_active: { _eq: true }
      }
      order_by: { next_allocation_date: asc }
    ) {
      ...GoalAllocationFields
      goal {
        name
        goal_type
      }
    }
  }
  ${GOAL_ALLOCATION_FIELDS}
`

export const SEARCH_GOALS = gql`
  query SearchGoals($userId: uuid!, $searchTerm: String!) {
    financial_goals(
      where: {
        user_id: { _eq: $userId },
        _or: [
          { name: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { goal_type: { _ilike: $searchTerm } }
        ]
      }
      order_by: { created_at: desc }
      limit: 10
    ) {
      ...FinancialGoalBasicFields
    }
  }
  ${FINANCIAL_GOAL_BASIC_FIELDS}
`

// Portfolio and Investment Queries
export const GET_USER_PORTFOLIOS = gql`
  query GetUserPortfolios($userId: uuid!) {
    portfolios(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
      order_by: { created_at: desc }
    ) {
      ...PortfolioWithHoldings
    }
  }
  ${PORTFOLIO_WITH_HOLDINGS}
`

export const GET_PORTFOLIO_DETAILS = gql`
  query GetPortfolioDetails($portfolioId: uuid!) {
    portfolios_by_pk(id: $portfolioId) {
      ...PortfolioWithHoldings
    }
  }
  ${PORTFOLIO_WITH_HOLDINGS}
`

export const GET_PORTFOLIO_HOLDINGS = gql`
  query GetPortfolioHoldings($portfolioId: uuid!) {
    holdings(
      where: { portfolio_id: { _eq: $portfolioId } }
      order_by: { market_value: desc }
    ) {
      ...HoldingBasicFields
    }
  }
  ${HOLDING_BASIC_FIELDS}
`

export const GET_PORTFOLIO_PERFORMANCE = gql`
  query GetPortfolioPerformance($portfolioId: uuid!, $startDate: date, $endDate: date) {
    portfolios_by_pk(id: $portfolioId) {
      ...PortfolioBasicFields
      performance_history: portfolio_performance(
        where: {
          date: { _gte: $startDate, _lte: $endDate }
        }
        order_by: { date: asc }
      ) {
        date
        total_value
        daily_return
        cumulative_return
      }
    }
  }
  ${PORTFOLIO_BASIC_FIELDS}
`

export const GET_PORTFOLIO_ALLOCATION = gql`
  query GetPortfolioAllocation($portfolioId: uuid!) {
    portfolio_allocation: holdings_aggregate(
      where: { portfolio_id: { _eq: $portfolioId } }
    ) {
      aggregate {
        sum {
          market_value
        }
      }
    }
    allocation_by_type: holdings(
      where: { portfolio_id: { _eq: $portfolioId } }
    ) {
      asset_type
      market_value
      name
      symbol
    }
  }
`

// Simplified queries for Phase 1 Core Ledger MVP
