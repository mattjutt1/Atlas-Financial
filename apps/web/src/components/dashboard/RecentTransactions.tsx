'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Transaction } from '@/types/graphql'
import { formatCurrency } from '@atlas/shared/utils'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  // formatCurrency now imported from utils

  const getTransactionIcon = (amount: number) => {
    // Since we don't have categories in the current schema,
    // we'll use amount to determine icon
    return amount > 0 ? '💰' : '💸'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Transactions
        </h3>
        <Link
          href="/transactions"
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No recent transactions</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Connect your accounts to see transaction history
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {getTransactionIcon(transaction.amount)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.description || 'Transaction'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{transaction.account?.name || 'Unknown Account'}</span>
                    <span>•</span>
                    <span>Amount: {formatCurrency(Math.abs(transaction.amount), 'USD')}</span>
                    <span>•</span>
                    <span>{transaction.created_at ? formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true }) : 'Unknown date'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.amount > 0
                    ? 'financial-positive'
                    : 'financial-negative'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}
                  {formatCurrency(transaction.amount, 'USD')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'Unknown date'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {transactions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/transactions"
            className="btn-secondary w-full justify-center"
          >
            View All Transactions
          </Link>
        </div>
      )}
    </div>
  )
}
