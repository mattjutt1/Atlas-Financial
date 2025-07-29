'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_USER_FINANCIAL_GOALS, GET_GOAL_ANALYTICS } from '../../lib/graphql/queries'
import { FinancialGoal } from '../../types/graphql'
import { calculateGoalAnalytics, formatCurrency, formatCompactCurrency } from '../../lib/goals/utils'
import { Card } from '../common/Card'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { GoalProgressCard } from './GoalProgressCard'
import { GoalCreationWizard } from './GoalCreationWizard'

interface GoalDashboardProps {
  userId: string
  onEditGoal?: (goal: FinancialGoal) => void
  onAddContribution?: (goal: FinancialGoal) => void
  onViewGoalDetails?: (goal: FinancialGoal) => void
}

type ViewMode = 'grid' | 'list' | 'compact'
type SortOption = 'created' | 'priority' | 'progress' | 'target_date' | 'name'
type FilterOption = 'all' | 'active' | 'completed' | 'overdue' | 'on_track'

export function GoalDashboard({
  userId,
  onEditGoal,
  onAddContribution,
  onViewGoalDetails
}: GoalDashboardProps) {
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, loading, error, refetch } = useQuery(GET_USER_FINANCIAL_GOALS, {
    variables: { userId },
    fetchPolicy: 'cache-and-network'
  })

  const goals: FinancialGoal[] = data?.financial_goals || []
  const analytics = calculateGoalAnalytics(goals)

  // Filter and sort goals
  const filteredGoals = goals.filter(goal => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!goal.name.toLowerCase().includes(query) &&
          !goal.description?.toLowerCase().includes(query) &&
          !goal.goal_type.toLowerCase().includes(query)) {
        return false
      }
    }

    // Status filter
    switch (filterBy) {
      case 'active':
        return goal.is_active
      case 'completed':
        return parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)
      case 'overdue':
        return goal.target_date && new Date(goal.target_date) < new Date() &&
               parseFloat(goal.current_amount) < parseFloat(goal.target_amount)
      case 'on_track':
        // Simplified on-track logic for filtering
        return goal.is_active &&
               parseFloat(goal.current_amount) < parseFloat(goal.target_amount)
      default:
        return true
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'priority':
        return b.priority - a.priority
      case 'progress':
        const progressA = (parseFloat(a.current_amount) / parseFloat(a.target_amount)) * 100
        const progressB = (parseFloat(b.current_amount) / parseFloat(b.target_amount)) * 100
        return progressB - progressA
      case 'target_date':
        if (!a.target_date && !b.target_date) return 0
        if (!a.target_date) return 1
        if (!b.target_date) return -1
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      case 'created':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const handleGoalCreated = (newGoal: FinancialGoal) => {
    setShowCreateWizard(false)
    refetch()
  }

  if (showCreateWizard) {
    return (
      <GoalCreationWizard
        userId={userId}
        onComplete={handleGoalCreated}
        onCancel={() => setShowCreateWizard(false)}
      />
    )
  }

  if (loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-600 dark:text-danger-400 mb-4">
          Error loading goals: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  const renderAnalyticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card padding="md" className="text-center">
        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
          {analytics.total_goals}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Goals</div>
      </Card>

      <Card padding="md" className="text-center">
        <div className="text-3xl font-bold text-success-600 dark:text-success-400 mb-1">
          {analytics.active_goals}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Active Goals</div>
      </Card>

      <Card padding="md" className="text-center">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {formatCompactCurrency(analytics.total_current_amount)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Saved</div>
      </Card>

      <Card padding="md" className="text-center">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {analytics.overall_progress_percentage.toFixed(0)}%
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</div>
      </Card>
    </div>
  )

  const renderControls = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
          className="input-field w-auto"
        >
          <option value="all">All Goals</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="on_track">On Track</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input-field w-auto"
        >
          <option value="priority">Priority</option>
          <option value="created">Created Date</option>
          <option value="progress">Progress</option>
          <option value="target_date">Target Date</option>
          <option value="name">Name</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['grid', 'list', 'compact'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🎯</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Goals Yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Start your financial journey by creating your first savings goal.
        Whether it's an emergency fund, vacation, or dream purchase, we'll help you get there.
      </p>
      <button
        onClick={() => setShowCreateWizard(true)}
        className="btn-primary"
      >
        Create Your First Goal
      </button>
    </div>
  )

  const renderGoalsList = () => {
    if (filteredGoals.length === 0) {
      if (searchQuery || filterBy !== 'all') {
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Goals Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )
      }
      return renderEmptyState()
    }

    const gridClass = viewMode === 'grid'
      ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
      : 'space-y-4'

    return (
      <div className={gridClass}>
        {filteredGoals.map((goal) => (
          <GoalProgressCard
            key={goal.id}
            goal={goal}
            onEdit={onEditGoal}
            onAddContribution={onAddContribution}
            onViewDetails={onViewGoalDetails}
            compact={viewMode === 'compact'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Goals
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your savings progress and achieve your dreams
          </p>
        </div>

        <button
          onClick={() => setShowCreateWizard(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Goal
        </button>
      </div>

      {/* Analytics Cards */}
      {goals.length > 0 && renderAnalyticsCards()}

      {/* Controls */}
      {goals.length > 0 && renderControls()}

      {/* Progress Summary */}
      {goals.length > 0 && (
        <Card padding="lg" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overall Progress
            </h2>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.total_current_amount)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                of {formatCurrency(analytics.total_target_amount)}
              </div>
            </div>
          </div>

          <div className="relative mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="h-4 bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(analytics.overall_progress_percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
              <span>0%</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.overall_progress_percentage.toFixed(1)}%
              </span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-success-600 dark:text-success-400">
                {analytics.on_track_goals}
              </div>
              <div className="text-gray-600 dark:text-gray-400">On Track</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-warning-600 dark:text-warning-400">
                {analytics.behind_schedule_goals}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Behind</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                {analytics.completed_goals}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-primary-600 dark:text-primary-400">
                {formatCurrency(analytics.monthly_contribution_total)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Monthly</div>
            </div>
          </div>
        </Card>
      )}

      {/* Goals List */}
      {renderGoalsList()}

      {/* Loading overlay */}
      {loading && goals.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <LoadingSpinner size="lg" />
            <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
              Updating goals...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
