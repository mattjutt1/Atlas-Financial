/**
 * Consolidated GraphQL Queries for Atlas Financial
 * Eliminates duplicate query definitions across applications
 */

import { gql } from '@apollo/client'
import {
  USER_BASIC_FIELDS,
  USER_FULL_FIELDS,
  ACCOUNT_BASIC_FIELDS,
  ACCOUNT_WITH_TRANSACTIONS,
  TRANSACTION_WITH_ACCOUNT,
  ACCOUNT_TYPE_FIELDS,
  PORTFOLIO_WITH_ALLOCATIONS,
  DEBT_ACCOUNT_WITH_PAYMENTS,
  DEBT_STRATEGY_WITH_ACCOUNTS,
  BUDGET_WITH_CATEGORIES,
  FINANCIAL_GOAL_WITH_PROGRESS,
  INVESTMENT_WITH_PERFORMANCE,
  INSIGHT_FULL_DETAILS,
  NOTIFICATION_FIELDS,
  PAGINATION_INFO
} from './fragments'

// User Queries
export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }) {
      ...UserBasicFields
    }
  }
  ${USER_BASIC_FIELDS}
`

export const GET_USER_BY_ID = gql`
  query GetUserById($id: String!) {
    users_by_pk(id: $id) {
      ...UserFullFields
    }
  }
  ${USER_FULL_FIELDS}
`

export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: String!) {
    users_by_pk(id: $userId) {
      ...UserFullFields
      preferences
      settings
      subscription {
        id
        plan
        status
        expires_at
      }
    }
  }
  ${USER_FULL_FIELDS}
`

// Account Queries
export const GET_USER_ACCOUNTS = gql`
  query GetUserAccounts(
    $userId: String!
    $limit: Int = 50
    $offset: Int = 0
    $orderBy: [accounts_order_by!] = [{ created_at: desc }]
  ) {
    accounts(
      where: { user_id: { _eq: $userId } }
      limit: $limit
      offset: $offset
      order_by: $orderBy
    ) {
      ...AccountBasicFields
    }
    accounts_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
        sum {
          virtual_balance
          native_virtual_balance
        }
      }
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const GET_ACCOUNT_DETAILS = gql`
  query GetAccountDetails($accountId: String!) {
    accounts_by_pk(id: $accountId) {
      ...AccountWithTransactions
    }
  }
  ${ACCOUNT_WITH_TRANSACTIONS}
`

export const GET_ACCOUNTS_SUMMARY = gql`
  query GetAccountsSummary($userId: String!) {
    accounts(where: { user_id: { _eq: $userId }, active: { _eq: true } }) {
      ...AccountBasicFields
    }
    accounts_aggregate(
      where: {
        user_id: { _eq: $userId },
        active: { _eq: true },
        account_type: { category: { _eq: "asset" } }
      }
    ) {
      aggregate {
        sum {
          virtual_balance
        }
      }
    }
    debt_accounts_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        sum {
          balance
        }
      }
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

