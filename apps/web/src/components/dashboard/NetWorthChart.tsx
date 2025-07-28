'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface NetWorthDataPoint {
  date: string
  netWorth: number
  assets: number
  liabilities: number
}

interface NetWorthChartProps {
  data: NetWorthDataPoint[]
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const currentNetWorth = data[data.length - 1]?.netWorth || 0
  const previousNetWorth = data[data.length - 2]?.netWorth || 0
  const netWorthChange = currentNetWorth - previousNetWorth
  const netWorthChangePercent = previousNetWorth !== 0
    ? ((netWorthChange / Math.abs(previousNetWorth)) * 100)
    : 0

  const timeframeButtons = [
    { label: '1M', value: '1M' as const },
    { label: '3M', value: '3M' as const },
    { label: '6M', value: '6M' as const },
    { label: '1Y', value: '1Y' as const },
    { label: 'ALL', value: 'ALL' as const },
  ]

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Net Worth Trend
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentNetWorth)}
            </span>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              netWorthChange >= 0 ? 'financial-positive' : 'financial-negative'
            }`}>
              {netWorthChange >= 0 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
              <span>
                {formatCurrency(Math.abs(netWorthChange))} ({Math.abs(netWorthChangePercent).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {timeframeButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => setTimeframe(button.value)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeframe === button.value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              className="text-gray-500 dark:text-gray-400"
            />
            <YAxis
              tickFormatter={formatCurrency}
              className="text-gray-500 dark:text-gray-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(31 41 55)',
                border: '1px solid rgb(75 85 99)',
                borderRadius: '8px',
                color: 'white',
              }}
              labelFormatter={(value) => formatDate(value as string)}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'netWorth' ? 'Net Worth' : name === 'assets' ? 'Assets' : 'Liabilities'
              ]}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="assets"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="liabilities"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Net Worth</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-success-500" style={{ borderTop: '2px dashed' }}></div>
          <span className="text-gray-600 dark:text-gray-400">Assets</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-danger-500" style={{ borderTop: '2px dashed' }}></div>
          <span className="text-gray-600 dark:text-gray-400">Liabilities</span>
        </div>
      </div>
    </div>
  )
}
