// Core domain types for the frontend
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Money {
  amount: string; // Decimal as string for precision
  currency: Currency;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  balance: Money;
  institutionName?: string;
  accountNumber?: string;
  routingNumber?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata: Record<string, string>;
}

export type AccountType =
  | 'Checking'
  | 'Savings'
  | 'Credit'
  | 'Investment'
  | 'Retirement'
  | 'Loan'
  | 'Mortgage'
  | 'Cash'
  | 'Other';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  transactionType: TransactionType;
  amount: Money;
  description: string;
  category?: string;
  subcategory?: string;
  tags: string[];
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  reconciled: boolean;
  referenceNumber?: string;
  counterparty?: string;
  metadata: Record<string, string>;
}

export type TransactionType =
  | 'Debit'
  | 'Credit'
  | 'Deposit'
  | 'Withdrawal'
  | 'Transfer'
  | 'Payment';

export interface CreateAccountRequest {
  name: string;
  accountType: AccountType;
  currency: Currency;
  institutionName?: string;
  accountNumber?: string;
  routingNumber?: string;
  initialBalance?: Money;
}

export interface UpdateAccountRequest {
  id: string;
  name?: string;
  institutionName?: string;
  accountNumber?: string;
  routingNumber?: string;
  isActive?: boolean;
}

export interface CreateTransactionRequest {
  accountId: string;
  transactionType: TransactionType;
  amount: Money;
  description: string;
  category?: string;
  subcategory?: string;
  tags: string[];
  transactionDate?: string;
  referenceNumber?: string;
  counterparty?: string;
}

export interface UpdateTransactionRequest {
  id: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  transactionDate?: string;
  reconciled?: boolean;
  referenceNumber?: string;
  counterparty?: string;
}

export interface TransactionFilter {
  accountIds?: string[];
  transactionTypes?: TransactionType[];
  categories?: string[];
  tags?: string[];
  amountMin?: Money;
  amountMax?: Money;
  dateFrom?: string;
  dateTo?: string;
  reconciled?: boolean;
  searchText?: string;
}

export interface UserSession {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AppError {
  type: 'Database' | 'Authentication' | 'Validation' | 'NotFound' | 'PermissionDenied' | 'FinancialCalculation' | 'Encryption' | 'Internal';
  message: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppError;
}

// Navigation and UI types
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: MenuItem[];
}

export interface NavigationState {
  currentPath: string;
  breadcrumbs: { label: string; path: string }[];
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'date' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}
