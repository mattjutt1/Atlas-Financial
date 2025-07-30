/**
 * Budget Dashboard with A/B Testing Integration
 * Enhanced version of BudgetDashboard with AI features controlled by feature flags
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  PlusIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatCurrencyCompact } from '@atlas/shared/utils/currency';
import { GET_CURRENT_BUDGET, GET_BUDGET_OVERVIEW } from '../../lib/graphql/budget-queries';
import { BudgetCreationWizard } from './BudgetCreationWizard';
import { BudgetCategoryCard } from './BudgetCategoryCard';
import { BudgetProgressChart } from './BudgetProgressChart';
import { BudgetAlerts } from './BudgetAlerts';

// A/B Testing and Feature Flag Imports
import { 
  useFeatureFlag, 
  useABTest, 
  useAIFeatures, 
  AIFeatureWrapper,
  FeatureFlagWrapper 
} from '../../hooks/useFeatureFlagProvider';

// AI Components (conditionally loaded)
import { BudgetAIInsights } from './ai/BudgetAIInsights';
import { SpendingAnomalyDetector } from './ai/SpendingAnomalyDetector';
import { PredictiveBudgetAllocation } from './ai/PredictiveBudgetAllocation';

interface BudgetDashboardProps {
  userId: string;
}

export const BudgetDashboardWithABTesting: React.FC<BudgetDashboardProps> = ({ userId }) => {
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // A/B Testing Hooks
  const budgetAITest = useABTest('budget_ai_insights', 'control');
  const aiFeatures = useAIFeatures();

  // Feature Flag Evaluations
  const spendingAnomalyFlag = useFeatureFlag('spending_anomaly_detection');
  const predictiveAllocationFlag = useFeatureFlag('predictive_budget_allocation');

  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // GraphQL queries (same as original)
  const {
    data: currentBudgetData,
    loading: budgetLoading,
    refetch: refetchBudget
  } = useQuery(GET_CURRENT_BUDGET, {
    variables: { userId },
    fetchPolicy: 'cache-and-network'
  });

  const {
    data: overviewData,
    loading: overviewLoading
  } = useQuery(GET_BUDGET_OVERVIEW, {
    variables: {
      userId,
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    }
  });

  const currentBudget = currentBudgetData?.budgets?.[0];
  const categories = currentBudget?.categories || [];
  const totalIncome = currentBudget?.total_income || 0;
  const totalAllocated = currentBudget?.total_allocated || 0;
  const totalSpent = categories.reduce((sum: number, cat: any) => sum + (cat.spent_amount || 0), 0);
  const remainingBudget = totalAllocated - totalSpent;

  // Calculate budget health
  const budgetHealthScore = totalAllocated > 0 ? Math.max(0, (remainingBudget / totalAllocated) * 100) : 100;
  const isOverBudget = remainingBudget < 0;
  const isNearLimit = budgetHealthScore < 20 && !isOverBudget;

  const getBudgetHealthColor = () => {
    if (isOverBudget) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBudgetHealthIcon = () => {
    if (isOverBudget) return ExclamationTriangleIcon;
    if (isNearLimit) return ClockIcon;
    return CheckCircleIcon;
  };

  const handleWizardComplete = (budgetId: string) => {
    setShowCreateWizard(false);
    refetchBudget();
    
    // Track conversion for A/B test
    if (budgetAITest.isEnabled) {
      budgetAITest.trackConversion('budget_created', 1);
    }
  };

  // Track AI feature interactions
  const handleAIInsightClick = (insightType: string) => {
    if (budgetAITest.isEnabled) {
      budgetAITest.trackConversion('ai_insight_clicked', 1);
    }
  };

  if (budgetLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No current budget state
  if (!currentBudget) {
    return (
      <>
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Active Budget</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first budget to start tracking your spending and achieving your financial goals.
          </p>
          
          {/* AI-Enhanced Create Button (A/B Test) */}
          <FeatureFlagWrapper 
            flagName="budget_ai_insights"
            fallback={
              <button
                onClick={() => setShowCreateWizard(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Budget
              </button>
            }
          >
            {(variant) => (
              <button
                onClick={() => {
                  setShowCreateWizard(true);
                  handleAIInsightClick('create_budget_ai');
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Create Smart Budget with AI
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                  {variant?.name === 'ai_enhanced' ? 'AI Enhanced' : 'New'}
                </span>
              </button>
            )}
          </FeatureFlagWrapper>
        </div>

        {showCreateWizard && (
          <BudgetCreationWizard
            userId={userId}
            onComplete={handleWizardComplete}
            onCancel={() => setShowCreateWizard(false)}
          />
        )}
      </>
    );
  }

  const HealthIcon = getBudgetHealthIcon();

  return (
    <>
      <div className="space-y-6">
        {/* Header with A/B Testing Indicators (Development Only) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Budget Dashboard</h1>
              {/* A/B Test Indicator (shown only in development) */}
              {process.env.NODE_ENV === 'development' && budgetAITest.isEnabled && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  A/B: {budgetAITest.variant}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {currentBudget.name} • {currentBudget.period_type.charAt(0).toUpperCase() + currentBudget.period_type.slice(1)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Current Period</option>
              <option value="last">Last Period</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Budget
            </button>
          </div>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Income */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 text-green-600">💰</div>
              </div>
            </div>
          </div>

          {/* Total Allocated */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalAllocated)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalIncome > 0 ? `${((totalAllocated / totalIncome) * 100).toFixed(1)}%` : '0%'} of income
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalAllocated > 0 ? `${((totalSpent / totalAllocated) * 100).toFixed(1)}%` : '0%'} of budget
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 text-purple-600">💳</div>
              </div>
            </div>
          </div>

          {/* Budget Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className={`text-2xl font-bold ${getBudgetHealthColor()}`}>
                  {formatCurrency(Math.abs(remainingBudget))}
                </p>
                <p className="text-xs text-gray-500">
                  {isOverBudget ? 'Over budget' : 'Available'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isOverBudget ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <HealthIcon className={`w-6 h-6 ${getBudgetHealthColor()}`} />
              </div>
            </div>
          </div>
        </div>

        {/* AI-Enhanced Budget Alerts (A/B Test) */}
        <AIFeatureWrapper 
          feature="budget"
          fallback={<BudgetAlerts userId={userId} />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BudgetAlerts userId={userId} />
            
            {/* Spending Anomaly Detection (Feature Flag) */}
            <FeatureFlagWrapper 
              flagName="spending_anomaly_detection"
              fallback={null}
            >
              <SpendingAnomalyDetector
                userId={userId}
                budgetId={currentBudget.id}
                onAnomalyClick={() => handleAIInsightClick('anomaly_detected')}
              />
            </FeatureFlagWrapper>
          </div>
        </AIFeatureWrapper>

        {/* Budget Progress Chart with AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BudgetProgressChart
              categories={categories}
              totalIncome={totalIncome}
              totalAllocated={totalAllocated}
              totalSpent={totalSpent}
            />
          </div>

          {/* Enhanced Quick Stats or AI Insights */}
          <AIFeatureWrapper 
            feature="budget"
            fallback={
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Categories</span>
                    <span className="font-medium">{categories.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Category Usage</span>
                    <span className="font-medium">
                      {categories.length > 0
                        ? `${(categories.reduce((sum: number, cat: any) => sum + (cat.percentage_used || 0), 0) / categories.length).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Days Remaining</span>
                    <span className="font-medium">
                      {Math.max(0, Math.ceil((new Date(currentBudget.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Daily Spending Avg</span>
                    <span className="font-medium">
                      {formatCurrencyCompact(totalSpent / Math.max(1,
                        Math.ceil((Date.now() - new Date(currentBudget.start_date).getTime()) / (1000 * 60 * 60 * 24))
                      ))}
                    </span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button className="w-full flex items-center justify-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <EyeIcon className="w-4 h-4 mr-2" />
                    View Detailed Report
                  </button>
                </div>
              </div>
            }
          >
            <BudgetAIInsights
              userId={userId}
              budgetId={currentBudget.id}
              categories={categories}
              totalSpent={totalSpent}
              totalAllocated={totalAllocated}
              remainingBudget={remainingBudget}
              onInsightClick={(insight) => handleAIInsightClick(insight.type)}
            />
          </AIFeatureWrapper>
        </div>

        {/* Predictive Budget Allocation (Feature Flag) */}
        <FeatureFlagWrapper 
          flagName="predictive_budget_allocation"
          fallback={null}
        >
          <PredictiveBudgetAllocation
            userId={userId}
            budgetId={currentBudget.id}
            currentAllocations={categories}
            onAllocationSuggestionApplied={() => {
              handleAIInsightClick('allocation_applied');
              refetchBudget();
            }}
          />
        </FeatureFlagWrapper>

        {/* Category Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Budget Categories</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
              <CogIcon className="w-4 h-4 mr-1" />
              Manage Categories
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category: any) => (
              <BudgetCategoryCard
                key={category.id}
                category={category}
                budgetId={currentBudget.id}
                onUpdate={refetchBudget}
              />
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No categories found. Add some categories to start tracking your budget.</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Creation Wizard Modal */}
      {showCreateWizard && (
        <BudgetCreationWizard
          userId={userId}
          onComplete={handleWizardComplete}
          onCancel={() => setShowCreateWizard(false)}
        />
      )}
    </>
  );
};