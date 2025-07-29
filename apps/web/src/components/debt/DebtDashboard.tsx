'use client'

import React, { useState, useMemo } from 'react'
import { useDebtManagement } from '../../hooks/useDebtManagement'
import { Card } from '../common/Card'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Badge } from '../common/Badge'
import DebtOverviewCard from './DebtOverviewCard'
import DebtStrategySelector from './DebtStrategySelector'
import DebtProgressTracker from './DebtProgressTracker'
import DebtCard from './DebtCard'
import DebtPayoffCalculator from './DebtPayoffCalculator'
import PaymentAllocationOptimizer from './PaymentAllocationOptimizer'
import DebtConsolidationAnalyzer from './DebtConsolidationAnalyzer'

interface DebtDashboardProps {
  className?: string
}

const DebtDashboard: React.FC<DebtDashboardProps> = ({ className = '' }) => {
  const {
    debtAccounts,
    debtStatistics,
    debtUtilization,
    strategyComparison,
    consolidationOpportunities,
    milestones,
    loading,
    error,
    selectedStrategy,
    setSelectedStrategy,
    extraPayment,
    setExtraPayment,
    calculateTotalDebt,
    calculateMonthlyMinimums,
    getDebtsByType,
    prioritizeDebts,
    handleAddDebtAccount,
    handleActivateStrategy,
    refreshAllData,
  } = useDebtManagement()

  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'progress' | 'optimization' | 'consolidation'>('overview')
  const [showAddDebtModal, setShowAddDebtModal] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)

  const totalDebt = useMemo(() => calculateTotalDebt(), [calculateTotalDebt])
  const monthlyMinimums = useMemo(() => calculateMonthlyMinimums(), [calculateMonthlyMinimums])
  const debtsByType = useMemo(() => getDebtsByType(), [getDebtsByType])
  const prioritizedDebts = useMemo(() => prioritizeDebts(selectedStrategy), [prioritizeDebts, selectedStrategy])

  const hasDebt = debtAccounts.length > 0
  const debtFreeGoal = milestones.find(m => m.milestoneType === 'DEBT_FREE')

  if (loading && debtAccounts.length === 0) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Debt Information
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We couldn't load your debt information. Please try again.
          </p>
          <button
            onClick={refreshAllData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Debt Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Take control of your debt with strategic payoff plans
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {debtFreeGoal && !debtFreeGoal.isCompleted && (
                  <Badge variant="success" size="lg">
                    {Math.round(((debtFreeGoal.currentAmount.amount / debtFreeGoal.targetAmount.amount) * 100))}%
                    Debt Free
                  </Badge>
                )}
                <button
                  onClick={() => setShowAddDebtModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Debt</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'overview', name: 'Overview', icon: 'chart-bar' },
                  { id: 'strategy', name: 'Strategy', icon: 'target' },
                  { id: 'progress', name: 'Progress', icon: 'trending-up' },
                  { id: 'optimization', name: 'Optimization', icon: 'cog' },
                  { id: 'consolidation', name: 'Consolidation', icon: 'collection' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasDebt ? (
          /* No Debt State */
          <div className="text-center py-12">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8 mb-8">
              <div className="text-green-500 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                Congratulations! You're Debt Free!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-6">
                You don't have any recorded debts. Keep up the great financial habits!
              </p>
            </div>

            <Card className="max-w-md mx-auto">
              <div className="p-6 text-center">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Want to track a debt?
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add your debts to create payoff strategies and track your progress.
                </p>
                <button
                  onClick={() => setShowAddDebtModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Debt
                </button>
              </div>
            </Card>
          </div>
        ) : (
          /* Main Dashboard Content */
          <div className="space-y-8">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Overview Cards */}
                <div className="lg:col-span-2">
                  <DebtOverviewCard
                    totalDebt={totalDebt}
                    monthlyMinimums={monthlyMinimums}
                    debtStatistics={debtStatistics}
                    debtUtilization={debtUtilization}
                    debtsByType={debtsByType}
                  />
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                  <Card>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Quick Actions
                      </h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setActiveTab('strategy')}
                          className="w-full px-4 py-3 text-left bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Compare Strategies</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Find the best payoff strategy
                          </p>
                        </button>

                        <button
                          onClick={() => setActiveTab('optimization')}
                          className="w-full px-4 py-3 text-left bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Optimize Payments</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Maximize your payment impact
                          </p>
                        </button>

                        {consolidationOpportunities.length > 0 && (
                          <button
                            onClick={() => setActiveTab('consolidation')}
                            className="w-full px-4 py-3 text-left bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Consolidation Options</span>
                              <Badge variant="primary" size="sm">
                                {consolidationOpportunities.length}
                              </Badge>
                            </div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                              Explore consolidation opportunities
                            </p>
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Recent Milestones */}
                  {milestones.length > 0 && (
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Recent Milestones
                        </h3>
                        <div className="space-y-3">
                          {milestones.slice(0, 3).map((milestone) => (
                            <div
                              key={milestone.id}
                              className={`p-3 rounded-lg ${
                                milestone.isCompleted
                                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                  milestone.isCompleted
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                }`}>
                                  {milestone.isCompleted ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <div className="w-2 h-2 bg-current rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    milestone.isCompleted
                                      ? 'text-green-800 dark:text-green-200'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {milestone.milestoneType.replace('_', ' ')}
                                  </p>
                                  <p className={`text-xs ${
                                    milestone.isCompleted
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    ${milestone.targetAmount.amount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setActiveTab('progress')}
                          className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          View All Milestones →
                        </button>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Individual Debt Cards */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Your Debts
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sorted by {selectedStrategy === 'AVALANCHE' ? 'Interest Rate' : 'Balance'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {prioritizedDebts.map((debt) => (
                      <DebtCard
                        key={debt.id}
                        debt={debt}
                        onSelect={() => setSelectedDebtId(debt.id)}
                        isSelected={selectedDebtId === debt.id}
                        showPriority={true}
                        strategy={selectedStrategy}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DebtStrategySelector
                  strategyComparison={strategyComparison}
                  selectedStrategy={selectedStrategy}
                  onStrategyChange={setSelectedStrategy}
                  extraPayment={extraPayment}
                  onExtraPaymentChange={setExtraPayment}
                  onActivateStrategy={handleActivateStrategy}
                />
                <DebtPayoffCalculator
                  debtAccounts={debtAccounts}
                  selectedStrategy={selectedStrategy}
                  extraPayment={extraPayment}
                />
              </div>
            )}

            {activeTab === 'progress' && (
              <DebtProgressTracker
                debtAccounts={debtAccounts}
                milestones={milestones}
                strategyComparison={strategyComparison}
                selectedStrategy={selectedStrategy}
              />
            )}

            {activeTab === 'optimization' && (
              <PaymentAllocationOptimizer
                debtAccounts={debtAccounts}
                selectedStrategy={selectedStrategy}
                monthlyBudget={monthlyMinimums + extraPayment.amount}
              />
            )}

            {activeTab === 'consolidation' && (
              <DebtConsolidationAnalyzer
                debtAccounts={debtAccounts}
                consolidationOpportunities={consolidationOpportunities}
                totalDebt={totalDebt}
                monthlyMinimums={monthlyMinimums}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DebtDashboard
