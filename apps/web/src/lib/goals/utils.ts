import { FinancialGoal, GoalAnalytics, FinancialAmountString } from '../../types/graphql'

/**
 * Calculate progress percentage for a goal
 */
export const calculateGoalProgress = (current: number, target: number): number => {
  if (target <= 0) return 0
  return Math.min((current / target) * 100, 100)
}

/**
 * Calculate monthly required contribution to reach goal by target date
 */
export const calculateMonthlyRequired = (
  currentAmount: number,
  targetAmount: number,
  targetDate?: string
): number | null => {
  if (!targetDate) return null

  const now = new Date()
  const target = new Date(targetDate)
  const monthsRemaining = Math.max(1,
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  )

  const remaining = Math.max(0, targetAmount - currentAmount)
  return remaining / monthsRemaining
}

/**
 * Calculate projected completion date based on current monthly contribution
 */
export const calculateProjectedCompletion = (
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number
): Date | null => {
  if (monthlyContribution <= 0) return null

  const remaining = Math.max(0, targetAmount - currentAmount)
  if (remaining <= 0) return new Date() // Already completed

  const monthsNeeded = Math.ceil(remaining / monthlyContribution)
  const projectedDate = new Date()
  projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded)

  return projectedDate
}

/**
 * Check if goal is on track to meet target date
 */
export const isGoalOnTrack = (goal: FinancialGoal): boolean => {
  if (!goal.target_date) return true // No deadline, always on track

  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const now = new Date()
  const targetDate = new Date(goal.target_date)

  if (targetDate <= now) {
    return current >= target // Past due - check if completed
  }

  const totalDays = (targetDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const daysPassed = (now.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const expectedProgress = Math.max(0, Math.min(1, daysPassed / totalDays))
  const actualProgress = current / target

  // Consider on track if within 10% of expected progress
  return actualProgress >= (expectedProgress * 0.9)
}

/**
 * Check if goal is overdue
 */
export const isGoalOverdue = (goal: FinancialGoal): boolean => {
  if (!goal.target_date) return false

  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const now = new Date()
  const targetDate = new Date(goal.target_date)

  return targetDate < now && current < target
}

/**
 * Calculate days remaining until target date
 */
export const getDaysRemaining = (targetDate?: string): number | null => {
  if (!targetDate) return null

  const now = new Date()
  const target = new Date(targetDate)
  const diffTime = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: FinancialAmountString | number, currency = 'USD'): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export const formatCompactCurrency = (amount: FinancialAmountString | number, currency = 'USD'): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Calculate goal analytics from array of goals
 */
export const calculateGoalAnalytics = (goals: FinancialGoal[]): GoalAnalytics => {
  const activeGoals = goals.filter(goal => goal.is_active)
  const completedGoals = goals.filter(goal => {
    const current = parseFloat(goal.current_amount)
    const target = parseFloat(goal.target_amount)
    return current >= target
  })

  const totalTarget = goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount), 0)
  const totalCurrent = goals.reduce((sum, goal) => sum + parseFloat(goal.current_amount), 0)

  const onTrackGoals = goals.filter(isGoalOnTrack)
  const behindScheduleGoals = goals.filter(goal => !isGoalOnTrack(goal) && !isGoalOverdue(goal))

  const monthlyContributions = goals
    .filter(goal => goal.monthly_contribution)
    .reduce((sum, goal) => sum + parseFloat(goal.monthly_contribution!), 0)

  // Group goals by type
  const goalsByType = goals.reduce((acc, goal) => {
    acc[goal.goal_type] = (acc[goal.goal_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate progress trend (simplified)
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0
  const progressTrend: 'improving' | 'stable' | 'declining' =
    overallProgress > 50 ? 'improving' :
    overallProgress > 20 ? 'stable' : 'declining'

  return {
    total_goals: goals.length,
    active_goals: activeGoals.length,
    completed_goals: completedGoals.length,
    total_target_amount: totalTarget.toFixed(2),
    total_current_amount: totalCurrent.toFixed(2),
    overall_progress_percentage: overallProgress,
    on_track_goals: onTrackGoals.length,
    behind_schedule_goals: behindScheduleGoals.length,
    monthly_contribution_total: monthlyContributions.toFixed(2),
    goals_by_type: goalsByType as any,
    progress_trend: progressTrend
  }
}

/**
 * Get goal status text and color
 */
export const getGoalStatus = (goal: FinancialGoal): { text: string; color: string; severity: 'success' | 'warning' | 'danger' | 'info' } => {
  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)

  if (current >= target) {
    return { text: 'Completed', color: 'text-success-600', severity: 'success' }
  }

  if (isGoalOverdue(goal)) {
    return { text: 'Overdue', color: 'text-danger-600', severity: 'danger' }
  }

  if (!isGoalOnTrack(goal)) {
    return { text: 'Behind Schedule', color: 'text-warning-600', severity: 'warning' }
  }

  return { text: 'On Track', color: 'text-success-600', severity: 'success' }
}

/**
 * Generate goal insights based on current status
 */
export const generateGoalInsights = (goal: FinancialGoal): string[] => {
  const insights: string[] = []
  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const progress = (current / target) * 100

  if (progress === 0) {
    insights.push('Get started by making your first contribution!')
  } else if (progress < 25) {
    insights.push('Great start! Keep up the momentum.')
  } else if (progress < 50) {
    insights.push('You\'re making solid progress. Stay consistent!')
  } else if (progress < 75) {
    insights.push('Over halfway there! The finish line is in sight.')
  } else if (progress < 100) {
    insights.push('So close! One final push to reach your goal.')
  } else {
    insights.push('Congratulations! You\'ve achieved your goal!')
  }

  if (goal.monthly_contribution) {
    const monthlyRequired = calculateMonthlyRequired(current, target, goal.target_date)
    const currentMonthly = parseFloat(goal.monthly_contribution)

    if (monthlyRequired && currentMonthly < monthlyRequired) {
      const difference = monthlyRequired - currentMonthly
      insights.push(`Consider increasing your monthly contribution by ${formatCurrency(difference)} to stay on track.`)
    }
  }

  if (isGoalOverdue(goal)) {
    insights.push('This goal is past its target date. Consider adjusting the timeline or increasing contributions.')
  }

  return insights
}

/**
 * Validate goal data
 */
export const validateGoalData = (goalData: Partial<FinancialGoal>): string[] => {
  const errors: string[] = []

  if (!goalData.name?.trim()) {
    errors.push('Goal name is required')
  }

  if (!goalData.target_amount || parseFloat(goalData.target_amount) <= 0) {
    errors.push('Target amount must be greater than 0')
  }

  if (goalData.current_amount && parseFloat(goalData.current_amount) < 0) {
    errors.push('Current amount cannot be negative')
  }

  if (goalData.target_date) {
    const targetDate = new Date(goalData.target_date)
    const now = new Date()

    if (targetDate < now) {
      errors.push('Target date must be in the future')
    }
  }

  if (goalData.monthly_contribution && parseFloat(goalData.monthly_contribution) < 0) {
    errors.push('Monthly contribution cannot be negative')
  }

  if (goalData.priority && (goalData.priority < 1 || goalData.priority > 5)) {
    errors.push('Priority must be between 1 and 5')
  }

  return errors
}
