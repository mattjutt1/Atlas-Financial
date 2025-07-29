'use client'

import React, { useState, useMemo } from 'react'
import { Card, LoadingSpinner } from '@/components/common'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import {
  CurrencyDollarIcon,
  CalendarIcon,
  TrendingUpIcon,
  ClockIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Props {
  portfolioId: string
}

interface DividendPayment {
  id: string
  symbol: string
  companyName: string
  paymentDate: string
  recordDate: string
  exDividendDate: string
  amount: number
  shares: number
  totalPayment: number
  dividendYield: number
  paymentType: 'regular' | 'special' | 'return_of_capital'
  currency: string
}

interface DividendSummary {
  totalAnnualIncome: number
  monthlyAverageIncome: number
  dividendYield: number
  payingStocks: number
  totalStocks: number
  nextPaymentDate: string
  nextPaymentAmount: number
}

export function DividendTracker({ portfolioId }: Props) {
  const [timeFrame, setTimeFrame] = useState<'12M' | '3Y' | '5Y'>('12M')
  const [viewType, setViewType] = useState<'calendar' | 'analytics'>('analytics')

  // Mock dividend data (would come from real dividend API)
  const dividendPayments: DividendPayment[] = useMemo(() => [
    {
      id: '1',
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      paymentDate: '2024-08-15',
      recordDate: '2024-07-22',
      exDividendDate: '2024-07-19',
      amount: 0.25,
      shares: 100,
      totalPayment: 25.00,
      dividendYield: 0.85,
      paymentType: 'regular',
      currency: 'USD'
    },
    {
      id: '2',
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      paymentDate: '2024-09-12',
      recordDate: '2024-08-15',
      exDividendDate: '2024-08-14',
      amount: 0.75,
      shares: 50,
      totalPayment: 37.50,
      dividendYield: 2.1,
      paymentType: 'regular',
      currency: 'USD'
    },
    {
      id: '3',
      symbol: 'JNJ',
      companyName: 'Johnson & Johnson',
      paymentDate: '2024-09-10',
      recordDate: '2024-08-26',
      exDividendDate: '2024-08-23',
      amount: 1.19,
      shares: 30,
      totalPayment: 35.70,
      dividendYield: 3.2,
      paymentType: 'regular',
      currency: 'USD'
    },
    {
      id: '4',
      symbol: 'KO',
      companyName: 'The Coca-Cola Company',
      paymentDate: '2024-10-01',
      recordDate: '2024-09-15',
      exDividendDate: '2024-09-13',
      amount: 0.48,
      shares: 75,
      totalPayment: 36.00,
      dividendYield: 3.8,
      paymentType: 'regular',
      currency: 'USD'
    },
    {
      id: '5',
      symbol: 'REIT',
      companyName: 'Sample REIT',
      paymentDate: '2024-08-30',
      recordDate: '2024-08-15',
      exDividendDate: '2024-08-12',
      amount: 0.89,
      shares: 40,
      totalPayment: 35.60,
      dividendYield: 6.5,
      paymentType: 'regular',
      currency: 'USD'
    }
  ], [])

  // Calculate dividend summary
  const dividendSummary: DividendSummary = useMemo(() => {
    const totalAnnualIncome = dividendPayments.reduce((sum, payment) => sum + (payment.totalPayment * 4), 0) // Quarterly to annual
    const monthlyAverageIncome = totalAnnualIncome / 12
    const totalStocks = new Set(dividendPayments.map(p => p.symbol)).size
    const payingStocks = totalStocks // All stocks in our mock data pay dividends

    // Calculate portfolio dividend yield (mock calculation)
    const portfolioValue = 250000 // Mock portfolio value
    const dividendYield = (totalAnnualIncome / portfolioValue) * 100

    // Find next payment
    const futurePayments = dividendPayments
      .filter(p => new Date(p.paymentDate) > new Date())
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())

    const nextPayment = futurePayments[0]

    return {
      totalAnnualIncome,
      monthlyAverageIncome,
      dividendYield,
      payingStocks,
      totalStocks,
      nextPaymentDate: nextPayment?.paymentDate || '',
      nextPaymentAmount: nextPayment?.totalPayment || 0
    }
  }, [dividendPayments])

  // Generate monthly dividend income chart data
  const monthlyIncomeData = useMemo(() => {
    const months = []
    const currentDate = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)

      // Mock monthly income (would be calculated from actual dividend payments)
      const baseIncome = dividendSummary.monthlyAverageIncome
      const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
      const income = baseIncome * (1 + variation)

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        income: Math.max(0, income),
        date: monthKey
      })
    }

    return months
  }, [dividendSummary.monthlyAverageIncome])

  // Generate dividend growth data
  const dividendGrowthData = useMemo(() => {
    const years = []
    const currentYear = new Date().getFullYear()

    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i
      const baseIncome = dividendSummary.totalAnnualIncome
      const growthRate = Math.pow(1.05, i) // 5% annual growth
      const income = baseIncome / growthRate

      years.push({
        year: year.toString(),
        income: income,
        growth: i === 4 ? 0 : ((income / years[years.length - 1]?.income || 1) - 1) * 100
      })
    }

    return years
  }, [dividendSummary.totalAnnualIncome])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'regular':
        return 'bg-green-100 text-green-800'
      case 'special':
        return 'bg-blue-100 text-blue-800'
      case 'return_of_capital':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dividend Income Tracker</h3>
          <p className="text-sm text-gray-500">
            Track dividend payments and income projections
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewType('analytics')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'analytics'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'calendar'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Dividend Summary Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Annual Income</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dividendSummary.totalAnnualIncome)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {formatCurrency(dividendSummary.monthlyAverageIncome)} per month avg
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <TrendingUpIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Portfolio Yield</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(dividendSummary.dividendYield)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {dividendSummary.payingStocks} of {dividendSummary.totalStocks} holdings
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Next Payment</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dividendSummary.nextPaymentAmount)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {dividendSummary.nextPaymentDate ? formatDate(dividendSummary.nextPaymentDate) : 'No upcoming payments'}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">5-Year Growth</p>
              <p className="text-2xl font-bold text-green-600">
                +12.6%
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Annual dividend growth rate
          </div>
        </Card>
      </div>

      {viewType === 'analytics' ? (
        <>
          {/* Monthly Income Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Monthly Dividend Income</h4>
              <div className="flex items-center space-x-2">
                <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Last 12 months</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Dividend Income']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Dividend Growth Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Annual Dividend Growth</h4>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {['12M', '3Y', '5Y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeFrame(period as any)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      timeFrame === period
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dividendGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Annual Dividend Income']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : (
        /* Dividend Calendar View */
        <Card className="p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-6">Upcoming Dividend Payments</h4>

          <div className="space-y-4">
            {dividendPayments
              .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
              .map((payment) => {
                const isUpcoming = new Date(payment.paymentDate) > new Date()

                return (
                  <div
                    key={payment.id}
                    className={`border rounded-lg p-4 ${
                      isUpcoming ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h5 className="text-sm font-semibold text-gray-900">
                            {payment.symbol}
                          </h5>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentTypeColor(payment.paymentType)}`}>
                            {payment.paymentType.replace('_', ' ').toUpperCase()}
                          </span>
                          {isUpcoming && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              UPCOMING
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {payment.companyName}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500">Payment Date: </span>
                            <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Ex-Dividend: </span>
                            <span className="font-medium">{formatDate(payment.exDividendDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Dividend/Share: </span>
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Shares: </span>
                            <span className="font-medium">{payment.shares.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(payment.totalPayment)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(payment.dividendYield)} yield
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Calendar Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {dividendPayments.filter(p => new Date(p.paymentDate) > new Date()).length}
                </p>
                <p className="text-sm text-gray-500">Upcoming Payments</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(
                    dividendPayments
                      .filter(p => new Date(p.paymentDate) > new Date())
                      .reduce((sum, p) => sum + p.totalPayment, 0)
                  )}
                </p>
                <p className="text-sm text-gray-500">Expected Income</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {dividendPayments.filter(p => new Date(p.paymentDate) <= new Date()).length}
                </p>
                <p className="text-sm text-gray-500">Received This Year</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
