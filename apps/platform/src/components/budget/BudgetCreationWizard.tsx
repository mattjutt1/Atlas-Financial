'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, createMoney, multiplyMoney } from '@atlas/shared/utils/currency';
import { CREATE_BUDGET, CREATE_BUDGET_CATEGORY } from '../../lib/graphql/budget-mutations';
import { GET_USER_CATEGORIES } from '../../lib/graphql/budget-queries';

interface BudgetWizardProps {
  userId: string;
  onComplete: (budgetId: string) => void;
  onCancel: () => void;
}

interface BudgetFormData {
  name: string;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
  totalIncome: number;
  categories: {
    id?: string;
    name: string;
    type: 'need' | 'want' | 'save';
    allocatedAmount: number;
    color: string;
    icon: string;
  }[];
}

const BUDGET_RULE_75_15_10 = {
  needs: 0.75,
  wants: 0.15,
  savings: 0.10
};

const DEFAULT_CATEGORIES = {
  needs: [
    { name: 'Housing', icon: '🏠', color: '#ef4444' },
    { name: 'Food & Groceries', icon: '🛒', color: '#f97316' },
    { name: 'Transportation', icon: '🚗', color: '#eab308' },
    { name: 'Utilities', icon: '⚡', color: '#22c55e' },
    { name: 'Insurance', icon: '🛡️', color: '#3b82f6' },
    { name: 'Healthcare', icon: '🏥', color: '#a855f7' }
  ],
  wants: [
    { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { name: 'Dining Out', icon: '🍽️', color: '#06b6d4' },
    { name: 'Shopping', icon: '🛍️', color: '#84cc16' },
    { name: 'Hobbies', icon: '🎨', color: '#f59e0b' }
  ],
  savings: [
    { name: 'Emergency Fund', icon: '🏦', color: '#10b981' },
    { name: 'Retirement', icon: '💰', color: '#3b82f6' },
    { name: 'Investments', icon: '📈', color: '#8b5cf6' }
  ]
};

export const BudgetCreationWizard: React.FC<BudgetWizardProps> = ({
  userId,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalIncome: 0,
    categories: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useTemplate, setUseTemplate] = useState(true);

  // GraphQL hooks
  const { data: userCategories } = useQuery(GET_USER_CATEGORIES, {
    variables: { userId }
  });

  const [createBudget, { loading: creatingBudget }] = useMutation(CREATE_BUDGET);
  const [createBudgetCategory] = useMutation(CREATE_BUDGET_CATEGORY);

  // Calculate end date based on period
  useEffect(() => {
    if (formData.startDate && formData.period) {
      const start = new Date(formData.startDate);
      let end = new Date(start);

      switch (formData.period) {
        case 'weekly':
          end.setDate(start.getDate() + 6);
          break;
        case 'monthly':
          end.setMonth(start.getMonth() + 1);
          end.setDate(start.getDate() - 1);
          break;
        case 'yearly':
          end.setFullYear(start.getFullYear() + 1);
          end.setDate(start.getDate() - 1);
          break;
      }

      setFormData(prev => ({
        ...prev,
        endDate: end.toISOString().split('T')[0]
      }));
    }
  }, [formData.startDate, formData.period]);

  // Initialize categories with template
  useEffect(() => {
    if (useTemplate && formData.totalIncome > 0) {
      const income = createMoney(formData.totalIncome);
      const needsAmount = multiplyMoney(income, BUDGET_RULE_75_15_10.needs);
      const wantsAmount = multiplyMoney(income, BUDGET_RULE_75_15_10.wants);
      const savingsAmount = multiplyMoney(income, BUDGET_RULE_75_15_10.savings);

      const categories = [
        ...DEFAULT_CATEGORIES.needs.map(cat => ({
          ...cat,
          type: 'need' as const,
          allocatedAmount: needsAmount.amount / DEFAULT_CATEGORIES.needs.length
        })),
        ...DEFAULT_CATEGORIES.wants.map(cat => ({
          ...cat,
          type: 'want' as const,
          allocatedAmount: wantsAmount.amount / DEFAULT_CATEGORIES.wants.length
        })),
        ...DEFAULT_CATEGORIES.savings.map(cat => ({
          ...cat,
          type: 'save' as const,
          allocatedAmount: savingsAmount.amount / DEFAULT_CATEGORIES.savings.length
        }))
      ];

      setFormData(prev => ({ ...prev, categories }));
    }
  }, [formData.totalIncome, useTemplate]);

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepNumber) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Budget name is required';
        }
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required';
        }
        break;

      case 2:
        if (formData.totalIncome <= 0) {
          newErrors.totalIncome = 'Income must be greater than 0';
        }
        break;

      case 3:
        if (formData.categories.length === 0) {
          newErrors.categories = 'At least one category is required';
        }
        const totalAllocated = formData.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
        if (totalAllocated > formData.totalIncome) {
          newErrors.categories = 'Total allocated amount exceeds income';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setErrors({});
  };

  const updateCategory = (index: number, updates: Partial<typeof formData.categories[0]>) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === index ? { ...cat, ...updates } : cat
      )
    }));
  };

  const addCustomCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, {
        name: '',
        type: 'want',
        allocatedAmount: 0,
        color: '#6b7280',
        icon: '📝'
      }]
    }));
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      const budgetResult = await createBudget({
        variables: {
          input: {
            user_id: userId,
            name: formData.name,
            period_type: formData.period,
            start_date: formData.startDate,
            end_date: formData.endDate,
            total_income: formData.totalIncome,
            total_allocated: formData.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0),
            remaining_balance: formData.totalIncome - formData.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0),
            is_active: true
          }
        }
      });

      const budgetId = budgetResult.data?.insert_budgets_one?.id;

      if (budgetId) {
        // Create categories
        await Promise.all(
          formData.categories.map(category =>
            createBudgetCategory({
              variables: {
                input: {
                  budget_id: budgetId,
                  name: category.name,
                  type: category.type,
                  allocated_amount: category.allocatedAmount,
                  spent_amount: 0,
                  remaining_amount: category.allocatedAmount,
                  percentage_used: 0
                }
              }
            })
          )
        );

        onComplete(budgetId);
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      setErrors({ submit: 'Failed to create budget. Please try again.' });
    }
  };

  const totalAllocated = formData.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
  const remaining = formData.totalIncome - totalAllocated;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold">Create New Budget</h2>
          <p className="mt-2 opacity-90">Set up your budget in {step === 1 ? 'basic info' : step === 2 ? 'income setup' : step === 3 ? 'category allocation' : 'review'}</p>

          {/* Progress Bar */}
          <div className="mt-4 flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum <= step ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                }`}>
                  {stepNum < step ? <CheckCircleIcon className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    stepNum < step ? 'bg-white' : 'bg-blue-500'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Monthly Budget 2024"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Period
                  </label>
                  <select
                    id="period"
                    value={formData.period}
                    onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as typeof prev.period }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Automatically calculated based on period</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Income Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Income Setup</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">75/15/10 Rule</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      We recommend allocating 75% for needs, 15% for wants, and 10% for savings.
                      You can customize this in the next step.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="totalIncome" className="block text-sm font-medium text-gray-700 mb-2">
                  Total {formData.period.charAt(0).toUpperCase() + formData.period.slice(1)} Income *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="totalIncome"
                    value={formData.totalIncome || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalIncome: parseFloat(e.target.value) || 0 }))}
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.totalIncome ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.totalIncome && <p className="text-red-500 text-sm mt-1">{errors.totalIncome}</p>}
              </div>

              {formData.totalIncome > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recommended Allocation</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-700">
                        {formatCurrency(formData.totalIncome * BUDGET_RULE_75_15_10.needs)}
                      </div>
                      <div className="text-sm text-red-600">Needs (75%)</div>
                    </div>
                    <div className="bg-yellow-100 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-700">
                        {formatCurrency(formData.totalIncome * BUDGET_RULE_75_15_10.wants)}
                      </div>
                      <div className="text-sm text-yellow-600">Wants (15%)</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(formData.totalIncome * BUDGET_RULE_75_15_10.savings)}
                      </div>
                      <div className="text-sm text-green-600">Savings (10%)</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useTemplate"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="useTemplate" className="ml-2 text-sm text-gray-700">
                  Use recommended categories and allocation
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Category Allocation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Category Allocation</h3>
                <button
                  onClick={addCustomCategory}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Custom Category
                </button>
              </div>

              {/* Budget Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(formData.totalIncome)}
                    </div>
                    <div className="text-sm text-gray-600">Total Income</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatCurrency(totalAllocated)}
                    </div>
                    <div className="text-sm text-gray-600">Allocated</div>
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(remaining)}
                    </div>
                    <div className="text-sm text-gray-600">Remaining</div>
                  </div>
                </div>
              </div>

              {remaining < 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Over Budget</h4>
                      <p className="text-sm text-red-700 mt-1">
                        You've allocated {formatCurrency(Math.abs(remaining))} more than your income.
                        Please adjust your category amounts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Groups */}
              <div className="space-y-6">
                {['need', 'want', 'save'].map((type) => {
                  const typeCategories = formData.categories.filter(cat => cat.type === type);
                  const typeTotal = typeCategories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
                  const typeLabel = type === 'need' ? 'Needs' : type === 'want' ? 'Wants' : 'Savings';
                  const typeColor = type === 'need' ? 'red' : type === 'want' ? 'yellow' : 'green';

                  return (
                    <div key={type} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-lg font-medium text-${typeColor}-700`}>
                          {typeLabel} ({formatCurrency(typeTotal)})
                        </h4>
                        <div className="text-sm text-gray-500">
                          {formData.totalIncome > 0
                            ? `${((typeTotal / formData.totalIncome) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </div>
                      </div>

                      <div className="space-y-3">
                        {typeCategories.map((category, index) => {
                          const globalIndex = formData.categories.findIndex(cat => cat === category);
                          return (
                            <div key={globalIndex} className="flex items-center space-x-3">
                              <span className="text-2xl">{category.icon}</span>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={category.name}
                                  onChange={(e) => updateCategory(globalIndex, { name: e.target.value })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                  placeholder="Category name"
                                />
                              </div>
                              <div className="w-32">
                                <div className="relative">
                                  <span className="absolute left-2 top-1 text-xs text-gray-500">$</span>
                                  <input
                                    type="number"
                                    value={category.allocatedAmount || ''}
                                    onChange={(e) => updateCategory(globalIndex, {
                                      allocatedAmount: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => removeCategory(globalIndex)}
                                className="text-red-500 hover:text-red-700"
                                aria-label="Remove category"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {errors.categories && (
                <p className="text-red-500 text-sm">{errors.categories}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={step === 1 ? onCancel : prevStep}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>

          <div className="flex items-center space-x-3">
            {errors.submit && (
              <p className="text-red-500 text-sm">{errors.submit}</p>
            )}

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={creatingBudget}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {creatingBudget ? 'Creating...' : 'Create Budget'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
