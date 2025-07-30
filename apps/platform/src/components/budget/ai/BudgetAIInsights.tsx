'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { GET_BUDGET_AI_INSIGHTS } from '../../../lib/graphql/ai-queries';

interface BudgetAIInsightsProps {
  userId: string;
  budgetId: string;
  categories: any[];
  totalSpent: number;
  totalAllocated: number;
  remainingBudget: number;
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'anomaly' | 'prediction' | 'optimization';
  category: 'spending' | 'allocation' | 'saving' | 'warning';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  data?: any;
  createdAt: string;
}

export const BudgetAIInsights: React.FC<BudgetAIInsightsProps> = ({
  userId,
  budgetId,
  categories,
  totalSpent,
  totalAllocated,
  remainingBudget
}) => {
  const { data: insightsData, loading } = useQuery(GET_BUDGET_AI_INSIGHTS, {
    variables: {
      userId,
      budgetId,
      categories: ['budget', 'spending', 'optimization']
    },
    pollInterval: 300000 // Refresh every 5 minutes
  });

  const insights: AIInsight[] = insightsData?.insights || [];

  // Filter and prioritize insights
  const prioritizedInsights = insights
    .filter(insight => insight.confidence >= 0.7)
    .sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    })
    .slice(0, 4); // Show top 4 insights

  const getInsightIcon = (type: string, category: string) => {
    switch (type) {
      case 'recommendation':
        return LightBulbIcon;
      case 'anomaly':
        return ExclamationTriangleIcon;
      case 'prediction':
        return TrendingUpIcon;
      case 'optimization':
        return SparklesIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'high':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'medium':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'low':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getIconColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Budget Insights</h3>
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          <ClockIcon className="w-4 h-4 mr-1" />
          Updated 5 min ago
        </div>
      </div>

      {prioritizedInsights.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">Your budget looks healthy! No urgent insights at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prioritizedInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type, insight.category);
            return (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getInsightColor(insight.impact)}`}
              >
                <div className="flex items-start">
                  <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${getIconColor(insight.impact)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {insight.title}
                      </h4>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="px-2 py-1 bg-white rounded-full">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      {insight.description}
                    </p>
                    
                    {/* Specific data visualizations based on insight type */}
                    {insight.type === 'anomaly' && insight.data?.spendingChange && (
                      <div className="bg-white rounded p-3 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span>Spending Change</span>
                          <span className={`font-medium ${
                            insight.data.spendingChange > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {insight.data.spendingChange > 0 ? '+' : ''}
                            {formatCurrency(insight.data.spendingChange)}
                          </span>
                        </div>
                      </div>
                    )}

                    {insight.type === 'prediction' && insight.data?.projectedSpending && (
                      <div className="bg-white rounded p-3 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span>Projected Month-End</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(insight.data.projectedSpending)}
                          </span>
                        </div>
                        <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (insight.data.projectedSpending / totalAllocated) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {insight.type === 'recommendation' && insight.data?.suggestedAllocation && (
                      <div className="bg-white rounded p-3 mb-3">
                        <div className="text-xs text-gray-600 mb-1">Suggested Reallocation</div>
                        <div className="space-y-1">
                          {Object.entries(insight.data.suggestedAllocation).map(([category, amount]) => (
                            <div key={category} className="flex justify-between text-xs">
                              <span>{category}</span>
                              <span className="font-medium">{formatCurrency(amount as number)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.action && (
                      <button 
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
                        onClick={() => {
                          // Handle insight action - could trigger modal, navigation, etc.
                          console.log('Taking action:', insight.action);
                        }}
                      >
                        {insight.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {insights.filter(i => i.type === 'anomaly').length}
            </div>
            <div className="text-xs text-gray-500">Anomalies Detected</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {insights.filter(i => i.type === 'recommendation').length}
            </div>
            <div className="text-xs text-gray-500">Recommendations</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round((insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) * 100) || 0}%
            </div>
            <div className="text-xs text-gray-500">Avg. Confidence</div>
          </div>
        </div>
      </div>
    </div>
  );
};