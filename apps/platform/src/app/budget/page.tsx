'use client';

import React, { useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import {
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { BudgetDashboard } from '@/components/budget/BudgetDashboard';
import { BudgetAllocationInterface } from '@/components/budget/BudgetAllocationInterface';
import { CategoryManagement } from '@/components/budget/CategoryManagement';
import { AuthGate } from '@/modules/auth/components/AuthGate';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

type TabType = 'dashboard' | 'allocation' | 'categories';

const TABS = [
  {
    id: 'dashboard' as TabType,
    name: 'Dashboard',
    icon: ChartBarIcon,
    description: 'Overview and tracking'
  },
  {
    id: 'allocation' as TabType,
    name: 'Allocation',
    icon: AdjustmentsHorizontalIcon,
    description: 'Budget distribution'
  },
  {
    id: 'categories' as TabType,
    name: 'Categories',
    icon: TagIcon,
    description: 'Manage categories'
  }
];

export default function BudgetPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Loading state for initial authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Loading budget system...</span>
      </div>
    );
  }

  // Authentication gate
  if (!isAuthenticated || !user) {
    return <AuthGate />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BudgetDashboard userId={user.id} />;
      case 'allocation':
        return (
          <div className="space-y-6">
            <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
              <AdjustmentsHorizontalIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Budget Allocation</h2>
              <p className="text-blue-700 max-w-md mx-auto">
                This feature allows you to adjust budget allocations using proven budgeting rules like 75/15/10.
                It will be available once you have an active budget.
              </p>
            </div>
          </div>
        );
      case 'categories':
        return <CategoryManagement userId={user.id} />;
      default:
        return <BudgetDashboard userId={user.id} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
              <p className="text-sm text-gray-600">
                {TABS.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="border-t border-gray-200 bg-white">
              <div className="px-4 py-2 space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex lg:flex-shrink-0">
            <div className="w-64">
              <nav className="h-full bg-white shadow-sm border-r border-gray-200">
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
                      <p className="text-sm text-gray-600">Financial planning</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                            activeTab === tab.id
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{tab.name}</div>
                            <div className="text-xs opacity-75">{tab.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* User Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                      </div>
                      <div className="text-xs text-gray-500">Budget Manager</div>
                    </div>
                  </div>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <main className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="p-4 lg:p-8">
                  {/* Desktop Header */}
                  <div className="hidden lg:block mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {TABS.find(tab => tab.id === activeTab)?.name}
                        </h2>
                        <p className="text-gray-600 mt-1">
                          {TABS.find(tab => tab.id === activeTab)?.description}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Welcome back, {user.firstName || 'User'}
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="w-full">
                    {renderActiveTab()}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
