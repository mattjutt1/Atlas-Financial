'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  CalculatorIcon,
  TrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  LightBulbIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChartBarIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { format, addMonths } from 'date-fns';
import { GET_DEBT_AI_OPTIMIZATION, APPLY_DEBT_OPTIMIZATION_STRATEGY } from '../../../lib/graphql/ai-queries';

interface DebtOptimizationSuggestionsProps {
  userId: string;
  totalDebt: number;
  monthlyPaymentCapacity: number;
  onStrategyApplied?: () => void;
}

interface DebtOptimization {
  id: string;
  totalDebt: number;
  monthlyPaymentCapacity: number;
  currentStrategy: string;
  optimalStrategy: string;
  potentialSavings: number;
  payoffTimelineMonths: number;
  confidence: number;
  strategies: Array<{
    strategyType: 'avalanche' | 'snowball' | 'hybrid' | 'consolidation';
    monthlyPayment: number;
    payoffMonths: number;
    totalInterest: number;
    potentialSavings: number;
    accounts: Array<{
      debtAccountId: string;
      accountName: string;
      priorityOrder: number;
      recommendedPayment: number;
      payoffMonth: number;
    }>;
  }>;
  consolidationOpportunities: Array<{
    opportunityType: 'personal_loan' | 'balance_transfer' | 'home_equity';
    accountsToConsolidate: string[];
    newInterestRate: number;
    newMonthlyPayment: number;
    potentialSavings: number;
    requirements: string[];
    confidence: number;
  }>;
}

