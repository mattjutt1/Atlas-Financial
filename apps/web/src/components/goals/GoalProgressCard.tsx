'use client'

import { useState } from 'react'
import { FinancialGoal } from '../../types/graphql'
import { Card } from '../common/Card'
import {
  formatCurrency,
  calculateGoalProgress,
  getGoalStatus,
  getDaysRemaining,
  generateGoalInsights
} from '../../lib/goals/utils'
import { getGoalTemplate } from '../../lib/goals/templates'

interface GoalProgressCardProps {
  goal: FinancialGoal
  onEdit?: (goal: FinancialGoal) => void
  onAddContribution?: (goal: FinancialGoal) => void
  onViewDetails?: (goal: FinancialGoal) => void
  compact?: boolean
}

const GOAL_TYPE_ICONS: Record<string, string> = {
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

export function GoalProgressCard({
  goal,
  onEdit,
  onAddContribution,
  onViewDetails,
  compact = false
}: GoalProgressCardProps) {
  const [showInsights, setShowInsights] = useState(false)

  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const progress = calculateGoalProgress(current, target)
  const status = getGoalStatus(goal)
  const daysRemaining = getDaysRemaining(goal.target_date)
  const template = getGoalTemplate(goal.goal_type)
  const insights = generateGoalInsights(goal)

  const renderProgressBar = () => (
    <div className="relative">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            progress >= 100
              ? 'bg-success-500'
              : status.severity === 'danger'
                ? 'bg-danger-500'
                : status.severity === 'warning'
                  ? 'bg-warning-500'
                  : 'bg-primary-500'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
        <span>$0</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {progress.toFixed(1)}%
        </span>
        <span>{formatCurrency(target)}</span>
      </div>
    </div>
  )

  const renderCompactCard = () => (
    <Card
      className="transition-all hover:shadow-md cursor-pointer"
      padding="sm"
      onClick={() => onViewDetails?.(goal)}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl flex-shrink-0">
          {GOAL_TYPE_ICONS[goal.goal_type] || '⭐'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {goal.name}
            </h3>
            <span className={`text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(current)} of {formatCurrency(target)}
            </span>
            {daysRemaining && daysRemaining > 0 && (
              <span className="text-xs text-gray-500">
                {daysRemaining}d left
              </span>
            )}
          </div>

          {renderProgressBar()}
        </div>
      </div>
    </Card>
  )

  if (compact) {
    return renderCompactCard()
  }

  return (
    <Card className="transition-all hover:shadow-md" padding="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${template.color}20` }}
            >
              {GOAL_TYPE_ICONS[goal.goal_type] || '⭐'}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {goal.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {goal.goal_type.replace('_', ' ')}
                </span>
                <span className={`text-sm font-medium ${status.color}`}>
                  • {status.text}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(goal)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Edit Goal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(current)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                of {formatCurrency(target)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Goal Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Progress:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {progress.toFixed(1)}%
            </div>
          </div>

          <div>
            <span className="text-gray-600 dark:text-gray-400">Priority:</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {goal.priority}/5
            </div>
          </div>

          {goal.target_date && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                {daysRemaining && daysRemaining > 0 ? 'Days Left:' : 'Target Date:'}
              </span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {daysRemaining && daysRemaining > 0
                  ? `${daysRemaining} days`
                  : new Date(goal.target_date).toLocaleDateString()
                }
              </div>
            </div>
          )}

          {goal.monthly_contribution && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Monthly:</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(goal.monthly_contribution)}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {goal.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {goal.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {onAddContribution && (
              <button
                onClick={() => onAddContribution(goal)}
                className="btn-primary text-sm px-4 py-2"
              >
                Add Contribution
              </button>
            )}

            {onViewDetails && (
              <button
                onClick={() => onViewDetails(goal)}
                className="btn-secondary text-sm px-4 py-2"
              >
                View Details
              </button>
            )}
          </div>

          <button
            onClick={() => setShowInsights(!showInsights)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showInsights ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Insights
          </button>
        </div>

        {/* Insights Panel */}
        {showInsights && (
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-primary-800 dark:text-primary-200 mb-2">
              💡 Goal Insights
            </h4>
            {insights.map((insight, index) => (
              <p key={index} className="text-sm text-primary-700 dark:text-primary-300">
                • {insight}
              </p>
            ))}
          </div>
        )}

        {/* Milestones Preview */}
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              Next Milestones
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {goal.milestones
                .filter(milestone => !milestone.is_achieved)
                .slice(0, 3)
                .map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full text-xs"
                  >
                    <span className="font-medium">{milestone.name}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {formatCurrency(milestone.target_amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
