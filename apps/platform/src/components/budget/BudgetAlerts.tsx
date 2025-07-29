'use client';

import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { GET_BUDGET_ALERTS } from '../../lib/graphql/budget-queries';
import { UPDATE_BUDGET_ALERT_STATUS } from '../../lib/graphql/budget-mutations';

interface BudgetAlertsProps {
  userId: string;
}

interface BudgetAlert {
  id: string;
  budget_id: string;
  category_id?: string;
  alert_type: 'overspending' | 'approaching_limit' | 'budget_exceeded' | 'unallocated';
  threshold_percentage: number;
  current_percentage: number;
  is_triggered: boolean;
  message: string;
  created_at: string;
  budget: {
    name: string;
  };
  category?: {
    name: string;
  };
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({ userId }) => {
  const {
    data: alertsData,
    loading,
    refetch
  } = useQuery(GET_BUDGET_ALERTS, {
    variables: { userId },
    fetchPolicy: 'cache-and-network'
  });

  const [updateAlertStatus] = useMutation(UPDATE_BUDGET_ALERT_STATUS);

  const alerts: BudgetAlert[] = alertsData?.budget_alerts || [];
  const activeAlerts = alerts.filter(alert => alert.is_triggered);

  const handleDismissAlert = async (alertId: string) => {
    try {
      await updateAlertStatus({
        variables: {
          id: alertId,
          isActive: false
        }
      });
      refetch();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'overspending':
      case 'budget_exceeded':
        return ExclamationTriangleIcon;
      case 'approaching_limit':
        return InformationCircleIcon;
      case 'unallocated':
        return BellIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'overspending':
      case 'budget_exceeded':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600'
        };
      case 'approaching_limit':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600'
        };
      case 'unallocated':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'text-gray-600'
        };
    }
  };

  const formatAlertTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 animate-pulse">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">All Good!</h3>
            <p className="text-sm text-gray-600">No budget alerts at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {activeAlerts.length} active
        </span>
      </div>

      <div className="space-y-4">
        {activeAlerts.map((alert) => {
          const AlertIcon = getAlertIcon(alert.alert_type);
          const colors = getAlertColor(alert.alert_type);

          return (
            <div
              key={alert.id}
              className={`${colors.bg} ${colors.border} border rounded-lg p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertIcon className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`text-sm font-medium ${colors.text}`}>
                        {alert.alert_type === 'overspending' && 'Overspending Alert'}
                        {alert.alert_type === 'approaching_limit' && 'Approaching Budget Limit'}
                        {alert.alert_type === 'budget_exceeded' && 'Budget Exceeded'}
                        {alert.alert_type === 'unallocated' && 'Unallocated Funds'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatAlertTime(alert.created_at)}
                      </span>
                    </div>

                    <p className={`text-sm ${colors.text} mb-2`}>
                      {alert.message}
                    </p>

                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-gray-600">
                        Budget: <span className="font-medium">{alert.budget.name}</span>
                      </span>
                      {alert.category && (
                        <span className="text-gray-600">
                          Category: <span className="font-medium">{alert.category.name}</span>
                        </span>
                      )}
                      {alert.current_percentage > 0 && (
                        <span className="text-gray-600">
                          Usage: <span className="font-medium">{Math.round(alert.current_percentage)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className={`p-1 rounded-md ${colors.icon} hover:bg-white hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  aria-label="Dismiss alert"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Management Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Info</span>
            </div>
          </div>

          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Manage Alert Settings
          </button>
        </div>
      </div>
    </div>
  );
};
