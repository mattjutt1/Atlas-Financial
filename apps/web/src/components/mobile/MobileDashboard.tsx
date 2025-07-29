'use client'

import { useState, useMemo } from 'react'
import { MobileCard, MobileCardHeader, MobileCardSection, MobileMetricCard } from './MobileCard'
import { MobileAccountCard, MobileAccountCardSkeleton } from './MobileAccountCard'
import { MobileTransactionList, MobileTransactionListSkeleton } from './MobileTransactionList'
import { MobileFinancialAmount } from './MobileFinancialAmount'
import { useFinancialData } from '@/hooks'
import { FinancialAmount } from '@atlas/shared/financial'
import { Account, Transaction } from '@/types/graphql'

interface MobileDashboardProps {
  userId?: string
  onAccountTap?: (account: Account) => void
  onTransactionTap?: (transaction: Transaction) => void
  onViewAllAccounts?: () => void
  onViewAllTransactions?: () => void
}

/**
 * Mobile-optimized financial dashboard with touch-friendly interactions
 * Designed for optimal personal finance management on mobile devices
 */
export function MobileDashboard({
  userId,
  onAccountTap,
  onTransactionTap,
  onViewAllAccounts,
  onViewAllTransactions
}: MobileDashboardProps) {
  const { accounts, transactions, loading, error } = useFinancialData()
  const [refreshing, setRefreshing] = useState(false)

  // Calculate financial metrics
  const metrics = useMemo(() => {
    if (!accounts.length) return null

    const totalAssets = accounts
      .filter(acc => acc.account_type?.type?.toLowerCase().includes('asset'))
      .reduce((sum, acc) => sum.add(acc.virtual_balance || 0), FinancialAmount.zero())

    const totalLiabilities = accounts
      .filter(acc => acc.account_type?.type?.toLowerCase().includes('liability'))
      .reduce((sum, acc) => sum.add(acc.virtual_balance || 0), FinancialAmount.zero())

    const netWorth = totalAssets.subtract(totalLiabilities)

    // Calculate monthly spending (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const monthlySpending = transactions
      .filter(t => {
        const transactionDate = t.created_at ? new Date(t.created_at) : null
        return transactionDate && transactionDate >= thirtyDaysAgo && t.amount < 0
      })
      .reduce((sum, t) => sum.add(Math.abs(t.amount)), FinancialAmount.zero())

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      monthlySpending,
      accountCount: accounts.length,
      transactionCount: transactions.length
    }
  }, [accounts, transactions])

  const handlePullToRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000)
  }

  if (loading) {
    return <MobileDashboardSkeleton />
  }

  if (error) {
    return <MobileDashboardError error={error.message} onRetry={handlePullToRefresh} />
  }

  return (
    <div className="pb-safe-area-inset-bottom">
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Refreshing...
        </div>
      )}

      {/* Welcome header with brutal honesty */}
      <MobileWelcomeSection
        userId={userId}
        metrics={metrics}
        onPullToRefresh={handlePullToRefresh}
      />

      {/* Financial overview metrics */}
      {metrics && (
        <section className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MobileMetricCard
              label="Net Worth"
              value={
                <MobileFinancialAmount
                  amount={metrics.netWorth}
                  variant="compact"
                  colorMode="auto"
                  compact={true}
                />
              }
              trend={metrics.netWorth.isPositive() ? 'up' : metrics.netWorth.isNegative() ? 'down' : 'neutral'}
            />
            <MobileMetricCard
              label="Monthly Spending"
              value={
                <MobileFinancialAmount
                  amount={metrics.monthlySpending}
                  variant="compact"
                  colorMode="negative"
                  compact={true}
                />
              }
              trend="down"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard
              label="Total Assets"
              value={
                <MobileFinancialAmount
                  amount={metrics.totalAssets}
                  variant="compact"
                  colorMode="positive"
                  compact={true}
                />
              }
              trend="up"
            />
            <MobileMetricCard
              label="Total Liabilities"
              value={
                <MobileFinancialAmount
                  amount={metrics.totalLiabilities}
                  variant="compact"
                  colorMode="negative"
                  compact={true}
                />
              }
              trend="down"
            />
          </div>
        </section>
      )}

      {/* Accounts section */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Accounts
          </h2>
          {accounts.length > 3 && onViewAllAccounts && (
            <button
              onClick={onViewAllAccounts}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View All ({accounts.length})
            </button>
          )}
        </div>

        <div className="space-y-3">
          {accounts.length === 0 ? (
            <MobileEmptyAccounts />
          ) : (
            accounts.slice(0, 3).map((account) => (
              <MobileAccountCard
                key={account.id}
                account={account}
                onTap={() => onAccountTap?.(account)}
                compact={accounts.length > 2}
              />
            ))
          )}
        </div>
      </section>

      {/* Recent transactions */}
      <section className="px-4 mb-6">
        {transactions.length === 0 ? (
          <MobileEmptyTransactions />
        ) : (
          <MobileTransactionList
            transactions={transactions}
            title="Recent Activity"
            maxItems={5}
            onViewAll={onViewAllTransactions}
            onTransactionTap={onTransactionTap}
            enableSwipeActions={true}
          />
        )}
      </section>

      {/* Quick actions */}
      <section className="px-4 mb-8">
        <MobileQuickActions />
      </section>
    </div>
  )
}

