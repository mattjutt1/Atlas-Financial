'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatCurrencyCompact } from '@atlas/shared/utils/currency';
import { UPDATE_BUDGET_CATEGORY, DELETE_BUDGET_CATEGORY } from '../../lib/graphql/budget-mutations';

interface BudgetCategoryCardProps {
  category: {
    id: string;
    name: string;
    type: 'need' | 'want' | 'save';
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    percentage_used: number;
  };
  budgetId: string;
  onUpdate: () => void;
}

export const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  category,
  budgetId,
  onUpdate
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(category.allocated_amount);

  const [updateCategory, { loading: updating }] = useMutation(UPDATE_BUDGET_CATEGORY);
  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_BUDGET_CATEGORY);

  const handleSaveEdit = async () => {
    try {
      await updateCategory({
        variables: {
          id: category.id,
          input: {
            allocated_amount: editAmount,
            remaining_amount: editAmount - category.spent_amount,
            percentage_used: editAmount > 0 ? (category.spent_amount / editAmount) * 100 : 0
          }
        }
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
      try {
        await deleteCategory({
          variables: { id: category.id }
        });
        onUpdate();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const getProgressColor = () => {
    if (category.percentage_used >= 100) return 'bg-red-500';
    if (category.percentage_used >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (category.percentage_used >= 100) return ExclamationTriangleIcon;
    if (category.percentage_used >= 80) return ClockIcon;
    return CheckCircleIcon;
  };

  const getStatusColor = () => {
    if (category.percentage_used >= 100) return 'text-red-600';
    if (category.percentage_used >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTypeColor = () => {
    switch (category.type) {
      case 'need': return 'bg-red-100 text-red-800';
      case 'want': return 'bg-yellow-100 text-yellow-800';
      case 'save': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = () => {
    switch (category.type) {
      case 'need': return 'Need';
      case 'want': return 'Want';
      case 'save': return 'Save';
      default: return 'Other';
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">
              {category.type === 'need' ? '🏠' : category.type === 'want' ? '🎯' : '💰'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
              {getTypeLabel()}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Category options"
          >
            <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Amount
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  disabled={deleting}
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Category
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amount Display/Edit */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditAmount(category.allocated_amount);
                }}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Budget</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(category.allocated_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spent</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(category.spent_amount)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <div className="flex items-center space-x-1">
            <StatusIcon className={`w-4 h-4 ${getStatusColor()}`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {Math.round(category.percentage_used)}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, category.percentage_used)}%` }}
          />
        </div>
      </div>

      {/* Remaining Amount */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Remaining</span>
        <span className={`font-medium ${
          category.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {category.remaining_amount >= 0
            ? formatCurrencyCompact(category.remaining_amount)
            : `-${formatCurrencyCompact(Math.abs(category.remaining_amount))}`
          }
        </span>
      </div>

      {/* Warning for overspending */}
      {category.percentage_used >= 100 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Over Budget</p>
              <p className="text-xs text-red-700">
                You've exceeded this category by {formatCurrency(Math.abs(category.remaining_amount))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning for approaching limit */}
      {category.percentage_used >= 80 && category.percentage_used < 100 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Approaching Limit</p>
              <p className="text-xs text-yellow-700">
                Only {formatCurrency(category.remaining_amount)} remaining in this category
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
