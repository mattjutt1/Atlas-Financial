/**
 * Shared GraphQL Types
 */

export interface GraphQLUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  emailVerified: boolean
  roles: string[]
  permissions: Array<{
    resource: string
    action: string
    conditions?: Record<string, unknown>
  }>
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  metadata?: Record<string, unknown>
}

export interface GraphQLAccount {
  id: string
  userId: string
  name: string
  accountType: string
  balance: number
  virtualBalance?: number
  nativeVirtualBalance?: number
  iban?: string
  active: boolean
  encrypted: boolean
  createdAt: string
  updatedAt: string
}

export interface GraphQLTransaction {
  id: string
  accountId: string
  amount: number
  description: string
  balanceBefore: number
  balanceAfter: number
  foreignAmount?: number
  nativeAmount?: number
  reconciled: boolean
  category?: string
  tags?: string[]
  date: string
  createdAt: string
  updatedAt: string
  account?: GraphQLAccount
}

export interface GraphQLPortfolio {
  id: string
  userId: string
  name: string
  description?: string
  totalValue: number
  allocation: Array<{
    assetClass: string
    targetPercentage: number
    currentPercentage: number
    value: number
  }>
  riskProfile: {
    level: 'conservative' | 'moderate' | 'aggressive'
    score: number
    tolerance: number
    timeHorizon: number
  }
  createdAt: string
  updatedAt: string
}

// Query response types
export interface GetUserByEmailResponse {
  users: GraphQLUser[]
}

export interface GetAccountsResponse {
  accounts: GraphQLAccount[]
}

export interface GetTransactionsResponse {
  transactions: GraphQLTransaction[]
}

export interface GetPortfolioResponse {
  portfolios: GraphQLPortfolio[]
}

// Mutation response types
export interface CreateUserResponse {
  insert_users_one: GraphQLUser
}

export interface UpdateUserProfileResponse {
  update_users_by_pk: GraphQLUser
}

export interface CreateAccountResponse {
  insert_accounts_one: GraphQLAccount
}

// Subscription response types
export interface AccountBalanceUpdatedResponse {
  accounts: GraphQLAccount[]
}

export interface TransactionsUpdatedResponse {
  transactions: GraphQLTransaction[]
}
