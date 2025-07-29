import React from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Track and manage your financial transactions</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="label">Account</label>
              <select className="input">
                <option value="">All Accounts</option>
                <option value="checking">Main Checking</option>
                <option value="savings">Emergency Fund</option>
                <option value="investment">Investment Portfolio</option>
                <option value="credit">Cashback Card</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input">
                <option value="">All Categories</option>
                <option value="income">Income</option>
                <option value="groceries">Groceries</option>
                <option value="utilities">Utilities</option>
                <option value="entertainment">Entertainment</option>
                <option value="transportation">Transportation</option>
              </select>
            </div>
            <div>
              <label className="label">Date Range</label>
              <select className="input">
                <option value="all">All Time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <div className="flex space-x-2">
              <button className="btn btn-secondary btn-sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </button>
              <button className="btn btn-secondary btn-sm">Clear Filters</button>
            </div>
            <button className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr className="table-row">
                  <th className="table-head">Date</th>
                  <th className="table-head">Description</th>
                  <th className="table-head">Category</th>
                  <th className="table-head">Account</th>
                  <th className="table-head">Amount</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">Dec 15, 2024</div>
                    <div className="text-xs text-gray-500">2:30 PM</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Salary Deposit</div>
                    <div className="text-sm text-gray-500">Monthly salary payment</div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Income</span>
                  </td>
                  <td className="table-cell">Main Checking</td>
                  <td className="table-cell">
                    <span className="font-medium text-success-600">+$3,500.00</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Cleared</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">Dec 14, 2024</div>
                    <div className="text-xs text-gray-500">4:15 PM</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Grocery Store</div>
                    <div className="text-sm text-gray-500">Weekly grocery shopping</div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-warning">Groceries</span>
                  </td>
                  <td className="table-cell">Cashback Card</td>
                  <td className="table-cell">
                    <span className="font-medium text-danger-600">-$127.45</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Cleared</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">Dec 13, 2024</div>
                    <div className="text-xs text-gray-500">9:00 AM</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Electric Bill</div>
                    <div className="text-sm text-gray-500">Monthly utility payment</div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-danger">Utilities</span>
                  </td>
                  <td className="table-cell">Main Checking</td>
                  <td className="table-cell">
                    <span className="font-medium text-danger-600">-$89.23</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Cleared</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">Dec 12, 2024</div>
                    <div className="text-xs text-gray-500">7:45 PM</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Restaurant</div>
                    <div className="text-sm text-gray-500">Dinner with friends</div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-outline">Entertainment</span>
                  </td>
                  <td className="table-cell">Cashback Card</td>
                  <td className="table-cell">
                    <span className="font-medium text-danger-600">-$65.78</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-warning">Pending</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">Dec 11, 2024</div>
                    <div className="text-xs text-gray-500">3:20 PM</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">Gas Station</div>
                    <div className="text-sm text-gray-500">Fuel for car</div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-default">Transportation</span>
                  </td>
                  <td className="table-cell">Main Checking</td>
                  <td className="table-cell">
                    <span className="font-medium text-danger-600">-$45.20</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success">Cleared</span>
                  </td>
                  <td className="table-cell">
                    <button className="btn btn-sm btn-secondary mr-2">Edit</button>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
              <span className="font-medium">47</span> results
            </div>
            <div className="flex space-x-2">
              <button className="btn btn-sm btn-secondary" disabled>
                Previous
              </button>
              <button className="btn btn-sm btn-primary">1</button>
              <button className="btn btn-sm btn-secondary">2</button>
              <button className="btn btn-sm btn-secondary">3</button>
              <button className="btn btn-sm btn-secondary">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
