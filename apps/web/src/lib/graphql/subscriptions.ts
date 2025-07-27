import { gql } from '@apollo/client'

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