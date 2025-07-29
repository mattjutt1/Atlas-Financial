'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { FinancialGoal, GoalMilestone } from '../../types/graphql'
import { formatCurrency, calculateGoalProgress } from '../../lib/goals/utils'
import { Card } from '../common/Card'

interface GoalMilestoneTrackerProps {
  goal: FinancialGoal
  onMilestoneUpdate?: (milestone: GoalMilestone) => void
  showChart?: boolean
}

type ChartType = 'progress' | 'milestones' | 'contributions'

interface ProgressDataPoint {
  date: string
  amount: number
  milestone?: string
}

interface MilestoneData {
  name: string
  target: number
  achieved: boolean
  progress: number
}

export function GoalMilestoneTracker({
  goal,
  onMilestoneUpdate,
  showChart = true
}: GoalMilestoneTrackerProps) {
  const [chartType, setChartType] = useState<ChartType>('progress')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')

  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const overallProgress = calculateGoalProgress(current, target)

  // Generate sample progress data (in real app, this would come from contributions)
  const generateProgressData = (): ProgressDataPoint[] => {
    const data: ProgressDataPoint[] = []
    const startDate = new Date(goal.created_at)
    const now = new Date()
    const monthsDiff = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth())

    for (let i = 0; i <= monthsDiff; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)

      // Simulate progressive savings with some variance
      const baseProgress = Math.min(current, (current / monthsDiff) * i * (0.8 + Math.random() * 0.4))

      data.push({
        date: date.toISOString().split('T')[0],
        amount: Math.max(0, baseProgress),
        milestone: i === monthsDiff ? `Current: ${formatCurrency(current)}` : undefined
      })
    }

    return data
  }

  const prepareMilestoneData = (): MilestoneData[] => {
    if (!goal.milestones || goal.milestones.length === 0) {
      // Generate default milestones based on target amount
      const milestoneCount = 4
      const increment = target / milestoneCount
      return Array.from({ length: milestoneCount }, (_, i) => {
        const milestoneTarget = increment * (i + 1)
        return {
          name: `${((i + 1) / milestoneCount * 100).toFixed(0)}%`,
          target: milestoneTarget,
          achieved: current >= milestoneTarget,
          progress: Math.min(100, (current / milestoneTarget) * 100)
        }
      })
    }

    return goal.milestones.map(milestone => ({
      name: milestone.name,
      target: parseFloat(milestone.target_amount),
      achieved: milestone.is_achieved,
      progress: Math.min(100, (current / parseFloat(milestone.target_amount)) * 100)
    }))
  }

  const progressData = generateProgressData()
  const milestoneData = prepareMilestoneData()

  const formatTooltipValue = (value: number, name: string) => {
    return [formatCurrency(value), name === 'amount' ? 'Saved Amount' : name]
  }

  const formatXAxisDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  const renderProgressChart = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={progressData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value).replace('.00', '')}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(31 41 55)',
              border: '1px solid rgb(75 85 99)',
              borderRadius: '8px',
              color: 'white',
            }}
            labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
            formatter={formatTooltipValue}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Add target line */}
          <Line
            type="monotone"
            dataKey={() => target}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  const renderMilestoneChart = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={milestoneData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(31 41 55)',
              border: '1px solid rgb(75 85 99)',
              borderRadius: '8px',
              color: 'white',
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === 'progress' ? 'Progress' : name
            ]}
          />
          <Bar
            dataKey="progress"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  const renderMilestoneList = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Milestones
      </h3>

      {milestoneData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🎯</div>
          <p>No milestones set for this goal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestoneData.map((milestone, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                milestone.achieved
                  ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
                  : milestone.progress > 50
                    ? 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    milestone.achieved
                      ? 'bg-success-500 text-white'
                      : milestone.progress > 50
                        ? 'bg-warning-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {milestone.achieved ? '✓' : index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {milestone.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Target: {formatCurrency(milestone.target)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    milestone.achieved
                      ? 'text-success-600 dark:text-success-400'
                      : milestone.progress > 50
                        ? 'text-warning-600 dark:text-warning-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {milestone.progress.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {milestone.achieved ? 'Achieved!' : 'In Progress'}
                  </div>
                </div>
              </div>

              {/* Progress bar for incomplete milestones */}
              {!milestone.achieved && (
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        milestone.progress > 75
                          ? 'bg-success-500'
                          : milestone.progress > 50
                            ? 'bg-warning-500'
                            : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min(milestone.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{formatCurrency(current * (milestone.progress / 100))}</span>
                    <span>{formatCurrency(milestone.target)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Overall Progress Summary */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Progress Tracking
          </h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {overallProgress.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Complete
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="h-4 bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span>{formatCurrency(0)}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(current)} / {formatCurrency(target)}
            </span>
            <span>{formatCurrency(target)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(current)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Current</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(target - current)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Remaining</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {milestoneData.filter(m => m.achieved).length}/{milestoneData.length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Milestones</div>
          </div>
        </div>
      </Card>

      {/* Chart Section */}
      {showChart && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Visual Progress
            </h3>

            <div className="flex gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['progress', 'milestones'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                      chartType === type
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {chartType === 'progress' && renderProgressChart()}
          {chartType === 'milestones' && renderMilestoneChart()}
        </Card>
      )}

      {/* Milestone List */}
      <Card padding="lg">
        {renderMilestoneList()}
      </Card>

      {/* Next Steps */}
      <Card padding="lg" className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <h3 className="font-semibold text-primary-800 dark:text-primary-200 mb-3">
          💡 Next Steps
        </h3>
        <div className="space-y-2 text-sm text-primary-700 dark:text-primary-300">
          {overallProgress < 25 && (
            <p>• Start building momentum with consistent small contributions</p>
          )}
          {overallProgress >= 25 && overallProgress < 50 && (
            <p>• Great progress! Consider increasing your monthly contribution if possible</p>
          )}
          {overallProgress >= 50 && overallProgress < 75 && (
            <p>• You're over halfway there! Stay consistent to reach your goal</p>
          )}
          {overallProgress >= 75 && overallProgress < 100 && (
            <p>• So close! One final push to reach your target</p>
          )}
          {overallProgress >= 100 && (
            <p>• Congratulations! You've achieved your goal. Consider setting a new target.</p>
          )}

          {goal.monthly_contribution && (
            <p>• Keep up your monthly contribution of {formatCurrency(goal.monthly_contribution)}</p>
          )}

          {!goal.monthly_contribution && (
            <p>• Consider setting up automatic monthly contributions to stay on track</p>
          )}
        </div>
      </Card>
    </div>
  )
}
