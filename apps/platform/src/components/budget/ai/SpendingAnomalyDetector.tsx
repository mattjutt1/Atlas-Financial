'use client';

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CalendarIcon,
  TagIcon,
  BanknotesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { formatDistance } from 'date-fns';
import { GET_SPENDING_ANOMALIES } from '../../../lib/graphql/ai-queries';

interface SpendingAnomalyDetectorProps {
  userId: string;
  budgetId: string;
  onAnomalyClick?: (anomaly: SpendingAnomaly) => void;
}

interface SpendingAnomaly {
  id: string;
  type: 'unusual_amount' | 'frequency_spike' | 'new_merchant' | 'category_shift' | 'timing_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  amount: number;
  normalAmount: number;
  deviation: number;
  confidence: number;
  description: string;
  transactionId?: string;
  merchantName?: string;
  detectedAt: string;
  relatedTransactions?: number;
  recommendation?: string;
}

export const SpendingAnomalyDetector: React.FC<SpendingAnomalyDetectorProps> = ({
  userId,
  budgetId,
  onAnomalyClick
}) => {
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const { data: anomaliesData, loading, refetch } = useQuery(GET_SPENDING_ANOMALIES, {
    variables: {
      userId,
      budgetId,
      severityFilter: selectedSeverity === 'all' ? undefined : [selectedSeverity],
      limit: 10
    },
    pollInterval: 600000 // Refresh every 10 minutes
  });

  const anomalies: SpendingAnomaly[] = (anomaliesData?.spendingAnomalies || [])
    .filter((anomaly: SpendingAnomaly) => !dismissedAnomalies.has(anomaly.id));

  const handleDismissAnomaly = (anomalyId: string) => {
    setDismissedAnomalies(prev => new Set([...prev, anomalyId]));
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'unusual_amount':
        return BanknotesIcon;
      case 'frequency_spike':
        return ChartBarIcon;
      case 'new_merchant':
        return TagIcon;
      case 'category_shift':
        return ChartBarIcon;
      case 'timing_anomaly':
        return CalendarIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[severity as keyof typeof colors]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
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
          <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Spending Anomalies</h3>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <InformationCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No unusual spending patterns detected.</p>
          <p className="text-sm text-gray-500 mt-1">Your spending looks normal for this period.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => {
            const Icon = getAnomalyIcon(anomaly.type);
            return (
              <div
                key={anomaly.id}
                className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)} transition-all duration-200 hover:shadow-md cursor-pointer`}
                onClick={() => onAnomalyClick?.(anomaly)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${getIconColor(anomaly.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {anomaly.category} - {anomaly.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          {getSeverityBadge(anomaly.severity)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round(anomaly.confidence * 100)}% confidence
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        {anomaly.description}
                      </p>

                      {/* Anomaly details */}
                      <div className="bg-white rounded p-3 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Amount</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(anomaly.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Normal Range</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(anomaly.normalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Deviation</span>
                          <span className={`font-medium ${
                            anomaly.deviation > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {anomaly.deviation > 0 ? '+' : ''}
                            {Math.round(anomaly.deviation * 100)}%
                          </span>
                        </div>
                        {anomaly.merchantName && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Merchant</span>
                            <span className="font-medium text-gray-900">
                              {anomaly.merchantName}
                            </span>
                          </div>
                        )}
                        {anomaly.relatedTransactions && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Related Transactions</span>
                            <span className="font-medium text-gray-900">
                              {anomaly.relatedTransactions}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Recommendation */}
                      {anomaly.recommendation && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <div className="flex items-start">
                            <InformationCircleIcon className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800">
                              <strong>Recommendation:</strong> {anomaly.recommendation}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Detected {formatDistance(new Date(anomaly.detectedAt), new Date(), { addSuffix: true })}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissAnomaly(anomaly.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label="Dismiss anomaly"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Anomaly Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
            const count = anomalies.filter(a => a.severity === severity).length;
            return (
              <div key={severity}>
                <div className={`text-lg font-semibold ${getIconColor(severity)}`}>
                  {count}
                </div>
                <div className="text-xs text-gray-500 capitalize">{severity}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};