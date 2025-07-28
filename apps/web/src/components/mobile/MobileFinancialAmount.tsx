'use client'

import { useMemo } from 'react'
import { FinancialAmount, formatFinancialAmount } from '@/lib/financial/FinancialAmount'

interface MobileFinancialAmountProps {
  amount: FinancialAmount | string | number
  variant?: 'primary' | 'secondary' | 'compact' | 'large'
  colorMode?: 'auto' | 'positive' | 'negative' | 'neutral'
  currencyCode?: string
  className?: string
  showSign?: boolean
  compact?: boolean
}

/**
 * Mobile-optimized financial amount display component
 * Follows mobile-first design principles with clear hierarchy and touch-friendly sizing
 */
export function MobileFinancialAmount({
  amount,
  variant = 'primary',
  colorMode = 'auto',
  currencyCode = 'USD',
  className = '',
  showSign = false,
  compact = false
}: MobileFinancialAmountProps) {
  const financialAmount = useMemo(() => {
    return amount instanceof FinancialAmount ? amount : new FinancialAmount(amount)
  }, [amount])

  const formattedAmount = useMemo(() => {
    if (compact) {
      return financialAmount.toCurrencyCompact(currencyCode)
    }
    return formatFinancialAmount(financialAmount, currencyCode)
  }, [financialAmount, currencyCode, compact])

  const displayAmount = useMemo(() => {
    if (showSign && financialAmount.isPositive()) {
      return `+${formattedAmount}`
    }
    return formattedAmount
  }, [formattedAmount, showSign, financialAmount])

  // Determine color classes based on amount and mode
  const colorClasses = useMemo(() => {
    if (colorMode === 'neutral') return 'text-gray-900 dark:text-gray-100'
    if (colorMode === 'positive') return 'text-success-600 dark:text-success-400'
    if (colorMode === 'negative') return 'text-danger-600 dark:text-danger-400'

    // Auto mode - determine by amount value
    if (financialAmount.isPositive()) {
      return 'text-success-600 dark:text-success-400'
    } else if (financialAmount.isNegative()) {
      return 'text-danger-600 dark:text-danger-400'
    }
    return 'text-gray-900 dark:text-gray-100'
  }, [colorMode, financialAmount])

  // Variant-based sizing and styling
  const variantClasses = useMemo(() => {
    switch (variant) {
      case 'large':
        return 'text-3xl sm:text-4xl font-bold leading-none'
      case 'primary':
        return 'text-xl sm:text-2xl font-semibold leading-tight'
      case 'secondary':
        return 'text-lg sm:text-xl font-medium leading-tight'
      case 'compact':
        return 'text-base sm:text-lg font-medium leading-tight'
      default:
        return 'text-xl sm:text-2xl font-semibold leading-tight'
    }
  }, [variant])

  // Mobile-optimized font weight and spacing
  const baseClasses = 'font-mono tabular-nums tracking-tight select-none'

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${colorClasses} ${className}`}
      aria-label={`Amount: ${displayAmount}`}
      role="text"
    >
      {displayAmount}
    </span>
  )
}

/**
 * Mobile-optimized amount comparison component
 * Shows change with visual indicators and touch-friendly layout
 */
interface MobileAmountChangeProps {
  currentAmount: FinancialAmount | string | number
  previousAmount: FinancialAmount | string | number
  showPercentage?: boolean
  compact?: boolean
  currencyCode?: string
}

export function MobileAmountChange({
  currentAmount,
  previousAmount,
  showPercentage = true,
  compact = false,
  currencyCode = 'USD'
}: MobileAmountChangeProps) {
  const current = useMemo(() =>
    currentAmount instanceof FinancialAmount ? currentAmount : new FinancialAmount(currentAmount)
  , [currentAmount])

  const previous = useMemo(() =>
    previousAmount instanceof FinancialAmount ? previousAmount : new FinancialAmount(previousAmount)
  , [previousAmount])

  const change = useMemo(() => current.subtract(previous), [current, previous])
  const percentageChange = useMemo(() => {
    if (previous.isZero()) return null
    return change.divide(previous.abs()).multiply(100)
  }, [change, previous])

  const isPositive = change.greaterThan(0)
  const isNegative = change.lessThan(0)

  const iconClasses = compact ? 'w-3 h-3' : 'w-4 h-4'
  const textClasses = compact ? 'text-sm' : 'text-base font-medium'

  return (
    <div className={`flex items-center gap-2 ${compact ? 'gap-1' : 'gap-2'}`}>
      {/* Change indicator arrow */}
      <div className={`flex items-center justify-center ${iconClasses}`}>
        {isPositive && (
          <svg className={`${iconClasses} text-success-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" />
          </svg>
        )}
        {isNegative && (
          <svg className={`${iconClasses} text-danger-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04L9.25 14.388V3.75A.75.75 0 0110 3z" />
          </svg>
        )}
        {change.isZero() && (
          <div className={`${iconClasses.replace('w-', 'w-').replace('h-', 'h-')} bg-gray-400 rounded-full`} />
        )}
      </div>

      {/* Change amount */}
      <MobileFinancialAmount
        amount={change.abs()}
        variant={compact ? 'compact' : 'secondary'}
        colorMode={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
        currencyCode={currencyCode}
        showSign={false}
        compact={compact}
        className={textClasses}
      />

      {/* Percentage change */}
      {showPercentage && percentageChange && (
        <span className={`${textClasses} ${
          isPositive ? 'text-success-600 dark:text-success-400' :
          isNegative ? 'text-danger-600 dark:text-danger-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          ({percentageChange.toNumber().toFixed(1)}%)
        </span>
      )}
    </div>
  )
}
