/**
 * Shared TypeScript types for Atlas Financial
 * Eliminates duplicate type definitions across services
 */

// Environment types
export type Environment = 'development' | 'production' | 'test' | 'staging'

// User and authentication types
export interface AtlasUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  emailVerified: boolean
  roles: UserRole[]
  permissions: Permission[]
  createdAt: string
  lastLoginAt?: string
  metadata?: Record<string, unknown>
}

export type UserRole = 
  | 'admin'
  | 'user' 
  | 'premium'
  | 'advisor'
  | 'analyst'
  | 'support'

export interface Permission {
  resource: string
  action: string
  conditions?: Record<string, unknown>
}

// Authentication context
export interface AuthContext {
  user: AtlasUser | null
  isLoading: boolean
  isAuthenticated: boolean
  token?: string
  sessionId?: string
  expiresAt?: string
}

// Financial types (consolidated from Rust definitions)
export interface Money {
  amount: number
  currency: string
  precision?: number
}

export interface Account {
  id: string
  name: string
  accountType: AccountType
  balance: Money
  virtualBalance?: Money
  nativeVirtualBalance?: Money
  iban?: string
  active: boolean
  encrypted: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface AccountType {
  id: string
  type: string
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  accountId: string
  amount: Money
  description: string
  balanceBefore: Money
  balanceAfter: Money
  foreignAmount?: Money
  nativeAmount?: Money
  reconciled: boolean
  category?: string
  tags?: string[]
  date: string
  createdAt: string
  updatedAt: string
}

// Portfolio and investment types
export interface Portfolio {
  id: string
  userId: string
  name: string
  description?: string
  totalValue: Money
  allocation: AssetAllocation[]
  riskProfile: RiskProfile
  createdAt: string
  updatedAt: string
}

export interface AssetAllocation {
  assetClass: string
  targetPercentage: number
  currentPercentage: number
  value: Money
}

export interface RiskProfile {
  level: 'conservative' | 'moderate' | 'aggressive'
  score: number
  tolerance: number
  timeHorizon: number
}

// Debt management types
export interface DebtAccount {
  id: string
  userId: string
  name: string
  type: 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other'
  balance: Money
  interestRate: number
  minimumPayment: Money
  dueDate?: string
  creditor: string
  accountNumber?: string
  createdAt: string
  updatedAt: string
}

export interface DebtStrategy {
  id: string
  userId: string
  strategy: 'avalanche' | 'snowball' | 'custom'
  totalDebt: Money
  monthlyPayment: Money
  estimatedPayoffDate: string
  totalInterest: Money
  accounts: DebtAccount[]
  createdAt: string
  updatedAt: string
}

// Configuration types
export interface AppConfig {
  environment: Environment
  api: ApiConfig
  auth: AuthConfig
  database?: DatabaseConfig
  redis?: RedisConfig
  monitoring: MonitoringConfig
  features: FeatureFlags
}

export interface ApiConfig {
  baseUrl: string
  timeout: number
  retries: number
  rateLimit?: {
    requests: number
    window: number
  }
}

export interface AuthConfig {
  provider: 'supertokens' | 'auth0' | 'custom'
  domain: string
  apiDomain: string
  websiteDomain: string
  jwksUrl?: string
  audience: string
  sessionDomain?: string
  cookieDomain?: string
  cookieSecure: boolean
  tokenExpiry: number
}

export interface DatabaseConfig {
  url: string
  poolSize: number
  timeout: number
  ssl: boolean
  migrations?: {
    auto: boolean
    directory: string
  }
}

export interface RedisConfig {
  url: string
  poolSize: number
  timeout: number
  defaultTtl: number
  enabled: boolean
}

export interface MonitoringConfig {
  enabled: boolean
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  version: string
  metrics: {
    enabled: boolean
    namespace: string
    endpoint?: string
  }
  tracing: {
    enabled: boolean
    endpoint?: string
    sampleRate: number
  }
}

export interface FeatureFlags {
  [key: string]: boolean | string | number
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  category: string
  details?: Record<string, unknown>
  suggestions?: string[]
  stack?: string
}

export interface ResponseMeta {
  requestId: string
  timestamp: string
  version: string
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// GraphQL types
export interface GraphQLVariables {
  [key: string]: unknown
}

export interface GraphQLResponse<T = unknown> {
  data?: T
  errors?: GraphQLError[]
  extensions?: Record<string, unknown>
}

export interface GraphQLError {
  message: string
  locations?: Array<{
    line: number
    column: number
  }>
  path?: Array<string | number>
  extensions?: Record<string, unknown>
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Event types for monitoring and logging
export interface AuditEvent {
  id: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  timestamp: string
}

export interface MetricEvent {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
  timestamp: string
}

// Form and validation types
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface FormState {
  isSubmitting: boolean
  isValid: boolean
  errors: ValidationError[]
  touched: Record<string, boolean>
}

// Export all types as a namespace for easier imports
export namespace AtlasTypes {
  export type {
    Environment,
    AtlasUser,
    UserRole,
    Permission,
    AuthContext,
    Money,
    Account,
    AccountType,
    Transaction,
    Portfolio,
    AssetAllocation,
    RiskProfile,
    DebtAccount,
    DebtStrategy,
    AppConfig,
    ApiConfig,
    AuthConfig,
    DatabaseConfig,
    RedisConfig,
    MonitoringConfig,
    FeatureFlags,
    ApiResponse,
    ApiError,
    ResponseMeta,
    PaginationMeta,
    GraphQLVariables,
    GraphQLResponse,
    GraphQLError,
    AuditEvent,
    MetricEvent,
    ValidationError,
    FormState
  }
}