interface MobileWelcomeSectionProps {
  userId?: string
  metrics: any
  onPullToRefresh: () => void
}

function MobileWelcomeSection({ userId, metrics, onPullToRefresh }: MobileWelcomeSectionProps) {
  const brutalHonestyMessage = useMemo(() => {
    if (!metrics) return "Connect your accounts to see your financial reality."

    const { netWorth, monthlySpending } = metrics

    if (netWorth.isNegative()) {
      return "Your net worth is negative. Time to face reality and make changes."
    } else if (netWorth.lessThan(monthlySpending.multiply(3))) {
      return "You're living paycheck to paycheck. Your emergency fund needs work."
    } else if (netWorth.lessThan(monthlySpending.multiply(6))) {
      return "You're making progress, but you need a bigger emergency buffer."
    } else {
      return "You're on the right track. Keep building your financial security."
    }
  }, [metrics])

  return (
    <section className="px-4 mb-6">
      <MobileCard variant="filled" className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
        <div className="text-center space-y-4" onTouchStart={onPullToRefresh}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              Welcome back{userId ? `, ${userId}` : ''}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
              Here's your financial reality check
            </p>
          </div>

          {/* Brutal honesty insight */}
          <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/20 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">💡</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Brutal Honesty Insight
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed text-left">
              {brutalHonestyMessage}
            </p>
          </div>
        </div>
      </MobileCard>
    </section>
  )
}

function MobileQuickActions() {
  const actions = [
    { label: 'Add Transaction', icon: '➕', color: 'bg-green-500' },
    { label: 'Transfer Money', icon: '↔️', color: 'bg-blue-500' },
    { label: 'Pay Bills', icon: '💳', color: 'bg-red-500' },
    { label: 'View Budget', icon: '📊', color: 'bg-purple-500' }
  ]

  return (
    <MobileCard variant="elevated">
      <MobileCardHeader title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          >
            <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center text-white text-xl`}>
              {action.icon}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </MobileCard>
  )
}

function MobileEmptyAccounts() {
  return (
    <MobileCard variant="default">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No accounts connected
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Connect your bank accounts to start tracking your finances
        </p>
        <button className="btn-primary touch-manipulation">
          Connect Account
        </button>
      </div>
    </MobileCard>
  )
}

function MobileEmptyTransactions() {
  return (
    <MobileCard variant="elevated">
      <MobileCardHeader title="Recent Activity" />
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No transactions yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your transaction history will appear here
        </p>
      </div>
    </MobileCard>
  )
}

function MobileDashboardSkeleton() {
  return (
    <div className="pb-safe-area-inset-bottom">
      {/* Welcome section skeleton */}
      <section className="px-4 mb-6">
        <MobileCard variant="filled">
          <div className="text-center space-y-4 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-64"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-48"></div>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </MobileCard>
      </section>

      {/* Metrics skeleton */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MobileCard key={i} variant="elevated">
              <div className="text-center animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-20 mx-auto"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-24 mx-auto"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto"></div>
              </div>
            </MobileCard>
          ))}
        </div>
      </section>

      {/* Accounts skeleton */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileAccountCardSkeleton key={i} compact />
          ))}
        </div>
      </section>

      {/* Transactions skeleton */}
      <section className="px-4 mb-6">
        <MobileTransactionListSkeleton />
      </section>
    </div>
  )
}

interface MobileDashboardErrorProps {
  error: string
  onRetry: () => void
}

function MobileDashboardError({ error, onRetry }: MobileDashboardErrorProps) {
  return (
    <div className="px-4 py-8">
      <MobileCard variant="default" className="text-center">
        <div className="py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={onRetry}
            className="btn-primary touch-manipulation"
          >
            Try Again
          </button>
        </div>
      </MobileCard>
    </div>
  )
}
