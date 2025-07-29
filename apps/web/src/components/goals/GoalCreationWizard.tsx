'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { CREATE_FINANCIAL_GOAL } from '../../lib/graphql/mutations'
import { GET_USER_FINANCIAL_GOALS } from '../../lib/graphql/queries'
import { GoalType, FinancialGoal } from '../../types/graphql'
import { GOAL_TEMPLATES, getGoalTemplate } from '../../lib/goals/templates'
import { validateGoalData, formatCurrency } from '../../lib/goals/utils'
import { Card } from '../common/Card'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface GoalCreationWizardProps {
  userId: string
  onComplete: (goal: FinancialGoal) => void
  onCancel: () => void
}

interface GoalFormData {
  name: string
  description: string
  goal_type: GoalType
  target_amount: string
  target_date?: string
  monthly_contribution?: string
  priority: number
}

type WizardStep = 'type' | 'details' | 'timeline' | 'review'

const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  emergency_fund: '🛡️',
  vacation: '✈️',
  house_down_payment: '🏠',
  debt_payoff: '💳',
  retirement: '🏖️',
  car_purchase: '🚗',
  education: '🎓',
  wedding: '💒',
  home_improvement: '🔨',
  custom: '⭐'
}

export function GoalCreationWizard({ userId, onComplete, onCancel }: GoalCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type')
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    goal_type: 'custom',
    target_amount: '',
    priority: 3
  })
  const [errors, setErrors] = useState<string[]>([])

  const [createGoal, { loading }] = useMutation(CREATE_FINANCIAL_GOAL, {
    refetchQueries: [{ query: GET_USER_FINANCIAL_GOALS, variables: { userId } }],
    onCompleted: (data) => {
      onComplete(data.insert_financial_goals_one)
    },
    onError: (error) => {
      setErrors([error.message])
    }
  })

  const updateFormData = useCallback((updates: Partial<GoalFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors([])
  }, [])

  const selectGoalType = useCallback((goalType: GoalType) => {
    const template = getGoalTemplate(goalType)
    updateFormData({
      goal_type: goalType,
      name: template.name,
      description: template.description,
      target_amount: template.suggested_amount || '',
      ...(goalType === 'custom' && { name: '', description: '' })
    })
    setCurrentStep('details')
  }, [updateFormData])

  const validateCurrentStep = useCallback((): boolean => {
    const stepErrors: string[] = []

    switch (currentStep) {
      case 'details':
        if (!formData.name.trim()) stepErrors.push('Goal name is required')
        if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
          stepErrors.push('Target amount must be greater than 0')
        }
        break
      case 'timeline':
        if (formData.target_date) {
          const targetDate = new Date(formData.target_date)
          if (targetDate <= new Date()) {
            stepErrors.push('Target date must be in the future')
          }
        }
        if (formData.monthly_contribution && parseFloat(formData.monthly_contribution) < 0) {
          stepErrors.push('Monthly contribution cannot be negative')
        }
        break
    }

    setErrors(stepErrors)
    return stepErrors.length === 0
  }, [currentStep, formData])

  const nextStep = useCallback(() => {
    if (!validateCurrentStep()) return

    const steps: WizardStep[] = ['type', 'details', 'timeline', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }, [currentStep, validateCurrentStep])

  const previousStep = useCallback(() => {
    const steps: WizardStep[] = ['type', 'details', 'timeline', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }, [currentStep])

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateGoalData({
      ...formData,
      user_id: userId,
      current_amount: '0.00',
      is_active: true
    })

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      await createGoal({
        variables: {
          input: {
            user_id: userId,
            name: formData.name,
            description: formData.description,
            goal_type: formData.goal_type,
            target_amount: parseFloat(formData.target_amount),
            current_amount: 0,
            target_date: formData.target_date || null,
            monthly_contribution: formData.monthly_contribution ? parseFloat(formData.monthly_contribution) : null,
            priority: formData.priority,
            is_active: true
          }
        }
      })
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }, [formData, userId, createGoal])

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {['type', 'details', 'timeline', 'review'].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
            ${currentStep === step
              ? 'bg-primary-600 text-white'
              : index < ['type', 'details', 'timeline', 'review'].indexOf(currentStep)
                ? 'bg-success-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }
          `}>
            {index < ['type', 'details', 'timeline', 'review'].indexOf(currentStep) ? '✓' : index + 1}
          </div>
          {index < 3 && (
            <div className={`
              w-12 h-0.5 mx-2
              ${index < ['type', 'details', 'timeline', 'review'].indexOf(currentStep)
                ? 'bg-success-600'
                : 'bg-gray-200 dark:bg-gray-700'
              }
            `} />
          )}
        </div>
      ))}
    </div>
  )

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What are you saving for?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose a goal type to get started with smart defaults and tips
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(GOAL_TEMPLATES).map(([type, template]) => (
          <Card
            key={type}
            className="cursor-pointer transition-all hover:shadow-md hover:scale-105 border-2 border-transparent hover:border-primary-500"
            padding="md"
            onClick={() => selectGoalType(type as GoalType)}
          >
            <div className="text-center">
              <div className="text-3xl mb-3">
                {GOAL_TYPE_ICONS[type as GoalType]}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {template.description}
              </p>
              {template.suggested_amount && (
                <div className="mt-3 text-primary-600 dark:text-primary-400 font-semibold">
                  {formatCurrency(template.suggested_amount)}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderDetailsForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Goal Details
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your goal name, amount, and description
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Goal Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="input-field"
            placeholder="e.g., Emergency Fund"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.target_amount}
              onChange={(e) => updateFormData({ target_amount: e.target.value })}
              className="input-field pl-8"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            className="input-field"
            rows={3}
            placeholder="Describe your goal..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority (1-5)
          </label>
          <select
            value={formData.priority}
            onChange={(e) => updateFormData({ priority: parseInt(e.target.value) })}
            className="input-field"
          >
            <option value={1}>1 - Low Priority</option>
            <option value={2}>2 - Below Normal</option>
            <option value={3}>3 - Normal</option>
            <option value={4}>4 - High Priority</option>
            <option value={5}>5 - Critical</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderTimelineForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Timeline & Contributions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set your target date and monthly savings plan
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Date (Optional)
          </label>
          <input
            type="date"
            value={formData.target_date || ''}
            onChange={(e) => updateFormData({ target_date: e.target.value })}
            className="input-field"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Monthly Contribution (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.monthly_contribution || ''}
              onChange={(e) => updateFormData({ monthly_contribution: e.target.value })}
              className="input-field pl-8"
              placeholder="0.00"
            />
          </div>
        </div>

        {formData.target_date && formData.target_amount && (
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-2">
              Savings Calculation
            </h4>
            <p className="text-sm text-primary-700 dark:text-primary-300">
              To reach {formatCurrency(formData.target_amount)} by{' '}
              {new Date(formData.target_date).toLocaleDateString()}, you need to save approximately{' '}
              <span className="font-semibold">
                {formatCurrency(
                  parseFloat(formData.target_amount) /
                  Math.max(1, Math.ceil(
                    (new Date(formData.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                  ))
                )}
              </span>{' '}
              per month.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review Your Goal
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Make sure everything looks correct before creating your goal
        </p>
      </div>

      <Card className="max-w-md mx-auto" padding="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">
              {GOAL_TYPE_ICONS[formData.goal_type]}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {formData.name}
              </h3>
              <span className="text-sm text-primary-600 dark:text-primary-400 capitalize">
                {formData.goal_type.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Target Amount:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(formData.target_amount)}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Priority:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formData.priority}/5
              </div>
            </div>
            {formData.target_date && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Target Date:</span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {new Date(formData.target_date).toLocaleDateString()}
                </div>
              </div>
            )}
            {formData.monthly_contribution && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Monthly:</span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(formData.monthly_contribution)}
                </div>
              </div>
            )}
          </div>

          {formData.description && (
            <div>
              <span className="text-gray-600 dark:text-gray-400 text-sm">Description:</span>
              <p className="text-gray-900 dark:text-white mt-1">
                {formData.description}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStepIndicator()}

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <h4 className="font-semibold text-danger-800 dark:text-danger-200 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="list-disc list-inside text-sm text-danger-700 dark:text-danger-300">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        {currentStep === 'type' && renderTypeSelection()}
        {currentStep === 'details' && renderDetailsForm()}
        {currentStep === 'timeline' && renderTimelineForm()}
        {currentStep === 'review' && renderReview()}
      </div>

      <div className="flex justify-between">
        <div>
          {currentStep !== 'type' && (
            <button
              onClick={previousStep}
              className="btn-secondary"
              disabled={loading}
            >
              Previous
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading && <LoadingSpinner size="sm" />}
              Create Goal
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="btn-primary"
              disabled={loading}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
