import React from 'react';
import { CreditCard, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your financial overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Balance</h3>
                <p className="text-2xl font-bold text-gray-900">$12,345.67</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-success-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-success-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Monthly Income</h3>
                <p className="text-2xl font-bold text-gray-900">$4,567.89</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-warning-100 rounded-lg">
                  <Activity className="h-6 w-6 text-warning-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Monthly Expenses</h3>
                <p className="text-2xl font-bold text-gray-900">$2,987.45</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Accounts</h3>
                <p className="text-2xl font-bold text-gray-900">4</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
        </div>
        <div className="card-content">
          <div className="flow-root">
            <ul className="-mb-8">
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-success-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Salary Deposit</p>
                    <p className="text-sm text-gray-500">Main Checking • 2 hours ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success-600">+$3,500.00</p>
                  </div>
                </div>
              </li>
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-danger-100 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-danger-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Grocery Store</p>
                    <p className="text-sm text-gray-500">Credit Card • Yesterday</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-danger-600">-$127.45</p>
                  </div>
                </div>
              </li>
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-warning-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-warning-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Electric Bill</p>
                    <p className="text-sm text-gray-500">Main Checking • 2 days ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-danger-600">-$89.23</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
