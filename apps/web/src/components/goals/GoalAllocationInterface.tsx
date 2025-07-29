'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import {
  CREATE_GOAL_ALLOCATION,
  UPDATE_GOAL_ALLOCATION,
  DELETE_GOAL_ALLOCATION,
  TOGGLE_GOAL_ALLOCATION
} from '../../lib/graphql/mutations'
import { GET_GOAL_ALLOCATIONS } from '../../lib/graphql/queries'
import { FinancialGoal, GoalAllocation } from '../../types/graphql'
import { formatCurrency } from '../../lib/goals/utils'
import { Card } from '../common/Card'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface GoalAllocationInterfaceProps {
  goal: FinancialGoal
  userId: string
  availableAccounts?: Array<{ id: string; name: string; current_balance: string }>
  availableBudgetCategories?: Array<{ id: string; name: string; monthly_budget: string }>
  onAllocationUpdate?: (allocation: GoalAllocation) => void
}

interface AllocationFormData {
  allocation_type: 'account' | 'budget_category'
  account_id?: string
  budget_category_id?: string
  allocation_percentage: number
  allocation_amount?: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', multiplier: 52 },
  { value: 'biweekly', label: 'Bi-weekly', multiplier: 26 },
  { value: 'monthly', label: 'Monthly', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 4 }
] as const

