'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
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
  ClockIcon,
  WifiIcon,
  ExclamationCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';

// GraphQL Queries and Subscriptions
import { gql } from '@apollo/client';

const GET_PORTFOLIO_ANALYSIS = gql`
  query GetPortfolioAnalysis($portfolioId: String!) {
    getPortfolioAnalysis(portfolioId: $portfolioId) {
      portfolio {
        id
        name
        totalValue
        totalCost
        lastUpdated
        holdings {
          symbol
          quantity
          currentValue
          allocation
        }
      }
      insights {
        id
        type
        severity
        title
        description
        confidence
        data
        timestamp
        actionRequired
      }
      rebalanceRecommendations {
        id
        symbol
        action
        currentAllocation
        targetAllocation
        recommendedAmount
        reasoning
        confidence
        expectedImpact
        priority
      }
      alerts {
        id
        type
        symbol
        message
        severity
        timestamp
        actionRequired
      }
    }
  }
`;

const PORTFOLIO_INSIGHTS_SUBSCRIPTION = gql`
  subscription PortfolioInsightsUpdated($portfolioId: String!) {
    portfolioInsightsUpdated(portfolioId: $portfolioId) {
      portfolioId
      insights {
        id
        type
        severity
        title
        description
        confidence
        data
        timestamp
        actionRequired
      }
    }
  }
`;

const REBALANCE_RECOMMENDATIONS_SUBSCRIPTION = gql`
  subscription RebalanceRecommendationsUpdated($portfolioId: String!) {
    rebalanceRecommendationsUpdated(portfolioId: $portfolioId) {
      portfolioId
      recommendations {
        id
        symbol
        action
        currentAllocation
        targetAllocation
        recommendedAmount
        reasoning
        confidence
        expectedImpact
        priority
      }
    }
  }
`;

const PORTFOLIO_ALERTS_SUBSCRIPTION = gql`
  subscription PortfolioAlertsTriggered($portfolioId: String!) {
    portfolioAlertsTriggered(portfolioId: $portfolioId) {
      id
      type
      symbol
      message
      severity
      timestamp
      actionRequired
    }
  }
`;

interface PortfolioAIInsightsRealTimeProps {
  userId: string;
  portfolioId: string;
  portfolioName: string;
  totalValue: number;
  onRebalanceClick?: () => void;
  enableRealTimeUpdates?: boolean;
}

interface AIInsight {
  id: string;
  type: 'PERFORMANCE' | 'ALLOCATION' | 'RISK' | 'OPPORTUNITY' | 'ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  confidence: number;
  data?: any;
  timestamp: string;
  actionRequired: boolean;
}

interface RebalanceRecommendation {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentAllocation: number;
  targetAllocation: number;
  recommendedAmount: number;
  reasoning: string;
  confidence: number;
  expectedImpact: number;
  priority: number;
}

interface RealTimeAlert {
  id: string;
  type: 'PRICE_THRESHOLD' | 'VOLATILITY_SPIKE' | 'VOLUME_ANOMALY' | 'NEWS_IMPACT';
  symbol: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  actionRequired: boolean;
}

