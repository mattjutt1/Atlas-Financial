import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_USER_FINANCIAL_GOALS,
  GET_FINANCIAL_GOAL_DETAILS,
  GET_GOAL_ANALYTICS,
  GET_GOAL_CONTRIBUTIONS,
  GET_GOAL_INSIGHTS
} from '../lib/graphql/queries'
import {
  CREATE_FINANCIAL_GOAL,
  UPDATE_FINANCIAL_GOAL,
  DELETE_FINANCIAL_GOAL,
  ARCHIVE_FINANCIAL_GOAL,
  CREATE_GOAL_CONTRIBUTION
} from '../lib/graphql/mutations'
import { FinancialGoal, GoalType } from '../types/graphql'
import { calculateGoalAnalytics } from '../lib/goals/utils'

interface UseGoalsOptions {
  userId: string
  autoRefetch?: boolean
}

interface CreateGoalInput {
  name: string
  description?: string
  goal_type: GoalType
  target_amount: number
  target_date?: string
  monthly_contribution?: number
  priority?: number
}

interface UpdateGoalInput {
  name?: string
  description?: string
  target_amount?: number
  target_date?: string
  monthly_contribution?: number
  priority?: number
}

interface CreateContributionInput {
  goal_id: string
  amount: number
  description?: string
  contribution_date?: string
}

export function useGoals({ userId, autoRefetch = true }: UseGoalsOptions) {
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null)

  // Queries
  const {
    data: goalsData,
    loading: goalsLoading,
    error: goalsError,
    refetch: refetchGoals
  } = useQuery(GET_USER_FINANCIAL_GOALS, {
    variables: { userId },
    fetchPolicy: autoRefetch ? 'cache-and-network' : 'cache-first',
    errorPolicy: 'all'
  })

  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch: refetchAnalytics
  } = useQuery(GET_GOAL_ANALYTICS, {
    variables: { userId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  })

  // Mutations
  const [createGoalMutation, { loading: createLoading }] = useMutation(CREATE_FINANCIAL_GOAL, {
    refetchQueries: [
      { query: GET_USER_FINANCIAL_GOALS, variables: { userId } },
      { query: GET_GOAL_ANALYTICS, variables: { userId } }
    ],
    errorPolicy: 'all'
  })

  const [updateGoalMutation, { loading: updateLoading }] = useMutation(UPDATE_FINANCIAL_GOAL, {
    refetchQueries: [
      { query: GET_USER_FINANCIAL_GOALS, variables: { userId } }
    ],
    errorPolicy: 'all'
  })

  const [deleteGoalMutation, { loading: deleteLoading }] = useMutation(DELETE_FINANCIAL_GOAL, {
    refetchQueries: [
      { query: GET_USER_FINANCIAL_GOALS, variables: { userId } },
      { query: GET_GOAL_ANALYTICS, variables: { userId } }
    ],
    errorPolicy: 'all'
  })

  const [archiveGoalMutation, { loading: archiveLoading }] = useMutation(ARCHIVE_FINANCIAL_GOAL, {
    refetchQueries: [
      { query: GET_USER_FINANCIAL_GOALS, variables: { userId } }
    ],
    errorPolicy: 'all'
  })

  const [createContributionMutation, { loading: contributionLoading }] = useMutation(CREATE_GOAL_CONTRIBUTION, {
    refetchQueries: [
      { query: GET_USER_FINANCIAL_GOALS, variables: { userId } },
      { query: GET_GOAL_ANALYTICS, variables: { userId } }
    ],
    errorPolicy: 'all'
  })

  // Computed values
  const goals: FinancialGoal[] = goalsData?.financial_goals || []
  const activeGoals = goals.filter(goal => goal.is_active)
  const completedGoals = goals.filter(goal =>
    parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)
  )
  const analytics = calculateGoalAnalytics(goals)

  // Actions
  const createGoal = useCallback(async (input: CreateGoalInput) => {
    try {
      const result = await createGoalMutation({
        variables: {
          input: {
            user_id: userId,
            ...input,
            current_amount: 0,
            is_active: true
          }
        }
      })
      return result.data?.insert_financial_goals_one
    } catch (error) {
      console.error('Error creating goal:', error)
      throw error
    }
  }, [createGoalMutation, userId])

  const updateGoal = useCallback(async (goalId: string, input: UpdateGoalInput) => {
    try {
      const result = await updateGoalMutation({
        variables: { id: goalId, input }
      })
      return result.data?.update_financial_goals_by_pk
    } catch (error) {
      console.error('Error updating goal:', error)
      throw error
    }
  }, [updateGoalMutation])

  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      await deleteGoalMutation({
        variables: { id: goalId }
      })
      return true
    } catch (error) {
      console.error('Error deleting goal:', error)
      throw error
    }
  }, [deleteGoalMutation])

  const archiveGoal = useCallback(async (goalId: string) => {
    try {
      const result = await archiveGoalMutation({
        variables: { id: goalId }
      })
      return result.data?.update_financial_goals_by_pk
    } catch (error) {
      console.error('Error archiving goal:', error)
      throw error
    }
  }, [archiveGoalMutation])

  const addContribution = useCallback(async (input: CreateContributionInput) => {
    try {
      const result = await createContributionMutation({
        variables: {
          input: {
            ...input,
            contribution_date: input.contribution_date || new Date().toISOString().split('T')[0],
            source: 'manual'
          }
        }
      })
      return result.data?.insert_goal_contributions_one
    } catch (error) {
      console.error('Error adding contribution:', error)
      throw error
    }
  }, [createContributionMutation])

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        refetchGoals(),
        refetchAnalytics()
      ])
    } catch (error) {
      console.error('Error refreshing goal data:', error)
    }
  }, [refetchGoals, refetchAnalytics])

  // Utility functions
  const getGoalById = useCallback((goalId: string) => {
    return goals.find(goal => goal.id === goalId) || null
  }, [goals])

  const getGoalsByType = useCallback((goalType: GoalType) => {
    return goals.filter(goal => goal.goal_type === goalType)
  }, [goals])

  const getGoalsByPriority = useCallback((priority: number) => {
    return goals.filter(goal => goal.priority === priority)
  }, [goals])

  const isGoalCompleted = useCallback((goal: FinancialGoal) => {
    return parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)
  }, [])

  return {
    // Data
    goals,
    activeGoals,
    completedGoals,
    analytics,
    selectedGoal,

    // Loading states
    loading: goalsLoading || analyticsLoading,
    createLoading,
    updateLoading,
    deleteLoading,
    archiveLoading,
    contributionLoading,

    // Errors
    error: goalsError,

    // Actions
    createGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
    addContribution,
    refreshData,
    setSelectedGoal,

    // Utilities
    getGoalById,
    getGoalsByType,
    getGoalsByPriority,
    isGoalCompleted
  }
}