// Transaction Queries
export const GET_TRANSACTIONS = gql`
  query GetTransactions(
    $userId: String!
    $limit: Int = 50
    $offset: Int = 0
    $startDate: timestamptz
    $endDate: timestamptz
    $accountIds: [String!]
    $categories: [String!]
  ) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } }
        _and: [
          { date: { _gte: $startDate } }
          { date: { _lte: $endDate } }
          { account_id: { _in: $accountIds } }
          { category: { _in: $categories } }
        ]
      }
      order_by: { date: desc }
      limit: $limit
      offset: $offset
    ) {
      ...TransactionWithAccount
    }
    transactions_aggregate(
      where: {
        account: { user_id: { _eq: $userId } }
        _and: [
          { date: { _gte: $startDate } }
          { date: { _lte: $endDate } }
          { account_id: { _in: $accountIds } }
          { category: { _in: $categories } }
        ]
      }
    ) {
      aggregate {
        count
        sum {
          amount
          native_amount
        }
      }
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

export const GET_RECENT_TRANSACTIONS = gql`
  query GetRecentTransactions($userId: String!, $limit: Int = 10) {
    transactions(
      where: { account: { user_id: { _eq: $userId } } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...TransactionWithAccount
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

export const GET_TRANSACTION_DETAILS = gql`
  query GetTransactionDetails($transactionId: String!) {
    transactions_by_pk(id: $transactionId) {
      ...TransactionWithAccount
      metadata
      external_id
      source_system
      import_batch_id
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

// Account Types
export const GET_ACCOUNT_TYPES = gql`
  query GetAccountTypes {
    account_types(order_by: { type: asc }) {
      ...AccountTypeFields
    }
  }
  ${ACCOUNT_TYPE_FIELDS}
`

// Portfolio Queries
export const GET_USER_PORTFOLIOS = gql`
  query GetUserPortfolios($userId: String!) {
    portfolios(where: { user_id: { _eq: $userId } }) {
      ...PortfolioWithAllocations
    }
  }
  ${PORTFOLIO_WITH_ALLOCATIONS}
`

export const GET_PORTFOLIO_DETAILS = gql`
  query GetPortfolioDetails($portfolioId: String!) {
    portfolios_by_pk(id: $portfolioId) {
      ...PortfolioWithAllocations
      performance_metrics(order_by: { calculated_at: desc }, limit: 12) {
        id
        period
        return_percentage
        volatility
        sharpe_ratio
        max_drawdown
        calculated_at
      }
    }
  }
  ${PORTFOLIO_WITH_ALLOCATIONS}
`

// Debt Management Queries
export const GET_USER_DEBT_ACCOUNTS = gql`
  query GetUserDebtAccounts($userId: String!) {
    debt_accounts(where: { user_id: { _eq: $userId } }) {
      ...DebtAccountWithPayments
    }
    debt_accounts_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
        sum {
          balance
          minimum_payment
        }
      }
    }
  }
  ${DEBT_ACCOUNT_WITH_PAYMENTS}
`

export const GET_DEBT_STRATEGIES = gql`
  query GetDebtStrategies($userId: String!) {
    debt_strategies(where: { user_id: { _eq: $userId } }) {
      ...DebtStrategyWithAccounts
    }
  }
  ${DEBT_STRATEGY_WITH_ACCOUNTS}
`

export const GET_DEBT_OPTIMIZATION = gql`
  query GetDebtOptimization($userId: String!, $strategyType: String!) {
    debt_optimization(
      args: {
        user_id: $userId,
        strategy_type: $strategyType
      }
    ) {
      strategy_type
      total_debt
      monthly_payment
      payoff_time_months
      total_interest
      accounts {
        debt_account_id
        priority_order
        recommended_payment
        payoff_month
      }
    }
  }
`

// Budget Queries
export const GET_USER_BUDGETS = gql`
  query GetUserBudgets($userId: String!) {
    budgets(where: { user_id: { _eq: $userId } }) {
      ...BudgetWithCategories
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`

export const GET_CURRENT_BUDGET = gql`
  query GetCurrentBudget($userId: String!) {
    budgets(
      where: {
        user_id: { _eq: $userId },
        start_date: { _lte: "now()" },
        end_date: { _gte: "now()" }
      }
      limit: 1
    ) {
      ...BudgetWithCategories
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`

// Financial Goals
export const GET_USER_FINANCIAL_GOALS = gql`
  query GetUserFinancialGoals($userId: String!) {
    financial_goals(where: { user_id: { _eq: $userId } }) {
      ...FinancialGoalWithProgress
    }
  }
  ${FINANCIAL_GOAL_WITH_PROGRESS}
`

export const GET_ACTIVE_FINANCIAL_GOALS = gql`
  query GetActiveFinancialGoals($userId: String!) {
    financial_goals(
      where: {
        user_id: { _eq: $userId },
        status: { _eq: "active" }
      }
      order_by: { priority: asc }
    ) {
      ...FinancialGoalWithProgress
    }
  }
  ${FINANCIAL_GOAL_WITH_PROGRESS}
`

// Investment Queries
export const GET_USER_INVESTMENTS = gql`
  query GetUserInvestments($userId: String!) {
    investments(where: { user_id: { _eq: $userId } }) {
      ...InvestmentWithPerformance
    }
    investments_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
        sum {
          current_value
          total_return
        }
      }
    }
  }
  ${INVESTMENT_WITH_PERFORMANCE}
`

export const GET_INVESTMENT_PERFORMANCE = gql`
  query GetInvestmentPerformance(
    $userId: String!
    $period: String = "1M"
  ) {
    investment_performance(
      where: {
        investment: { user_id: { _eq: $userId } },
        period: { _eq: $period }
      }
    ) {
      investment_id
      period
      return_percentage
      volatility
      benchmark_return
      alpha
      beta
      sharpe_ratio
      calculated_at
    }
  }
`

// Insights and Analytics
export const GET_USER_INSIGHTS = gql`
  query GetUserInsights(
    $userId: String!
    $categories: [String!]
    $priorities: [String!]
    $limit: Int = 10
  ) {
    insights(
      where: {
        user_id: { _eq: $userId },
        category: { _in: $categories },
        priority: { _in: $priorities },
        status: { _eq: "active" }
      }
      order_by: [
        { priority: asc },
        { created_at: desc }
      ]
      limit: $limit
    ) {
      ...InsightFullDetails
    }
  }
  ${INSIGHT_FULL_DETAILS}
`

export const GET_FINANCIAL_DASHBOARD = gql`
  query GetFinancialDashboard($userId: String!) {
    # Net worth summary
    accounts_aggregate(
      where: {
        user_id: { _eq: $userId },
        active: { _eq: true },
        account_type: { category: { _eq: "asset" } }
      }
    ) {
      aggregate {
        sum {
          virtual_balance
        }
      }
    }

    # Total debt
    debt_accounts_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        sum {
          balance
        }
      }
    }

    # Recent transactions
    transactions(
      where: { account: { user_id: { _eq: $userId } } }
      order_by: { date: desc }
      limit: 5
    ) {
      ...TransactionWithAccount
    }

    # Active financial goals
    financial_goals(
      where: {
        user_id: { _eq: $userId },
        status: { _eq: "active" }
      }
      order_by: { priority: asc }
      limit: 3
    ) {
      ...FinancialGoalWithProgress
    }

    # High priority insights
    insights(
      where: {
        user_id: { _eq: $userId },
        priority: { _in: ["high", "critical"] },
        status: { _eq: "active" }
      }
      order_by: { created_at: desc }
      limit: 3
    ) {
      ...InsightFullDetails
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
  ${FINANCIAL_GOAL_WITH_PROGRESS}
  ${INSIGHT_FULL_DETAILS}
`

// Notifications
export const GET_USER_NOTIFICATIONS = gql`
  query GetUserNotifications(
    $userId: String!
    $unreadOnly: Boolean = false
    $limit: Int = 20
    $offset: Int = 0
  ) {
    notifications(
      where: {
        user_id: { _eq: $userId },
        read: { _eq: $unreadOnly ? false : undefined }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...NotificationFields
    }
    notifications_aggregate(
      where: {
        user_id: { _eq: $userId },
        read: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${NOTIFICATION_FIELDS}
`

// Search and Discovery
export const SEARCH_TRANSACTIONS = gql`
  query SearchTransactions(
    $userId: String!
    $searchTerm: String!
    $limit: Int = 20
  ) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } },
        _or: [
          { description: { _ilike: $searchTerm } },
          { category: { _ilike: $searchTerm } },
          { tags: { _has_key: $searchTerm } }
        ]
      }
      order_by: { date: desc }
      limit: $limit
    ) {
      ...TransactionWithAccount
    }
  }
  ${TRANSACTION_WITH_ACCOUNT}
`

export const SEARCH_ACCOUNTS = gql`
  query SearchAccounts(
    $userId: String!
    $searchTerm: String!
    $limit: Int = 10
  ) {
    accounts(
      where: {
        user_id: { _eq: $userId },
        _or: [
          { name: { _ilike: $searchTerm } },
          { iban: { _ilike: $searchTerm } }
        ]
      }
      order_by: { name: asc }
      limit: $limit
    ) {
      ...AccountBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

// Analytics and Reporting
export const GET_SPENDING_ANALYSIS = gql`
  query GetSpendingAnalysis(
    $userId: String!
    $startDate: timestamptz!
    $endDate: timestamptz!
    $groupBy: String = "category"
  ) {
    spending_analysis(
      args: {
        user_id: $userId,
        start_date: $startDate,
        end_date: $endDate,
        group_by: $groupBy
      }
    ) {
      category
      total_amount
      transaction_count
      average_amount
      percentage_of_total
    }
  }
`

export const GET_NET_WORTH_HISTORY = gql`
  query GetNetWorthHistory(
    $userId: String!
    $period: String = "1Y"
  ) {
    net_worth_history(
      where: {
        user_id: { _eq: $userId },
        period: { _eq: $period }
      }
      order_by: { date: asc }
    ) {
      date
      total_assets
      total_liabilities
      net_worth
      change_amount
      change_percentage
    }
  }
`
