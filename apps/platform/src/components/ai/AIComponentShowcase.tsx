'use client';

/**
 * AI Component Showcase
 * Demonstrates all Wave 2 AI-enhanced components
 * This file shows how to integrate AI components with existing Wave 1 dashboards
 */

import React from 'react';

// Budget AI Components
import { BudgetAIInsights, SpendingAnomalyDetector, PredictiveBudgetAllocation } from '../budget/ai';

// Goals AI Components  
import { GoalAIPredictor, AchievementProbabilityIndicator } from '../goals/ai';

// Portfolio AI Components
import { PortfolioAIInsights, RebalancingRecommendations } from '../portfolio/ai';

// Debt AI Components
import { DebtOptimizationSuggestions, PayoffStrategyComparison } from '../debt/ai';

interface AIComponentShowcaseProps {
  userId: string;
}

export const AIComponentShowcase: React.FC<AIComponentShowcaseProps> = ({ userId }) => {
  // Mock data for demonstration
  const mockBudgetData = {
    budgetId: 'budget-123',
    categories: [
      { id: '1', name: 'Groceries', allocated: 500, spent: 450 },
      { id: '2', name: 'Transportation', allocated: 300, spent: 280 }
    ],
    totalSpent: 730,
    totalAllocated: 800,
    remainingBudget: 70
  };

  const mockGoalData = {
    goalId: 'goal-123',
    goalName: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 3500,
    targetDate: '2024-12-31',
    currentMonthlyContribution: 500
  };

  const mockPortfolioData = {
    portfolioId: 'portfolio-123',
    portfolioName: 'Retirement Portfolio',
    totalValue: 75000
  };

  const mockDebtData = {
    totalDebt: 25000,
    monthlyPaymentCapacity: 800
  };

  const mockRebalancingSuggestions = [
    {
      id: '1',
      assetClass: 'US Stocks',
      currentAllocation: 0.7,
      targetAllocation: 0.6,
      suggestedAction: 'sell' as const,
      amount: -5000,
      reasoning: 'Reduce overweight position in US equities',
      priority: 1,
      confidence: 0.85,
      expectedImpact: 1200,
      riskImpact: 'decrease' as const,
      timeHorizon: 'short_term' as const
    }
  ];

  const mockPayoffStrategies = [
    {
      id: 'avalanche',
      name: 'Debt Avalanche',
      type: 'avalanche' as const,
      monthlyPayment: 800,
      totalPayoffTime: 28,
      totalInterestPaid: 3500,
      totalAmountPaid: 28500,
      description: 'Pay minimums on all debts, focus extra on highest interest rate first',
      pros: ['Saves the most money in interest', 'Mathematically optimal'],
      cons: ['May take longer to see progress', 'Requires discipline'],
      bestFor: ['People motivated by saving money', 'Those with high-interest debt'],
      accounts: [
        {
          id: 'cc1',
          name: 'Credit Card 1',
          balance: 5000,
          interestRate: 0.24,
          minimumPayment: 150,
          recommendedPayment: 450,
          payoffOrder: 1,
          payoffMonth: 12
        }
      ]
    }
  ];

  const mockAchievementData = {
    currentProbability: 0.75,
    probabilityTrend: 'increasing' as const,
    keyFactors: [
      {
        factorName: 'Income Stability',
        impactWeight: 0.9,
        currentStatus: 'good' as const,
        improvementPotential: 0.1
      }
    ],
    scenarioAnalysis: [
      {
        scenarioType: 'realistic' as const,
        probability: 0.75,
        timelineMonths: 24,
        requiredMonthlyContribution: 500,
        assumptions: ['Current income maintained', 'No major expenses']
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wave 2 AI Components Showcase</h1>
        <p className="text-gray-600">AI-enhanced financial insights and recommendations</p>
      </div>

      {/* Budget AI Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Smart Budget Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BudgetAIInsights
            userId={userId}
            budgetId={mockBudgetData.budgetId}
            categories={mockBudgetData.categories}
            totalSpent={mockBudgetData.totalSpent}
            totalAllocated={mockBudgetData.totalAllocated}
            remainingBudget={mockBudgetData.remainingBudget}
          />
          <SpendingAnomalyDetector
            userId={userId}
            budgetId={mockBudgetData.budgetId}
          />
        </div>
        <PredictiveBudgetAllocation
          userId={userId}
          budgetId={mockBudgetData.budgetId}
          categories={mockBudgetData.categories}
          totalIncome={2500}
          totalAllocated={mockBudgetData.totalAllocated}
        />
      </section>

      {/* Goals AI Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Goal Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GoalAIPredictor
              userId={userId}
              goalId={mockGoalData.goalId}
              goalName={mockGoalData.goalName}
              targetAmount={mockGoalData.targetAmount}
              currentAmount={mockGoalData.currentAmount}
              targetDate={mockGoalData.targetDate}
              currentMonthlyContribution={mockGoalData.currentMonthlyContribution}
            />
          </div>
          <AchievementProbabilityIndicator
            goalId={mockGoalData.goalId}
            goalName={mockGoalData.goalName}
            currentProbability={mockAchievementData.currentProbability}
            probabilityTrend={mockAchievementData.probabilityTrend}
            keyFactors={mockAchievementData.keyFactors}
            scenarioAnalysis={mockAchievementData.scenarioAnalysis}
          />
        </div>
      </section>

      {/* Portfolio AI Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Investment AI</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioAIInsights
            userId={userId}
            portfolioId={mockPortfolioData.portfolioId}
            portfolioName={mockPortfolioData.portfolioName}
            totalValue={mockPortfolioData.totalValue}
          />
          <RebalancingRecommendations
            userId={userId}
            portfolioId={mockPortfolioData.portfolioId}
            suggestions={mockRebalancingSuggestions}
            totalPortfolioValue={mockPortfolioData.totalValue}
          />
        </div>
      </section>

      {/* Debt AI Section */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Debt AI Optimization</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DebtOptimizationSuggestions
            userId={userId}
            totalDebt={mockDebtData.totalDebt}
            monthlyPaymentCapacity={mockDebtData.monthlyPaymentCapacity}
          />
          <PayoffStrategyComparison
            strategies={mockPayoffStrategies}
            selectedStrategy="avalanche"
          />
        </div>
      </section>

      {/* Integration Notes */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Integration Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Performance Features</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• <400ms render times for all AI components</li>
              <li>• Polling intervals optimized for each data type</li>
              <li>• Loading states with skeleton animations</li>
              <li>• Error boundaries and graceful degradation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Accessibility</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• WCAG 2.1 AA compliant color contrast</li>
              <li>• Proper ARIA labels and keyboard navigation</li>
              <li>• Screen reader optimized content</li>
              <li>• Focus management for interactive elements</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};