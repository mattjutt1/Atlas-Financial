import React from 'react';
import { Plus, CreditCard, Banknote, TrendingUp } from 'lucide-react';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </button>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Checking Account */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Main Checking</h3>
                  <p className="text-xs text-gray-500">Chase Bank</p>
                </div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">$8,456.78</p>
              <p className="text-sm text-gray-500">Available Balance</p>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Account ending in 4567
            </div>
          </div>
        </div>

        {/* Savings Account */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-success-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Emergency Fund</h3>
                  <p className="text-xs text-gray-500">Chase Bank</p>
                </div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">$15,234.56</p>
              <p className="text-sm text-gray-500">Available Balance</p>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Account ending in 8901
            </div>
          </div>
        </div>

        {/* Investment Account */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-warning-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Investment Portfolio</h3>
                  <p className="text-xs text-gray-500">Fidelity</p>
                </div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">$45,678.90</p>
              <p className="text-sm text-gray-500">Current Value</p>
            </div>
            <div className="mt-4 flex justify-between text-xs">
              <span className="text-gray-500">Account ending in 2345</span>
              <span className="text-success-600">+$1,234.56 (2.78%)</span>
            </div>
          </div>
        </div>

        {/* Credit Card */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-danger-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Cashback Card</h3>
                  <p className="text-xs text-gray-500">American Express</p>
                </div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-danger-600">-$1,234.56</p>
              <p className="text-sm text-gray-500">Current Balance</p>
            </div>
            <div className="mt-4 flex justify-between text-xs">
              <span className="text-gray-500">Card ending in 6789</span>
              <span className="text-gray-500">Limit: $10,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Account Summary</h2>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr className="table-row">
                  <th className="table-head">Account</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Institution</th>
                  <th className="table-head">Balance</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Main Checking</div>
                    <div className="text-gray-500 text-sm">****4567</div>
                  </td>
                  <td className="table-cell">Checking</td>
                  <td className="table-cell">Chase Bank</td>
                  <td className="table-cell">
                    <span className="font-medium">$8,456.78</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Emergency Fund</div>
                    <div className="text-gray-500 text-sm">****8901</div>
                  </td>
                  <td className="table-cell">Savings</td>
                  <td className="table-cell">Chase Bank</td>
                  <td className="table-cell">
                    <span className="font-medium">$15,234.56</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Investment Portfolio</div>
                    <div className="text-gray-500 text-sm">****2345</div>
                  </td>
                  <td className="table-cell">Investment</td>
                  <td className="table-cell">Fidelity</td>
                  <td className="table-cell">
                    <span className="font-medium">$45,678.90</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Cashback Card</div>
                    <div className="text-gray-500 text-sm">****6789</div>
                  </td>
                  <td className="table-cell">Credit</td>
                  <td className="table-cell">American Express</td>
                  <td className="table-cell">
                    <span className="font-medium text-danger-600">-$1,234.56</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
