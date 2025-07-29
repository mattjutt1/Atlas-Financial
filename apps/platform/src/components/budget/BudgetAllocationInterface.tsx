'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import {
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, createMoney, multiplyMoney } from '@atlas/shared/utils/currency';
import { BULK_UPDATE_BUDGET_ALLOCATIONS } from '../../lib/graphql/budget-mutations';

interface BudgetAllocationInterfaceProps {
  budgetId: string;
  totalIncome: number;
  categories: Array<{
    id: string;
    name: string;
    type: 'need' | 'want' | 'save';
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    percentage_used: number;
  }>;
  onUpdate: () => void;
}

const BUDGET_RULES = {
  '75_15_10': {
    name: '75/15/10 Rule',
    description: 'Recommended for balanced budgeting',
    needs: 0.75,
    wants: 0.15,
    savings: 0.10
  },
  '50_30_20': {
    name: '50/30/20 Rule',
    description: 'Popular balanced approach',
    needs: 0.50,
    wants: 0.30,
    savings: 0.20
  },
  '80_20': {
    name: '80/20 Rule',
    description: 'Simple savings-focused approach',
    needs: 0.80,
    wants: 0.00,
    savings: 0.20
  },
  custom: {
    name: 'Custom',
    description: 'Set your own percentages',
    needs: 0,
    wants: 0,
    savings: 0
  }
};

