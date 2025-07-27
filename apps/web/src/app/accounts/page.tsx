'use client'

import { useState } from 'react'
import { AccountCard } from '@/components/dashboard/AccountCard'
import { LoadingSpinner, Card } from '@/components/common'
import { SessionAuth } from '@/components/auth/AuthWrapper'
import { useAccountSummary } from '@/hooks'
import { formatCurrency } from '@/lib/utils'
import { mockAccounts } from '@/lib/fixtures'
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'

function AccountsContent() {
  const [filterType, setFilterType] = useState<string>('all')
  const { totalBalance, totalDebt, netWorth } = useAccountSummary({ accounts: mockAccounts as any })

  const filteredAccounts = filterType === 'all' 
    ? mockAccounts 
    : mockAccounts.filter(account => account.type === filterType)

  const accountTypes = ['all', 'checking', 'savings', 'credit', 'investment']
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Accounts Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage all your financial accounts in one place
          </p>
        </div>
        
        <button className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Total Assets
          </h3>
          <p className="text-3xl font-bold financial-positive">
            {formatCurrency(totalBalance)}
          </p>
        </Card>
        
        <Card>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Total Debt
          </h3>
          <p className="text-3xl font-bold financial-negative">
            {formatCurrency(totalDebt)}
          </p>
        </Card>
        
        <Card>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Net Worth
          </h3>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? 'financial-positive' : 'financial-negative'}`}>
            {formatCurrency(netWorth)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <FunnelIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by type:
          </span>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {accountTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                  filterType === type
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map((account) => (
          <AccountCard key={account.id} account={account as any} />
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No accounts found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filterType === 'all' 
              ? 'Get started by connecting your first account'
              : `No ${filterType} accounts found. Try a different filter.`
            }
          </p>
          <button className="btn-primary">
            Add Your First Account
          </button>
        </div>
      )}
    </div>
  )
}

export default function AccountsPage() {
  return (
    <SessionAuth>
      <AccountsContent />
    </SessionAuth>
  )
}