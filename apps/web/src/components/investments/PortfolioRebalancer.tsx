'use client'

import React, { useState, useMemo } from 'react'
import { Card, LoadingSpinner } from '@/components/common'
import {
  AdjustmentsHorizontalIcon,
  ScaleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'

interface Props {
  portfolioId: string
}

interface RebalanceRecommendation {
  symbol: string
  name: string
  currentWeight: number
  targetWeight: number
  currentValue: number
  targetValue: number
  action: 'buy' | 'sell' | 'hold'
  actionAmount: number
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface RebalanceStrategy {
  id: string
  name: string
  description: string
  targetAllocations: Record<string, number>
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
}

export function PortfolioRebalancer({ portfolioId }: Props) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('moderate_growth')
  const [rebalanceThreshold, setRebalanceThreshold] = useState<number>(5) // 5% threshold
  const [considerTaxes, setConsiderTaxes] = useState<boolean>(true)
  const [considerTransactionCosts, setConsiderTransactionCosts] = useState<boolean>(true)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)

  // Mock strategies (in real app, these would come from Rust Financial Engine)
  const rebalanceStrategies: RebalanceStrategy[] = [
    {
      id: 'conservative',
      name: 'Conservative Income',
      description: 'Low risk, steady income focus',
      targetAllocations: {
        'Stocks': 30,
        'Bonds': 50,
        'Real Estate': 15,
        'Cash': 5
      },
      riskLevel: 'conservative'
    },
    {
      id: 'moderate_growth',
      name: 'Moderate Growth',
      description: 'Balanced growth with managed risk',
      targetAllocations: {
        'Stocks': 60,
        'Bonds': 30,
        'Real Estate': 8,
        'Cash': 2
      },
      riskLevel: 'moderate'
    },
    {
      id: 'aggressive_growth',
      name: 'Aggressive Growth',
      description: 'High growth potential, higher risk',
      targetAllocations: {
        'Stocks': 80,
        'Bonds': 10,
        'Real Estate': 8,
        'Cash': 2
      },
      riskLevel: 'aggressive'
    },
    {
      id: 'target_date_2040',
      name: 'Target Date 2040',
      description: 'Age-appropriate allocation for 2040 retirement',
      targetAllocations: {
        'Stocks': 70,
        'Bonds': 25,
        'Real Estate': 5,
        'Cash': 0
      },
      riskLevel: 'moderate'
    }
  ]

  // Mock current portfolio data (would come from GraphQL)
  const currentPortfolio = useMemo(() => ({
    totalValue: 250000,
    currentAllocations: {
      'Stocks': { value: 175000, weight: 70 }, // Over-weighted
      'Bonds': { value: 50000, weight: 20 },   // Under-weighted
      'Real Estate': { value: 20000, weight: 8 },
      'Cash': { value: 5000, weight: 2 }
    }
  }), [])

  // Calculate rebalancing recommendations
  const rebalanceRecommendations = useMemo(() => {
    const strategy = rebalanceStrategies.find(s => s.id === selectedStrategy)
    if (!strategy) return []

    const recommendations: RebalanceRecommendation[] = []
    const totalValue = currentPortfolio.totalValue

    Object.entries(strategy.targetAllocations).forEach(([assetType, targetWeight]) => {
      const current = currentPortfolio.currentAllocations[assetType]
      if (!current) return

      const currentWeight = current.weight
      const targetValue = (targetWeight / 100) * totalValue
      const currentValue = current.value
      const deviation = Math.abs(currentWeight - targetWeight)

      if (deviation >= rebalanceThreshold) {
        const actionAmount = Math.abs(targetValue - currentValue)
        let action: 'buy' | 'sell' | 'hold' = 'hold'
        let reason = ''
        let priority: 'high' | 'medium' | 'low' = 'low'

        if (currentWeight > targetWeight) {
          action = 'sell'
          reason = `Over-allocated by ${deviation.toFixed(1)}%. Reduce to optimize risk.`
          priority = deviation > 10 ? 'high' : deviation > 7 ? 'medium' : 'low'
        } else if (currentWeight < targetWeight) {
          action = 'buy'
          reason = `Under-allocated by ${deviation.toFixed(1)}%. Increase for better diversification.`
          priority = deviation > 10 ? 'high' : deviation > 7 ? 'medium' : 'low'
        }

        recommendations.push({
          symbol: assetType,
          name: assetType,
          currentWeight,
          targetWeight,
          currentValue,
          targetValue,
          action,
          actionAmount,
          reason,
          priority
        })
      }
    })

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }, [selectedStrategy, rebalanceThreshold, currentPortfolio])

  // Calculate rebalancing impact
  const rebalanceImpact = useMemo(() => {
    const totalTransactionAmount = rebalanceRecommendations.reduce(
      (sum, rec) => sum + rec.actionAmount, 0
    )

    // Mock calculations (would use Rust Financial Engine in real app)
    const estimatedTransactionCosts = considerTransactionCosts ? totalTransactionAmount * 0.001 : 0 // 0.1% fee
    const estimatedTaxImpact = considerTaxes ? totalTransactionAmount * 0.15 : 0 // 15% capital gains
    const projectedAnnualReturn = 8.5 // Mock expected return improvement
    const riskReduction = 12 // Mock risk reduction percentage

    return {
      totalTransactionAmount,
      estimatedTransactionCosts,
      estimatedTaxImpact,
      netCost: estimatedTransactionCosts + estimatedTaxImpact,
      projectedAnnualReturn,
      riskReduction,
      recommendationCount: rebalanceRecommendations.length
    }
  }, [rebalanceRecommendations, considerTaxes, considerTransactionCosts])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getActionColor = (action: 'buy' | 'sell' | 'hold') => {
    switch (action) {
      case 'buy':
        return 'text-green-600 bg-green-50'
      case 'sell':
        return 'text-red-600 bg-red-50'
      case 'hold':
        return 'text-gray-600 bg-gray-50'
    }
  }

  const handleRebalance = async () => {
    setIsCalculating(true)
    // Mock API call to execute rebalancing
    setTimeout(() => {
      setIsCalculating(false)
      // Show success message or navigate to confirmation
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Rebalancer</h3>
          <p className="text-sm text-gray-500">
            Optimize your portfolio allocation based on your investment strategy
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">
            Powered by Rust Financial Engine
          </span>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Rebalancing Settings</h4>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Strategy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Strategy
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {rebalanceStrategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} ({strategy.riskLevel})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {rebalanceStrategies.find(s => s.id === selectedStrategy)?.description}
            </p>
          </div>

          {/* Rebalance Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rebalance Threshold: {rebalanceThreshold}%
            </label>
            <input
              type="range"
              min="1"
              max="15"
              value={rebalanceThreshold}
              onChange={(e) => setRebalanceThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1% (Frequent)</span>
              <span>15% (Infrequent)</span>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="flex items-center space-x-6 mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={considerTaxes}
              onChange={(e) => setConsiderTaxes(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Consider tax implications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={considerTransactionCosts}
              onChange={(e) => setConsiderTransactionCosts(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Include transaction costs</span>
          </label>
        </div>
      </Card>

      {/* Current vs Target Allocations */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Current vs Target Allocation</h4>

        <div className="space-y-4">
          {Object.entries(currentPortfolio.currentAllocations).map(([assetType, current]) => {
            const strategy = rebalanceStrategies.find(s => s.id === selectedStrategy)
            const targetWeight = strategy?.targetAllocations[assetType] || 0
            const deviation = Math.abs(current.weight - targetWeight)
            const isOutOfRange = deviation >= rebalanceThreshold

            return (
              <div key={assetType} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{assetType}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">
                      Current: {formatPercentage(current.weight)}
                    </span>
                    <span className="text-gray-900">
                      Target: {formatPercentage(targetWeight)}
                    </span>
                    {isOutOfRange && (
                      <span className="text-red-600 font-medium">
                        {deviation > 0 ? '+' : ''}{(current.weight - targetWeight).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        isOutOfRange ? 'bg-red-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(current.weight, 100)}%` }}
                    />
                  </div>
                  {/* Target marker */}
                  <div
                    className="absolute top-0 w-1 h-3 bg-gray-700 rounded"
                    style={{ left: `${Math.min(targetWeight, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Rebalancing Recommendations */}
      {rebalanceRecommendations.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">
              Rebalancing Recommendations ({rebalanceRecommendations.length})
            </h4>
            <div className="flex items-center text-sm text-gray-500">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              <span>Action required</span>
            </div>
          </div>

          <div className="space-y-4">
            {rebalanceRecommendations.map((recommendation, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h5 className="text-sm font-medium text-gray-900">
                        {recommendation.name}
                      </h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(recommendation.priority)}`}>
                        {recommendation.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(recommendation.action)}`}>
                        {recommendation.action.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {recommendation.reason}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">Current: </span>
                        <span className="font-medium">
                          {formatPercentage(recommendation.currentWeight)}
                          ({formatCurrency(recommendation.currentValue)})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Target: </span>
                        <span className="font-medium">
                          {formatPercentage(recommendation.targetWeight)}
                          ({formatCurrency(recommendation.targetValue)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      recommendation.action === 'buy' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {recommendation.action === 'buy' ? '+' : '-'}
                      {formatCurrency(recommendation.actionAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {recommendation.action === 'buy' ? 'Purchase' : 'Sell'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Portfolio is balanced</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your current allocation is within the {rebalanceThreshold}% threshold for your selected strategy.
            </p>
          </div>
        </Card>
      )}

      {/* Rebalancing Impact Analysis */}
      {rebalanceRecommendations.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <CalculatorIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h4 className="text-md font-medium text-gray-900">Impact Analysis</h4>
          </div>

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(rebalanceImpact.totalTransactionAmount)}
              </div>
              <div className="text-sm text-gray-500">Total Transaction Volume</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                -{formatCurrency(rebalanceImpact.netCost)}
              </div>
              <div className="text-sm text-gray-500">
                Estimated Costs {considerTaxes && considerTransactionCosts ? '(Taxes + Fees)' :
                considerTaxes ? '(Taxes)' : considerTransactionCosts ? '(Fees)' : ''}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{formatPercentage(rebalanceImpact.projectedAnnualReturn)}
              </div>
              <div className="text-sm text-gray-500">Projected Annual Return</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                -{formatPercentage(rebalanceImpact.riskReduction)}
              </div>
              <div className="text-sm text-gray-500">Risk Reduction</div>
            </div>
          </div>

          {/* Cost Breakdown */}
          {(considerTaxes || considerTransactionCosts) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Cost Breakdown</h5>
              <div className="space-y-2 text-sm">
                {considerTransactionCosts && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Fees (0.1%)</span>
                    <span className="text-gray-900">
                      {formatCurrency(rebalanceImpact.estimatedTransactionCosts)}
                    </span>
                  </div>
                )}
                {considerTaxes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Capital Gains Tax (15%)</span>
                    <span className="text-gray-900">
                      {formatCurrency(rebalanceImpact.estimatedTaxImpact)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total Cost</span>
                  <span className="text-gray-900">
                    {formatCurrency(rebalanceImpact.netCost)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      {rebalanceRecommendations.length > 0 && (
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save for Later
          </button>
          <button
            type="button"
            onClick={handleRebalance}
            disabled={isCalculating}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <div className="flex items-center">
                <LoadingSpinner className="h-4 w-4 mr-2" />
                Calculating...
              </div>
            ) : (
              <>
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2 inline" />
                Execute Rebalancing
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
