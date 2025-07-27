import { gql } from '@apollo/client'
import {
  ACCOUNT_BASIC_FIELDS,
  TRANSACTION_BASIC_FIELDS,
  USER_BASIC_FIELDS
} from './fragments'

// Account Mutations
export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: accounts_insert_input!) {
    insert_accounts_one(object: $input) {
      ...AccountBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: uuid!, $input: accounts_set_input!) {
    update_accounts_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...AccountBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: uuid!) {
    delete_accounts_by_pk(id: $id) {
      id
    }
  }
`

// Transaction Mutations
export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: transactions_insert_input!) {
    insert_transactions_one(object: $input) {
      ...TransactionBasicFields
      account_id
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($id: uuid!, $input: transactions_set_input!) {
    update_transactions_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...TransactionBasicFields
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: uuid!) {
    delete_transactions_by_pk(id: $id) {
      id
    }
  }
`

export const BULK_CREATE_TRANSACTIONS = gql`
  mutation BulkCreateTransactions($transactions: [transactions_insert_input!]!) {
    insert_transactions(objects: $transactions) {
      affected_rows
      returning {
        ...TransactionBasicFields
      }
    }
  }
`

// Budget Mutations
export const CREATE_BUDGET = gql`
  mutation CreateBudget($input: budgets_insert_input!) {
    insert_budgets_one(object: $input) {
      ...BudgetBasicFields
    }
  }
  ${BUDGET_BASIC_FIELDS}
`

export const UPDATE_BUDGET = gql`
  mutation UpdateBudget($id: uuid!, $input: budgets_set_input!) {
    update_budgets_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...BudgetBasicFields
    }
  }
  ${BUDGET_BASIC_FIELDS}
`

export const DELETE_BUDGET = gql`
  mutation DeleteBudget($id: uuid!) {
    delete_budgets_by_pk(id: $id) {
      id
    }
  }
`

// Debt Mutations
export const CREATE_DEBT = gql`
  mutation CreateDebt($input: debts_insert_input!) {
    insert_debts_one(object: $input) {
      ...DebtBasicFields
    }
  }
  ${DEBT_BASIC_FIELDS}
`

export const UPDATE_DEBT = gql`
  mutation UpdateDebt($id: uuid!, $input: debts_set_input!) {
    update_debts_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...DebtBasicFields
    }
  }
  ${DEBT_BASIC_FIELDS}
`

export const DELETE_DEBT = gql`
  mutation DeleteDebt($id: uuid!) {
    delete_debts_by_pk(id: $id) {
      id
    }
  }
`

export const RECORD_DEBT_PAYMENT = gql`
  mutation RecordDebtPayment($input: debt_payments_insert_input!) {
    insert_debt_payments_one(object: $input) {
      id
      debt_id
      amount
      payment_date
      created_at
    }
  }
`

// Investment Mutations
export const CREATE_INVESTMENT = gql`
  mutation CreateInvestment($input: investments_insert_input!) {
    insert_investments_one(object: $input) {
      ...InvestmentBasicFields
    }
  }
  ${INVESTMENT_BASIC_FIELDS}
`

export const UPDATE_INVESTMENT = gql`
  mutation UpdateInvestment($id: uuid!, $input: investments_set_input!) {
    update_investments_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...InvestmentWithPerformance
    }
  }
  ${INVESTMENT_WITH_PERFORMANCE}
`

export const DELETE_INVESTMENT = gql`
  mutation DeleteInvestment($id: uuid!) {
    delete_investments_by_pk(id: $id) {
      id
    }
  }
`

// User Preferences Mutations
export const UPDATE_USER_PREFERENCES = gql`
  mutation UpdateUserPreferences($userId: uuid!, $input: user_preferences_set_input!) {
    update_user_preferences_by_pk(pk_columns: { user_id: $userId }, _set: $input) {
      ...UserPreferencesFields
    }
  }
  ${USER_PREFERENCES_FIELDS}
`

// Financial Goal Mutations
export const CREATE_FINANCIAL_GOAL = gql`
  mutation CreateFinancialGoal($input: financial_goals_insert_input!) {
    insert_financial_goals_one(object: $input) {
      ...FinancialGoalFields
    }
  }
  ${FINANCIAL_GOAL_FIELDS}
`

export const UPDATE_FINANCIAL_GOAL = gql`
  mutation UpdateFinancialGoal($id: uuid!, $input: financial_goals_set_input!) {
    update_financial_goals_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...FinancialGoalFields
    }
  }
  ${FINANCIAL_GOAL_FIELDS}
`