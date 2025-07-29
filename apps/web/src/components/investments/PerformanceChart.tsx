'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, LoadingSpinner } from '@/components/common'
import { GET_PORTFOLIO_PERFORMANCE } from '@/lib/graphql/queries'
import {
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Props {
  portfolioId: string
}

type TimeFrame = '1D' | '7D' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

interface PerformanceData {
  date: string
  total_value: number
  daily_return: number
  cumulative_return: number
}

export function PerformanceChart({ portfolioId }: Props) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1M')
  const [chartType, setChartType] = useState<'line' | 'area'>('area')

  // Calculate date range based on selected timeframe
  const dateRange = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()

    switch (selectedTimeFrame) {
      case '1D':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7D':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case '6M':
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'ALL':
        startDate.setFullYear(endDate.getFullYear() - 5) // 5 years max for performance
        break
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }, [selectedTimeFrame])

  const { data, loading, error } = useQuery(GET_PORTFOLIO_PERFORMANCE, {
    variables: {
      portfolioId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    },
    fetchPolicy: 'cache-and-network'
  })

  // Generate mock performance data if no real data available
  const performanceData = useMemo(() => {
    if (data?.portfolios_by_pk?.performance_history?.length) {
      return data.portfolios_by_pk.performance_history
    }

    // Generate mock data for demonstration
    const mockData: PerformanceData[] = []
    const startValue = 100000
    let currentValue = startValue
    const days = selectedTimeFrame === '1D' ? 1 :
                 selectedTimeFrame === '7D' ? 7 :
                 selectedTimeFrame === '1M' ? 30 :
                 selectedTimeFrame === '3M' ? 90 :
                 selectedTimeFrame === '6M' ? 180 :
                 selectedTimeFrame === '1Y' ? 365 : 1825

    for (let i = 0; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))

      // Generate realistic market movement
      const dailyReturn = (Math.random() - 0.5) * 0.04 // ±2% daily volatility
      currentValue = currentValue * (1 + dailyReturn)

      const cumulativeReturn = ((currentValue - startValue) / startValue) * 100

      mockData.push({
        date: date.toISOString().split('T')[0],
        total_value: currentValue,
        daily_return: dailyReturn * 100,
        cumulative_return: cumulativeReturn
      })
    }

    return mockData
  }, [data, selectedTimeFrame])

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!performanceData.length) return null

    const firstValue = performanceData[0].total_value
    const lastValue = performanceData[performanceData.length - 1].total_value
    const totalReturn = lastValue - firstValue
    const totalReturnPercentage = (totalReturn / firstValue) * 100

    // Calculate volatility (standard deviation of daily returns)
    const dailyReturns = performanceData.slice(1).map((item, index) => {
      const prevValue = performanceData[index].total_value
      return ((item.total_value - prevValue) / prevValue) * 100
    })

    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length
    const volatility = Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility

    // Calculate max drawdown
    let maxValue = firstValue
    let maxDrawdown = 0

    performanceData.forEach(item => {
      if (item.total_value > maxValue) {
        maxValue = item.total_value
      }
      const drawdown = ((maxValue - item.total_value) / maxValue) * 100
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return {
      startValue: firstValue,
      endValue: lastValue,
      totalReturn,
      totalReturnPercentage,
      volatility,
      maxDrawdown,
      sharpeRatio: volatility > 0 ? (totalReturnPercentage / volatility) : 0
    }
  }, [performanceData])

  const timeFrames: TimeFrame[] = ['1D', '7D', '1M', '3M', '6M', '1Y', 'ALL']

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (selectedTimeFrame === '1D') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Error loading performance data</p>
          <p className="text-xs text-red-500">{error.message}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Summary */}
      {performanceMetrics && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center">
              {performanceMetrics.totalReturn >= 0 ? (
                <TrendingUpIcon className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <TrendingDownIcon className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className="text-sm font-medium text-gray-900">Total Return</span>
            </div>
            <p className={`mt-1 text-lg font-semibold ${
              performanceMetrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(performanceMetrics.totalReturn)}
            </p>
            <p className={`text-sm ${
              performanceMetrics.totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(performanceMetrics.totalReturnPercentage)}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Volatility</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatPercentage(performanceMetrics.volatility)}
            </p>
            <p className="text-xs text-gray-500">Annualized</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <TrendingDownIcon className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Max Drawdown</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-red-600">
              -{formatPercentage(performanceMetrics.maxDrawdown).substring(1)}
            </p>
            <p className="text-xs text-gray-500">Peak to trough</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-sm font-medium text-gray-900">Sharpe Ratio</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {performanceMetrics.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">Risk-adjusted return</p>
          </Card>
        </div>
      )}

      {/* Main Performance Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>

          <div className="flex items-center space-x-4">
            {/* Chart Type Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-sm rounded ${
                  chartType === 'line'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-sm rounded ${
                  chartType === 'area'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Area
              </button>
            </div>

            {/* Time Frame Selector */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {timeFrames.map((timeFrame) => (
                <button
                  key={timeFrame}
                  onClick={() => setSelectedTimeFrame(timeFrame)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    selectedTimeFrame === timeFrame
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {timeFrame}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={performanceMetrics?.totalReturn >= 0 ? "#10B981" : "#EF4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={performanceMetrics?.totalReturn >= 0 ? "#10B981" : "#EF4444"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total_value"
                  stroke={performanceMetrics?.totalReturn >= 0 ? "#10B981" : "#EF4444"}
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
              </AreaChart>
            ) : (
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total_value"
                  stroke={performanceMetrics?.totalReturn >= 0 ? "#10B981" : "#EF4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>
              {selectedTimeFrame} performance
              {performanceMetrics && (
                <> • {formatCurrency(performanceMetrics.startValue)} to {formatCurrency(performanceMetrics.endValue)}</>
              )}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </Card>
    </div>
  )
}
