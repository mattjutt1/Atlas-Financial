/**
 * Shared GraphQL Subscriptions
 */

import { gql } from '@apollo/client'

export const ACCOUNT_BALANCE_UPDATED = gql`
  subscription AccountBalanceUpdated($userId: uuid!) {
    accounts(where: { userId: { _eq: $userId } }) {
      id
      name
      balance
      updatedAt
    }
  }
`

export const TRANSACTIONS_UPDATED = gql`
  subscription TransactionsUpdated($userId: uuid!) {
    transactions(
      where: {
        account: { userId: { _eq: $userId } }
      }
      order_by: { createdAt: desc }
      limit: 10
    ) {
      id
      accountId
      amount
      description
      balanceBefore
      balanceAfter
      date
      createdAt
    }
  }
`
