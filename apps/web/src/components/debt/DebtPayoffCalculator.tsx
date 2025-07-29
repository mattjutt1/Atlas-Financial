'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { DebtAccount, DebtStrategy, Money } from '../../hooks/useDebtManagement'

interface DebtPayoffCalculatorProps {
  debtAccounts: DebtAccount[]
  selectedStrategy: DebtStrategy
  extraPayment: Money
}

interface CalculationResult {
  totalInterest: number
  totalPayments: number
  payoffMonths: number
  monthlyPayment: number
  interestSavings: number
  timeSavings: number
  payoffSchedule: PayoffScheduleItem[]
}

interface PayoffScheduleItem {
  month: number
  date: string
  totalBalance: number
  monthlyPayment: number
  interestPaid: number
  principalPaid: number
  debtsRemaining: number
  completedDebts: string[]
}

interface WhatIfScenario {
  extraPayment: number
  result: CalculationResult
}

const DebtPayoffCalculator: React.FC<DebtPayoffCalculatorProps> = ({
  debtAccounts,
  selectedStrategy,
  extraPayment,
}) => {
  const [calculatorView, setCalculatorView] = useState<'summary' | 'schedule' | 'scenarios'>('summary')
  const [customExtraPayment, setCustomExtraPayment] = useState(extraPayment.amount)
  const [targetPayoffDate, setTargetPayoffDate] = useState('')
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenario[]>([])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    })
  }

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    if (years === 0) {
      return `${months} months`
    } else if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`
    } else {
      return `${years}y ${remainingMonths}mo`
    }
  }

  // Simulate debt payoff calculation (would normally call Rust engine)
  const calculatePayoff = useCallback((extraPaymentAmount: number): CalculationResult => {
    if (debtAccounts.length === 0) {
      return {
        totalInterest: 0,
        totalPayments: 0,
        payoffMonths: 0,
        monthlyPayment: 0,
        interestSavings: 0,
        timeSavings: 0,
        payoffSchedule: []
      }
    }

    // Sort debts based on strategy
    let sortedDebts = [...debtAccounts]
    if (selectedStrategy === DebtStrategy.AVALANCHE) {
      sortedDebts.sort((a, b) => b.interestRate.percentage.value - a.interestRate.percentage.value)
    } else if (selectedStrategy === DebtStrategy.SNOWBALL) {
      sortedDebts.sort((a, b) => a.balance.amount - b.balance.amount)
    }

    const totalMinimumPayments = debtAccounts.reduce((sum, debt) => sum + debt.minimumPayment.amount, 0)
    const totalMonthlyPayment = totalMinimumPayments + extraPaymentAmount

    // Simplified calculation - in reality would use Rust financial engine
    let totalInterest = 0
    let totalPayments = 0
    let payoffMonths = 0
    const payoffSchedule: PayoffScheduleItem[] = []
    let remainingDebts = sortedDebts.map(debt => ({
      ...debt,
      remainingBalance: debt.balance.amount
    }))

    let month = 0
    while (remainingDebts.length > 0 && month < 600) { // Max 50 years
      month++
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + month)

      let totalBalance = remainingDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0)
      let monthlyInterest = 0
      let monthlyPrincipal = 0
      let remainingPayment = totalMonthlyPayment
      let completedThisMonth: string[] = []

      // Pay minimums first
      remainingDebts.forEach(debt => {
        const monthlyInterestRate = debt.interestRate.percentage.value / 100 / 12
        const interestCharge = debt.remainingBalance * monthlyInterestRate
        const minimumPayment = Math.min(debt.minimumPayment.amount, debt.remainingBalance + interestCharge)
        const principalPayment = Math.max(0, minimumPayment - interestCharge)

        debt.remainingBalance = Math.max(0, debt.remainingBalance - principalPayment)
        monthlyInterest += interestCharge
        monthlyPrincipal += principalPayment
        remainingPayment -= minimumPayment

        if (debt.remainingBalance === 0) {
          completedThisMonth.push(debt.name)
        }
      })

      // Apply extra payment to priority debt
      if (remainingPayment > 0 && remainingDebts.length > 0) {
        const priorityDebt = remainingDebts.find(debt => debt.remainingBalance > 0)
        if (priorityDebt) {
          const extraPrincipal = Math.min(remainingPayment, priorityDebt.remainingBalance)
          priorityDebt.remainingBalance -= extraPrincipal
          monthlyPrincipal += extraPrincipal

          if (priorityDebt.remainingBalance === 0 && !completedThisMonth.includes(priorityDebt.name)) {
            completedThisMonth.push(priorityDebt.name)
          }
        }
      }

      totalInterest += monthlyInterest
      totalPayments += monthlyInterest + monthlyPrincipal

      // Remove completed debts
      remainingDebts = remainingDebts.filter(debt => debt.remainingBalance > 0)

      payoffSchedule.push({
        month,
        date: formatDate(currentDate),
        totalBalance: totalBalance - monthlyPrincipal,
        monthlyPayment: monthlyInterest + monthlyPrincipal,
        interestPaid: monthlyInterest,
        principalPaid: monthlyPrincipal,
        debtsRemaining: remainingDebts.length,
        completedDebts: completedThisMonth
      })
    }

    payoffMonths = month

    // Calculate savings vs minimum payments
    const minimumOnlyCalculation = calculatePayoff(0)
    const interestSavings = Math.max(0, minimumOnlyCalculation.totalInterest - totalInterest)
    const timeSavings = Math.max(0, minimumOnlyCalculation.payoffMonths - payoffMonths)

    return {
      totalInterest,
      totalPayments,
      payoffMonths,
      monthlyPayment: totalMonthlyPayment,
      interestSavings,
      timeSavings,
      payoffSchedule
    }
  }, [debtAccounts, selectedStrategy])

  const currentCalculation = useMemo(() => {
    return calculatePayoff(extraPayment.amount)
  }, [calculatePayoff, extraPayment.amount])

  const customCalculation = useMemo(() => {
    return calculatePayoff(customExtraPayment)
  }, [calculatePayoff, customExtraPayment])

  const generateWhatIfScenarios = useCallback(() => {
    const scenarios: WhatIfScenario[] = []
    const baseExtra = extraPayment.amount

    // Generate scenarios with different extra payments
    const extraAmounts = [0, 100, 250, 500, 1000, baseExtra + 500]
      .filter((amount, index, arr) => arr.indexOf(amount) === index) // Remove duplicates
      .sort((a, b) => a - b)

    extraAmounts.forEach(amount => {
      scenarios.push({
        extraPayment: amount,
        result: calculatePayoff(amount)
      })
    })

    setWhatIfScenarios(scenarios)
  }, [extraPayment.amount, calculatePayoff])

  const calculateRequiredPaymentForDate = useCallback(() => {
    if (!targetPayoffDate) return null

    const targetDate = new Date(targetPayoffDate)
    const currentDate = new Date()
    const monthsToTarget = Math.max(1, Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))

    // Binary search to find required payment (simplified)
    let low = 0
    let high = 10000
    let requiredPayment = 0

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const result = calculatePayoff(mid)

      if (result.payoffMonths <= monthsToTarget) {
        requiredPayment = mid
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    return {
      monthsToTarget,
      requiredExtraPayment: requiredPayment,
      totalMonthlyPayment: debtAccounts.reduce((sum, debt) => sum + debt.minimumPayment.amount, 0) + requiredPayment
    }
  }, [targetPayoffDate, calculatePayoff, debtAccounts])

  const targetPaymentCalculation = useMemo(() => {
    return calculateRequiredPaymentForDate()
  }, [calculateRequiredPaymentForDate])

  const milestones = useMemo(() => {
    const totalDebt = debtAccounts.reduce((sum, debt) => sum + debt.balance.amount, 0)
    const milestonePercentages = [25, 50, 75, 90, 100]

    return milestonePercentages.map(percentage => {
      const targetAmount = totalDebt * (1 - percentage / 100)
      const milestoneMonth = currentCalculation.payoffSchedule.findIndex(item =>
        item.totalBalance <= targetAmount
      ) + 1

      return {
        percentage,
        targetAmount,
        month: milestoneMonth || currentCalculation.payoffMonths,
        date: milestoneMonth ? currentCalculation.payoffSchedule[milestoneMonth - 1]?.date : 'N/A'
      }
    })
  }, [debtAccounts, currentCalculation])

  React.useEffect(() => {
    if (calculatorView === 'scenarios') {
      generateWhatIfScenarios()
    }
  }, [calculatorView, generateWhatIfScenarios])

  if (debtAccounts.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Debts to Calculate
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add some debt accounts to see payoff calculations and strategies.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calculator Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payoff Calculator
            </h3>
            <div className="flex items-center space-x-2">
              {['summary', 'schedule', 'scenarios'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCalculatorView(view as any)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    calculatorView === view
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Badge */}
          <div className="flex items-center space-x-2 mb-4">
            <Badge variant="primary" size="sm">
              {selectedStrategy === DebtStrategy.AVALANCHE ? 'Debt Avalanche' :
               selectedStrategy === DebtStrategy.SNOWBALL ? 'Debt Snowball' :
               'Custom Strategy'}
            </Badge>
            {extraPayment.amount > 0 && (
              <Badge variant="success" size="sm">
                +{formatCurrency(extraPayment.amount)}/month
              </Badge>
            )}
          </div>

          {/* Key Results */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">
                Payoff Time
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatMonths(currentCalculation.payoffMonths)}
              </div>
              {currentCalculation.timeSavings > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {formatMonths(currentCalculation.timeSavings)} faster
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                Total Interest
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(currentCalculation.totalInterest)}
              </div>
              {currentCalculation.interestSavings > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Save {formatCurrency(currentCalculation.interestSavings)}
                </div>
              )}
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">
                Monthly Payment
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(currentCalculation.monthlyPayment)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                total payment
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                Total Paid
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(currentCalculation.totalPayments)}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                principal + interest
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Calculator Content */}
      {calculatorView === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones */}
          <Card>
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Payoff Milestones
              </h4>
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.percentage} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        milestone.percentage === 100 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {milestone.percentage}%
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {milestone.percentage === 100 ? 'Debt Free!' : `${milestone.percentage}% Paid Off`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(milestone.targetAmount)} remaining
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {milestone.date}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Month {milestone.month}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Custom Calculator */}
          <Card>
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Custom Calculation
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Extra Monthly Payment
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={customExtraPayment || ''}
                      onChange={(e) => setCustomExtraPayment(parseFloat(e.target.value) || 0)}
                      className="block w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-blue-600 dark:text-blue-400 font-medium">Payoff Time</div>
                      <div className="text-blue-800 dark:text-blue-200 font-bold">
                        {formatMonths(customCalculation.payoffMonths)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-600 dark:text-blue-400 font-medium">Total Interest</div>
                      <div className="text-blue-800 dark:text-blue-200 font-bold">
                        {formatCurrency(customCalculation.totalInterest)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-600 dark:text-blue-400 font-medium">Interest Savings</div>
                      <div className="text-green-600 dark:text-green-400 font-bold">
                        {formatCurrency(customCalculation.interestSavings)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-600 dark:text-blue-400 font-medium">Time Savings</div>
                      <div className="text-green-600 dark:text-green-400 font-bold">
                        {formatMonths(customCalculation.timeSavings)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Date Calculator */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Target Payoff Date
                  </label>
                  <input
                    type="month"
                    value={targetPayoffDate}
                    onChange={(e) => setTargetPayoffDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 7)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {targetPaymentCalculation && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <div className="font-medium mb-1">
                          Required Payment: {formatCurrency(targetPaymentCalculation.totalMonthlyPayment)}/month
                        </div>
                        <div className="text-xs">
                          Extra {formatCurrency(targetPaymentCalculation.requiredExtraPayment)} needed
                          to pay off in {targetPaymentCalculation.monthsToTarget} months
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {calculatorView === 'schedule' && (
        <Card>
          <div className="p-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Payment Schedule
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Month
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Payment
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Interest
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Principal
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Balance
                    </th>
                    <th className="text-center py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Debts Left
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentCalculation.payoffSchedule.slice(0, 24).map((item) => (
                    <tr key={item.month} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.month}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.date}
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.monthlyPayment)}
                      </td>
                      <td className="py-3 text-right text-sm text-red-600 dark:text-red-400">
                        {formatCurrency(item.interestPaid)}
                      </td>
                      <td className="py-3 text-right text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(item.principalPaid)}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.totalBalance)}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="secondary" size="xs">
                          {item.debtsRemaining}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentCalculation.payoffSchedule.length > 24 && (
              <div className="mt-4 text-center">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Show All {currentCalculation.payoffSchedule.length} Months
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {calculatorView === 'scenarios' && (
        <Card>
          <div className="p-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              What-If Scenarios
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Extra Payment
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Payoff Time
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Total Interest
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Interest Saved
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Time Saved
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {whatIfScenarios.map((scenario, index) => (
                    <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${
                      scenario.extraPayment === extraPayment.amount ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(scenario.extraPayment)}/month
                          </span>
                          {scenario.extraPayment === extraPayment.amount && (
                            <Badge variant="primary" size="xs">Current</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {formatMonths(scenario.result.payoffMonths)}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(scenario.result.totalInterest)}
                      </td>
                      <td className="py-3 text-right text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(scenario.result.interestSavings)}
                      </td>
                      <td className="py-3 text-right text-sm text-green-600 dark:text-green-400">
                        {formatMonths(scenario.result.timeSavings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Key Insights
              </h5>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Every extra $100/month saves approximately {formatCurrency((whatIfScenarios[2]?.result.interestSavings || 0) - (whatIfScenarios[1]?.result.interestSavings || 0))} in interest</li>
                <li>• Doubling your extra payment doesn't double the savings due to compound effects</li>
                <li>• Earlier extra payments have exponentially more impact than later ones</li>
                <li>• Consider the opportunity cost of extra payments vs. investing the money</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DebtPayoffCalculator
