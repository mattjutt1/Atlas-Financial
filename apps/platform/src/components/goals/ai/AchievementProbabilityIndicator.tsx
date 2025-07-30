'use client';

import React, { useState } from 'react';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface AchievementProbabilityIndicatorProps {
  goalId: string;
  goalName: string;
  currentProbability: number;
  probabilityTrend: 'increasing' | 'decreasing' | 'stable';
  keyFactors: Array<{
    factorName: string;
    impactWeight: number;
    currentStatus: 'good' | 'fair' | 'poor';
    improvementPotential: number;
  }>;
  scenarioAnalysis: Array<{
    scenarioType: 'conservative' | 'realistic' | 'optimistic';
    probability: number;
    timelineMonths: number;
    requiredMonthlyContribution: number;
    assumptions: string[];
  }>;
  className?: string;
}

export const AchievementProbabilityIndicator: React.FC<AchievementProbabilityIndicatorProps> = ({
  goalId,
  goalName,
  currentProbability,
  probabilityTrend,
  keyFactors,
  scenarioAnalysis,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('realistic');

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600 bg-green-100';
    if (probability >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProbabilityRing = (probability: number) => {
    if (probability >= 0.8) return 'stroke-green-500';
    if (probability >= 0.6) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const getTrendIcon = () => {
    switch (probabilityTrend) {
      case 'increasing':
        return TrendingUpIcon;
      case 'decreasing':
        return TrendingDownIcon;
      default:
        return ArrowPathIcon;
    }
  };

  const getTrendColor = () => {
    switch (probabilityTrend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'fair':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const selectedScenarioData = scenarioAnalysis.find(s => s.scenarioType === selectedScenario);
  const TrendIcon = getTrendIcon();

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Achievement Probability</h4>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showDetails ? 'Hide Details' : 'Details'}
        </button>
      </div>

      {/* Probability Visualization */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${currentProbability * 283} 283`}
              strokeLinecap="round"
              className={getProbabilityRing(currentProbability)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {Math.round(currentProbability * 100)}%
              </div>
              <div className="flex items-center justify-center mt-1">
                <TrendIcon className={`w-3 h-3 ${getTrendColor()}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Probability Status */}
      <div className="text-center mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getProbabilityColor(currentProbability)}`}>
          {currentProbability >= 0.8 ? (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              High Probability
            </>
          ) : currentProbability >= 0.6 ? (
            <>
              <InformationCircleIcon className="w-4 h-4 mr-1" />
              Moderate Probability
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              Low Probability
            </>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Key Factors */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-3">Key Success Factors</h5>
            <div className="space-y-2">
              {keyFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate pr-2">
                        {factor.factorName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(factor.currentStatus)}`}>
                        {factor.currentStatus}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            factor.currentStatus === 'good' ? 'bg-green-500' :
                            factor.currentStatus === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${factor.impactWeight * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">
                        {Math.round(factor.impactWeight * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Analysis */}
          <div>
            <h5 className="text-xs font-semibold text-gray-700 mb-3">Scenarios</h5>
            <div className="flex space-x-1 mb-3">
              {scenarioAnalysis.map((scenario) => (
                <button
                  key={scenario.scenarioType}
                  onClick={() => setSelectedScenario(scenario.scenarioType)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedScenario === scenario.scenarioType
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1)}
                </button>
              ))}
            </div>

            {selectedScenarioData && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-600">Success Rate</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {Math.round(selectedScenarioData.probability * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Timeline</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedScenarioData.timelineMonths} months
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">Required Monthly</div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${selectedScenarioData.requiredMonthlyContribution.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-2">Key Assumptions</div>
                  <ul className="space-y-1">
                    {selectedScenarioData.assumptions.slice(0, 3).map((assumption, index) => (
                      <li key={index} className="text-xs text-gray-700 flex items-start">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Trend: {probabilityTrend}
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View Recommendations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};