export const DebtOptimizationSuggestions: React.FC<DebtOptimizationSuggestionsProps> = ({
  userId,
  totalDebt,
  monthlyPaymentCapacity,
  onStrategyApplied
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [showConsolidation, setShowConsolidation] = useState(false);

  const { data: optimizationData, loading } = useQuery(GET_DEBT_AI_OPTIMIZATION, {
    variables: {
      userId,
      includeStrategies: true,
      includeConsolidation: true
    }
  });

  const [applyDebtStrategy, { loading: applying }] = useMutation(APPLY_DEBT_OPTIMIZATION_STRATEGY);

  const optimization: DebtOptimization | null = optimizationData?.debtOptimization?.[0] || null;

  const handleApplyStrategy = async (strategyType: string) => {
    if (!optimization) return;

    try {
      const strategy = optimization.strategies.find(s => s.strategyType === strategyType);
      if (!strategy) return;

      await applyDebtStrategy({
        variables: {
          userId,
          strategyType,
          paymentAllocations: strategy.accounts.map(account => ({
            debtAccountId: account.debtAccountId,
            recommendedPayment: account.recommendedPayment,
            priorityOrder: account.priorityOrder
          }))
        }
      });

      onStrategyApplied?.();
    } catch (error) {
      console.error('Failed to apply debt strategy:', error);
    }
  };

  const getStrategyIcon = (strategyType: string) => {
    switch (strategyType) {
      case 'avalanche':
        return TrendingDownIcon;
      case 'snowball':
        return ChartBarIcon;
      case 'hybrid':
        return CalculatorIcon;
      case 'consolidation':
        return CurrencyDollarIcon;
      default:
        return LightBulbIcon;
    }
  };

  const getStrategyColor = (strategyType: string) => {
    switch (strategyType) {
      case 'avalanche':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'snowball':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'hybrid':
        return 'border-purple-200 bg-purple-50 text-purple-800';
      case 'consolidation':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getStrategyDescription = (strategyType: string) => {
    switch (strategyType) {
      case 'avalanche':
        return 'Pay minimums on all debts, then focus extra payments on highest interest rate debt first. Saves the most money overall.';
      case 'snowball':
        return 'Pay minimums on all debts, then focus extra payments on smallest balance first. Provides quick psychological wins.';
      case 'hybrid':
        return 'Combines avalanche and snowball methods, balancing mathematical optimization with psychological benefits.';
      case 'consolidation':
        return 'Combine multiple debts into a single loan with potentially lower interest rate and simplified payments.';
      default:
        return 'Custom debt repayment strategy optimized for your specific situation.';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!optimization) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <SparklesIcon className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Debt Optimization</h3>
        </div>
        <div className="text-center py-8">
          <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No debt optimization opportunities found.</p>
          <p className="text-sm text-gray-500 mt-1">This may indicate your current strategy is already optimal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Debt Optimization</h3>
            <p className="text-sm text-gray-600">Personalized strategies to accelerate debt payoff</p>
          </div>
        </div>
        <button
          onClick={() => setShowConsolidation(!showConsolidation)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showConsolidation ? 'Hide Consolidation' : 'Show Consolidation'}
        </button>
      </div>

      {/* Optimization Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-green-800">Optimization Opportunity</h4>
            <p className="text-xs text-green-700">
              Switch from {optimization.currentStrategy} to {optimization.optimalStrategy} strategy
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(optimization.potentialSavings)}
            </div>
            <div className="text-xs text-green-700">Potential Savings</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded p-3">
            <div className="flex items-center mb-1">
              <ClockIcon className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-xs text-green-700">Payoff Timeline</span>
            </div>
            <div className="text-sm font-semibold text-green-900">
              {optimization.payoffTimelineMonths} months
            </div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="flex items-center mb-1">
              <TrendingDownIcon className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-xs text-green-700">Confidence</span>
            </div>
            <div className="text-sm font-semibold text-green-900">
              {Math.round(optimization.confidence * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Comparison */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-900">Strategy Comparison</h4>
        
        {optimization.strategies.map((strategy) => {
          const isSelected = selectedStrategy === strategy.strategyType;
          const isOptimal = strategy.strategyType === optimization.optimalStrategy;
          const StrategyIcon = getStrategyIcon(strategy.strategyType);

          return (
            <div
              key={strategy.strategyType}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 
                isOptimal ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <StrategyIcon className={`w-5 h-5 mr-3 ${
                    isOptimal ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-semibold text-gray-900 capitalize">
                        {strategy.strategyType} Strategy
                      </h5>
                      {isOptimal && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {getStrategyDescription(strategy.strategyType)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStrategy(isSelected ? '' : strategy.strategyType)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {isSelected ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {/* Strategy Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {strategy.payoffMonths}
                  </div>
                  <div className="text-xs text-gray-600">Months</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(strategy.monthlyPayment)}
                  </div>
                  <div className="text-xs text-gray-600">Monthly</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(strategy.totalInterest)}
                  </div>
                  <div className="text-xs text-gray-600">Total Interest</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-600">
                    {formatCurrency(strategy.potentialSavings)}
                  </div>
                  <div className="text-xs text-gray-600">Savings</div>
                </div>
              </div>

              {/* Detailed Payment Plan */}
              {isSelected && (
                <div className="border-t border-gray-200 pt-4">
                  <h6 className="text-xs font-semibold text-gray-700 mb-3">Payment Plan</h6>
                  <div className="space-y-2">
                    {strategy.accounts.slice(0, 5).map((account, index) => (
                      <div key={account.debtAccountId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                            {account.priorityOrder}
                          </div>
                          <span className="text-sm text-gray-900">{account.accountName}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(account.recommendedPayment)}/month
                          </div>
                          <div className="text-xs text-gray-600">
                            Payoff: Month {account.payoffMonth}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleApplyStrategy(strategy.strategyType)}
                      disabled={applying}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applying ? 'Applying...' : 'Apply This Strategy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Consolidation Opportunities */}
      {showConsolidation && optimization.consolidationOpportunities.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Consolidation Opportunities</h4>
          
          <div className="space-y-4">
            {optimization.consolidationOpportunities.map((opportunity, index) => (
              <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="text-sm font-semibold text-orange-900 capitalize">
                      {opportunity.opportunityType.replace('_', ' ')} Consolidation
                    </h5>
                    <p className="text-xs text-orange-800 mt-1">
                      Consolidate {opportunity.accountsToConsolidate.length} accounts
                    </p>
                  </div>
                  <span className="text-xs text-orange-700 px-2 py-1 bg-orange-100 rounded-full">
                    {Math.round(opportunity.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-orange-700 mb-1">New Rate</div>
                    <div className="text-sm font-semibold text-orange-900">
                      {(opportunity.newInterestRate * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-orange-700 mb-1">New Payment</div>
                    <div className="text-sm font-semibold text-orange-900">
                      {formatCurrency(opportunity.newMonthlyPayment)}
                    </div>
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-orange-700 mb-1">Savings</div>
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(opportunity.potentialSavings)}
                    </div>
                  </div>
                </div>

                {opportunity.requirements.length > 0 && (
                  <div className="bg-white border border-orange-200 rounded p-3">
                    <h6 className="text-xs font-semibold text-orange-800 mb-2">Requirements</h6>
                    <ul className="space-y-1">
                      {opportunity.requirements.map((req, reqIndex) => (
                        <li key={reqIndex} className="text-xs text-orange-700 flex items-start">
                          <span className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-yellow-900 mb-1">Important Note</h5>
                <p className="text-xs text-yellow-800">
                  Debt consolidation can simplify payments and potentially save money, but it's important to 
                  carefully review terms and ensure you don't accumulate new debt on the cleared accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Summary */}
      {optimization.strategies.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {optimization.strategies.length}
              </div>
              <div className="text-xs text-gray-500">Strategies Available</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(Math.max(...optimization.strategies.map(s => s.potentialSavings)))}
              </div>
              <div className="text-xs text-gray-500">Max Savings</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Math.min(...optimization.strategies.map(s => s.payoffMonths))}
              </div>
              <div className="text-xs text-gray-500">Min Months</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};