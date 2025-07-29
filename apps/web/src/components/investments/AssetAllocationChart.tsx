'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/common'
import { ScaleIcon } from '@heroicons/react/24/outline'

interface Portfolio {
  id: string
  name: string
  total_value: number
  currency: string
  holdings: Holding[]
}

interface Holding {
  id: string
  symbol: string
  name: string
  asset_type: string
  market_value: number
  shares: number
  average_cost: number
  current_price: number
}

interface Props {
  portfolio?: Portfolio
  detailed?: boolean
}

// Asset type colors for consistent visualization
const ASSET_TYPE_COLORS = {
  stock: '#3B82F6',      // Blue
  etf: '#10B981',        // Green
  bond: '#F59E0B',       // Amber
  mutual_fund: '#8B5CF6', // Purple
  crypto: '#EF4444',     // Red
  real_estate: '#06B6D4', // Cyan
  commodity: '#84CC16',   // Lime
  cash: '#6B7280'        // Gray
}

const ASSET_TYPE_LABELS = {
  stock: 'Stocks',
  etf: 'ETFs',
  bond: 'Bonds',
  mutual_fund: 'Mutual Funds',
  crypto: 'Cryptocurrency',
  real_estate: 'Real Estate',
  commodity: 'Commodities',
  cash: 'Cash & Cash Equivalents'
}

export function AssetAllocationChart({ portfolio, detailed = false }: Props) {
  const allocationData = useMemo(() => {
    if (!portfolio?.holdings.length) return []

    // Group holdings by asset type
    const assetTypeGroups = portfolio.holdings.reduce((groups, holding) => {
      const assetType = holding.asset_type
      if (!groups[assetType]) {
        groups[assetType] = {
          name: ASSET_TYPE_LABELS[assetType as keyof typeof ASSET_TYPE_LABELS] || assetType,
          value: 0,
          count: 0,
          holdings: []
        }
      }
      groups[assetType].value += holding.market_value
      groups[assetType].count += 1
      groups[assetType].holdings.push(holding)
      return groups
    }, {} as Record<string, any>)

    // Convert to array and calculate percentages
    return Object.entries(assetTypeGroups).map(([assetType, data]) => ({
      assetType,
      name: data.name,
      value: data.value,
      count: data.count,
      percentage: (data.value / portfolio.total_value) * 100,
      color: ASSET_TYPE_COLORS[assetType as keyof typeof ASSET_TYPE_COLORS] || '#6B7280',
      holdings: data.holdings
    })).sort((a, b) => b.value - a.value)
  }, [portfolio])

  const topHoldingsData = useMemo(() => {
    if (!portfolio?.holdings.length) return []

    return portfolio.holdings
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, detailed ? 10 : 5)
      .map(holding => ({
        symbol: holding.symbol,
        name: holding.name,
        value: holding.market_value,
        percentage: (holding.market_value / portfolio.total_value) * 100,
        color: ASSET_TYPE_COLORS[holding.asset_type as keyof typeof ASSET_TYPE_COLORS] || '#6B7280'
      }))
  }, [portfolio, detailed])

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (!portfolio || !allocationData.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <ScaleIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No allocation data available</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${detailed ? '' : 'lg:col-span-1'}`}>
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation</h3>

        {/* Pie Chart */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={detailed ? 80 : 60}
                outerRadius={detailed ? 120 : 100}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value, portfolio.currency),
                  'Value'
                ]}
                labelFormatter={(label: string) => `Asset Type: ${label}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Breakdown */}
        <div className="space-y-3">
          {allocationData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.count} holdings</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.value, portfolio.currency)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPercentage(item.percentage)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Target vs Actual (if detailed view) */}
        {detailed && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Target vs Current Allocation</h4>
            <div className="space-y-4">
              {allocationData.map((item, index) => {
                // Mock target allocation - in real app this would come from user preferences
                const targetPercentage = index === 0 ? 60 : index === 1 ? 30 : 10
                const deviation = item.percentage - targetPercentage

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <div className="flex space-x-4">
                        <span className="text-gray-500">
                          Target: {targetPercentage}%
                        </span>
                        <span className="text-gray-900">
                          Current: {formatPercentage(item.percentage)}
                        </span>
                        <span className={`font-medium ${
                          Math.abs(deviation) > 5
                            ? deviation > 0 ? 'text-red-600' : 'text-blue-600'
                            : 'text-green-600'
                        }`}>
                          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                      {/* Target marker */}
                      <div
                        className="absolute top-0 w-0.5 h-2 bg-gray-600"
                        style={{ left: `${Math.min(targetPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Top Holdings Bar Chart */}
      {detailed && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Holdings</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topHoldingsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="symbol"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, portfolio.currency)}
              />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  formatCurrency(value, portfolio.currency),
                  'Market Value'
                ]}
                labelFormatter={(label: string, payload: any) => {
                  const data = payload?.[0]?.payload
                  return data ? `${data.symbol} - ${data.name}` : label
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {topHoldingsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
