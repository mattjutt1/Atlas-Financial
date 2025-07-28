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
