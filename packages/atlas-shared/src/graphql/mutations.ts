/**
 * Shared GraphQL Mutations
 */

import { gql } from '@apollo/client'

export const CREATE_USER = gql`
  mutation CreateUser($email: String!, $firstName: String, $lastName: String) {
    insert_users_one(object: {
      email: $email
      firstName: $firstName
      lastName: $lastName
      emailVerified: false
      roles: ["user"]
    }) {
      id
      email
      firstName
      lastName
      emailVerified
      roles
      createdAt
    }
  }
`

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($id: uuid!, $updates: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $updates) {
      id
      email
      firstName
      lastName
      emailVerified
      roles
      permissions
      lastLoginAt
      metadata
      updatedAt
    }
  }
`

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($userId: uuid!, $name: String!, $accountType: String!, $balance: numeric!) {
    insert_accounts_one(object: {
      userId: $userId
      name: $name
      accountType: $accountType
      balance: $balance
    }) {
      id
      name
      accountType
      balance
      createdAt
    }
  }
`
