'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { DebtAccount, DebtStrategy } from '../../hooks/useDebtManagement'

interface PaymentAllocationOptimizerProps {
  debtAccounts: DebtAccount[]
  selectedStrategy: DebtStrategy
  monthlyBudget: number
}

interface AllocationResult {
  debtId: string
  debtName: string
  allocatedAmount: number
  paymentType: 'minimum' | 'extra' | 'optimization'
  priority: number
  expectedImpact: {
    interestSavings: number
    timeSavings: number
    balanceReduction: number
  }
}

interface OptimizationScenario {
  name: string
  description: string
  allocations: AllocationResult[]
  totalPayment: number
  estimatedPayoffTime: number
  estimatedInterestSavings: number
  optimizationScore: number
}

const PaymentAllocationOptimizer: React.FC<PaymentAllocationOptimizerProps> = ({
  debtAccounts,
  selectedStrategy,
  monthlyBudget,
}) => {
  const [customBudget, setCustomBudget] = useState(monthlyBudget)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string>('recommended')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return years > 0 ? `${years}y ${remainingMonths}mo` : `${months}mo`
  }

  const minimumPayments = useMemo(() => {
    return debtAccounts.reduce((sum, debt) => sum + debt.minimumPayment.amount, 0)
  }, [debtAccounts])

  const availableExtra = useMemo(() => {
    return Math.max(0, customBudget - minimumPayments)
  }, [customBudget, minimumPayments])

  // Calculate optimal allocation based on strategy
  const calculateOptimalAllocation = useCallback((budget: number, strategy: DebtStrategy): AllocationResult[] => {
    const allocations: AllocationResult[] = []
    let remainingBudget = budget

    // First, cover all minimum payments
    debtAccounts.forEach((debt, index) => {
      const minimumAmount = Math.min(debt.minimumPayment.amount, remainingBudget)

      allocations.push({
        debtId: debt.id,
        debtName: debt.name,
        allocatedAmount: minimumAmount,
        paymentType: 'minimum',
        priority: index + 1,
        expectedImpact: {
          interestSavings: 0,
          timeSavings: 0,
          balanceReduction: minimumAmount * 0.7 // Rough estimate of principal
        }
      })

      remainingBudget -= minimumAmount
    })

    // Allocate extra payments based on strategy
    if (remainingBudget > 0) {
      let sortedDebts = [...debtAccounts]

      if (strategy === DebtStrategy.AVALANCHE) {
        sortedDebts.sort((a, b) => b.interestRate.percentage.value - a.interestRate.percentage.value)
      } else if (strategy === DebtStrategy.SNOWBALL) {
        sortedDebts.sort((a, b) => a.balance.amount - b.balance.amount)
      }

      // Allocate extra payment to highest priority debt
      if (sortedDebts.length > 0) {
        const priorityDebt = sortedDebts[0]
        const extraAmount = Math.min(remainingBudget, priorityDebt.balance.amount)
        const existingAllocation = allocations.find(a => a.debtId === priorityDebt.id)

        if (existingAllocation) {
          existingAllocation.allocatedAmount += extraAmount
          existingAllocation.paymentType = 'extra'
          existingAllocation.expectedImpact = {
            interestSavings: extraAmount * (priorityDebt.interestRate.percentage.value / 100) * 2, // Simplified
            timeSavings: Math.floor(extraAmount / 100), // Rough months saved
            balanceReduction: extraAmount
          }
        }
      }
    }

    return allocations
  }, [debtAccounts])

  // Generate optimization scenarios
  const optimizationScenarios = useMemo((): OptimizationScenario[] => {
    const scenarios: OptimizationScenario[] = []

    // Recommended scenario (current strategy)
    const recommendedAllocations = calculateOptimalAllocation(customBudget, selectedStrategy)
    scenarios.push({
      name: 'recommended',
      description: `${selectedStrategy === DebtStrategy.AVALANCHE ? 'Debt Avalanche' : 'Debt Snowball'} Strategy`,
      allocations: recommendedAllocations,
      totalPayment: customBudget,
      estimatedPayoffTime: 36, // Simplified
      estimatedInterestSavings: availableExtra * 12, // Rough estimate
      optimizationScore: 85
    })

    // Aggressive scenario
    if (availableExtra > 0) {
      const aggressiveAllocations = calculateOptimalAllocation(customBudget + 500, selectedStrategy)
      scenarios.push({
        name: 'aggressive',
        description: 'Add $500 extra for faster payoff',
        allocations: aggressiveAllocations,
        totalPayment: customBudget + 500,
        estimatedPayoffTime: 28,
        estimatedInterestSavings: (availableExtra + 500) * 15,
        optimizationScore: 92
      })
    }

    // Conservative scenario
    const conservativeAllocations = calculateOptimalAllocation(minimumPayments + Math.min(availableExtra, 200), selectedStrategy)
    scenarios.push({
      name: 'conservative',
      description: 'Minimum payments + small extra',
      allocations: conservativeAllocations,
      totalPayment: minimumPayments + Math.min(availableExtra, 200),
      estimatedPayoffTime: 48,
      estimatedInterestSavings: Math.min(availableExtra, 200) * 8,
      optimizationScore: 72
    })

    // Hybrid scenario (mix of strategies)
    if (debtAccounts.length > 1) {
      const hybridAllocations = calculateOptimalAllocation(customBudget, DebtStrategy.CUSTOM)
      scenarios.push({
        name: 'hybrid',
        description: 'Balanced approach across all debts',
        allocations: hybridAllocations,
        totalPayment: customBudget,
        estimatedPayoffTime: 38,
        estimatedInterestSavings: availableExtra * 10,
        optimizationScore: 78
      })
    }

    return scenarios
  }, [customBudget, selectedStrategy, calculateOptimalAllocation, availableExtra, minimumPayments, debtAccounts.length])

  const currentScenario = optimizationScenarios.find(s => s.name === selectedScenario) || optimizationScenarios[0]

  const handleOptimize = async () => {
    setIsOptimizing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsOptimizing(false)
  }

  if (debtAccounts.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Debts to Optimize
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add some debt accounts to see payment allocation recommendations.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Budget Configuration */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Allocation Optimizer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Required Minimums
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(minimumPayments)}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Available Extra
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(availableExtra)}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                Total Budget
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(customBudget)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Monthly Payment Budget
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">$</span>
                </div>
                <input
                  type="number"
                  min={minimumPayments}
                  step="50"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(parseFloat(e.target.value) || minimumPayments)}
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum required: {formatCurrency(minimumPayments)}
              </p>
            </div>

            <button
              onClick={handleOptimize}
              disabled={isOptimizing || customBudget < minimumPayments}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isOptimizing && <LoadingSpinner size="sm" />}
              <span>
                {isOptimizing ? 'Optimizing...' : 'Optimize Payment Allocation'}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Scenario Selection */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">
              Optimization Scenarios
            </h4>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizationScenarios.map((scenario) => (
              <div
                key={scenario.name}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedScenario === scenario.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedScenario(scenario.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                    {scenario.name}
                  </h5>
                  <Badge
                    variant={scenario.optimizationScore >= 90 ? 'success' :
                            scenario.optimizationScore >= 80 ? 'primary' : 'secondary'}
                    size="xs"
                  >
                    {scenario.optimizationScore}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {scenario.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(scenario.totalPayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Payoff:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatMonths(scenario.estimatedPayoffTime)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Interest Savings:</span>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(scenario.estimatedInterestSavings)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Allocation Details */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">
              Recommended Allocation: {currentScenario.description}
            </h4>
            <div className="flex items-center space-x-2">
              <Badge variant="primary" size="sm">
                Score: {currentScenario.optimalizationScore}
              </Badge>
              <Badge variant="success" size="sm">
                {formatCurrency(currentScenario.estimatedInterestSavings)} saved
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {currentScenario.allocations.map((allocation) => {
              const debt = debtAccounts.find(d => d.id === allocation.debtId)
              if (!debt) return null

              return (
                <div key={allocation.debtId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {debt.debtType === 'CREDIT_CARD' ? '💳' :
                         debt.debtType === 'STUDENT_LOAN' ? '🎓' :
                         debt.debtType === 'MORTGAGE' ? '🏠' :
                         debt.debtType === 'AUTO_LOAN' ? '🚗' : '💰'}
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {allocation.debtName}
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(debt.balance.amount)} balance • {(debt.interestRate.percentage.value).toFixed(1)}% APR
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(allocation.allocatedAmount)}
                      </div>
                      <Badge
                        variant={allocation.paymentType === 'extra' ? 'success' :
                               allocation.paymentType === 'optimization' ? 'primary' : 'secondary'}
                        size="xs"
                      >
                        {allocation.paymentType}
                      </Badge>
                    </div>
                  </div>

                  {allocation.paymentType !== 'minimum' && (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="font-semibold text-green-700 dark:text-green-300">
                          {formatCurrency(allocation.expectedImpact.interestSavings)}
                        </div>
                        <div className="text-green-600 dark:text-green-400">Interest Saved</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          {formatMonths(allocation.expectedImpact.timeSavings)}
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">Time Saved</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <div className="font-semibold text-purple-700 dark:text-purple-300">
                          {formatCurrency(allocation.expectedImpact.balanceReduction)}
                        </div>
                        <div className="text-purple-600 dark:text-purple-400">Balance Reduction</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Allocation Summary
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400">Total Payment:</span>
                <div className="font-bold text-blue-800 dark:text-blue-200">
                  {formatCurrency(currentScenario.totalPayment)}
                </div>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">Payoff Time:</span>
                <div className="font-bold text-blue-800 dark:text-blue-200">
                  {formatMonths(currentScenario.estimatedPayoffTime)}
                </div>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">Interest Savings:</span>
                <div className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(currentScenario.estimatedInterestSavings)}
                </div>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">Optimization Score:</span>
                <div className="font-bold text-blue-800 dark:text-blue-200">
                  {currentScenario.optimizationScore}/100
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Apply This Allocation
            </button>
          </div>
        </div>
      </Card>

      {/* Advanced Options */}
      {showAdvanced && (
        <Card>
          <div className="p-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Advanced Optimization Options
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Optimization Factors
                </h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Interest Rate Priority</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="80"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Psychological Motivation</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="60"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Risk Tolerance</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="70"
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Custom Constraints
                </h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Maximum Payment Increase
                    </label>
                    <select className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
                      <option>25%</option>
                      <option>50%</option>
                      <option>100%</option>
                      <option>No limit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Priority Debt Focus
                    </label>
                    <select className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
                      <option>Automatic</option>
                      <option>Highest Interest</option>
                      <option>Lowest Balance</option>
                      <option>Newest Debt</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PaymentAllocationOptimizer
