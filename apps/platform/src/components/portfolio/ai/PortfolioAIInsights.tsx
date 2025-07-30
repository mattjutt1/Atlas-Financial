'use client';

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  ChartPieIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { GET_PORTFOLIO_AI_INSIGHTS } from '../../../lib/graphql/ai-queries';

interface PortfolioAIInsightsProps {
  userId: string;
  portfolioId: string;
  portfolioName: string;
  totalValue: number;
  onRebalanceClick?: () => void;
}

interface PortfolioInsight {
  id: string;
  insightType: 'performance' | 'risk' | 'allocation' | 'market' | 'tax' | 'diversification';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  potentialImpact: number;
  data: any;
  createdAt: string;
}

interface RebalancingSuggestion {
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
}

interface RiskAnalysis {
  id: string;
  riskScore: number;
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  volatilityAnalysis: {
    currentVolatility: number;
    benchmarkVolatility: number;
    riskAdjustedReturn: number;
  };
  concentrationRisk: {
    topHoldings: Array<{
      name: string;
      percentage: number;
      risk: string;
    }>;
    sectorConcentration: Array<{
      sector: string;
      percentage: number;
      risk: string;
    }>;
  };
  recommendations: Array<{
    riskFactor: string;
    currentLevel: string;
    recommendedAction: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export const PortfolioAIInsights: React.FC<PortfolioAIInsightsProps> = ({
  userId,
  portfolioId,
  portfolioName,
  totalValue,
  onRebalanceClick
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'rebalancing' | 'risk'>('insights');

  const { data: insightsData, loading } = useQuery(GET_PORTFOLIO_AI_INSIGHTS, {
    variables: {
      userId,
      portfolioId,
      includeRebalancing: true,
      includeRiskAnalysis: true
    },
    pollInterval: 900000 // Refresh every 15 minutes
  });

  const insights: PortfolioInsight[] = insightsData?.portfolioInsights || [];
  const rebalancingSuggestions: RebalancingSuggestion[] = insightsData?.rebalancingSuggestions || [];
  const riskAnalysis: RiskAnalysis | null = insightsData?.riskAnalysis?.[0] || null;

  // Filter and sort insights by priority
  const prioritizedInsights = insights
    .filter(insight => insight.confidence >= 0.7)
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 6);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return TrendingUpIcon;
      case 'risk':
        return ShieldCheckIcon;
      case 'allocation':
        return ChartPieIcon;
      case 'market':
        return TrendingDownIcon;
      case 'tax':
        return InformationCircleIcon;
      case 'diversification':
        return AdjustmentsHorizontalIcon;
      default:
        return LightBulbIcon;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getIconColor = (priority: string) => {
    switch (priority) {
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'very_low':
        return 'text-green-600 bg-green-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'very_high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Portfolio AI Insights</h3>
            <p className="text-sm text-gray-600">{portfolioName}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          <ClockIcon className="w-4 h-4 mr-1" />
          Updated 15 min ago
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {(['insights', 'rebalancing', 'risk'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {prioritizedInsights.length === 0 ? (
            <div className="text-center py-8">
              <InformationCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Your portfolio is performing well!</p>
              <p className="text-sm text-gray-500 mt-1">No critical insights at this time.</p>
            </div>
          ) : (
            prioritizedInsights.map((insight) => {
              const Icon = getInsightIcon(insight.insightType);
              return (
                <div
                  key={insight.id}
                  className={`border rounded-lg p-4 ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${getIconColor(insight.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {insight.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                          <span className="text-xs px-2 py-1 bg-white rounded-full font-medium">
                            {insight.priority}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        {insight.description}
                      </p>

                      {/* Specific data based on insight type */}
                      {insight.insightType === 'performance' && insight.data?.performanceMetrics && (
                        <div className="bg-white rounded p-3 mb-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-600">Return</span>
                              <div className="font-medium text-gray-900">
                                {(insight.data.performanceMetrics.return * 100).toFixed(2)}%
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Benchmark</span>
                              <div className="font-medium text-gray-900">
                                {(insight.data.performanceMetrics.benchmark * 100).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {insight.insightType === 'allocation' && insight.data?.allocationDrift && (
                        <div className="bg-white rounded p-3 mb-3">
                          <div className="text-xs text-gray-600 mb-2">Allocation Drift</div>
                          {Object.entries(insight.data.allocationDrift).map(([asset, drift]) => (
                            <div key={asset} className="flex justify-between text-xs mb-1">
                              <span>{asset}</span>
                              <span className={`font-medium ${
                                (drift as number) > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {(drift as number) > 0 ? '+' : ''}{((drift as number) * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {insight.potentialImpact && (
                        <div className="text-xs text-gray-600">
                          Potential Impact: <span className="font-medium">{formatCurrency(insight.potentialImpact)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rebalancing Tab */}
      {activeTab === 'rebalancing' && (
        <div className="space-y-4">
          {rebalancingSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <AdjustmentsHorizontalIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Your portfolio allocation looks optimal!</p>
              <p className="text-sm text-gray-500 mt-1">No rebalancing needed at this time.</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">
                      Rebalancing Recommendations
                    </h4>
                    <p className="text-xs text-blue-700">
                      {rebalancingSuggestions.length} suggestions to optimize your allocation
                    </p>
                  </div>
                  {onRebalanceClick && (
                    <button
                      onClick={onRebalanceClick}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Start Rebalancing
                    </button>
                  )}
                </div>
              </div>

              {rebalancingSuggestions.map((suggestion, index) => (
                <div key={suggestion.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {suggestion.assetClass}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span>Current: {(suggestion.currentAllocation * 100).toFixed(1)}%</span>
                        <span>Target: {(suggestion.targetAllocation * 100).toFixed(1)}%</span>
                        <span className={`font-medium px-2 py-1 rounded-full ${
                          suggestion.suggestedAction === 'buy' ? 'bg-green-100 text-green-800' :
                          suggestion.suggestedAction === 'sell' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {suggestion.suggestedAction.toUpperCase()}
                        </span>
                      </div>
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

                  <p className="text-sm text-gray-700 mb-3">
                    {suggestion.reasoning}
                  </p>

                  <div className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Expected Impact</span>
                      <span className="font-medium text-green-600">
                        +{formatCurrency(suggestion.expectedImpact)}/year
                      </span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${suggestion.priority * 20}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Risk Tab */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          {!riskAnalysis ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Risk analysis is being processed...</p>
            </div>
          ) : (
            <>
              {/* Risk Score Overview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">Overall Risk Assessment</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(riskAnalysis.riskLevel)}`}>
                    {riskAnalysis.riskLevel.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {riskAnalysis.riskScore}/10
                    </div>
                    <div className="text-sm text-gray-600">Risk Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {(riskAnalysis.volatilityAnalysis.currentVolatility * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Volatility</div>
                  </div>
                </div>
              </div>

              {/* Concentration Risk */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Concentration Risk</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-2">Top Holdings</div>
                    {riskAnalysis.concentrationRisk.topHoldings.slice(0, 3).map((holding, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm text-gray-900">{holding.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{holding.percentage.toFixed(1)}%</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            holding.risk === 'high' ? 'bg-red-100 text-red-800' :
                            holding.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {holding.risk}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Risk Recommendations */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Risk Management Recommendations</h4>
                <div className="space-y-3">
                  {riskAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-900">
                              {rec.riskFactor}
                            </span>
                            <span className="text-xs text-blue-700 px-2 py-1 bg-blue-100 rounded-full">
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-blue-800 mb-2">
                            Current: {rec.currentLevel}
                          </p>
                          <p className="text-sm text-blue-800">
                            <strong>Action:</strong> {rec.recommendedAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {insights.length}
            </div>
            <div className="text-xs text-gray-500">Total Insights</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {rebalancingSuggestions.length}
            </div>
            <div className="text-xs text-gray-500">Rebalancing Ops</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {riskAnalysis?.riskScore || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Risk Score</div>
          </div>
        </div>
      </div>
    </div>
  );
};