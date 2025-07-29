'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { DebtAccount, ConsolidationOpportunity } from '../../hooks/useDebtManagement'

interface DebtConsolidationAnalyzerProps {
  debtAccounts: DebtAccount[]
  consolidationOpportunities: ConsolidationOpportunity[]
  totalDebt: number
  monthlyMinimums: number
}

interface ConsolidationComparison {
  current: {
    totalBalance: number
    monthlyPayment: number
    averageRate: number
    estimatedPayoffMonths: number
    totalInterest: number
  }
  consolidated: {
    newBalance: number
    newPayment: number
    newRate: number
    newPayoffMonths: number
    newTotalInterest: number
    savings: number
    timeSaved: number
  }
}

const DebtConsolidationAnalyzer: React.FC<DebtConsolidationAnalyzerProps> = ({
  debtAccounts,
  consolidationOpportunities,
  totalDebt,
  monthlyMinimums,
}) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ConsolidationOpportunity | null>(
    consolidationOpportunities[0] || null
  )
  const [showEligibilityCheck, setShowEligibilityCheck] = useState(false)
  const [userCreditScore, setUserCreditScore] = useState<number>(750)
  const [userIncome, setUserIncome] = useState<number>(60000)

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

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return years > 0 ? `${years}y ${remainingMonths}mo` : `${months}mo`
  }

  const consolidationTypeInfo = {
    PersonalLoan: {
      name: 'Personal Loan',
      icon: '💰',
      description: 'Unsecured loan with fixed rate and term',
      pros: ['Fixed monthly payment', 'No collateral required', 'Predictable payoff'],
      cons: ['Higher rates than secured loans', 'Origination fees', 'Credit score dependent'],
      bestFor: 'Good credit scores (650+) with stable income'
    },
    BalanceTransfer: {
      name: 'Balance Transfer Card',
      icon: '💳',
      description: '0% introductory APR credit card',
      pros: ['0% intro rate period', 'Single payment', 'Reward earning potential'],
      cons: ['Promotional rate expires', 'Transfer fees', 'Requires excellent credit'],
      bestFor: 'Excellent credit (740+) who can pay off during promo period'
    },
    HomeEquityLoan: {
      name: 'Home Equity Loan',
      icon: '🏠',
      description: 'Secured loan against home equity',
      pros: ['Lowest interest rates', 'Tax deductible interest', 'Large loan amounts'],
      cons: ['Home is collateral', 'Closing costs', 'Longer approval process'],
      bestFor: 'Homeowners with significant equity and stable income'
    },
    DebtManagementPlan: {
      name: 'Debt Management Plan',
      icon: '📋',
      description: 'Credit counseling organization program',
      pros: ['Lower interest rates', 'Professional guidance', 'No credit score requirement'],
      cons: ['Fees required', 'Accounts may be closed', 'Credit impact'],
      bestFor: 'Those struggling with payments who need professional help'
    },
    RefinancingProgram: {
      name: 'Refinancing Program',
      icon: '🔄',
      description: 'Lender-specific refinancing offer',
      pros: ['Existing relationship', 'Streamlined process', 'Loyalty benefits'],
      cons: ['Limited options', 'May not be best rate', 'Relationship dependent'],
      bestFor: 'Current customers in good standing with their lenders'
    }
  }

  const averageInterestRate = useMemo(() => {
    if (debtAccounts.length === 0) return 0
    const weightedSum = debtAccounts.reduce(
      (sum, debt) => sum + (debt.interestRate.percentage.value * debt.balance.amount),
      0
    )
    return weightedSum / totalDebt
  }, [debtAccounts, totalDebt])

  const consolidationComparison = useMemo((): ConsolidationComparison | null => {
    if (!selectedOpportunity) return null

    // Current situation
    const current = {
      totalBalance: totalDebt,
      monthlyPayment: monthlyMinimums,
      averageRate: averageInterestRate,
      estimatedPayoffMonths: 48, // Simplified estimate
      totalInterest: totalDebt * 0.3 // Rough estimate
    }

    // Consolidated situation
    const consolidated = {
      newBalance: selectedOpportunity.consolidatedBalance.amount,
      newPayment: selectedOpportunity.newMonthlyPayment.amount,
      newRate: selectedOpportunity.newInterestRate.percentage.value,
      newPayoffMonths: current.estimatedPayoffMonths - selectedOpportunity.timeSavingsMonths,
      newTotalInterest: current.totalInterest - selectedOpportunity.totalInterestSavings.amount,
      savings: selectedOpportunity.totalInterestSavings.amount,
      timeSaved: selectedOpportunity.timeSavingsMonths
    }

    return { current, consolidated }
  }, [selectedOpportunity, totalDebt, monthlyMinimums, averageInterestRate])

  const eligibilityScore = useMemo(() => {
    if (!selectedOpportunity) return 0

    let score = 0

    // Credit score factor (40%)
    if (userCreditScore >= 750) score += 40
    else if (userCreditScore >= 700) score += 30
    else if (userCreditScore >= 650) score += 20
    else if (userCreditScore >= 600) score += 10

    // Debt-to-income factor (30%)
    const monthlyIncome = userIncome / 12
    const dti = monthlyMinimums / monthlyIncome * 100
    if (dti <= 20) score += 30
    else if (dti <= 30) score += 25
    else if (dti <= 40) score += 15
    else if (dti <= 50) score += 5

    // Consolidation type factor (30%)
    if (selectedOpportunity.consolidationType === 'PersonalLoan' && userCreditScore >= 650) score += 25
    else if (selectedOpportunity.consolidationType === 'BalanceTransfer' && userCreditScore >= 740) score += 30
    else if (selectedOpportunity.consolidationType === 'HomeEquityLoan') score += 25
    else score += 15

    return Math.min(score, 100)
  }, [selectedOpportunity, userCreditScore, userIncome, monthlyMinimums])

  if (debtAccounts.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Debts to Consolidate
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add some debt accounts to explore consolidation opportunities.
          </p>
        </div>
      </Card>
    )
  }

  if (consolidationOpportunities.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="text-yellow-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Consolidation Opportunities
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Based on your current debt profile, we don't see beneficial consolidation options at this time.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>This could be because:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Your current rates are already competitive</li>
              <li>• Your debt balances are too small to benefit from consolidation</li>
              <li>• You may need to improve your credit profile first</li>
            </ul>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Current Debt Summary */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Debt Consolidation Analysis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-red-600 dark:text-red-400 text-sm font-medium mb-1">
                Total Debt
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(totalDebt)}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                {debtAccounts.length} accounts
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                Monthly Payments
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(monthlyMinimums)}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                minimum required
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-1">
                Average Rate
              </div>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {formatPercentage(averageInterestRate)}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                weighted average
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                Opportunities
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {consolidationOpportunities.length}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                options available
              </div>
            </div>
          </div>

          {consolidationOpportunities.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <div className="text-green-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Consolidation could save you money!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    We found {consolidationOpportunities.length} potential options that could reduce your interest costs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Opportunity Selection */}
      <Card>
        <div className="p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            Consolidation Options
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consolidationOpportunities.map((opportunity, index) => {
              const typeInfo = consolidationTypeInfo[opportunity.consolidationType as keyof typeof consolidationTypeInfo]
              const isSelected = selectedOpportunity?.consolidationType === opportunity.consolidationType

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedOpportunity(opportunity)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-2xl">{typeInfo?.icon || '📋'}</div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {typeInfo?.name || opportunity.consolidationType}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={opportunity.prosAndCons.recommendationScore >= 80 ? 'success' :
                                  opportunity.prosAndCons.recommendationScore >= 60 ? 'primary' : 'warning'}
                          size="xs"
                        >
                          {Math.round(opportunity.prosAndCons.recommendationScore)}/100
                        </Badge>
                        <Badge
                          variant={opportunity.prosAndCons.riskAssessment === 'Low' ? 'success' :
                                  opportunity.prosAndCons.riskAssessment === 'Moderate' ? 'warning' : 'danger'}
                          size="xs"
                        >
                          {opportunity.prosAndCons.riskAssessment} Risk
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {typeInfo?.description || 'Consolidation option'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">New Rate:</span>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {formatPercentage(opportunity.newInterestRate.percentage.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">New Payment:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(opportunity.newMonthlyPayment.amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Interest Savings:</span>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(opportunity.totalInterestSavings.amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time Savings:</span>
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatMonths(opportunity.timeSavingsMonths)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Detailed Comparison */}
      {selectedOpportunity && consolidationComparison && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before vs After */}
          <Card>
            <div className="p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Before vs After Comparison
              </h4>

              <div className="space-y-6">
                {/* Current Situation */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Current Situation
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-red-600 dark:text-red-400 font-medium">Total Balance</div>
                      <div className="text-red-800 dark:text-red-200 font-bold">
                        {formatCurrency(consolidationComparison.current.totalBalance)}
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-orange-600 dark:text-orange-400 font-medium">Monthly Payment</div>
                      <div className="text-orange-800 dark:text-orange-200 font-bold">
                        {formatCurrency(consolidationComparison.current.monthlyPayment)}
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-yellow-600 dark:text-yellow-400 font-medium">Average Rate</div>
                      <div className="text-yellow-800 dark:text-yellow-200 font-bold">
                        {formatPercentage(consolidationComparison.current.averageRate)}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-purple-600 dark:text-purple-400 font-medium">Total Interest</div>
                      <div className="text-purple-800 dark:text-purple-200 font-bold">
                        {formatCurrency(consolidationComparison.current.totalInterest)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* After Consolidation */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    After Consolidation
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-blue-600 dark:text-blue-400 font-medium">New Balance</div>
                      <div className="text-blue-800 dark:text-blue-200 font-bold">
                        {formatCurrency(consolidationComparison.consolidated.newBalance)}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-green-600 dark:text-green-400 font-medium">New Payment</div>
                      <div className="text-green-800 dark:text-green-200 font-bold">
                        {formatCurrency(consolidationComparison.consolidated.newPayment)}
                      </div>
                    </div>
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                      <div className="text-teal-600 dark:text-teal-400 font-medium">New Rate</div>
                      <div className="text-teal-800 dark:text-teal-200 font-bold">
                        {formatPercentage(consolidationComparison.consolidated.newRate)}
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <div className="text-indigo-600 dark:text-indigo-400 font-medium">New Total Interest</div>
                      <div className="text-indigo-800 dark:text-indigo-200 font-bold">
                        {formatCurrency(consolidationComparison.consolidated.newTotalInterest)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Summary */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h5 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                    Potential Savings
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 dark:text-green-400">Interest Savings:</span>
                      <div className="font-bold text-green-800 dark:text-green-200">
                        {formatCurrency(consolidationComparison.consolidated.savings)}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600 dark:text-green-400">Time Savings:</span>
                      <div className="font-bold text-green-800 dark:text-green-200">
                        {formatMonths(consolidationComparison.consolidated.timeSaved)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Pros, Cons, and Eligibility */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                  {consolidationTypeInfo[selectedOpportunity.consolidationType as keyof typeof consolidationTypeInfo]?.name} Analysis
                </h4>
                <button
                  onClick={() => setShowEligibilityCheck(!showEligibilityCheck)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Check Eligibility
                </button>
              </div>

              <div className="space-y-6">
                {/* Pros and Cons */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                      Advantages
                    </h5>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {selectedOpportunity.prosAndCons.advantages.map((pro, index) => (
                        <li key={index} className="flex items-start space-x-1">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                      Disadvantages
                    </h5>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {selectedOpportunity.prosAndCons.disadvantages.map((con, index) => (
                        <li key={index} className="flex items-start space-x-1">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Eligibility Requirements
                  </h5>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {selectedOpportunity.eligibilityRequirements.map((req, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best For */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                    Best For
                  </h5>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {consolidationTypeInfo[selectedOpportunity.consolidationType as keyof typeof consolidationTypeInfo]?.bestFor}
                  </p>
                </div>

                {/* Eligibility Check */}
                {showEligibilityCheck && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Eligibility Assessment
                    </h5>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Credit Score
                        </label>
                        <input
                          type="number"
                          min="300"
                          max="850"
                          value={userCreditScore}
                          onChange={(e) => setUserCreditScore(parseInt(e.target.value) || 750)}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Annual Income
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={userIncome}
                          onChange={(e) => setUserIncome(parseInt(e.target.value) || 60000)}
                          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                        />
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Eligibility Score
                          </span>
                          <Badge
                            variant={eligibilityScore >= 80 ? 'success' :
                                    eligibilityScore >= 60 ? 'primary' : 'warning'}
                            size="sm"
                          >
                            {eligibilityScore}/100
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              eligibilityScore >= 80 ? 'bg-green-500' :
                              eligibilityScore >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${eligibilityScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {eligibilityScore >= 80 ? 'Excellent chance of approval' :
                           eligibilityScore >= 60 ? 'Good chance of approval' :
                           eligibilityScore >= 40 ? 'Moderate chance of approval' :
                           'Consider improving credit first'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Action Section */}
      {selectedOpportunity && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                Next Steps
              </h4>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={selectedOpportunity.prosAndCons.recommendationScore >= 80 ? 'success' : 'primary'}
                  size="sm"
                >
                  {Math.round(selectedOpportunity.prosAndCons.recommendationScore)}% Recommended
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Quick Summary
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Potential Savings:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(selectedOpportunity.totalInterestSavings.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Time Saved:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatMonths(selectedOpportunity.timeSavingsMonths)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Monthly Payment:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedOpportunity.newMonthlyPayment.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Interest Rate:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(selectedOpportunity.newInterestRate.percentage.value)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recommended Actions
                </h5>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Get Pre-Qualified
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                    Compare More Options
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
                    Save for Later
                  </button>
                </div>
              </div>
            </div>

            {/* Warning/Disclaimer */}
            <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-500 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Important Considerations
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Rates and terms shown are estimates. Actual offers may vary based on creditworthiness,
                    income verification, and lender-specific criteria. Consider all fees and closing costs
                    when evaluating consolidation options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DebtConsolidationAnalyzer
