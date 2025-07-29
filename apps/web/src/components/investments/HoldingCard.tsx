'use client'

import React, { useState } from 'react'
import { Card } from '@/components/common'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

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

interface Props {
  holding: Holding
  showDetails?: boolean
  onHoldingClick?: (holding: Holding) => void
}

// Asset type styling
const ASSET_TYPE_STYLES = {
  stock: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: ChartBarIcon
  },
  etf: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: ChartBarIcon
  },
  bond: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: CurrencyDollarIcon
  },
  mutual_fund: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: ChartBarIcon
  },
  crypto: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: ChartBarIcon
  },
  real_estate: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    icon: ChartBarIcon
  }
}

export function HoldingCard({ holding, showDetails = false, onHoldingClick }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate metrics
  const costBasis = holding.shares * holding.average_cost
  const unrealizedGain = holding.market_value - costBasis
  const unrealizedGainPercentage = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0

  // Mock daily change (would come from real-time data feed)
  const dailyChange = holding.market_value * 0.015 // Mock 1.5% daily change
  const dailyChangePercentage = 1.5

  // Get asset type styling
  const assetStyle = ASSET_TYPE_STYLES[holding.asset_type] || ASSET_TYPE_STYLES.stock
  const AssetIcon = assetStyle.icon

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  const formatAssetType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleCardClick = () => {
    if (onHoldingClick) {
      onHoldingClick(holding)
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <Card
      className={`p-6 transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isExpanded ? 'ring-2 ring-indigo-500' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${assetStyle.bg} ${assetStyle.border} border`}>
              <AssetIcon className={`h-5 w-5 ${assetStyle.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{holding.symbol}</h3>
              <p className="text-sm text-gray-500 truncate max-w-48">{holding.name}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-md text-xs font-medium ${assetStyle.bg} ${assetStyle.text}`}>
            {formatAssetType(holding.asset_type)}
          </div>
        </div>

        {/* Market Value */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(holding.market_value, holding.currency)}
            </span>
            <div className={`flex items-center text-sm font-medium ${
              dailyChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {dailyChange >= 0 ? (
                <TrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {formatCurrency(Math.abs(dailyChange))} ({formatPercentage(dailyChangePercentage)})
            </div>
          </div>
          <p className="text-sm text-gray-500">Market Value</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Shares</p>
            <p className="text-lg text-gray-900">{holding.shares.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Current Price</p>
            <p className="text-lg text-gray-900">
              {formatCurrency(holding.current_price, holding.currency)}
            </p>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Unrealized Gain/Loss</span>
            <InformationCircleIcon className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-lg font-semibold ${
              unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(unrealizedGain, holding.currency)}
            </span>
            <span className={`text-sm font-medium ${
              unrealizedGainPercentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(unrealizedGainPercentage)}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Cost Basis: {formatCurrency(costBasis, holding.currency)}
            ({formatCurrency(holding.average_cost, holding.currency)}/share)
          </div>
        </div>

        {/* Expanded Details */}
        {(isExpanded || showDetails) && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Purchase Info
                  </p>
                  <p className="text-sm text-gray-900">
                    Avg Cost: {formatCurrency(holding.average_cost, holding.currency)}
                  </p>
                  <p className="text-sm text-gray-900">
                    Total Cost: {formatCurrency(costBasis, holding.currency)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Market Info
                  </p>
                  <p className="text-sm text-gray-900">
                    Current: {formatCurrency(holding.current_price, holding.currency)}
                  </p>
                  <p className="text-sm text-gray-900">
                    Value: {formatCurrency(holding.market_value, holding.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                <span>Performance Chart</span>
              </div>
              <div className="h-24 bg-white rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
                <span className="text-sm text-gray-400">Chart would be here</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>
                  Added: {new Date(holding.created_at).toLocaleDateString()}
                </span>
              </div>
              <span>
                Last updated: {new Date(holding.last_price_update).toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                View Details
              </button>
              <button className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Buy More
              </button>
              <button className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Sell
              </button>
            </div>
          </div>
        )}

        {/* Collapse/Expand Indicator */}
        {!onHoldingClick && (
          <div className="flex justify-center pt-2">
            <button className="text-xs text-gray-400 hover:text-gray-600">
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
