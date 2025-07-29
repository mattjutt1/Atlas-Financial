'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { FinancialGoal } from '../../types/graphql'
import { GoalDashboard } from '../../components/goals/GoalDashboard'
import { GoalAchievementCelebration } from '../../components/goals/GoalAchievementCelebration'
import { GoalCreationWizard } from '../../components/goals/GoalCreationWizard'

// Mock user ID for now - in production this would come from the session
const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const [showAchievementCelebration, setShowAchievementCelebration] = useState<FinancialGoal | null>(null)
  const [showGoalCreation, setShowGoalCreation] = useState(false)

  // Check for goal achievement celebrations from URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const celebrateGoalId = urlParams.get('celebrate')

    if (celebrateGoalId) {
      // In a real app, you'd fetch the goal details
      // For now, we'll just clear the URL param
      window.history.replaceState({}, '', '/goals')
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const handleEditGoal = (goal: FinancialGoal) => {
    // TODO: Implement goal editing modal
    console.log('Edit goal:', goal)
  }

  const handleAddContribution = (goal: FinancialGoal) => {
    // TODO: Implement contribution modal
    console.log('Add contribution to goal:', goal)
  }

  const handleViewGoalDetails = (goal: FinancialGoal) => {
    // TODO: Implement goal details modal/page
    console.log('View goal details:', goal)
  }

  const handleShareAchievement = (goal: FinancialGoal) => {
    const shareText = `🎉 I just achieved my ${goal.name} goal and saved ${goal.target_amount}! Financial discipline pays off! #GoalAchieved #FinancialSuccess`

    if (navigator.share) {
      navigator.share({
        title: 'Goal Achievement!',
        text: shareText,
        url: window.location.origin + '/goals'
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Achievement message copied to clipboard!')
      }).catch(() => {
        alert(`Achievement: ${shareText}`)
      })
    }
  }

  const handleSetNewGoal = () => {
    setShowAchievementCelebration(null)
    setShowGoalCreation(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GoalDashboard
          userId={MOCK_USER_ID}
          onEditGoal={handleEditGoal}
          onAddContribution={handleAddContribution}
          onViewGoalDetails={handleViewGoalDetails}
        />
      </div>

      {/* Achievement Celebration Modal */}
      {showAchievementCelebration && (
        <GoalAchievementCelebration
          goal={showAchievementCelebration}
          onClose={() => setShowAchievementCelebration(null)}
          onShareAchievement={handleShareAchievement}
          onSetNewGoal={handleSetNewGoal}
        />
      )}
    </div>
  )
}