export const BudgetAllocationInterface: React.FC<BudgetAllocationInterfaceProps> = ({
  budgetId,
  totalIncome,
  categories,
  onUpdate
}) => {
  const [selectedRule, setSelectedRule] = useState<keyof typeof BUDGET_RULES>('75_15_10');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [customPercentages, setCustomPercentages] = useState({
    needs: 75,
    wants: 15,
    savings: 10
  });
  const [isDirty, setIsDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [updateAllocations, { loading: updating }] = useMutation(BULK_UPDATE_BUDGET_ALLOCATIONS);

  // Initialize allocations from categories
  useEffect(() => {
    const initialAllocations: Record<string, number> = {};
    categories.forEach(category => {
      initialAllocations[category.id] = category.allocated_amount;
    });
    setAllocations(initialAllocations);
  }, [categories]);

  // Group categories by type
  const needsCategories = categories.filter(cat => cat.type === 'need');
  const wantsCategories = categories.filter(cat => cat.type === 'want');
  const savingsCategories = categories.filter(cat => cat.type === 'save');

  // Calculate totals
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
  const remaining = totalIncome - totalAllocated;
  const isOverBudget = remaining < 0;

  const needsTotal = needsCategories.reduce((sum, cat) => sum + (allocations[cat.id] || 0), 0);
  const wantsTotal = wantsCategories.reduce((sum, cat) => sum + (allocations[cat.id] || 0), 0);
  const savingsTotal = savingsCategories.reduce((sum, cat) => sum + (allocations[cat.id] || 0), 0);

  const needsPercentage = totalIncome > 0 ? (needsTotal / totalIncome) * 100 : 0;
  const wantsPercentage = totalIncome > 0 ? (wantsTotal / totalIncome) * 100 : 0;
  const savingsPercentage = totalIncome > 0 ? (savingsTotal / totalIncome) * 100 : 0;

  // Apply budget rule
  const applyBudgetRule = (rule: keyof typeof BUDGET_RULES) => {
    if (rule === 'custom') {
      const needsAmount = (customPercentages.needs / 100) * totalIncome;
      const wantsAmount = (customPercentages.wants / 100) * totalIncome;
      const savingsAmount = (customPercentages.savings / 100) * totalIncome;
      distributeAmounts(needsAmount, wantsAmount, savingsAmount);
    } else {
      const ruleConfig = BUDGET_RULES[rule];
      const needsAmount = ruleConfig.needs * totalIncome;
      const wantsAmount = ruleConfig.wants * totalIncome;
      const savingsAmount = ruleConfig.savings * totalIncome;
      distributeAmounts(needsAmount, wantsAmount, savingsAmount);
    }
    setSelectedRule(rule);
    setIsDirty(true);
  };

  const distributeAmounts = (needsAmount: number, wantsAmount: number, savingsAmount: number) => {
    const newAllocations = { ...allocations };

    // Distribute needs
    if (needsCategories.length > 0) {
      const perCategoryNeeds = needsAmount / needsCategories.length;
      needsCategories.forEach(cat => {
        newAllocations[cat.id] = perCategoryNeeds;
      });
    }

    // Distribute wants
    if (wantsCategories.length > 0) {
      const perCategoryWants = wantsAmount / wantsCategories.length;
      wantsCategories.forEach(cat => {
        newAllocations[cat.id] = perCategoryWants;
      });
    }

    // Distribute savings
    if (savingsCategories.length > 0) {
      const perCategorySavings = savingsAmount / savingsCategories.length;
      savingsCategories.forEach(cat => {
        newAllocations[cat.id] = perCategorySavings;
      });
    }

    setAllocations(newAllocations);
  };

  const updateAllocation = (categoryId: string, amount: number) => {
    setAllocations(prev => ({
      ...prev,
      [categoryId]: Math.max(0, amount)
    }));
    setIsDirty(true);
  };

  const adjustAllocation = (categoryId: string, delta: number) => {
    const currentAmount = allocations[categoryId] || 0;
    updateAllocation(categoryId, currentAmount + delta);
  };

  const handleSave = async () => {
    try {
      const updates = categories.map(category => ({
        where: { id: { _eq: category.id } },
        _set: {
          allocated_amount: allocations[category.id] || 0,
          remaining_amount: (allocations[category.id] || 0) - category.spent_amount,
          percentage_used: allocations[category.id] > 0
            ? (category.spent_amount / allocations[category.id]) * 100
            : 0
        }
      }));

      await updateAllocations({
        variables: { updates }
      });

      setIsDirty(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating allocations:', error);
    }
  };

  const handleReset = () => {
    const initialAllocations: Record<string, number> = {};
    categories.forEach(category => {
      initialAllocations[category.id] = category.allocated_amount;
    });
    setAllocations(initialAllocations);
    setIsDirty(false);
  };

  const getRecommendationColor = (current: number, target: number) => {
    const diff = Math.abs(current - target);
    if (diff < 5) return 'text-green-600';
    if (diff < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <AdjustmentsHorizontalIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Budget Allocation</h3>
            <p className="text-sm text-gray-600">Adjust your budget distribution</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAdvanced ? 'Simple View' : 'Advanced'}
        </button>
      </div>

      {/* Budget Rule Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Budget Rules</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(BUDGET_RULES).map(([key, rule]) => (
            <button
              key={key}
              onClick={() => applyBudgetRule(key as keyof typeof BUDGET_RULES)}
              className={`p-3 text-left border rounded-lg hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedRule === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{rule.name}</div>
              <div className="text-xs text-gray-600 mt-1">{rule.description}</div>
              {key !== 'custom' && (
                <div className="text-xs text-gray-500 mt-2">
                  {Math.round(rule.needs * 100)}% • {Math.round(rule.wants * 100)}% • {Math.round(rule.savings * 100)}%
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Percentages */}
      {selectedRule === 'custom' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Percentages</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Needs (%)</label>
              <input
                type="number"
                value={customPercentages.needs}
                onChange={(e) => setCustomPercentages(prev => ({
                  ...prev,
                  needs: parseInt(e.target.value) || 0
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Wants (%)</label>
              <input
                type="number"
                value={customPercentages.wants}
                onChange={(e) => setCustomPercentages(prev => ({
                  ...prev,
                  wants: parseInt(e.target.value) || 0
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Savings (%)</label>
              <input
                type="number"
                value={customPercentages.savings}
                onChange={(e) => setCustomPercentages(prev => ({
                  ...prev,
                  savings: parseInt(e.target.value) || 0
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Total: {customPercentages.needs + customPercentages.wants + customPercentages.savings}%
            {customPercentages.needs + customPercentages.wants + customPercentages.savings !== 100 && (
              <span className="text-red-600 ml-2">Should equal 100%</span>
            )}
          </div>
        </div>
      )}

      {/* Current vs Recommended */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Current vs Recommended</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-900">Needs</span>
              <span className={`text-sm font-bold ${getRecommendationColor(
                needsPercentage,
                selectedRule === 'custom' ? customPercentages.needs : BUDGET_RULES[selectedRule].needs * 100
              )}`}>
                {needsPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-red-700">
              Target: {selectedRule === 'custom' ? customPercentages.needs : Math.round(BUDGET_RULES[selectedRule].needs * 100)}%
            </div>
            <div className="text-xs text-red-600 font-medium">
              {formatCurrency(needsTotal)}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-900">Wants</span>
              <span className={`text-sm font-bold ${getRecommendationColor(
                wantsPercentage,
                selectedRule === 'custom' ? customPercentages.wants : BUDGET_RULES[selectedRule].wants * 100
              )}`}>
                {wantsPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-yellow-700">
              Target: {selectedRule === 'custom' ? customPercentages.wants : Math.round(BUDGET_RULES[selectedRule].wants * 100)}%
            </div>
            <div className="text-xs text-yellow-600 font-medium">
              {formatCurrency(wantsTotal)}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Savings</span>
              <span className={`text-sm font-bold ${getRecommendationColor(
                savingsPercentage,
                selectedRule === 'custom' ? customPercentages.savings : BUDGET_RULES[selectedRule].savings * 100
              )}`}>
                {savingsPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-green-700">
              Target: {selectedRule === 'custom' ? customPercentages.savings : Math.round(BUDGET_RULES[selectedRule].savings * 100)}%
            </div>
            <div className="text-xs text-green-600 font-medium">
              {formatCurrency(savingsTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Category Allocation */}
      <div className="space-y-6">
        {[
          { type: 'need' as const, categories: needsCategories, label: 'Needs', color: 'red' },
          { type: 'want' as const, categories: wantsCategories, label: 'Wants', color: 'yellow' },
          { type: 'save' as const, categories: savingsCategories, label: 'Savings', color: 'green' }
        ].map(({ type, categories: typeCategories, label, color }) => (
          <div key={type} className="border border-gray-200 rounded-lg p-4">
            <h4 className={`text-sm font-medium text-${color}-900 mb-3`}>{label}</h4>
            <div className="space-y-3">
              {typeCategories.map(category => (
                <div key={category.id} className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      <span className="text-xs text-gray-500">
                        {category.spent_amount > 0 && `${formatCurrency(category.spent_amount)} spent`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {showAdvanced && (
                      <>
                        <button
                          onClick={() => adjustAllocation(category.id, -50)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => adjustAllocation(category.id, 50)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <div className="relative">
                      <span className="absolute left-2 top-1 text-xs text-gray-500">$</span>
                      <input
                        type="number"
                        value={allocations[category.id] || 0}
                        onChange={(e) => updateAllocation(category.id, parseFloat(e.target.value) || 0)}
                        className="w-24 pl-5 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm text-gray-600">Total Allocated:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {formatCurrency(totalAllocated)}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Remaining:</span>
              <span className={`ml-2 font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(remaining))}
                {isOverBudget && ' over'}
              </span>
            </div>
          </div>

          {isDirty && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={updating}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {isOverBudget && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Over Budget</p>
                <p className="text-xs text-red-700">
                  Your allocations exceed your income by {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
