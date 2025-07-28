export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  balance: number
  currency: string
  institution: string
}

export const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Primary Checking',
    type: 'checking',
    balance: 2458.32,
    currency: 'USD',
    institution: 'Chase Bank'
  },
  {
    id: '2',
    name: 'High Yield Savings',
    type: 'savings',
    balance: 15240.87,
    currency: 'USD',
    institution: 'Ally Bank'
  },
  {
    id: '3',
    name: 'Emergency Fund',
    type: 'savings',
    balance: 8750.00,
    currency: 'USD',
    institution: 'Marcus by Goldman Sachs'
  },
  {
    id: '4',
    name: 'Credit Card',
    type: 'credit',
    balance: -1284.56,
    currency: 'USD',
    institution: 'Capital One'
  },
  {
    id: '5',
    name: '401(k)',
    type: 'investment',
    balance: 45280.91,
    currency: 'USD',
    institution: 'Fidelity'
  },
  {
    id: '6',
    name: 'Roth IRA',
    type: 'investment',
    balance: 18450.32,
    currency: 'USD',
    institution: 'Vanguard'
  }
]

export const mockAccountsBasic: Account[] = mockAccounts.slice(0, 3)
