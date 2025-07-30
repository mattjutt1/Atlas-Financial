'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  ScaleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { APPLY_REBALANCING_SUGGESTIONS } from '../../../lib/graphql/ai-queries';

interface RebalancingRecommendationsProps {
  userId: string;
  portfolioId: string;
  suggestions: Array<{
    id: string;
    assetClass: string;
    currentAllocation: number;
    targetAllocation: number;
    suggestedAction: 'buy' | 'sell' | 'hold';
    amount: number;
    reasoning: string;
    priority: number;
    confidence: number;
    expectedImpact: number;
    riskImpact: 'increase' | 'decrease' | 'neutral';
    timeHorizon: 'immediate' | 'short_term' | 'long_term';
  }>;
  totalPortfolioValue: number;
  onApplyRebalancing?: () => void;
}

export const RebalancingRecommendations: React.FC<RebalancingRecommendationsProps> = ({
  userId,
  portfolioId,
  suggestions,
  totalPortfolioValue,
  onApplyRebalancing
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false);

  const [applyRebalancingSuggestions, { loading: applying }] = useMutation(APPLY_REBALANCING_SUGGESTIONS);

  const totalRebalancingAmount = suggestions
    .filter(s => selectedSuggestions.has(s.id))
    .reduce((sum, s) => sum + Math.abs(s.amount), 0);

  const totalExpectedImpact = suggestions
    .filter(s => selectedSuggestions.has(s.id))
    .reduce((sum, s) => sum + s.expectedImpact, 0);

  const handleToggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleApplySelected = async () => {
    if (selectedSuggestions.size === 0) return;

    try {
      const rebalancingActions = suggestions
        .filter(s => selectedSuggestions.has(s.id))
        .map(s => ({
          assetClass: s.assetClass,
          action: s.suggestedAction,
          amount: s.amount,
          targetAllocation: s.targetAllocation
        }));

      await applyRebalancingSuggestions({
        variables: {
          portfolioId,
          rebalancingActions
        }
      });

      setSelectedSuggestions(new Set());
      onApplyRebalancing?.();
    } catch (error) {
      console.error('Failed to apply rebalancing suggestions:', error);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'text-green-600 bg-green-100';
      case 'sell':
        return 'text-red-600 bg-red-100';
      case 'hold':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return TrendingUpIcon;
      case 'sell':
        return TrendingDownIcon;
      default:
        return ArrowRightIcon;
    }
  };

  const getRiskImpactColor = (riskImpact: string) => {
    switch (riskImpact) {
      case 'increase':
        return 'text-red-600';
      case 'decrease':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-orange-600 bg-orange-100';
    if (priority >= 2) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ScaleIcon className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Rebalancing Recommendations</h3>
        </div>
        <div className="text-center py-8">
          <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">Your portfolio allocation is optimal!</p>
          <p className="text-sm text-gray-500 mt-1">No rebalancing needed at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ScaleIcon className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rebalancing Recommendations</h3>
            <p className="text-sm text-gray-600">AI-powered portfolio optimization</p>
          </div>
        </div>
        <button
          onClick={() => setShowRiskAnalysis(!showRiskAnalysis)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showRiskAnalysis ? 'Hide Risk Analysis' : 'Show Risk Analysis'}
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-blue-800">Portfolio Rebalancing Summary</h4>
            <p className="text-xs text-blue-700">
              {suggestions.length} recommendations • Potential annual impact: {formatCurrency(suggestions.reduce((sum, s) => sum + s.expectedImpact, 0))}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedSuggestions.size === suggestions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        
        {selectedSuggestions.size > 0 && (
          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-medium">{selectedSuggestions.size}</span> recommendations selected
                <span className="ml-2 text-xs">• Total impact: {formatCurrency(totalExpectedImpact)}/year</span>
              </div>
              <button
                onClick={handleApplySelected}
                disabled={applying}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : 'Apply Selected'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rebalancing Suggestions */}
      <div className="space-y-4 mb-6">
        {suggestions
          .sort((a, b) => b.priority - a.priority)
          .map((suggestion) => {
            const isSelected = selectedSuggestions.has(suggestion.id);
            const ActionIcon = getActionIcon(suggestion.suggestedAction);
            const allocationDiff = suggestion.targetAllocation - suggestion.currentAllocation;

            return (
              <div
                key={suggestion.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <button
                    onClick={() => handleToggleSuggestion(suggestion.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-4 mt-0.5 transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500 text-white' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {suggestion.assetClass}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(suggestion.suggestedAction)}`}>
                          {suggestion.suggestedAction.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                          Priority {suggestion.priority}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(Math.abs(suggestion.amount))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-4">
                      {suggestion.reasoning}
                    </p>

                    {/* Allocation Details */}
                    <div className="bg-white rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-700">Allocation Change</span>
                        <ActionIcon className={`w-4 h-4 ${
                          suggestion.suggestedAction === 'buy' ? 'text-green-600' : 
                          suggestion.suggestedAction === 'sell' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex-1">
                          <div className="text-xs text-gray-600 mb-1">Current</div>
                          <div className="bg-gray-200 rounded-full h-2 relative">
                            <div 
                              className="bg-gray-500 h-2 rounded-full"
                              style={{ width: `${suggestion.currentAllocation * 100}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium text-gray-900 mt-1">
                            {(suggestion.currentAllocation * 100).toFixed(1)}%
                          </div>
                        </div>
                        
                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                        
                        <div className="flex-1">
                          <div className="text-xs text-gray-600 mb-1">Target</div>
                          <div className="bg-gray-200 rounded-full h-2 relative">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${suggestion.targetAllocation * 100}%` }}
                            />
                          </div>
                          <div className="text-xs font-medium text-blue-900 mt-1">
                            {(suggestion.targetAllocation * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Change</span>
                        <span className={`font-medium ${
                          allocationDiff > 0 ? 'text-green-600' : allocationDiff < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {allocationDiff > 0 ? '+' : ''}{(allocationDiff * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Impact Analysis */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-green-700">Expected Impact</span>
                          <TrendingUpIcon className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="text-sm font-semibold text-green-900">
                          +{formatCurrency(suggestion.expectedImpact)}/year
                        </div>
                      </div>

                      <div className={`border rounded p-3 ${
                        suggestion.riskImpact === 'increase' ? 'bg-red-50 border-red-200' :
                        suggestion.riskImpact === 'decrease' ? 'bg-green-50 border-green-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${getRiskImpactColor(suggestion.riskImpact)}`}>
                            Risk Impact
                          </span>
                          {suggestion.riskImpact === 'increase' ? (
                            <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
                          ) : suggestion.riskImpact === 'decrease' ? (
                            <CheckIcon className="w-3 h-3 text-green-600" />
                          ) : (
                            <ArrowRightIcon className="w-3 h-3 text-gray-600" />
                          )}
                        </div>
                        <div className={`text-sm font-semibold ${getRiskImpactColor(suggestion.riskImpact)}`}>
                          {suggestion.riskImpact.charAt(0).toUpperCase() + suggestion.riskImpact.slice(1)}
                        </div>
                      </div>
                    </div>

                    {/* Time Horizon */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>Time Horizon: {suggestion.timeHorizon.replace('_', ' ')}</span>
                      <span>
                        {(Math.abs(suggestion.amount) / totalPortfolioValue * 100).toFixed(1)}% of portfolio
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Risk Analysis */}
      {showRiskAnalysis && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Risk Analysis</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-3">Risk Distribution</h5>
              <div className="space-y-2">
                {(['Low', 'Medium', 'High'] as const).map((risk) => {
                  const count = suggestions.filter(s => 
                    s.riskImpact === (risk === 'Low' ? 'decrease' : risk === 'High' ? 'increase' : 'neutral')
                  ).length;
                  return (
                    <div key={risk} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{risk} Risk</span>
                      <span className="text-xs font-medium">{count} suggestions</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-3">Action Breakdown</h5>
              <div className="space-y-2">
                {(['buy', 'sell', 'hold'] as const).map((action) => {
                  const count = suggestions.filter(s => s.suggestedAction === action).length;
                  const amount = suggestions
                    .filter(s => s.suggestedAction === action)
                    .reduce((sum, s) => sum + Math.abs(s.amount), 0);
                  return (
                    <div key={action} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 capitalize">{action}</span>
                      <div className="text-right">
                        <div className="text-xs font-medium">{count} ops</div>
                        <div className="text-xs text-gray-500">{formatCurrency(amount)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-blue-900 mb-1">Important Considerations</h5>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Rebalancing may trigger taxable events in taxable accounts</li>
                  <li>• Consider your investment timeline and risk tolerance</li>
                  <li>• Market conditions can affect the timing of rebalancing</li>
                  <li>• Transaction costs may impact the net benefit of small adjustments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};