'use client'

import { useState, useEffect } from 'react'
import { FinancialGoal } from '../../types/graphql'
import { formatCurrency } from '../../lib/goals/utils'
import { Card } from '../common/Card'

interface GoalAchievementCelebrationProps {
  goal: FinancialGoal
  onClose: () => void
  onShareAchievement?: (goal: FinancialGoal) => void
  onSetNewGoal?: () => void
}

const CELEBRATION_MESSAGES = {
  emergency_fund: [
    "🛡️ Safety Net Secured!",
    "You've built a fortress of financial security! Your emergency fund is ready to protect you from life's unexpected challenges.",
    "Peace of mind: achieved! 💪"
  ],
  vacation: [
    "✈️ Adventure Awaits!",
    "Pack your bags! You've successfully saved for your dream vacation. Time to create memories that will last a lifetime!",
    "Wanderlust funded! 🌍"
  ],
  house_down_payment: [
    "🏠 Home Sweet Home!",
    "Congratulations! You've saved enough for your down payment. Your dream home is now within reach!",
    "Keys to the future! 🗝️"
  ],
  debt_payoff: [
    "💳 Freedom Achieved!",
    "You're debt-free! The weight has been lifted, and your financial future is brighter than ever. Celebrate this huge win!",
    "Liberation complete! ⛓️‍💥"
  ],
  retirement: [
    "🏖️ Future Secured!",
    "Your future self is thanking you! Every dollar saved brings you closer to the retirement of your dreams.",
    "Golden years, here we come! ✨"
  ],
  car_purchase: [
    "🚗 Ready to Roll!",
    "New wheels await! You've successfully saved for your car purchase. Time to hit the road in style!",
    "Drive into success! 🛣️"
  ],
  education: [
    "🎓 Knowledge Investment!",
    "Education is the best investment! You've secured funding for learning and growth. The future is bright!",
    "Wisdom earned! 📚"
  ],
  wedding: [
    "💒 Dream Wedding Funded!",
    "Your special day is secured! You've saved for the wedding of your dreams. Here's to love and smart financial planning!",
    "Happily ever after begins! 💍"
  ],
  home_improvement: [
    "🔨 Home Enhancement Complete!",
    "Ready to transform your space! Your home improvement fund is complete. Time to create the home of your dreams!",
    "Renovation ready! 🏡"
  ],
  custom: [
    "⭐ Goal Conquered!",
    "You did it! Your determination and consistent saving have paid off. This achievement is a testament to your financial discipline!",
    "Success unlocked! 🎯"
  ]
}

const ACHIEVEMENT_STATS = [
  "Days of dedication",
  "Consistent saving",
  "Smart financial planning",
  "Milestone achieved"
]

export function GoalAchievementCelebration({
  goal,
  onClose,
  onShareAchievement,
  onSetNewGoal
}: GoalAchievementCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [animationPhase, setAnimationPhase] = useState<'entrance' | 'celebration' | 'exit'>('entrance')

  const [title, description, tagline] = CELEBRATION_MESSAGES[goal.goal_type] || CELEBRATION_MESSAGES.custom

  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  useEffect(() => {
    // Animation sequence
    const timer1 = setTimeout(() => setAnimationPhase('celebration'), 500)
    const timer2 = setTimeout(() => setShowConfetti(false), 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleShare = () => {
    if (onShareAchievement) {
      onShareAchievement(goal)
    } else {
      // Fallback to native sharing
      const shareText = `🎉 I just achieved my ${goal.name} goal and saved ${formatCurrency(goal.target_amount)}! Financial discipline pays off! #GoalAchieved #FinancialSuccess`

      if (navigator.share) {
        navigator.share({
          title: 'Goal Achievement!',
          text: shareText,
          url: window.location.href
        }).catch(console.error)
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Achievement copied to clipboard!')
        }).catch(() => {
          alert(`Achievement: ${shareText}`)
        })
      }
    }
  }

  const renderConfetti = () => {
    if (!showConfetti) return null

    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className={`absolute animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10px`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              fontSize: `${1 + Math.random()}rem`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          >
            {['🎉', '🎊', '⭐', '💫', '🏆', '✨', '🎯', '💰'][Math.floor(Math.random() * 8)]}
          </div>
        ))}
      </div>
    )
  }

  const renderAchievementBadge = () => (
    <div className="relative">
      <div className={`
        w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center text-6xl
        bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
        shadow-2xl transform transition-all duration-1000
        ${animationPhase === 'celebration' ? 'scale-110 rotate-12' : 'scale-100'}
      `}>
        🏆
      </div>

      {/* Glow effect */}
      <div className={`
        absolute inset-0 w-32 h-32 mx-auto rounded-full
        bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
        opacity-30 blur-xl transition-all duration-1000
        ${animationPhase === 'celebration' ? 'scale-150' : 'scale-100'}
      `} />
    </div>
  )

  const renderStats = () => (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="text-center">
        <div className="text-3xl font-bold text-success-600 dark:text-success-400">
          {formatCurrency(goal.target_amount)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Amount Saved</div>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {daysSinceCreation}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Days</div>
      </div>

      {goal.monthly_contribution && (
        <>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(goal.monthly_contribution)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Monthly</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {Math.ceil(parseFloat(goal.target_amount) / parseFloat(goal.monthly_contribution))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Months</div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {renderConfetti()}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <Card
          className={`
            max-w-lg w-full text-center relative overflow-hidden
            transform transition-all duration-500
            ${animationPhase === 'entrance' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}
          `}
          padding="lg"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-success-50 via-primary-50 to-warning-50 dark:from-success-900/20 dark:via-primary-900/20 dark:to-warning-900/20" />

          <div className="relative z-10">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {renderAchievementBadge()}

            {/* Title and Description */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h1>

            <h2 className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-4">
              {goal.name}
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
              {description}
            </p>

            <p className="text-lg font-semibold text-success-600 dark:text-success-400 mb-8">
              {tagline}
            </p>

            {renderStats()}

            {/* Motivational Quote */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-8 border-l-4 border-success-500">
              <p className="text-gray-700 dark:text-gray-300 italic">
                "Success is the sum of small efforts repeated day in and day out."
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                - Robert Collier
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShare}
                className="btn-primary flex items-center justify-center gap-2 flex-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share Achievement
              </button>

              {onSetNewGoal && (
                <button
                  onClick={onSetNewGoal}
                  className="btn-secondary flex items-center justify-center gap-2 flex-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Set New Goal
                </button>
              )}
            </div>

            {/* Achievement Tips */}
            <div className="mt-8 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                🎯 What's Next?
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Consider setting a new, more ambitious goal</li>
                <li>• Share your success story to motivate others</li>
                <li>• Reflect on the habits that led to this achievement</li>
                <li>• Celebrate responsibly - you've earned it!</li>
              </ul>
            </div>

            {/* Progress Badge */}
            <div className="mt-6 inline-flex items-center gap-2 bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Goal Completed: 100%
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
