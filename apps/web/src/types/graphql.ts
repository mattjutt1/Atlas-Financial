// GraphQL types matching the actual Hasura schema

export interface User {
  id: number
  email: string
}

export interface AccountType {
  id: number
  type: string
  created_at?: string
  updated_at?: string
}

export interface Account {
  id: number
  name: string
  account_type?: AccountType
  virtual_balance?: number | null
  native_virtual_balance?: number | null
  iban?: string | null
  active: boolean
  encrypted: boolean
  created_at?: string
  updated_at?: string
  user_id: number
  transactions?: Transaction[]
}

export interface Transaction {
  id: number
  amount: number
  description?: string | null
  balance_before?: number | null
  balance_after?: number | null
  foreign_amount?: number | null
  native_amount?: number | null
  reconciled: boolean
  created_at?: string
  updated_at?: string
  account_id: number
  account?: Account
}

// Utility types for derived data
export interface AccountSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  currency: string
}