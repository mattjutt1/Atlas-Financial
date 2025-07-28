'use client'

import { useState, useMemo, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MobileCard, MobileCardHeader } from './MobileCard'
import { MobileFinancialAmount } from './MobileFinancialAmount'
import { Transaction } from '@/types/graphql'
import { FinancialAmount } from '@/lib/financial/FinancialAmount'

interface MobileTransactionListProps {
  transactions: Transaction[]
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
  onTransactionTap?: (transaction: Transaction) => void
  maxItems?: number
  enableSwipeActions?: boolean
  groupByDate?: boolean
}

/**
 * Mobile-optimized transaction list with swipe actions and touch-friendly interface
 * Designed for optimal financial data consumption on mobile devices
 */
export function MobileTransactionList({
  transactions,
  title = 'Recent Transactions',
  showViewAll = true,
  onViewAll,
  onTransactionTap,
  maxItems,
  enableSwipeActions = true,
  groupByDate = false
}: MobileTransactionListProps) {
  const [swipeStates, setSwipeStates] = useState<Record<string, boolean>>({})

  // Process and limit transactions
  const displayTransactions = useMemo(() => {
    const filtered = maxItems ? transactions.slice(0, maxItems) : transactions

    if (!groupByDate) return filtered

    // Group transactions by date
    const grouped = filtered.reduce((acc, transaction) => {
      const date = transaction.created_at
        ? new Date(transaction.created_at).toDateString()
        : 'Unknown Date'

      if (!acc[date]) acc[date] = []
      acc[date].push(transaction)
      return acc
    }, {} as Record<string, Transaction[]>)

    return grouped
  }, [transactions, maxItems, groupByDate])

  const handleSwipeStart = useCallback((transactionId: string) => {
    setSwipeStates(prev => ({ ...prev, [transactionId]: true }))
  }, [])

  const handleSwipeEnd = useCallback((transactionId: string) => {
    setSwipeStates(prev => ({ ...prev, [transactionId]: false }))
  }, [])

  if (transactions.length === 0) {
    return <MobileTransactionListEmpty />
  }

  return (
    <MobileCard variant="elevated">
      <MobileCardHeader
        title={title}
        action={showViewAll && onViewAll ? (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors touch-manipulation px-3 py-2 -m-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            View All
          </button>
        ) : undefined}
      />

      <div className="space-y-1">
        {groupByDate ? (
          <GroupedTransactionList
            groupedTransactions={displayTransactions as Record<string, Transaction[]>}
            onTransactionTap={onTransactionTap}
            enableSwipeActions={enableSwipeActions}
            swipeStates={swipeStates}
            onSwipeStart={handleSwipeStart}
            onSwipeEnd={handleSwipeEnd}
          />
        ) : (
          <SimpleTransactionList
            transactions={displayTransactions as Transaction[]}
            onTransactionTap={onTransactionTap}
            enableSwipeActions={enableSwipeActions}
            swipeStates={swipeStates}
            onSwipeStart={handleSwipeStart}
            onSwipeEnd={handleSwipeEnd}
          />
        )}
      </div>

      {showViewAll && onViewAll && transactions.length > (maxItems || 5) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onViewAll}
            className="w-full btn-secondary justify-center touch-manipulation"
          >
            View All {transactions.length} Transactions
          </button>
        </div>
      )}
    </MobileCard>
  )
}

interface TransactionListProps {
  transactions?: Transaction[] | Record<string, Transaction[]>
  groupedTransactions?: Record<string, Transaction[]>
  onTransactionTap?: (transaction: Transaction) => void
  enableSwipeActions: boolean
  swipeStates: Record<string, boolean>
  onSwipeStart: (id: string) => void
  onSwipeEnd: (id: string) => void
}

function SimpleTransactionList({
  transactions,
  onTransactionTap,
  enableSwipeActions,
  swipeStates,
  onSwipeStart,
  onSwipeEnd
}: TransactionListProps) {
  return (
    <>
      {(transactions as Transaction[]).map((transaction) => (
        <MobileTransactionItem
          key={transaction.id}
          transaction={transaction}
          onTap={onTransactionTap}
          enableSwipeActions={enableSwipeActions}
          isSwipeActive={swipeStates[transaction.id] || false}
          onSwipeStart={() => onSwipeStart(transaction.id)}
          onSwipeEnd={() => onSwipeEnd(transaction.id)}
        />
      ))}
    </>
  )
}

