'use client'

import { useEffect, useState } from 'react'
import { AccountCard } from '@/components/dashboard/AccountCard'
import { NetWorthChart } from '@/components/dashboard/NetWorthChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { BrutalHonestyInsight } from '@/components/dashboard/BrutalHonestyInsight'
import { AICFOInsights } from '@/components/dashboard/AICFOInsights'
import { LoadingSpinner, Card } from '@/components/common'
import { MobileDashboard } from '@/components/mobile/MobileDashboard'
import { SessionAuth } from '@/components/auth/AuthWrapper'
import { useSessionContext } from 'supertokens-auth-react/recipe/session'
import { useFinancialData } from '@/hooks'
import { mockNetWorthData, mockInsights } from '@/lib/fixtures'

function LandingPage() {
  return (
    <div className="min-h-screen-mobile bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Atlas Financial
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            The brutally honest personal finance platform that tells you the truth about your money.
            No sugar-coating. No false hope. Just reality.
          </p>
          <div className="space-y-4">
            <div className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium touch-manipulation">
              Please sign in to access your dashboard
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Atlas Financial v1.6 - Mobile-First Design
            </p>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-4xl mx-auto px-4">
          <Card className="text-center p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-2">Brutal Honesty</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Get the unfiltered truth about your financial situation
            </p>
          </Card>

          <Card className="text-center p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-2">Mobile-First</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Optimized for mobile with touch gestures and responsive design
            </p>
          </Card>

          <Card className="text-center p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-semibold mb-2">Action-Oriented</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Concrete steps to improve your financial future
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const session = useSessionContext()
  const { accounts, transactions, loading: dataLoading, error } = useFinancialData()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (dataLoading) {
    return <LoadingSpinner fullScreen />
  }

  // Use mobile-optimized dashboard on small screens
  if (isMobile) {
    return (
      <MobileDashboard
        userId={session.userId}
        onAccountTap={(account) => {
          // Navigate to account detail
          console.log('Account tapped:', account)
        }}
        onTransactionTap={(transaction) => {
          // Navigate to transaction detail
          console.log('Transaction tapped:', transaction)
        }}
        onViewAllAccounts={() => {
          // Navigate to accounts page
          window.location.href = '/accounts'
        }}
        onViewAllTransactions={() => {
          // Navigate to transactions page
          window.location.href = '/transactions'
        }}
      />
    )
  }

  // Desktop dashboard layout
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Financial Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome back, {session.userId || 'User'}. Here's your brutal financial reality.
        </p>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            Error loading financial data: {error.message}
          </div>
        )}
      </div>

      {/* Top Row - Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {accounts.length > 0 ? (
          accounts.slice(0, 3).map((account: any) => (
            <AccountCard key={account.id} account={account as any} />
          ))
        ) : (
          <div className="col-span-3 text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No accounts found. Connect your financial accounts to get started.
            </p>
          </div>
        )}
      </div>

      {/* Second Row - Net Worth Chart + Brutal Honesty */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <NetWorthChart data={mockNetWorthData} />
        </div>
        <div>
          <BrutalHonestyInsight insights={mockInsights} />
        </div>
      </div>

      {/* Third Row - AI CFO Insights */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <AICFOInsights 
          userId={session.userId}
          accounts={accounts}
          transactions={transactions}
        />
      </div>

      {/* Fourth Row - Recent Transactions */}
      <div className="grid grid-cols-1 gap-6">
        <RecentTransactions transactions={transactions.slice(0, 10)} />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <SessionAuth fallback={<LandingPage />}>
      <Dashboard />
    </SessionAuth>
  )
}
