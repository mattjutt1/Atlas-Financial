// Goal Tracking Components
export { GoalDashboard } from './GoalDashboard'
export { GoalCreationWizard } from './GoalCreationWizard'
export { GoalProgressCard } from './GoalProgressCard'
export { GoalMilestoneTracker } from './GoalMilestoneTracker'
export { GoalAchievementCelebration } from './GoalAchievementCelebration'
export { GoalAllocationInterface } from './GoalAllocationInterface'

// Goal Templates and Utilities
export { GOAL_TEMPLATES, getGoalTemplate, getAllGoalTemplates } from '../../lib/goals/templates'
export {
  calculateGoalProgress,
  calculateMonthlyRequired,
  calculateProjectedCompletion,
  isGoalOnTrack,
  isGoalOverdue,
  getDaysRemaining,
  formatCurrency,
  formatCompactCurrency,
  calculateGoalAnalytics,
  getGoalStatus,
  generateGoalInsights,
  validateGoalData
} from '../../lib/goals/utils'
