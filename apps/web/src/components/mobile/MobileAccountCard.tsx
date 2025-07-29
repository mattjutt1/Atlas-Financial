'use client'

import { useMemo } from 'react'
import { MobileCard, MobileCardHeader, MobileCardSection } from './MobileCard'
import { MobileFinancialAmount, MobileAmountChange } from './MobileFinancialAmount'
import { Badge } from '@/components/common'
import { Account } from '@/types/graphql'
import { FinancialAmount } from '@atlas/shared/financial'

interface MobileAccountCardProps {
  account: Account
  showChange?: boolean
  previousBalance?: number
  onTap?: () => void
  compact?: boolean
}

/**
 * Mobile-optimized account card with touch-friendly layout
 * Optimized for financial data consumption on small screens
 */
export function MobileAccountCard({
  account,
  showChange = false,
  previousBalance,
  onTap,
  compact = false
}: MobileAccountCardProps) {
  const balance = useMemo(() =>
    new FinancialAmount(account.virtual_balance || 0)
  , [account.virtual_balance])

  const previousAmount = useMemo(() =>
    previousBalance ? new FinancialAmount(previousBalance) : null
  , [previousBalance])

  // Determine account type styling
  const accountTypeInfo = useMemo(() => {
    const type = account.account_type?.type?.toLowerCase() || 'unknown'

    if (type.includes('asset')) {
      return {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        icon: '💰'
      }
    }
    if (type.includes('liability')) {
      return {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        icon: '💳'
      }
    }
    if (type.includes('expense')) {
      return {
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        icon: '💸'
      }
    }
    if (type.includes('revenue')) {
      return {
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        icon: '💵'
      }
    }
    return {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      icon: '📊'
    }
  }, [account.account_type?.type])

  // Determine balance display mode
  const balanceColorMode = useMemo(() => {
    const type = account.account_type?.type?.toLowerCase() || ''
    const isLiability = type.includes('liability')

    if (balance.isNegative()) {
      return 'negative'
    }
    if (isLiability) {
      return 'negative' // Liabilities shown as negative even if positive balance
    }
    return 'positive'
  }, [balance, account.account_type?.type])

  // Account status indicators
  const accountStatus = useMemo(() => {
    if (balance.isNegative()) {
      return {
        label: 'Overdrawn',
        color: 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-300'
      }
    }
    if (account.account_type?.type?.toLowerCase().includes('liability') && balance.greaterThan(0)) {
      return {
        label: 'Outstanding',
        color: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-300'
      }
    }
    return null
  }, [balance, account.account_type?.type])

  const CardComponent = compact ? MobileCompactAccountCard : MobileFullAccountCard

  return (
    <CardComponent
      account={account}
      balance={balance}
      previousAmount={previousAmount}
      accountTypeInfo={accountTypeInfo}
      balanceColorMode={balanceColorMode}
      accountStatus={accountStatus}
      showChange={showChange}
      onTap={onTap}
    />
  )
}

interface CardComponentProps {
  account: Account
  balance: FinancialAmount
  previousAmount: FinancialAmount | null
  accountTypeInfo: { color: string; icon: string }
  balanceColorMode: string
  accountStatus: { label: string; color: string } | null
  showChange: boolean
  onTap?: () => void
}

function MobileFullAccountCard({
  account,
  balance,
  previousAmount,
  accountTypeInfo,
  balanceColorMode,
  accountStatus,
  showChange,
  onTap
}: CardComponentProps) {
  return (
    <MobileCard
      variant="elevated"
      interactive={!!onTap}
      onClick={onTap}
      className="hover:shadow-lg transition-shadow duration-200"
    >
      {/* Header with account name and type */}
      <MobileCardHeader
        title={account.name}
        subtitle={account.iban ? `IBAN: ${account.iban}` : undefined}
        icon={
          <div className="text-2xl" role="img" aria-label="Account type">
            {accountTypeInfo.icon}
          </div>
        }
        action={
          <div className="flex flex-col items-end gap-2">
            <Badge className={accountTypeInfo.color}>
              {account.account_type?.type || 'Unknown'}
            </Badge>
            {accountStatus && (
              <Badge className={accountStatus.color}>
                {accountStatus.label}
              </Badge>
            )}
          </div>
        }
      />

      {/* Balance section */}
      <MobileCardSection>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                Current Balance
              </p>
              <MobileFinancialAmount
                amount={balance}
                variant="large"
                colorMode={balanceColorMode}
                className="leading-none"
              />
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <button
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                aria-label="Account options"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle options menu
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Balance change indicator */}
          {showChange && previousAmount && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Change from last period
                </span>
                <MobileAmountChange
                  currentAmount={balance}
                  previousAmount={previousAmount}
                  compact={false}
                />
              </div>
            </div>
          )}
        </div>
      </MobileCardSection>
    </MobileCard>
  )
}

function MobileCompactAccountCard({
  account,
  balance,
  previousAmount,
  accountTypeInfo,
  balanceColorMode,
  accountStatus,
  showChange,
  onTap
}: CardComponentProps) {
  return (
    <MobileCard
      variant="default"
      padding="sm"
      interactive={!!onTap}
      onClick={onTap}
      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left side - Account info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-lg" role="img" aria-label="Account type">
            {accountTypeInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
              {account.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${accountTypeInfo.color} text-xs`}>
                {account.account_type?.type || 'Unknown'}
              </Badge>
              {accountStatus && (
                <Badge className={`${accountStatus.color} text-xs`}>
                  {accountStatus.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Balance */}
        <div className="text-right flex-shrink-0">
          <MobileFinancialAmount
            amount={balance}
            variant="secondary"
            colorMode={balanceColorMode}
            compact={true}
          />
          {showChange && previousAmount && (
            <div className="mt-1">
              <MobileAmountChange
                currentAmount={balance}
                previousAmount={previousAmount}
                compact={true}
                showPercentage={false}
              />
            </div>
          )}
        </div>
      </div>
    </MobileCard>
  )
}

/**
 * Loading state for mobile account cards
 */
export function MobileAccountCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <MobileCard variant="default" padding="sm">
        <div className="flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>
      </MobileCard>
    )
  }

  return (
    <MobileCard variant="elevated">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
          <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
      </div>
    </MobileCard>
  )
}
