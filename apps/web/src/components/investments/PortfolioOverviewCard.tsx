'use client'

import React from 'react'
import { Card } from '@/components/common'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Portfolio {
  id: string
  name: string
  portfolio_type: string
  total_value: number
  currency: string
  provider?: string
  created_at: string
  holdings: Holding[]
}

interface Holding {
  id: string
  symbol: string
  name: string
  asset_type: string
  shares: number
  average_cost: number
  current_price: number
  market_value: number
  last_price_update: string
}

interface AggregatedMetrics {
  totalValue: number
  totalCostBasis: number
  totalUnrealizedGain: number
  totalReturnPercentage: number
  totalHoldings: number
  portfolioCount: number
}

interface Props {
  portfolio?: Portfolio
  aggregatedMetrics?: AggregatedMetrics | null
}

export function PortfolioOverviewCard({ portfolio, aggregatedMetrics }: Props) {
  if (!portfolio || !aggregatedMetrics) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No portfolio data available</p>
        </div>
      </Card>
    )
  }

  // Calculate portfolio-specific metrics
  const portfolioCostBasis = portfolio.holdings.reduce((sum, holding) => {
    return sum + (holding.shares * holding.average_cost)
  }, 0)

  const portfolioUnrealizedGain = portfolio.total_value - portfolioCostBasis
  const portfolioReturnPercentage = portfolioCostBasis > 0
    ? (portfolioUnrealizedGain / portfolioCostBasis) * 100
    : 0

  // Get top holdings
  const topHoldings = portfolio.holdings
    .sort((a, b) => b.market_value - a.market_value)
    .slice(0, 3)

  // Calculate today's change (mock data for now - would come from real-time price feed)
  const todayChange = portfolio.total_value * 0.012 // Mock 1.2% daily change
  const todayChangePercentage = 1.2

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{portfolio.name}</h3>
            <p className="text-sm text-gray-500">{portfolio.portfolio_type}</p>
          </div>
          {portfolio.provider && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{portfolio.provider}</p>
              <p className="text-xs text-gray-500">Provider</p>
            </div>
          )}
        </div>

        {/* Total Value */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(portfolio.total_value, portfolio.currency)}
            </span>
            <div className={`flex items-center text-sm font-medium ${
              todayChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {todayChange >= 0 ? (
                <TrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {formatCurrency(Math.abs(todayChange))} ({formatPercentage(todayChangePercentage)})
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Today's change
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-900">Cost Basis</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(portfolioCostBasis, portfolio.currency)}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUpIcon className={`h-5 w-5 mr-2 ${
                portfolioUnrealizedGain >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-900">Unrealized Gain</span>
            </div>
            <p className={`mt-1 text-lg font-semibold ${
              portfolioUnrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(portfolioUnrealizedGain, portfolio.currency)}
            </p>
            <p className={`text-sm ${
              portfolioReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(portfolioReturnPercentage)}
            </p>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {portfolio.holdings.length}
              </p>
              <p className="text-sm text-gray-500">Holdings</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(portfolio.holdings.map(h => h.asset_type)).size}
              </p>
              <p className="text-sm text-gray-500">Asset Types</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(
                  (Date.now() - new Date(portfolio.created_at).getTime()) /
                  (1000 * 60 * 60 * 24)
                )}
              </p>
              <p className="text-sm text-gray-500">Days Active</p>
            </div>
          </div>
        </div>

        {/* Top Holdings */}
        {topHoldings.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Top Holdings</h4>
            <div className="space-y-3">
              {topHoldings.map((holding, index) => {
                const weight = (holding.market_value / portfolio.total_value) * 100
                const gain = holding.market_value - (holding.shares * holding.average_cost)
                const gainPercentage = ((holding.current_price - holding.average_cost) / holding.average_cost) * 100

                return (
                  <div key={holding.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {holding.symbol}
                        </p>
                        <p className="text-xs text-gray-500">
                          {holding.shares.toFixed(2)} shares
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(holding.market_value)}
                      </p>
                      <div className="flex items-center text-xs">
                        <span className="text-gray-500 mr-2">
                          {weight.toFixed(1)}%
                        </span>
                        <span className={
                          gainPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }>
                          {formatPercentage(gainPercentage)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
          <ClockIcon className="h-4 w-4 mr-1" />
          <span>
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  )
}
