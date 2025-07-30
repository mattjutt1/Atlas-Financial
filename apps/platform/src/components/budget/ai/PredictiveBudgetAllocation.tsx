'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  XMarkIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { GET_PREDICTIVE_ALLOCATIONS, APPLY_ALLOCATION_SUGGESTIONS } from '../../../lib/graphql/ai-queries';

interface PredictiveBudgetAllocationProps {
  userId: string;
  budgetId: string;
  categories: any[];
  totalIncome: number;
  totalAllocated: number;
  onAllocationApplied?: () => void;
}

interface AllocationSuggestion {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  suggestedAmount: number;
  change: number;
  changePercentage: number;
  reasoning: string;
  confidence: number;
  impact: 'positive' | 'neutral' | 'negative';
  projectedSavings?: number;
  historicalPerformance?: {
    averageSpent: number;
    utilizationRate: number;
    trendDirection: 'up' | 'down' | 'stable';
  };
}

export const PredictiveBudgetAllocation: React.FC<PredictiveBudgetAllocationProps> = ({
  userId,
  budgetId,
  categories,
  totalIncome,
  totalAllocated,
  onAllocationApplied
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const { data: allocationsData, loading, refetch } = useQuery(GET_PREDICTIVE_ALLOCATIONS, {
    variables: {
      userId,
      budgetId,
      includeHistoricalData: true,
      confidenceThreshold: 0.6
    }
  });

  const [applyAllocationSuggestions, { loading: applying }] = useMutation(APPLY_ALLOCATION_SUGGESTIONS);

  const suggestions: AllocationSuggestion[] = allocationsData?.predictiveAllocations || [];
  
  // Filter suggestions based on view preference
  const visibleSuggestions = showAllSuggestions 
    ? suggestions 
    : suggestions.filter(s => s.confidence >= 0.75).slice(0, 5);

  const totalSavings = suggestions
    .filter(s => selectedSuggestions.has(s.categoryId))
    .reduce((sum, s) => sum + (s.projectedSavings || 0), 0);

  const totalReallocation = suggestions
    .filter(s => selectedSuggestions.has(s.categoryId))
    .reduce((sum, s) => sum + Math.abs(s.change), 0);

  const handleToggleSuggestion = (categoryId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleApplySelected = async () => {
    if (selectedSuggestions.size === 0) return;

    try {
      const selectedSuggestionData = suggestions
        .filter(s => selectedSuggestions.has(s.categoryId))
        .map(s => ({
          categoryId: s.categoryId,
          newAmount: s.suggestedAmount
        }));

      await applyAllocationSuggestions({
        variables: {
          budgetId,
          allocations: selectedSuggestionData
        }
      });

      setSelectedSuggestions(new Set());
      onAllocationApplied?.();
      refetch();
    } catch (error) {
      console.error('Failed to apply allocation suggestions:', error);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return TrendingUpIcon;
      case 'down':
        return TrendingDownIcon;
      default:
        return ArrowRightIcon;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse ml-4"></div>
            </div>
          ))}
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
            <h3 className="text-lg font-semibold text-gray-900">Smart Allocation Suggestions</h3>
            <p className="text-sm text-gray-600">AI-powered budget optimization based on your spending patterns</p>
          </div>
        </div>
        <button
          onClick={() => setShowAllSuggestions(!showAllSuggestions)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAllSuggestions ? 'Show Top Suggestions' : 'Show All Suggestions'}
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <AdjustmentsHorizontalIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Your current budget allocation looks optimal!</p>
          <p className="text-sm text-gray-500 mt-1">No significant improvements suggested at this time.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {visibleSuggestions.map((suggestion) => {
              const isSelected = selectedSuggestions.has(suggestion.categoryId);
              const TrendIcon = getTrendIcon(suggestion.historicalPerformance?.trendDirection || 'stable');
              
              return (
                <div
                  key={suggestion.categoryId}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <button
                        onClick={() => handleToggleSuggestion(suggestion.categoryId)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 mt-0.5 transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500 text-white' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {suggestion.categoryName}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${getImpactColor(suggestion.impact)}`}>
                              {suggestion.change > 0 ? '+' : ''}
                              {formatCurrency(suggestion.change)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({Math.round(suggestion.confidence * 100)}% confidence)
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {suggestion.reasoning}
                        </p>

                        {/* Current vs Suggested */}
                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-600">Current Allocation</span>
                            <span className="font-medium">{formatCurrency(suggestion.currentAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-600">Suggested Allocation</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(suggestion.suggestedAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Change</span>
                            <span className={`font-medium ${
                              suggestion.changePercentage > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {suggestion.changePercentage > 0 ? '+' : ''}
                              {suggestion.changePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Historical Performance */}
                        {suggestion.historicalPerformance && (
                          <div className="bg-white border rounded p-3 mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">Historical Average</span>
                              <span className="font-medium">
                                {formatCurrency(suggestion.historicalPerformance.averageSpent)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">Utilization Rate</span>
                              <div className="flex items-center">
                                <span className="font-medium mr-1">
                                  {Math.round(suggestion.historicalPerformance.utilizationRate * 100)}%
                                </span>
                                <TrendIcon className="w-3 h-3 text-gray-500" />
                              </div>
                            </div>
                          </div>
                        )}

                        {suggestion.projectedSavings && suggestion.projectedSavings > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <div className="flex items-center">
                              <InformationCircleIcon className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-xs text-green-800">
                                Projected monthly savings: <strong>{formatCurrency(suggestion.projectedSavings)}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apply Selected Actions */}
          {selectedSuggestions.size > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedSuggestions.size} suggestion{selectedSuggestions.size !== 1 ? 's' : ''} selected
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-sm font-medium text-green-600">
                      Potential savings: {formatCurrency(totalSavings)}/month
                    </span>
                  )}
                </div>
                <div className="text-xs text-blue-700">
                  Total reallocation: {formatCurrency(totalReallocation)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedSuggestions(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear Selection
                </button>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleApplySelected}
                    disabled={applying}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applying ? 'Applying...' : `Apply ${selectedSuggestions.size} Suggestion${selectedSuggestions.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {suggestions.length}
            </div>
            <div className="text-xs text-gray-500">Total Suggestions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round((suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length) * 100) || 0}%
            </div>
            <div className="text-xs text-gray-500">Avg. Confidence</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(suggestions.reduce((sum, s) => sum + (s.projectedSavings || 0), 0))}
            </div>
            <div className="text-xs text-gray-500">Potential Savings</div>
          </div>
        </div>
      </div>
    </div>
  );
};