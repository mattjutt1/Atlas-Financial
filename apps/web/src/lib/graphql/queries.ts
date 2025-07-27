import { gql } from '@apollo/client'
import {
  USER_BASIC_FIELDS,
  ACCOUNT_BASIC_FIELDS,
  ACCOUNT_WITH_TRANSACTIONS,
  TRANSACTION_WITH_ACCOUNT,
  ACCOUNT_TYPE_FIELDS
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

// Simplified queries for Phase 1 Core Ledger MVP