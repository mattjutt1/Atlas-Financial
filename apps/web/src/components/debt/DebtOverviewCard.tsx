'use client'

import React from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

interface DebtOverviewCardProps {
  totalDebt: number
  monthlyMinimums: number
  debtStatistics?: {
    totalBalance: { amount: number; currency: string }
    totalMinimumPayments: { amount: number; currency: string }
    averageInterestRate: { value: number }
    highestInterestRate: { value: number }
    lowestInterestRate: { value: number }
    debtAccountCount: number
    debtToIncomeRatio?: { value: number }
    timeToPayoffMinimumMonths: number
    totalInterestMinimum: { amount: number; currency: string }
  }
  debtUtilization?: {
    creditUtilization: { value: number }
    availableCredit: { amount: number; currency: string }
    totalCreditLimits: { amount: number; currency: string }
    usedCredit: { amount: number; currency: string }
    accountsAtMaxUtilization: number
  }
  debtsByType: Array<{
    type: string
    totalBalance: number
    totalMinimumPayment: number
    count: number
  }>
}

const DebtOverviewCard: React.FC<DebtOverviewCardProps> = ({
  totalDebt,
  monthlyMinimums,
  debtStatistics,
  debtUtilization,
  debtsByType,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-red-600 dark:text-red-400'
    if (utilization >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getUtilizationBadgeVariant = (utilization: number) => {
    if (utilization >= 80) return 'danger'
    if (utilization >= 50) return 'warning'
    return 'success'
  }

  const debtTypeLabels: { [key: string]: string } = {
    CREDIT_CARD: 'Credit Cards',
    STUDENT_LOAN: 'Student Loans',
    MORTGAGE: 'Mortgages',
    PERSONAL_LOAN: 'Personal Loans',
    AUTO_LOAN: 'Auto Loans',
    HOME_EQUITY_LOAN: 'Home Equity',
    MEDICAL_DEBT: 'Medical Debt',
    OTHER: 'Other Debt',
  }

  return (
    <div className="space-y-6">
      {/* Primary Overview Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Debt Overview
            </h3>
            {debtUtilization && (
              <Badge
                variant={getUtilizationBadgeVariant(debtUtilization.creditUtilization.value)}
                size="sm"
              >
                {formatPercentage(debtUtilization.creditUtilization.value)} Utilization
              </Badge>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-red-600 dark:text-red-400 text-sm font-medium mb-1">
                Total Debt
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(totalDebt)}
              </div>
              {debtStatistics && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {debtStatistics.debtAccountCount} accounts
                </div>
              )}
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                Monthly Minimums
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(monthlyMinimums)}
              </div>
              {debtStatistics && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {formatPercentage(debtStatistics.averageInterestRate.value)} avg rate
                </div>
              )}
            </div>

            {debtStatistics && (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-1">
                    Time to Payoff
                  </div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {Math.round(debtStatistics.timeToPayoffMinimumMonths / 12)}y
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {debtStatistics.timeToPayoffMinimumMonths % 12}mo with minimums
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">
                    Total Interest
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(debtStatistics.totalInterestMinimum.amount)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    with minimum payments
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Interest Rate Range */}
          {debtStatistics && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Interest Rate Range
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Low: <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatPercentage(debtStatistics.lowestInterestRate.value)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      High: <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatPercentage(debtStatistics.highestInterestRate.value)}
                      </span>
                    </div>
                  </div>
                </div>
                {debtStatistics.debtToIncomeRatio && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Debt-to-Income
                    </div>
                    <div className={`text-lg font-bold ${
                      debtStatistics.debtToIncomeRatio.value > 40 ? 'text-red-600 dark:text-red-400' :
                      debtStatistics.debtToIncomeRatio.value > 20 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {formatPercentage(debtStatistics.debtToIncomeRatio.value)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debt by Type */}
          {debtsByType.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Debt Breakdown
              </h4>
              <div className="space-y-3">
                {debtsByType.map((category) => {
                  const percentage = (category.totalBalance / totalDebt) * 100
                  return (
                    <div key={category.type} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {debtTypeLabels[category.type] || category.type}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatCurrency(category.totalBalance)}
                            </span>
                            <Badge variant="secondary" size="xs">
                              {category.count}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPercentage(percentage)} of total debt
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(category.totalMinimumPayment)}/mo minimum
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Credit Utilization Card */}
      {debtUtilization && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Credit Utilization
              </h4>
              <Badge
                variant={getUtilizationBadgeVariant(debtUtilization.creditUtilization.value)}
                size="sm"
              >
                {debtUtilization.accountsAtMaxUtilization > 0 && (
                  <span className="mr-1">⚠️</span>
                )}
                {formatPercentage(debtUtilization.creditUtilization.value)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Used Credit
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(debtUtilization.usedCredit.amount)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  of {formatCurrency(debtUtilization.totalCreditLimits.amount)} total
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Available Credit
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(debtUtilization.availableCredit.amount)}
                </div>
                {debtUtilization.accountsAtMaxUtilization > 0 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {debtUtilization.accountsAtMaxUtilization} cards maxed out
                  </div>
                )}
              </div>
            </div>

            {/* Utilization Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Overall Utilization
                </span>
                <span className={`text-sm font-semibold ${getUtilizationColor(debtUtilization.creditUtilization.value)}`}>
                  {formatPercentage(debtUtilization.creditUtilization.value)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    debtUtilization.creditUtilization.value >= 80 ? 'bg-red-500' :
                    debtUtilization.creditUtilization.value >= 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(debtUtilization.creditUtilization.value, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-yellow-600 dark:text-yellow-400">30%</span>
                <span className="text-red-600 dark:text-red-400">80%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Utilization Tips */}
            {debtUtilization.creditUtilization.value > 30 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-500 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      High Credit Utilization
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Keeping utilization below 30% can improve your credit score.
                      Consider paying down balances or requesting credit limit increases.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default DebtOverviewCard
