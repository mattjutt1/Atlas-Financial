'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { DebtStrategy, DebtComparison, Money } from '../../hooks/useDebtManagement'

interface DebtStrategySelectorProps {
  strategyComparison?: DebtComparison
  selectedStrategy: DebtStrategy
  onStrategyChange: (strategy: DebtStrategy) => void
  extraPayment: Money
  onExtraPaymentChange: (payment: Money) => void
  onActivateStrategy: (strategy: DebtStrategy, extraPayment?: Money) => Promise<{ success: boolean; error?: any }>
}

const DebtStrategySelector: React.FC<DebtStrategySelectorProps> = ({
  strategyComparison,
  selectedStrategy,
  onStrategyChange,
  extraPayment,
  onExtraPaymentChange,
  onActivateStrategy,
}) => {
  const [isActivating, setIsActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    if (years === 0) {
      return `${months}mo`
    } else if (remainingMonths === 0) {
      return `${years}y`
    } else {
      return `${years}y ${remainingMonths}mo`
    }
  }

  const strategyInfo = {
    [DebtStrategy.AVALANCHE]: {
      name: 'Debt Avalanche',
      subtitle: 'Mathematically Optimal',
      description: 'Pay minimums on all debts, then put extra money toward the highest interest rate debt first.',
      icon: '🎯',
      pros: [
        'Saves the most money in interest',
        'Mathematically optimal approach',
        'Faster overall payoff',
        'Better for high-interest debt'
      ],
      cons: [
        'May take longer to see first debt paid off',
        'Can feel less motivating initially',
        'Requires discipline to stick with plan'
      ],
      bestFor: 'People motivated by saving money and mathematical optimization'
    },
    [DebtStrategy.SNOWBALL]: {
      name: 'Debt Snowball',
      subtitle: 'Psychologically Motivating',
      description: 'Pay minimums on all debts, then put extra money toward the smallest balance first.',
      icon: '❄️',
      pros: [
        'Quick psychological wins',
        'Builds momentum and motivation',
        'Simplifies debt management',
        'Great for staying on track'
      ],
      cons: [
        'May pay more interest overall',
        'Not mathematically optimal',
        'High-interest debts remain longer'
      ],
      bestFor: 'People who need motivation and psychological wins to stay committed'
    },
    [DebtStrategy.CUSTOM]: {
      name: 'Custom Strategy',
      subtitle: 'Personalized Approach',
      description: 'Create your own payment allocation based on your priorities and circumstances.',
      icon: '⚙️',
      pros: [
        'Tailored to your situation',
        'Flexible payment allocation',
        'Can combine multiple strategies',
        'Accounts for personal preferences'
      ],
      cons: [
        'Requires more planning',
        'May not be optimal',
        'Needs regular adjustment'
      ],
      bestFor: 'People with specific circumstances or mixed debt priorities'
    }
  }

  const handleActivateStrategy = async () => {
    setIsActivating(true)
    setActivationError(null)

    try {
      const result = await onActivateStrategy(
        selectedStrategy,
        extraPayment.amount > 0 ? extraPayment : undefined
      )

      if (!result.success) {
        setActivationError(result.error?.message || 'Failed to activate strategy')
      }
    } catch (error) {
      setActivationError('An unexpected error occurred')
    } finally {
      setIsActivating(false)
    }
  }

  const handleExtraPaymentChange = (value: string) => {
    const amount = parseFloat(value) || 0
    onExtraPaymentChange({ amount, currency: 'USD' })
  }

  const comparisonResults = useMemo(() => {
    if (!strategyComparison) return null

    return [
      {
        strategy: DebtStrategy.AVALANCHE,
        result: strategyComparison.avalancheResult,
        isRecommended: strategyComparison.recommendedStrategy === DebtStrategy.AVALANCHE
      },
      {
        strategy: DebtStrategy.SNOWBALL,
        result: strategyComparison.snowballResult,
        isRecommended: strategyComparison.recommendedStrategy === DebtStrategy.SNOWBALL
      },
      {
        strategy: 'MINIMUM_ONLY' as DebtStrategy,
        result: strategyComparison.minimumOnlyResult,
        isRecommended: false
      }
    ]
  }, [strategyComparison])

  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Choose Your Strategy
            </h3>
            {strategyComparison && (
              <>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {showComparison ? 'Hide' : 'Show'} Comparison
                </button>
              </>
            )}
          </div>

          {/* Strategy Options */}
          <div className="space-y-4">
            {[DebtStrategy.AVALANCHE, DebtStrategy.SNOWBALL, DebtStrategy.CUSTOM].map((strategy) => {
              const info = strategyInfo[strategy]
              const isSelected = selectedStrategy === strategy
              const isRecommended = strategyComparison?.recommendedStrategy === strategy

              return (
                <div
                  key={strategy}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => onStrategyChange(strategy)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl mt-1">{info.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {info.name}
                        </h4>
                        {isRecommended && (
                          <Badge variant="success" size="sm">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                        {info.subtitle}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {info.description}
                      </p>

                      {isSelected && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <h5 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
                              PROS
                            </h5>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {info.pros.map((pro, index) => (
                                <li key={index} className="flex items-start space-x-1">
                                  <span className="text-green-500 mt-0.5">•</span>
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">
                              CONS
                            </h5>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {info.cons.map((con, index) => (
                                <li key={index} className="flex items-start space-x-1">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {isSelected && (
                        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                            Best for: {info.bestFor}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Extra Payment Input */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Extra Monthly Payment (Optional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={extraPayment.amount || ''}
                    onChange={(e) => handleExtraPaymentChange(e.target.value)}
                    className="block w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                per month
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Adding extra payments can significantly reduce your payoff time and interest costs.
            </p>
          </div>

          {/* Activate Strategy Button */}
          <div className="mt-6">
            <button
              onClick={handleActivateStrategy}
              disabled={isActivating}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isActivating && <LoadingSpinner size="sm" />}
              <span>
                {isActivating ? 'Activating Strategy...' : 'Activate Strategy'}
              </span>
            </button>

            {activationError && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {activationError}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Strategy Comparison */}
      {showComparison && comparisonResults && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Strategy Comparison
            </h3>

            {strategyComparison.recommendationReason && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-500 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Recommendation: {strategyInfo[strategyComparison.recommendedStrategy]?.name}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {strategyComparison.recommendationReason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Strategy
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Total Interest
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Payoff Time
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Monthly Payment
                    </th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.map((item, index) => {
                    const isMinimumOnly = item.strategy === 'MINIMUM_ONLY'
                    const strategyName = isMinimumOnly
                      ? 'Minimum Payments Only'
                      : strategyInfo[item.strategy]?.name || item.strategy

                    return (
                      <tr
                        key={item.strategy}
                        className={`border-b border-gray-100 dark:border-gray-800 ${
                          item.isRecommended ? 'bg-green-50 dark:bg-green-900/20' : ''
                        }`}
                      >
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {strategyName}
                            </span>
                            {item.isRecommended && (
                              <Badge variant="success" size="xs">
                                Best
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.result.totalInterestPaid.amount)}
                        </td>
                        <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                          {formatMonths(item.result.totalTimeToPayoffMonths)}
                        </td>
                        <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.result.totalMonthlyPayment.amount)}
                        </td>
                        <td className="py-3 text-right">
                          {!isMinimumOnly && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(item.result.interestSavingsVsMinimum.amount)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatMonths(item.result.timeSavingsVsMinimumMonths)} faster
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Psychological Factors */}
            {strategyComparison.psychologicalFactors && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  Psychological Profile
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Motivation Scores
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Snowball</span>
                        <span className="text-xs font-medium">
                          {strategyComparison.psychologicalFactors.motivationScoreSnowball}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Avalanche</span>
                        <span className="text-xs font-medium">
                          {strategyComparison.psychologicalFactors.motivationScoreAvalanche}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Success Probability
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(strategyComparison.psychologicalFactors.estimatedSuccessProbability.value)}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      with recommended strategy
                    </div>
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

export default DebtStrategySelector
