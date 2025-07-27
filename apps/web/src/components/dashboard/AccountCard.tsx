'use client'

import { Card, Badge } from '@/components/common'
import { formatCurrency } from '@/lib/utils'
import { Account } from '@/types/graphql'

interface AccountCardProps {
  account?: Account
}

export function AccountCard({ account }: AccountCardProps) {
  // Handle loading state or missing data gracefully
  if (!account) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  const getAccountTypeColor = (type: string) => {
    const normalizedType = type.toLowerCase()
    if (normalizedType.includes('asset')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    }
    if (normalizedType.includes('liability')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
    if (normalizedType.includes('expense')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    }
    if (normalizedType.includes('revenue')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const balance = account.virtual_balance || 0
  const isNegativeBalance = balance < 0
  const accountType = account.account_type?.type || 'Unknown'
  const isLiability = accountType.toLowerCase().includes('liability')
  const balanceColor = isNegativeBalance 
    ? 'financial-negative' 
    : isLiability
    ? 'financial-warning'
    : 'financial-positive'

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {account.name}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(accountType)}`}>
              {accountType}
            </span>
          </div>
          
          {account.iban && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              IBAN: {account.iban}
            </p>
          )}
          
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${balanceColor}`}>
              {formatCurrency(balance, 'USD')}
            </span>
            {isNegativeBalance && (
              <span className="text-xs bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-300 px-2 py-1 rounded">
                Overdrawn
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}