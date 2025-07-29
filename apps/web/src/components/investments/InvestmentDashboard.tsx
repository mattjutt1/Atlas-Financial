'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_USER_PORTFOLIOS } from '@/lib/graphql/queries'
import { useAuthentication } from '@/hooks/useAuthentication'
import { LoadingSpinner } from '@/components/common'
import { PortfolioOverviewCard } from './PortfolioOverviewCard'
import { AssetAllocationChart } from './AssetAllocationChart'
import { HoldingCard } from './HoldingCard'
import { PerformanceChart } from './PerformanceChart'
import { PortfolioRebalancer } from './PortfolioRebalancer'
import { DividendTracker } from './DividendTracker'
import { RiskAnalysisPanel } from './RiskAnalysisPanel'
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface Portfolio {
  id: string
  user_id: string
  name: string
  portfolio_type: string
  total_value: number
  currency: string
  provider?: string
  account_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
  holdings: Holding[]
}

interface Holding {
  id: string
  portfolio_id: string
  symbol: string
  name: string
  asset_type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'real_estate'
  shares: number
  average_cost: number
  current_price: number
  market_value: number
  currency: string
  last_price_update: string
  created_at: string
  updated_at: string
}

type TabType = 'overview' | 'performance' | 'allocation' | 'holdings' | 'rebalance' | 'dividends' | 'risk'

export function InvestmentDashboard() {
  const { user, isLoading: authLoading } = useAuthentication()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('')

  const { data, loading, error, refetch } = useQuery(GET_USER_PORTFOLIOS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  })

  const portfolios: Portfolio[] = data?.portfolios || []

  // Calculate aggregate portfolio metrics
  const aggregatedMetrics = useMemo(() => {
    if (!portfolios.length) return null

    const totalValue = portfolios.reduce((sum, portfolio) => sum + portfolio.total_value, 0)
    const totalHoldings = portfolios.reduce((sum, portfolio) => sum + portfolio.holdings.length, 0)

    // Calculate total cost basis and unrealized gains
    let totalCostBasis = 0
    let totalUnrealizedGain = 0

    portfolios.forEach(portfolio => {
      portfolio.holdings.forEach(holding => {
        const costBasis = holding.shares * holding.average_cost
        const unrealizedGain = holding.market_value - costBasis
        totalCostBasis += costBasis
        totalUnrealizedGain += unrealizedGain
      })
    })

    const totalReturnPercentage = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0

    return {
      totalValue,
      totalCostBasis,
      totalUnrealizedGain,
      totalReturnPercentage,
      totalHoldings,
      portfolioCount: portfolios.length
    }
  }, [portfolios])

  // Get selected portfolio data
  const currentPortfolio = selectedPortfolio
    ? portfolios.find(p => p.id === selectedPortfolio)
    : portfolios[0]

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: ChartBarIcon },
    { id: 'performance' as TabType, name: 'Performance', icon: PresentationChartLineIcon },
    { id: 'allocation' as TabType, name: 'Allocation', icon: ScaleIcon },
    { id: 'holdings' as TabType, name: 'Holdings', icon: CurrencyDollarIcon },
    { id: 'rebalance' as TabType, name: 'Rebalance', icon: AdjustmentsHorizontalIcon },
    { id: 'dividends' as TabType, name: 'Dividends', icon: CurrencyDollarIcon },
    { id: 'risk' as TabType, name: 'Risk Analysis', icon: ShieldCheckIcon }
  ]

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="text-red-800">
          <h3 className="text-sm font-medium">Error loading portfolios</h3>
          <p className="mt-1 text-sm">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!portfolios.length) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No portfolios</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by connecting your investment accounts or adding manual holdings.
        </p>
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <ChartBarIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add Portfolio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Investment Portfolio
          </h2>
          {aggregatedMetrics && (
            <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="font-medium">
                  ${aggregatedMetrics.totalValue.toLocaleString()}
                </span>
                <span className="ml-2">
                  Total Value
                </span>
              </div>
              <div className={`mt-2 flex items-center text-sm ${
                aggregatedMetrics.totalReturnPercentage >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                <span className="font-medium">
                  {aggregatedMetrics.totalReturnPercentage >= 0 ? '+' : ''}
                  {aggregatedMetrics.totalReturnPercentage.toFixed(2)}%
                </span>
                <span className="ml-2 text-gray-500">
                  Total Return
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Selector */}
        {portfolios.length > 1 && (
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <select
              value={selectedPortfolio || portfolios[0]?.id || ''}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} ({portfolio.portfolio_type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 inline mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PortfolioOverviewCard
              portfolio={currentPortfolio}
              aggregatedMetrics={aggregatedMetrics}
            />
            <AssetAllocationChart
              portfolio={currentPortfolio}
            />
          </div>
        )}

        {activeTab === 'performance' && currentPortfolio && (
          <PerformanceChart portfolioId={currentPortfolio.id} />
        )}

        {activeTab === 'allocation' && currentPortfolio && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AssetAllocationChart portfolio={currentPortfolio} detailed />
            </div>
            <div>
              <RiskAnalysisPanel portfolioId={currentPortfolio.id} />
            </div>
          </div>
        )}

        {activeTab === 'holdings' && currentPortfolio && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentPortfolio.holdings
              .sort((a, b) => b.market_value - a.market_value)
              .map((holding) => (
                <HoldingCard key={holding.id} holding={holding} />
              ))}
          </div>
        )}

        {activeTab === 'rebalance' && currentPortfolio && (
          <PortfolioRebalancer portfolioId={currentPortfolio.id} />
        )}

        {activeTab === 'dividends' && currentPortfolio && (
          <DividendTracker portfolioId={currentPortfolio.id} />
        )}

        {activeTab === 'risk' && currentPortfolio && (
          <RiskAnalysisPanel portfolioId={currentPortfolio.id} detailed />
        )}
      </div>
    </div>
  )
}