export const PortfolioAIInsightsRealTime: React.FC<PortfolioAIInsightsRealTimeProps> = ({
  userId,
  portfolioId,
  portfolioName,
  totalValue,
  onRebalanceClick,
  enableRealTimeUpdates = true
}) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'rebalancing' | 'risk' | 'alerts'>('insights');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [realTimeInsights, setRealTimeInsights] = useState<AIInsight[]>([]);
  const [realTimeRecommendations, setRealTimeRecommendations] = useState<RebalanceRecommendation[]>([]);
  const [realTimeAlerts, setRealTimeAlerts] = useState<RealTimeAlert[]>([]);

  // Initial data query
  const { data: portfolioData, loading: portfolioLoading, error: portfolioError } = useQuery(GET_PORTFOLIO_ANALYSIS, {
    variables: { portfolioId },
    errorPolicy: 'all',
  });

  // Real-time subscriptions
  const { data: insightsSubData, error: insightsSubError } = useSubscription(PORTFOLIO_INSIGHTS_SUBSCRIPTION, {
    variables: { portfolioId },
    skip: !enableRealTimeUpdates,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.portfolioInsightsUpdated) {
        setRealTimeInsights(subscriptionData.data.portfolioInsightsUpdated.insights);
        setLastUpdateTime(new Date());
        setConnectionStatus('connected');
      }
    },
    onError: (error) => {
      console.error('Insights subscription error:', error);
      setConnectionStatus('error');
    }
  });

  const { data: rebalanceSubData, error: rebalanceSubError } = useSubscription(REBALANCE_RECOMMENDATIONS_SUBSCRIPTION, {
    variables: { portfolioId },
    skip: !enableRealTimeUpdates,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.rebalanceRecommendationsUpdated) {
        setRealTimeRecommendations(subscriptionData.data.rebalanceRecommendationsUpdated.recommendations);
        setLastUpdateTime(new Date());
      }
    }
  });

  const { data: alertsSubData, error: alertsSubError } = useSubscription(PORTFOLIO_ALERTS_SUBSCRIPTION, {
    variables: { portfolioId },
    skip: !enableRealTimeUpdates,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.portfolioAlertsTriggered) {
        const newAlert = subscriptionData.data.portfolioAlertsTriggered;
        setRealTimeAlerts(prev => [newAlert, ...prev.slice(0, 19)]); // Keep last 20 alerts
        setLastUpdateTime(new Date());
        
        // Show notification for critical alerts
        if (newAlert.severity === 'CRITICAL' && newAlert.actionRequired) {
          showNotification(`Critical Alert: ${newAlert.message}`, 'error');
        }
      }
    }
  });

  // Update connection status based on subscription states
  useEffect(() => {
    if (insightsSubError || rebalanceSubError || alertsSubError) {
      setConnectionStatus('error');
    } else if (enableRealTimeUpdates) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [insightsSubError, rebalanceSubError, alertsSubError, enableRealTimeUpdates]);

  // Use real-time data if available, otherwise fall back to initial query data
  const insights = realTimeInsights.length > 0 ? realTimeInsights : (portfolioData?.getPortfolioAnalysis?.insights || []);
  const rebalanceRecommendations = realTimeRecommendations.length > 0 ? realTimeRecommendations : (portfolioData?.getPortfolioAnalysis?.rebalanceRecommendations || []);
  const alerts = realTimeAlerts.length > 0 ? realTimeAlerts : (portfolioData?.getPortfolioAnalysis?.alerts || []);

  // Filter and sort insights by priority
  const prioritizedInsights = insights
    .filter((insight: AIInsight) => insight.confidence >= 0.7)
    .sort((a: AIInsight, b: AIInsight) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })
    .slice(0, 6);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'PERFORMANCE':
        return TrendingUpIcon;
      case 'RISK':
        return ShieldCheckIcon;
      case 'ALLOCATION':
        return ChartPieIcon;
      case 'OPPORTUNITY':
        return TrendingDownIcon;
      case 'ALERT':
        return ExclamationTriangleIcon;
      default:
        return LightBulbIcon;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'HIGH':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'MEDIUM':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'LOW':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getIconColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'MEDIUM':
        return 'text-blue-600';
      case 'LOW':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return WifiIcon;
      case 'error':
        return ExclamationCircleIcon;
      default:
        return WifiIcon;
    }
  };

  const showNotification = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    // Implement your notification system here
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (portfolioLoading) {
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
        <div className="flex items-center space-x-3">
          {enableRealTimeUpdates && (
            <div className={`flex items-center text-xs ${getConnectionStatusColor()}`}>
              {React.createElement(getConnectionStatusIcon(), { className: "w-4 h-4 mr-1" })}
              <span className="capitalize">{connectionStatus}</span>
            </div>
          )}
          <div className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            Updated {formatTimeAgo(lastUpdateTime.toISOString())}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {(['insights', 'rebalancing', 'risk', 'alerts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'alerts' && alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alerts.length}
              </span>
            )}
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
            prioritizedInsights.map((insight: AIInsight) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div
                  key={insight.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(insight.severity)}`}
                >
                  <div className="flex items-start">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${getIconColor(insight.severity)}`} />
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
                            {insight.severity.toLowerCase()}
                          </span>
                          {insight.actionRequired && (
                            <BellIcon className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        {insight.description}
                      </p>

                      {insight.data && (
                        <div className="bg-white rounded p-3 mb-3">
                          <div className="text-xs text-gray-600 mb-2">Additional Data</div>
                          <pre className="text-xs text-gray-800 overflow-x-auto">
                            {JSON.stringify(insight.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Generated {formatTimeAgo(insight.timestamp)}
                      </div>
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
          {rebalanceRecommendations.length === 0 ? (
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
                      Real-time Rebalancing Recommendations
                    </h4>
                    <p className="text-xs text-blue-700">
                      {rebalanceRecommendations.length} suggestions to optimize your allocation
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

              {rebalanceRecommendations
                .sort((a, b) => b.priority - a.priority)
                .map((recommendation: RebalanceRecommendation) => (
                <div key={recommendation.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {recommendation.symbol}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span>Current: {(recommendation.currentAllocation * 100).toFixed(1)}%</span>
                        <span>Target: {(recommendation.targetAllocation * 100).toFixed(1)}%</span>
                        <span className={`font-medium px-2 py-1 rounded-full ${
                          recommendation.action === 'BUY' ? 'bg-green-100 text-green-800' :
                          recommendation.action === 'SELL' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {recommendation.action}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(Math.abs(recommendation.recommendedAmount))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(recommendation.confidence * 100)}% confidence
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {recommendation.reasoning}
                  </p>

                  <div className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Expected Impact</span>
                      <span className="font-medium text-green-600">
                        +{formatCurrency(recommendation.expectedImpact)}/year
                      </span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(recommendation.priority * 20, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <BellIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">No active alerts</p>
              <p className="text-sm text-gray-500 mt-1">Your portfolio is running smoothly.</p>
            </div>
          ) : (
            alerts.map((alert: RealTimeAlert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start">
                  <ExclamationTriangleIcon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${getIconColor(alert.severity)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {alert.symbol} - {alert.type.replace('_', ' ')}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-white rounded-full font-medium">
                          {alert.severity.toLowerCase()}
                        </span>
                        {alert.actionRequired && (
                          <BellIcon className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {alert.message}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {insights.length}
            </div>
            <div className="text-xs text-gray-500">Insights</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {rebalanceRecommendations.length}
            </div>
            <div className="text-xs text-gray-500">Rebalancing</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {alerts.length}
            </div>
            <div className="text-xs text-gray-500">Alerts</div>
          </div>
          <div>
            <div className={`text-lg font-semibold ${getConnectionStatusColor()}`}>
              {enableRealTimeUpdates ? 'LIVE' : 'STATIC'}
            </div>
            <div className="text-xs text-gray-500">Data Mode</div>
          </div>
        </div>
      </div>
    </div>
  );
};