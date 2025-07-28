'use client'

import { ReactNode, forwardRef } from 'react'
import { clsx } from 'clsx'

interface MobileCardProps {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  className?: string
  onClick?: () => void
  href?: string
  testId?: string
}

/**
 * Mobile-optimized card component with touch-friendly interactions
 * Designed for financial data display with proper accessibility
 */
export const MobileCard = forwardRef<HTMLDivElement, MobileCardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  interactive = false,
  className = '',
  onClick,
  href,
  testId,
  ...props
}, ref) => {
  // Base mobile-first responsive classes
  const baseClasses = 'block w-full transition-all duration-200 ease-in-out'

  // Variant styles optimized for mobile financial data
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg shadow-gray-900/5 dark:shadow-black/20 border border-gray-100 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    filled: 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
  }

  // Mobile-optimized padding
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  // Mobile-friendly rounded corners
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  }

  // Interactive states with proper touch feedback
  const interactiveClasses = interactive || onClick || href ? clsx(
    'cursor-pointer select-none',
    'hover:shadow-md hover:shadow-gray-900/10 dark:hover:shadow-black/30',
    'active:scale-[0.98] active:shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
    // Enhanced touch targets for mobile
    'min-h-[44px] touch-manipulation',
    // Prevent text selection on interactive cards
    'user-select-none'
  ) : ''

  const cardClasses = clsx(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    roundedClasses[rounded],
    interactiveClasses,
    className
  )

  const CardComponent = href ? 'a' : 'div'

  return (
    <CardComponent
      ref={ref}
      className={cardClasses}
      onClick={onClick}
      href={href}
      data-testid={testId}
      role={interactive || onClick || href ? 'button' : undefined}
      tabIndex={interactive || onClick || href ? 0 : undefined}
      onKeyDown={(e) => {
        if ((interactive || onClick || href) && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
      {...props}
    >
      {children}
    </CardComponent>
  )
})

MobileCard.displayName = 'MobileCard'

/**
 * Mobile-optimized card header with financial context
 */
interface MobileCardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function MobileCardHeader({
  title,
  subtitle,
  action,
  icon,
  className = ''
}: MobileCardHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * Mobile-optimized card section with financial data layout
 */
interface MobileCardSectionProps {
  children: ReactNode
  title?: string
  divider?: boolean
  className?: string
}

export function MobileCardSection({
  children,
  title,
  divider = false,
  className = ''
}: MobileCardSectionProps) {
  return (
    <div className={clsx(
      divider && 'border-t border-gray-200 dark:border-gray-700 pt-4 mt-4',
      className
    )}>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
          {title}
        </h4>
      )}
      {children}
    </div>
  )
}

/**
 * Mobile-optimized financial metric display
 */
interface MobileMetricCardProps {
  label: string
  value: ReactNode
  change?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
}

export function MobileMetricCard({
  label,
  value,
  change,
  trend,
  onClick
}: MobileMetricCardProps) {
  const trendIcon = {
    up: (
      <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04L9.25 14.388V3.75A.75.75 0 0110 3z" />
      </svg>
    ),
    neutral: null
  }

  return (
    <MobileCard
      variant="elevated"
      interactive={!!onClick}
      onClick={onClick}
      className="text-center"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        {change && (
          <div className="flex items-center justify-center gap-2">
            {trend && trendIcon[trend]}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {change}
            </div>
          </div>
        )}
      </div>
    </MobileCard>
  )
}
