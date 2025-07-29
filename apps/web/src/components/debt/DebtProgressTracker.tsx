'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { DebtAccount, DebtMilestone, DebtComparison, DebtStrategy } from '../../hooks/useDebtManagement'

interface DebtProgressTrackerProps {
  debtAccounts: DebtAccount[]
  milestones: DebtMilestone[]
  strategyComparison?: DebtComparison
  selectedStrategy: DebtStrategy
}

const DebtProgressTracker: React.FC<DebtProgressTrackerProps> = ({
  debtAccounts,
  milestones,
  strategyComparison,
  selectedStrategy,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'milestones' | 'progress'>('timeline')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const totalDebt = useMemo(() => {
    return debtAccounts.reduce((sum, debt) => sum + debt.balance.amount, 0)
  }, [debtAccounts])

  const completedMilestones = useMemo(() => {
    return milestones.filter(m => m.isCompleted)
  }, [milestones])

  const progressPercentage = useMemo(() => {
    if (milestones.length === 0) return 0
    return (completedMilestones.length / milestones.length) * 100
  }, [milestones.length, completedMilestones.length])

  const payoffProjection = useMemo(() => {
    // Generate 24-month projection based on current strategy
    const projection = []
    let remainingBalance = totalDebt
    const monthlyReduction = totalDebt / 36 // Simplified: assume 3-year payoff

    for (let month = 1; month <= 24; month++) {
      remainingBalance = Math.max(0, remainingBalance - monthlyReduction)
      const percentagePaid = ((totalDebt - remainingBalance) / totalDebt) * 100

      projection.push({
        month,
        date: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }),
        remainingBalance,
        percentagePaid,
        debtsCompleted: Math.floor(percentagePaid / (100 / debtAccounts.length))
      })
    }
    return projection
  }, [totalDebt, debtAccounts.length])

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Debt Payoff Progress
            </h3>
            <div className="flex items-center space-x-2">
              {['timeline', 'milestones', 'progress'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                Total Debt
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(totalDebt)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {debtAccounts.length} accounts
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">
                Progress
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {completedMilestones.length} of {milestones.length} milestones
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">
                Strategy
              </div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {selectedStrategy === DebtStrategy.AVALANCHE ? 'Avalanche' :
                 selectedStrategy === DebtStrategy.SNOWBALL ? 'Snowball' : 'Custom'}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                active strategy
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                Est. Payoff
              </div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {strategyComparison
                  ? new Date(Date.now() + (strategyComparison.avalancheResult.totalTimeToPayoffMonths * 30 * 24 * 60 * 60 * 1000))
                      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'Calculating...'
                }
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                with current plan
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Debt Payoff Progress</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'timeline' && (
        <Card>
          <div className="p-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-6">
              24-Month Payoff Timeline
            </h4>

            <div className="space-y-4">
              {payoffProjection.slice(0, 12).map((point, index) => (
                <div key={point.month} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {point.date}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-900 dark:text-white">
                        Month {point.month}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(point.remainingBalance)}
                        </span>
                        <Badge variant="secondary" size="xs">
                          {point.debtsCompleted} paid off
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${point.percentagePaid}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(point.percentagePaid)}% paid off
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(totalDebt - point.remainingBalance)} paid down
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                View Full 24-Month Timeline →
              </button>
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'milestones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completed Milestones */}
          <Card>
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Completed Milestones
              </h4>

              {completedMilestones.length > 0 ? (
                <div className="space-y-4">
                  {completedMilestones.map((milestone) => (
                    <div key={milestone.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {milestone.milestoneType.replace('_', ' ')}
                          </h5>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {formatCurrency(milestone.targetAmount.amount)} • Completed {milestone.completedDate && new Date(milestone.completedDate).toLocaleDateString()}
                          </p>
                          {milestone.celebrationMessage && (
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1 italic">
                              "{milestone.celebrationMessage}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No milestones completed yet. Keep making payments to reach your first milestone!
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Milestones */}
          <Card>
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Upcoming Milestones
              </h4>

              {milestones.filter(m => !m.isCompleted).length > 0 ? (
                <div className="space-y-4">
                  {milestones.filter(m => !m.isCompleted).slice(0, 5).map((milestone) => {
                    const progress = (milestone.currentAmount.amount / milestone.targetAmount.amount) * 100

                    return (
                      <div key={milestone.id} className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {milestone.milestoneType.replace('_', ' ')}
                          </h5>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {formatCurrency(milestone.currentAmount.amount)} of {formatCurrency(milestone.targetAmount.amount)}
                          </span>
                          <span>
                            Target: {new Date(milestone.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                        {milestone.motivationalQuote && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                            "{milestone.motivationalQuote}"
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    No upcoming milestones set. Create some to track your progress!
                  </p>
                  <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Create Milestone
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Individual Debt Progress */}
          {debtAccounts.map((debt) => {
            // Simulate progress (in real app would track actual payments)
            const simulatedProgress = Math.random() * 30 // 0-30% progress

            return (
              <Card key={debt.id}>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-2xl">
                      {debt.debtType === 'CREDIT_CARD' ? '💳' :
                       debt.debtType === 'STUDENT_LOAN' ? '🎓' :
                       debt.debtType === 'MORTGAGE' ? '🏠' :
                       debt.debtType === 'AUTO_LOAN' ? '🚗' : '💰'}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {debt.name}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(debt.balance.amount)} balance
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Payoff Progress</span>
                        <span>{Math.round(simulatedProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${simulatedProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          {formatCurrency(debt.minimumPayment.amount)}
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">Min Payment</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="font-semibold text-green-700 dark:text-green-300">
                          {formatPercentage(debt.interestRate.percentage.value)}
                        </div>
                        <div className="text-green-600 dark:text-green-400">Interest Rate</div>
                      </div>
                    </div>

                    {simulatedProgress > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Paid down:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(debt.balance.amount * simulatedProgress / 100)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Motivational Section */}
      <Card>
        <div className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Stay Motivated!
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Every payment brings you closer to financial freedom. You've got this!
            </p>

            {completedMilestones.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  🎉 You've completed {completedMilestones.length} milestone{completedMilestones.length !== 1 ? 's' : ''}!
                  Keep up the excellent work.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export default DebtProgressTracker
