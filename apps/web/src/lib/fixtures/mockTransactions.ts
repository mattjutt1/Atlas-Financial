export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  date: string
  type: 'income' | 'expense'
  account: {
    name: string
    type: string
  }
}

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 45.67,
    description: 'Grocery Shopping',
    category: 'food',
    date: '2024-06-15T10:30:00Z',
    type: 'expense',
    account: { name: 'Primary Checking', type: 'checking' }
  },
  {
    id: '2',
    amount: 2800.00,
    description: 'Salary Deposit',
    category: 'income',
    date: '2024-06-14T09:00:00Z',
    type: 'income',
    account: { name: 'Primary Checking', type: 'checking' }
  },
  {
    id: '3',
    amount: 89.99,
    description: 'Gas Station',
    category: 'transportation',
    date: '2024-06-13T16:45:00Z',
    type: 'expense',
    account: { name: 'Credit Card', type: 'credit' }
  }
]