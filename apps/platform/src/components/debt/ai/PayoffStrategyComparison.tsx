'use client';

import React, { useState } from 'react';
import {
  ChartBarIcon,
  TrendingDownIcon,
  CalculatorIcon,
  ClockIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { format, addMonths } from 'date-fns';

interface PayoffStrategyComparisonProps {
  strategies: Array<{
    id: string;
    name: string;
    type: 'avalanche' | 'snowball' | 'hybrid' | 'minimum_only';
    monthlyPayment: number;
    totalPayoffTime: number;
    totalInterestPaid: number;
    totalAmountPaid: number;
    description: string;
    pros: string[];
    cons: string[];
    bestFor: string[];
    accounts: Array<{
      id: string;
      name: string;
      balance: number;
      interestRate: number;
      minimumPayment: number;
      recommendedPayment: number;
      payoffOrder: number;
      payoffMonth: number;
    }>;
  }>;
  selectedStrategy?: string;
  onStrategySelect?: (strategyId: string) => void;
  className?: string;
}

export const PayoffStrategyComparison: React.FC<PayoffStrategyComparisonProps> = ({
  strategies,
  selectedStrategy,
  onStrategySelect,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'comparison' | 'timeline'>('comparison');
  const [expandedStrategy, setExpandedStrategy] = useState<string>('');

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'avalanche':
        return TrendingDownIcon;
      case 'snowball':
        return ChartBarIcon;
      case 'hybrid':
        return CalculatorIcon;
      case 'minimum_only':
        return ClockIcon;
      default:
        return CurrencyDollarIcon;
    }
  };

  const getStrategyColor = (type: string, isSelected: boolean = false) => {
    const baseColors = {
      avalanche: isSelected ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50',
      snowball: isSelected ? 'border-green-500 bg-green-50' : 'border-green-200 bg-green-50',
      hybrid: isSelected ? 'border-purple-500 bg-purple-50' : 'border-purple-200 bg-purple-50',
      minimum_only: isSelected ? 'border-gray-500 bg-gray-50' : 'border-gray-200 bg-gray-50'
    };
    return baseColors[type as keyof typeof baseColors] || 'border-gray-200 bg-gray-50';
  };

  const getBestStrategy = () => {
    return strategies.reduce((best, current) => {
      const bestSavings = (strategies[0].totalInterestPaid - best.totalInterestPaid);
      const currentSavings = (strategies[0].totalInterestPaid - current.totalInterestPaid);
      return currentSavings > bestSavings ? current : best;
    });
  };

  const getFastestStrategy = () => {
    return strategies.reduce((fastest, current) => 
      current.totalPayoffTime < fastest.totalPayoffTime ? current : fastest
    );
  };

  const bestStrategy = getBestStrategy();
  const fastestStrategy = getFastestStrategy();

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payoff Strategy Comparison</h3>
          <p className="text-sm text-gray-600">Compare different debt repayment approaches</p>
        </div>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'comparison'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Comparison
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Strategy Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-semibold text-green-800">Most Savings</span>
          </div>
          <div className="text-lg font-bold text-green-900 mb-1">
            {bestStrategy.name}
          </div>
          <div className="text-sm text-green-700">
            Saves {formatCurrency(strategies[0].totalInterestPaid - bestStrategy.totalInterestPaid)} in interest
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ClockIcon className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-semibold text-blue-800">Fastest Payoff</span>
          </div>
          <div className="text-lg font-bold text-blue-900 mb-1">
            {fastestStrategy.name}
          </div>
          <div className="text-sm text-blue-700">
            {fastestStrategy.totalPayoffTime} months to debt freedom
          </div>
        </div>
      </div>

      {viewMode === 'comparison' ? (
        <div className="space-y-4">
          {strategies.map((strategy) => {
            const isSelected = selectedStrategy === strategy.id;
            const isExpanded = expandedStrategy === strategy.id;
            const StrategyIcon = getStrategyIcon(strategy.type);
            const isBest = strategy.id === bestStrategy.id;
            const isFastest = strategy.id === fastestStrategy.id;

            return (
              <div
                key={strategy.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${getStrategyColor(strategy.type, isSelected)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center flex-1">
                    <button
                      onClick={() => onStrategySelect?.(strategy.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <StrategyIcon className="w-5 h-5 text-gray-600 mr-2" />
                        <h4 className="text-sm font-semibold text-gray-900">{strategy.name}</h4>
                        <div className="flex items-center ml-2 space-x-1">
                          {isBest && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Best Savings
                            </span>
                          )}
                          {isFastest && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Fastest
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{strategy.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedStrategy(isExpanded ? '' : strategy.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-4"
                  >
                    {isExpanded ? 'Less Info' : 'More Info'}
                  </button>
                </div>

                {/* Strategy Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {strategy.totalPayoffTime}
                    </div>
                    <div className="text-xs text-gray-600">Months</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(strategy.monthlyPayment)}
                    </div>
                    <div className="text-xs text-gray-600">Monthly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(strategy.totalInterestPaid)}
                    </div>
                    <div className="text-xs text-gray-600">Total Interest</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(strategy.totalAmountPaid)}
                    </div>
                    <div className="text-xs text-gray-600">Total Paid</div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    {/* Pros and Cons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">Advantages</h5>
                        <ul className="space-y-1">
                          {strategy.pros.map((pro, index) => (
                            <li key={index} className="text-xs text-gray-700 flex items-start">
                              <CheckCircleIcon className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">Considerations</h5>
                        <ul className="space-y-1">
                          {strategy.cons.map((con, index) => (
                            <li key={index} className="text-xs text-gray-700 flex items-start">
                              <ExclamationTriangleIcon className="w-3 h-3 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Best For */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Best For</h5>
                      <div className="flex flex-wrap gap-2">
                        {strategy.bestFor.map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Payment Schedule Preview */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Payment Order</h5>
                      <div className="space-y-2">
                        {strategy.accounts
                          .sort((a, b) => a.payoffOrder - b.payoffOrder)
                          .slice(0, 3)
                          .map((account, index) => (
                            <div key={account.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <div className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                                  {account.payoffOrder}
                                </div>
                                <span className="text-xs text-gray-900">{account.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-gray-900">
                                  {formatCurrency(account.recommendedPayment)}/mo
                                </div>
                                <div className="text-xs text-gray-600">
                                  {(account.interestRate * 100).toFixed(1)}% APR
                                </div>
                              </div>
                            </div>
                          ))}
                        {strategy.accounts.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{strategy.accounts.length - 3} more accounts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Timeline View
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Payoff Timeline Comparison</h4>
            
            {/* Timeline Chart */}
            <div className="space-y-3">
              {strategies.map((strategy) => {
                const maxTime = Math.max(...strategies.map(s => s.totalPayoffTime));
                const widthPercentage = (strategy.totalPayoffTime / maxTime) * 100;
                
                return (
                  <div key={strategy.id} className="flex items-center">
                    <div className="w-20 text-xs text-gray-700 mr-4">
                      {strategy.name}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div 
                        className={`h-4 rounded-full ${
                          strategy.type === 'avalanche' ? 'bg-blue-500' :
                          strategy.type === 'snowball' ? 'bg-green-500' :
                          strategy.type === 'hybrid' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}
                        style={{ width: `${widthPercentage}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {strategy.totalPayoffTime}mo
                      </span>
                    </div>
                    <div className="w-24 text-xs text-gray-700 text-right ml-4">
                      {formatCurrency(strategy.totalInterestPaid)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Payment Progression */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Payment Strategy Details</h4>
            
            {selectedStrategy && strategies.find(s => s.id === selectedStrategy) && (
              <div className="space-y-3">
                {strategies
                  .find(s => s.id === selectedStrategy)
                  ?.accounts.sort((a, b) => a.payoffOrder - b.payoffOrder)
                  .map((account, index) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {account.payoffOrder}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{account.name}</div>
                          <div className="text-xs text-gray-600">
                            {formatCurrency(account.balance)} at {(account.interestRate * 100).toFixed(1)}%
                          </div>
                        </div>
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
            )}
          </div>
        </div>
      )}

      {/* Strategy Selection Summary */}
      {selectedStrategy && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Selected Strategy: {strategies.find(s => s.id === selectedStrategy)?.name}
                </h4>
                <p className="text-xs text-blue-800">
                  This strategy will pay off your debt in {strategies.find(s => s.id === selectedStrategy)?.totalPayoffTime} months 
                  with {formatCurrency(strategies.find(s => s.id === selectedStrategy)?.totalInterestPaid || 0)} in total interest.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};