function GroupedTransactionList({
  groupedTransactions,
  onTransactionTap,
  enableSwipeActions,
  swipeStates,
  onSwipeStart,
  onSwipeEnd
}: TransactionListProps) {
  return (
    <>
      {Object.entries(groupedTransactions as Record<string, Transaction[]>).map(([date, dateTransactions]) => (
        <div key={date} className="space-y-1">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDateGroup(date)}
            </h4>
          </div>
          {dateTransactions.map((transaction) => (
            <MobileTransactionItem
              key={transaction.id}
              transaction={transaction}
              onTap={onTransactionTap}
              enableSwipeActions={enableSwipeActions}
              isSwipeActive={swipeStates[transaction.id] || false}
              onSwipeStart={() => onSwipeStart(transaction.id)}
              onSwipeEnd={() => onSwipeEnd(transaction.id)}
            />
          ))}
        </div>
      ))}
    </>
  )
}

interface MobileTransactionItemProps {
  transaction: Transaction
  onTap?: (transaction: Transaction) => void
  enableSwipeActions?: boolean
  isSwipeActive?: boolean
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
}

function MobileTransactionItem({
  transaction,
  onTap,
  enableSwipeActions = true,
  isSwipeActive = false,
  onSwipeStart,
  onSwipeEnd
}: MobileTransactionItemProps) {
  const amount = useMemo(() =>
    new FinancialAmount(transaction.amount)
  , [transaction.amount])

  const transactionIcon = useMemo(() => {
    // Enhanced icon logic based on amount and potential category
    if (amount.isPositive()) {
      return { icon: '💰', color: 'text-success-500', bg: 'bg-success-100 dark:bg-success-900' }
    } else {
      return { icon: '💸', color: 'text-danger-500', bg: 'bg-danger-100 dark:bg-danger-900' }
    }
  }, [amount])

  const handleItemTap = useCallback(() => {
    onTap?.(transaction)
  }, [onTap, transaction])

  return (
    <div className="relative overflow-hidden">
      {/* Swipe actions background */}
      {enableSwipeActions && isSwipeActive && (
        <div className="absolute inset-y-0 right-0 flex items-center bg-primary-500 text-white px-4 rounded-r-lg">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 016 11.5V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Transaction item */}
      <div
        className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer select-none rounded-lg p-3 ${
          isSwipeActive ? 'transform -translate-x-24' : ''
        }`}
        onClick={handleItemTap}
        onTouchStart={enableSwipeActions ? onSwipeStart : undefined}
        onTouchEnd={enableSwipeActions ? onSwipeEnd : undefined}
      >
        <div className="flex items-center gap-3">
          {/* Transaction icon */}
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${transactionIcon.bg} flex-shrink-0`}>
            <span className="text-lg" role="img" aria-label="Transaction type">
              {transactionIcon.icon}
            </span>
          </div>

          {/* Transaction details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base leading-tight">
                  {transaction.description || 'Transaction'}
                </h4>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="truncate">
                    {transaction.account?.name || 'Unknown Account'}
                  </span>
                  <span>•</span>
                  <span>
                    {transaction.created_at
                      ? formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })
                      : 'Unknown date'
                    }
                  </span>
                </div>
              </div>

              {/* Transaction amount */}
              <div className="text-right flex-shrink-0">
                <MobileFinancialAmount
                  amount={amount}
                  variant="secondary"
                  colorMode="auto"
                  showSign={true}
                  className="leading-tight"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {transaction.created_at
                    ? new Date(transaction.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileTransactionListEmpty() {
  return (
    <MobileCard variant="default">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No transactions yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Connect your accounts to see transaction history
        </p>
      </div>
    </MobileCard>
  )
}

/**
 * Loading state for mobile transaction list
 */
export function MobileTransactionListSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <MobileCard variant="elevated">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileCard>
  )
}

// Helper function to format date groups
function formatDateGroup(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }
}
