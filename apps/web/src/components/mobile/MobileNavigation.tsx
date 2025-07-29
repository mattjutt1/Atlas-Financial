'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

interface MobileNavigationProps {
  className?: string
}

/**
 * Mobile-optimized bottom navigation with touch-friendly design
 * Fixed position with safe area insets for modern mobile devices
 */
export function MobileNavigation({ className = '' }: MobileNavigationProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Auto-hide navigation on scroll down, show on scroll up
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          // Scrolling down & past threshold
          setIsVisible(false)
        } else {
          // Scrolling up
          setIsVisible(true)
        }
        setLastScrollY(window.scrollY)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar)
      return () => window.removeEventListener('scroll', controlNavbar)
    }
  }, [lastScrollY])

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: DashboardIcon,
      activeIcon: DashboardIconFilled
    },
    {
      name: 'Accounts',
      href: '/accounts',
      icon: AccountsIcon,
      activeIcon: AccountsIconFilled
    },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: TransactionsIcon,
      activeIcon: TransactionsIconFilled
    },
    {
      name: 'Budget',
      href: '/budget',
      icon: BudgetIcon,
      activeIcon: BudgetIconFilled
    },
    {
      name: 'Goals',
      href: '/goals',
      icon: GoalsIcon,
      activeIcon: GoalsIconFilled
    }
  ]

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md',
        'border-t border-gray-200 dark:border-gray-700',
        'pb-safe-area-inset-bottom', // Safe area for devices with home indicator
        isVisible ? 'translate-y-0' : 'translate-y-full',
        className
      )}
    >
      <div className="px-4 pt-2 pb-1">
        <div className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = isActive ? item.activeIcon : item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 ease-in-out',
                  'min-h-[44px] min-w-[44px]', // Minimum touch target size
                  'touch-manipulation select-none',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'active:scale-95',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6 mb-1" />
                  {isActive && (
                    <div className="absolute -bottom-1 -left-1 -right-1 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
                  )}
                </div>
                <span className={clsx(
                  'text-xs font-medium leading-none',
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

/**
 * Mobile floating action button for primary actions
 */
interface MobileFloatingActionButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function MobileFloatingActionButton({
  onClick,
  icon = <PlusIcon className="w-6 h-6" />,
  className = '',
  disabled = false
}: MobileFloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'fixed bottom-20 right-4 z-40', // Position above navigation
        'w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200 ease-in-out',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'touch-manipulation select-none',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      aria-label="Add new item"
    >
      {icon}
    </button>
  )
}

/**
 * Mobile gesture navigation component for swipe actions
 */
interface MobileGestureNavigationProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  children: React.ReactNode
  className?: string
  threshold?: number
}

export function MobileGestureNavigation({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  className = '',
  threshold = 50
}: MobileGestureNavigationProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > threshold
    const isRightSwipe = distanceX < -threshold
    const isUpSwipe = distanceY > threshold
    const isDownSwipe = distanceY < -threshold

    // Determine primary direction (horizontal vs vertical)
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft()
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight()
      }
    } else {
      // Vertical swipe
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp()
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown()
      }
    }

    // Reset touch states
    setTouchStart(null)
    setTouchEnd(null)
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

/**
 * Mobile pull-to-refresh component
 */
interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  refreshThreshold?: number
}

export function MobilePullToRefresh({
  onRefresh,
  children,
  className = '',
  refreshThreshold = 80
}: MobilePullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY)

    if (distance > 0) {
      setPullDistance(Math.min(distance, refreshThreshold * 1.5))
      // Add some resistance after threshold
      if (distance > refreshThreshold) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > refreshThreshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
    setStartY(0)
  }

  const refreshOpacity = Math.min(pullDistance / refreshThreshold, 1)
  const shouldShowRefresh = pullDistance > 20

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {shouldShowRefresh && (
        <div
          className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-200"
          style={{ opacity: refreshOpacity }}
        >
          <div className="bg-primary-600 text-white px-4 py-2 rounded-b-lg shadow-lg">
            <div className="flex items-center gap-2">
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Refreshing...</span>
                </>
              ) : pullDistance > refreshThreshold ? (
                <>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
                  </svg>
                  <span className="text-sm font-medium">Release to refresh</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white transform rotate-180" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" />
                  </svg>
                  <span className="text-sm font-medium">Pull to refresh</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

// Navigation Icons
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 5v4" />
    </svg>
  )
}

function DashboardIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <rect x="8" y="5" width="1" height="4" />
      <rect x="12" y="5" width="1" height="4" />
      <rect x="16" y="5" width="1" height="4" />
    </svg>
  )
}

function AccountsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function AccountsIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4a2 2 0 00-2 2v6a2 2 0 002 2h2v4a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-6V6a2 2 0 00-2-2H4z" />
      <circle cx="16" cy="13" r="2" />
    </svg>
  )
}

function TransactionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function TransactionsIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2z" />
    </svg>
  )
}

function BudgetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function BudgetIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 13a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6zM11 9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V9zM19 5a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V7a2 2 0 012-2h2z" />
    </svg>
  )
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function MoreIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M3 6a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zM3 18a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1z" />
    </svg>
  )
}

function GoalsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
    </svg>
  )
}

function GoalsIconFilled({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
