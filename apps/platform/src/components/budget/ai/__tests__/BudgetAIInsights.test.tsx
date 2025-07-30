/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { BudgetAIInsights } from '../BudgetAIInsights';
import { GET_BUDGET_AI_INSIGHTS } from '../../../../lib/graphql/ai-queries';

// Mock data
const mockInsightsData = {
  insights: [
    {
      id: '1',
      type: 'recommendation',
      category: 'spending',
      title: 'Reduce Dining Out Spending',
      description: 'Your dining out spending is 25% higher than similar users',
      confidence: 0.85,
      impact: 'medium',
      action: 'Review dining expenses',
      data: {
        spendingChange: 150
      },
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      type: 'anomaly',
      category: 'warning',
      title: 'Unusual Transportation Spending',
      description: 'Transportation costs increased by 40% this month',
      confidence: 0.92,
      impact: 'high',
      action: 'Investigate transportation expenses',
      data: {
        spendingChange: -85
      },
      createdAt: '2024-01-14T15:30:00Z'
    }
  ]
};

const mocks = [
  {
    request: {
      query: GET_BUDGET_AI_INSIGHTS,
      variables: {
        userId: 'test-user-id',
        budgetId: 'test-budget-id',
        categories: ['budget', 'spending', 'optimization']
      }
    },
    result: {
      data: mockInsightsData
    }
  }
];

const defaultProps = {
  userId: 'test-user-id',
  budgetId: 'test-budget-id',
  categories: [
    { id: '1', name: 'Groceries', allocated: 500, spent: 450 },
    { id: '2', name: 'Transportation', allocated: 300, spent: 280 }
  ],
  totalSpent: 730,
  totalAllocated: 800,
  remainingBudget: 70
};

describe('BudgetAIInsights', () => {
  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    expect(screen.getByText('Smart Budget Insights')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading insights')).toBeInTheDocument();
  });

  it('renders insights when data is loaded', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Reduce Dining Out Spending')).toBeInTheDocument();
      expect(screen.getByText('Unusual Transportation Spending')).toBeInTheDocument();
    });

    // Check confidence scores
    expect(screen.getByText('85% confidence')).toBeInTheDocument();
    expect(screen.getByText('92% confidence')).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByText('Review dining expenses')).toBeInTheDocument();
    expect(screen.getByText('Investigate transportation expenses')).toBeInTheDocument();
  });

  it('renders empty state when no insights are available', async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_BUDGET_AI_INSIGHTS,
          variables: {
            userId: 'test-user-id',
            budgetId: 'test-budget-id',
            categories: ['budget', 'spending', 'optimization']
          }
        },
        result: {
          data: { insights: [] }
        }
      }
    ];

    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Your budget looks healthy! No urgent insights at this time.')).toBeInTheDocument();
    });
  });

  it('displays summary statistics correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      // Check anomalies count
      expect(screen.getByText('1')).toBeInTheDocument(); // anomalies detected
      
      // Check recommendations count  
      expect(screen.getByText('1')).toBeInTheDocument(); // recommendations
      
      // Check average confidence
      expect(screen.getByText('89%')).toBeInTheDocument(); // (85% + 92%) / 2 = 88.5% rounded to 89%
    });
  });

  it('handles error states gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_BUDGET_AI_INSIGHTS,
          variables: {
            userId: 'test-user-id',
            budgetId: 'test-budget-id',
            categories: ['budget', 'spending', 'optimization']
          }
        },
        error: new Error('Network error')
      }
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Your budget looks healthy! No urgent insights at this time.')).toBeInTheDocument();
    });
  });

  it('filters insights by confidence threshold', async () => {
    const lowConfidenceMocks = [
      {
        request: {
          query: GET_BUDGET_AI_INSIGHTS,
          variables: {
            userId: 'test-user-id',
            budgetId: 'test-budget-id',
            categories: ['budget', 'spending', 'optimization']
          }
        },
        result: {
          data: {
            insights: [
              {
                id: '1',
                type: 'recommendation',
                category: 'spending',
                title: 'Low Confidence Insight',
                description: 'This insight has low confidence',
                confidence: 0.5, // Below 0.7 threshold
                impact: 'low',
                createdAt: '2024-01-15T10:00:00Z'
              }
            ]
          }
        }
      }
    ];

    render(
      <MockedProvider mocks={lowConfidenceMocks} addTypename={false}>
        <BudgetAIInsights {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      // Should show empty state since low confidence insights are filtered out
      expect(screen.getByText('Your budget looks healthy! No urgent insights at this time.')).toBeInTheDocument();
      expect(screen.queryByText('Low Confidence Insight')).not.toBeInTheDocument();
    });
  });
});