export function GoalAllocationInterface({
  goal,
  userId,
  availableAccounts = [],
  availableBudgetCategories = [],
  onAllocationUpdate
}: GoalAllocationInterfaceProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState<GoalAllocation | null>(null)
  const [formData, setFormData] = useState<AllocationFormData>({
    allocation_type: 'account',
    allocation_percentage: 10,
    frequency: 'monthly'
  })
  const [errors, setErrors] = useState<string[]>([])

  const { data, loading, error, refetch } = useQuery(GET_GOAL_ALLOCATIONS, {
    variables: { userId },
    fetchPolicy: 'cache-and-network'
  })

  const [createAllocation, { loading: creating }] = useMutation(CREATE_GOAL_ALLOCATION, {
    onCompleted: (data) => {
      setShowCreateForm(false)
      setFormData({
        allocation_type: 'account',
        allocation_percentage: 10,
        frequency: 'monthly'
      })
      refetch()
      onAllocationUpdate?.(data.insert_goal_allocations_one)
    },
    onError: (error) => setErrors([error.message])
  })

  const [updateAllocation, { loading: updating }] = useMutation(UPDATE_GOAL_ALLOCATION, {
    onCompleted: (data) => {
      setEditingAllocation(null)
      refetch()
      onAllocationUpdate?.(data.update_goal_allocations_by_pk)
    },
    onError: (error) => setErrors([error.message])
  })

  const [deleteAllocation] = useMutation(DELETE_GOAL_ALLOCATION, {
    onCompleted: () => refetch(),
    onError: (error) => setErrors([error.message])
  })

  const [toggleAllocation] = useMutation(TOGGLE_GOAL_ALLOCATION, {
    onCompleted: () => refetch(),
    onError: (error) => setErrors([error.message])
  })

  const goalAllocations = data?.goal_allocations?.filter(
    (allocation: GoalAllocation) => allocation.goal_id === goal.id
  ) || []

  const updateFormData = useCallback((updates: Partial<AllocationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors([])
  }, [])

  const validateForm = (): boolean => {
    const newErrors: string[] = []

    if (formData.allocation_type === 'account' && !formData.account_id) {
      newErrors.push('Please select an account')
    }

    if (formData.allocation_type === 'budget_category' && !formData.budget_category_id) {
      newErrors.push('Please select a budget category')
    }

    if (formData.allocation_percentage < 1 || formData.allocation_percentage > 100) {
      newErrors.push('Allocation percentage must be between 1% and 100%')
    }

    // Check for existing allocations to avoid conflicts
    const totalAllocated = goalAllocations
      .filter(a => a.is_active)
      .reduce((sum, a) => sum + a.allocation_percentage, 0)

    const newTotal = totalAllocated + formData.allocation_percentage
    if (newTotal > 100) {
      newErrors.push(`Total allocation would exceed 100% (currently ${totalAllocated}%)`)
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    const input = {
      goal_id: goal.id,
      allocation_percentage: formData.allocation_percentage,
      frequency: formData.frequency,
      is_active: true,
      ...(formData.allocation_type === 'account'
        ? { account_id: formData.account_id }
        : { budget_category_id: formData.budget_category_id }
      ),
      ...(formData.allocation_amount && {
        allocation_amount: parseFloat(formData.allocation_amount)
      })
    }

    try {
      if (editingAllocation) {
        await updateAllocation({
          variables: { id: editingAllocation.id, input }
        })
      } else {
        await createAllocation({
          variables: { input }
        })
      }
    } catch (error) {
      console.error('Error saving allocation:', error)
    }
  }

  const handleEdit = (allocation: GoalAllocation) => {
    setEditingAllocation(allocation)
    setFormData({
      allocation_type: allocation.account_id ? 'account' : 'budget_category',
      account_id: allocation.account_id || undefined,
      budget_category_id: allocation.budget_category_id || undefined,
      allocation_percentage: allocation.allocation_percentage,
      allocation_amount: allocation.allocation_amount?.toString(),
      frequency: allocation.frequency
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (allocation: GoalAllocation) => {
    if (confirm('Are you sure you want to delete this allocation?')) {
      await deleteAllocation({
        variables: { id: allocation.id }
      })
    }
  }

  const handleToggle = async (allocation: GoalAllocation) => {
    await toggleAllocation({
      variables: {
        id: allocation.id,
        isActive: !allocation.is_active
      }
    })
  }

  const calculateProjectedContribution = () => {
    if (!formData.allocation_amount) return null

    const amount = parseFloat(formData.allocation_amount)
    const frequency = FREQUENCY_OPTIONS.find(f => f.value === formData.frequency)

    if (!frequency) return null

    const monthlyAmount = amount * (frequency.multiplier / 12)
    return monthlyAmount
  }

  const renderAllocationForm = () => (
    <Card padding="lg" className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingAllocation ? 'Edit Allocation' : 'Create Automatic Allocation'}
        </h3>
        <button
          onClick={() => {
            setShowCreateForm(false)
            setEditingAllocation(null)
            setErrors([])
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <ul className="list-disc list-inside text-sm text-danger-700 dark:text-danger-300">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {/* Allocation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Allocation Source
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="account"
                checked={formData.allocation_type === 'account'}
                onChange={(e) => updateFormData({ allocation_type: e.target.value as 'account' })}
                className="mr-2"
              />
              Account Balance
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="budget_category"
                checked={formData.allocation_type === 'budget_category'}
                onChange={(e) => updateFormData({ allocation_type: e.target.value as 'budget_category' })}
                className="mr-2"
              />
              Budget Category
            </label>
          </div>
        </div>

        {/* Source Selection */}
        {formData.allocation_type === 'account' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Account
            </label>
            <select
              value={formData.account_id || ''}
              onChange={(e) => updateFormData({ account_id: e.target.value })}
              className="input-field"
            >
              <option value="">Choose an account...</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.current_balance)}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.allocation_type === 'budget_category' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Budget Category
            </label>
            <select
              value={formData.budget_category_id || ''}
              onChange={(e) => updateFormData({ budget_category_id: e.target.value })}
              className="input-field"
            >
              <option value="">Choose a category...</option>
              {availableBudgetCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} - {formatCurrency(category.monthly_budget)} monthly
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Allocation Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Allocation Percentage
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="50"
              value={formData.allocation_percentage}
              onChange={(e) => updateFormData({ allocation_percentage: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="font-semibold text-gray-900 dark:text-white min-w-[3rem]">
              {formData.allocation_percentage}%
            </span>
          </div>
        </div>

        {/* Fixed Amount (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fixed Amount (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.allocation_amount || ''}
              onChange={(e) => updateFormData({ allocation_amount: e.target.value })}
              className="input-field pl-8"
              placeholder="Leave empty for percentage-based"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            If set, this overrides the percentage calculation
          </p>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => updateFormData({ frequency: e.target.value as any })}
            className="input-field"
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Projection */}
        {calculateProjectedContribution() && (
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-2">
              Projected Monthly Contribution
            </h4>
            <p className="text-primary-700 dark:text-primary-300">
              {formatCurrency(calculateProjectedContribution()!)} per month
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={creating || updating}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            {(creating || updating) && <LoadingSpinner size="sm" />}
            {editingAllocation ? 'Update Allocation' : 'Create Allocation'}
          </button>
          <button
            onClick={() => {
              setShowCreateForm(false)
              setEditingAllocation(null)
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  )

  const renderAllocationsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Active Allocations
        </h3>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary text-sm px-4 py-2"
          >
            Add Allocation
          </button>
        )}
      </div>

      {goalAllocations.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            No Automatic Allocations
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Set up automatic transfers to consistently fund your goal
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            Create First Allocation
          </button>
        </Card>
      ) : (
        goalAllocations.map((allocation) => (
          <Card key={allocation.id} padding="md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    allocation.is_active ? 'bg-success-500' : 'bg-gray-400'
                  }`} />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {allocation.account_id ? 'Account Transfer' : 'Budget Allocation'}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    allocation.is_active
                      ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {allocation.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Percentage:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {allocation.allocation_percentage}%
                    </div>
                  </div>

                  {allocation.allocation_amount && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(allocation.allocation_amount)}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Frequency:</span>
                    <div className="font-semibold text-gray-900 dark:text-white capitalize">
                      {allocation.frequency}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Next:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {new Date(allocation.next_allocation_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggle(allocation)}
                  className={`p-2 rounded-full transition-colors ${
                    allocation.is_active
                      ? 'text-warning-600 hover:bg-warning-100 dark:hover:bg-warning-900/20'
                      : 'text-success-600 hover:bg-success-100 dark:hover:bg-success-900/20'
                  }`}
                  title={allocation.is_active ? 'Pause Allocation' : 'Resume Allocation'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {allocation.is_active ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-5a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </button>

                <button
                  onClick={() => handleEdit(allocation)}
                  className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                  title="Edit Allocation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => handleDelete(allocation)}
                  className="p-2 text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-900/20 rounded-full transition-colors"
                  title="Delete Allocation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-danger-600 dark:text-danger-400 mb-4">
          Error loading allocations: {error.message}
        </div>
        <button onClick={() => refetch()} className="btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Automatic Savings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set up automatic transfers to consistently fund your "{goal.name}" goal
        </p>
      </div>

      {showCreateForm && renderAllocationForm()}
      {renderAllocationsList()}
    </div>
  )
}
