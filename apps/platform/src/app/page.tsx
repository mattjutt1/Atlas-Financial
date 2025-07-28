'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useFinancialEngine } from '@/modules/financial/hooks/useFinancialEngine';
import { useAIEngine } from '@/modules/ai/hooks/useAIEngine';

// Components from modular architecture
import { DashboardLayout } from '@/modules/dashboard/components/DashboardLayout';
import { NetWorthChart } from '@/modules/dashboard/components/NetWorthChart';
import { AccountSummary } from '@/modules/dashboard/components/AccountSummary';
import { BrutalHonestyInsight } from '@/modules/dashboard/components/BrutalHonestyInsight';
import { RecentTransactions } from '@/modules/dashboard/components/RecentTransactions';
import { QuickActions } from '@/modules/dashboard/components/QuickActions';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// Types
import type { FinancialSummary, AIInsight, TransactionData } from '@/shared/types';

export default function AtlasCorePlatform() {
  // Modular Monolith Hooks
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { 
    calculateNetWorth, 
    getPortfolioAnalysis, 
    isLoading: financialLoading,
    error: financialError 
  } = useFinancialEngine();
  const { 
    generateInsights, 
    getBrutalHonestyFeedback,
    isLoading: aiLoading,
    error: aiError 
  } = useAIEngine();

  // State management for dashboard data
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadDashboardData = async () => {
      try {
        setDashboardLoading(true);

        // Parallel data loading for performance
        const [summary, insights, transactionData] = await Promise.allSettled([
          // Financial Engine calculations
          calculateNetWorth(user.id),
          // AI Engine insights
          generateInsights(user.id, { includeHonesty: true }),
          // Transaction data from API Gateway
          fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetRecentTransactions($userId: UUID!) {
                  transactions(
                    where: { user_id: { _eq: $userId } }
                    order_by: { date: desc }
                    limit: 10
                  ) {
                    id
                    amount
                    description
                    date
                    category
                    account_id
                  }
                }
              `,
              variables: { userId: user.id }
            })
          }).then(res => res.json())
        ]);

        // Handle results
        if (summary.status === 'fulfilled') {
          setFinancialSummary(summary.value);
        }

        if (insights.status === 'fulfilled') {
          setAIInsights(insights.value);
        }

        if (transactionData.status === 'fulfilled') {
          setTransactions(transactionData.value.data?.transactions || []);
        }

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated, user, calculateNetWorth, generateInsights]);

  // Loading state for initial authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg">Loading Atlas Financial...</span>
      </div>
    );
  }

  // Authentication gate
  if (!isAuthenticated) {
    return <AuthGate />;
  }

  // Error states
  if (financialError || aiError) {
    return (
      <DashboardLayout>
        <div className="atlas-error">
          <h2 className="text-lg font-semibold mb-2">System Error</h2>
          <p className="atlas-error-text">
            {financialError?.message || aiError?.message || 'An unexpected error occurred.'}
          </p>
          <button 
            className="atlas-button atlas-button-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold atlas-text-primary">
            Welcome back, {user?.firstName || 'Atlas User'}
          </h1>
          <p className="atlas-text-secondary mt-2">
            Your financial overview for {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Loading State */}
        {dashboardLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="atlas-card">
                <div className="atlas-skeleton h-4 w-3/4 mb-4"></div>
                <div className="atlas-skeleton h-8 w-1/2 mb-2"></div>
                <div className="atlas-skeleton h-3 w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Content */}
        {!dashboardLoading && (
          <>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AccountSummary 
                summary={financialSummary}
                loading={financialLoading}
              />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Net Worth Chart */}
              <div className="lg:col-span-2">
                <NetWorthChart 
                  data={financialSummary?.netWorthHistory || []}
                  loading={financialLoading}
                />
              </div>

              {/* AI Insights */}
              <div>
                <BrutalHonestyInsight 
                  insights={aiInsights}
                  loading={aiLoading}
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Transactions */}
              <RecentTransactions 
                transactions={transactions}
                loading={financialLoading}
              />

              {/* Quick Actions */}
              <QuickActions 
                onAction={(action) => {
                  console.log('Quick action:', action);
                  // Handle quick actions (add transaction, run analysis, etc.)
                }}
              />
            </div>
          </>
        )}

        {/* System Status Indicator */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="atlas-card p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                financialLoading || aiLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`}></div>
              <span className="text-xs atlas-text-secondary">
                {financialLoading || aiLoading ? 'Processing...' : 'All systems operational'}
              </span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}