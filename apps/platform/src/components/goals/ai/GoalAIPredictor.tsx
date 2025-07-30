'use client';

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  TargetIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@atlas/shared/utils/currency';
import { format, addMonths, differenceInMonths } from 'date-fns';
import { GET_GOAL_AI_PREDICTIONS, GET_GOAL_ACHIEVEMENT_PROBABILITY } from '../../../lib/graphql/ai-queries';

interface GoalAIPredictorProps {
  userId: string;
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  currentMonthlyContribution: number;
  onUpdateContribution?: (newAmount: number) => void;
}

interface GoalPrediction {
  id: string;
  predictedCompletionDate: string;
  probabilityOfSuccess: number;
  recommendedMonthlyContribution: number;
  currentTrajectory: 'ahead' | 'on_track' | 'behind' | 'off_track';
  optimisticScenario: {
    completionDate: string;
    probability: number;
  };
  pessimisticScenario: {
    completionDate: string;
    probability: number;
  };
  confidence: number;
  factorsAnalysis: {
    incomeStability: number;
    spendingConsistency: number;
    marketConditions: number;
    goalPriority: number;
    externalFactors: number;
  };
  milestones: Array<{
    date: string;
    amount: number;
    probability: number;
    description: string;
  }>;
}

export const GoalAIPredictor: React.FC<GoalAIPredictorProps> = ({
  userId,
  goalId,
  goalName,
  targetAmount,
  currentAmount,
  targetDate,
  currentMonthlyContribution,
  onUpdateContribution
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const { data: predictionData, loading } = useQuery(GET_GOAL_AI_PREDICTIONS, {
    variables: {
      userId,
      goalIds: [goalId],
      includeProbabilityAnalysis: true
    }
  });

  const { data: probabilityData } = useQuery(GET_GOAL_ACHIEVEMENT_PROBABILITY, {
    variables: {
      userId,
      goalId
    }
  });

  const prediction: GoalPrediction | null = predictionData?.goalPredictions?.[0] || null;
  const probabilityAnalysis = probabilityData?.goalProbability?.[0] || null;

  const progressPercentage = (currentAmount / targetAmount) * 100;
  const monthsRemaining = differenceInMonths(new Date(targetDate), new Date());
  const requiredMonthlyContribution = Math.max(0, (targetAmount - currentAmount) / Math.max(1, monthsRemaining));

  const getTrajectoryColor = (trajectory: string) => {
    switch (trajectory) {
      case 'ahead':
        return 'text-green-600 bg-green-100';
      case 'on_track':
        return 'text-blue-600 bg-blue-100';
      case 'behind':
        return 'text-yellow-600 bg-yellow-100';
      case 'off_track':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrajectoryIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'ahead':
        return TrendingUpIcon;
      case 'on_track':
        return TargetIcon;
      case 'behind':
        return ClockIcon;
      case 'off_track':
        return ExclamationTriangleIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <SparklesIcon className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Goal Predictions</h3>
        </div>
        <div className="text-center py-8">
          <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Analyzing your goal progress...</p>
          <p className="text-sm text-gray-500 mt-1">AI predictions will be available once we have enough data.</p>
        </div>
      </div>
    );
  }

  const TrajectoryIcon = getTrajectoryIcon(prediction.currentTrajectory);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Goal Predictions</h3>
            <p className="text-sm text-gray-600">{goalName}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Main Prediction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Trajectory Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <TrajectoryIcon className={`w-5 h-5 mr-2 ${getTrajectoryColor(prediction.currentTrajectory).split(' ')[0]}`} />
              <span className="text-sm font-medium text-gray-700">Current Trajectory</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTrajectoryColor(prediction.currentTrajectory)}`}>
              {prediction.currentTrajectory.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Math.round(prediction.probabilityOfSuccess * 100)}%
          </div>
          <div className="text-sm text-gray-600">Success Probability</div>
        </div>

        {/* Predicted Completion */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <CalendarIcon className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Predicted Completion</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {format(new Date(prediction.predictedCompletionDate), 'MMM yyyy')}
          </div>
          <div className="text-sm text-gray-600">
            {differenceInMonths(new Date(prediction.predictedCompletionDate), new Date(targetDate)) > 0 
              ? `${differenceInMonths(new Date(prediction.predictedCompletionDate), new Date(targetDate))} months later than target`
              : differenceInMonths(new Date(prediction.predictedCompletionDate), new Date(targetDate)) < 0
              ? `${Math.abs(differenceInMonths(new Date(prediction.predictedCompletionDate), new Date(targetDate)))} months ahead of target`
              : 'On target date'
            }
          </div>
        </div>
      </div>

      {/* Recommended Contribution */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-semibold text-blue-800">Recommended Monthly Contribution</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(prediction.recommendedMonthlyContribution)}
            </div>
            <div className="text-sm text-blue-700">
              {prediction.recommendedMonthlyContribution > currentMonthlyContribution 
                ? `Increase by ${formatCurrency(prediction.recommendedMonthlyContribution - currentMonthlyContribution)}`
                : prediction.recommendedMonthlyContribution < currentMonthlyContribution
                ? `Decrease by ${formatCurrency(currentMonthlyContribution - prediction.recommendedMonthlyContribution)}`
                : 'Current contribution is optimal'
              }
            </div>
          </div>
          {onUpdateContribution && prediction.recommendedMonthlyContribution !== currentMonthlyContribution && (
            <button
              onClick={() => onUpdateContribution(prediction.recommendedMonthlyContribution)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircleIcon className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">Optimistic Scenario</span>
          </div>
          <div className="text-lg font-semibold text-green-900 mb-1">
            {format(new Date(prediction.optimisticScenario.completionDate), 'MMM yyyy')}
          </div>
          <div className="text-sm text-green-700">
            {Math.round(prediction.optimisticScenario.probability * 100)}% probability
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">Pessimistic Scenario</span>
          </div>
          <div className="text-lg font-semibold text-red-900 mb-1">
            {format(new Date(prediction.pessimisticScenario.completionDate), 'MMM yyyy')}
          </div>
          <div className="text-sm text-red-700">
            {Math.round(prediction.pessimisticScenario.probability * 100)}% probability
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-6">
          {/* Factors Analysis */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Success Factors Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(prediction.factorsAnalysis).map(([factor, score]) => (
                <div key={factor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 capitalize">
                    {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <div className="flex items-center">
                    <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                      <div 
                        className={`h-2 rounded-full ${
                          score >= 0.8 ? 'bg-green-500' : 
                          score >= 0.6 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Predicted Milestones</h4>
            <div className="space-y-3">
              {prediction.milestones.slice(0, 4).map((milestone, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(milestone.amount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(milestone.date), 'MMM yyyy')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">{milestone.description}</div>
                  </div>
                  <div className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${getProbabilityColor(milestone.probability)} bg-opacity-10`}>
                    {Math.round(milestone.probability * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations from Probability Analysis */}
          {probabilityAnalysis?.recommendations && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">AI Recommendations</h4>
              <div className="space-y-3">
                {probabilityAnalysis.recommendations.slice(0, 3).map((rec: any, index: number) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-blue-900 capitalize">
                            {rec.action_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-blue-700 px-2 py-1 bg-blue-100 rounded-full">
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-blue-800 mb-2">{rec.description}</p>
                        <div className="text-xs text-blue-700">
                          Impact: <span className="font-medium">{rec.potential_impact}</span> • 
                          Effort: <span className="font-medium">{rec.estimated_effort}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confidence Score */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Prediction Confidence: <span className="font-medium">{Math.round(prediction.confidence * 100)}%</span>
        </div>
        <div className="text-xs text-gray-500">
          Updated based on recent financial activity
        </div>
      </div>
    </div>
  );
};