/**
 * Budget-specific GraphQL Queries
 * Complete set of queries for budget management system
 */

import { gql } from '@apollo/client';
import {
  BUDGET_WITH_CATEGORIES,
  BUDGET_BASIC_FIELDS
} from '@atlas/shared/graphql/fragments';

// Budget Queries
export const GET_USER_BUDGETS = gql`
  query GetUserBudgets($userId: uuid!) {
    budgets(
      where: { user_id: { _eq: $userId } },
      order_by: { created_at: desc }
    ) {
      ...BudgetWithCategories
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`;

export const GET_CURRENT_BUDGET = gql`
  query GetCurrentBudget($userId: uuid!) {
    budgets(
      where: {
        user_id: { _eq: $userId },
        start_date: { _lte: "now()" },
        end_date: { _gte: "now()" },
        is_active: { _eq: true }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...BudgetWithCategories
      spending_analysis: categories {
        id
        name
        type
        allocated_amount
        spent_amount
        remaining_amount
        percentage_used
        transactions_aggregate {
          aggregate {
            count
            sum {
              amount
            }
          }
        }
      }
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`;

export const GET_BUDGET_DETAILS = gql`
  query GetBudgetDetails($budgetId: uuid!) {
    budgets_by_pk(id: $budgetId) {
      ...BudgetWithCategories
      categories {
        id
        name
        type
        allocated_amount
        spent_amount
        remaining_amount
        percentage_used
        transactions(
          order_by: { date: desc },
          limit: 10
        ) {
          id
          amount
          description
          date
          category
        }
      }
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`;

export const GET_BUDGET_OVERVIEW = gql`
  query GetBudgetOverview($userId: uuid!, $startDate: date!, $endDate: date!) {
    # Current budget summary
    budgets_aggregate(
      where: {
        user_id: { _eq: $userId },
        start_date: { _lte: $endDate },
        end_date: { _gte: $startDate },
        is_active: { _eq: true }
      }
    ) {
      aggregate {
        sum {
          total_income
          total_expenses
          total_allocated
          remaining_balance
        }
      }
    }

    # Category spending breakdown
    budget_categories(
      where: {
        budget: {
          user_id: { _eq: $userId },
          start_date: { _lte: $endDate },
          end_date: { _gte: $startDate },
          is_active: { _eq: true }
        }
      }
      order_by: { allocated_amount: desc }
    ) {
      id
      name
      type
      allocated_amount
      spent_amount
      remaining_amount
      percentage_used
    }

    # Recent transactions affecting budget
    transactions(
      where: {
        account: { user_id: { _eq: $userId } },
        date: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { date: desc }
      limit: 20
    ) {
      id
      amount
      description
      date
      category
      account {
        name
      }
    }
  }
`;

export const GET_BUDGET_ALERTS = gql`
  query GetBudgetAlerts($userId: uuid!) {
    budget_alerts(
      where: {
        budget: { user_id: { _eq: $userId } },
        is_active: { _eq: true }
      }
      order_by: { created_at: desc }
    ) {
      id
      budget_id
      category_id
      alert_type
      threshold_percentage
      current_percentage
      is_triggered
      message
      created_at
      budget {
        name
      }
      category {
        name
      }
    }
  }
`;

export const GET_BUDGET_CATEGORIES = gql`
  query GetBudgetCategories($budgetId: uuid!) {
    budget_categories(
      where: { budget_id: { _eq: $budgetId } },
      order_by: { allocated_amount: desc }
    ) {
      id
      name
      type
      allocated_amount
      spent_amount
      remaining_amount
      percentage_used
      category {
        id
        name
        color
        icon
      }
    }
  }
`;

export const GET_USER_CATEGORIES = gql`
  query GetUserCategories($userId: uuid!) {
    categories(
      where: { user_id: { _eq: $userId } },
      order_by: { name: asc }
    ) {
      id
      name
      parent_category_id
      color
      icon
      is_income
      is_transfer
      created_at
      parent_category {
        id
        name
      }
    }
  }
`;

export const GET_SPENDING_BY_CATEGORY = gql`
  query GetSpendingByCategory(
    $userId: uuid!,
    $startDate: date!,
    $endDate: date!,
    $categoryIds: [uuid!]
  ) {
    spending_by_category: transactions_aggregate(
      where: {
        account: { user_id: { _eq: $userId } },
        date: { _gte: $startDate, _lte: $endDate },
        category_id: { _in: $categoryIds }
      }
    ) {
      aggregate {
        sum {
          amount
        }
        count
      }
    }

    transactions(
      where: {
        account: { user_id: { _eq: $userId } },
        date: { _gte: $startDate, _lte: $endDate },
        category_id: { _in: $categoryIds }
      }
      order_by: { date: desc }
    ) {
      id
      amount
      description
      date
      category
      category_id
    }
  }
`;

export const GET_BUDGET_PERFORMANCE = gql`
  query GetBudgetPerformance($userId: uuid!, $months: Int = 6) {
    budget_performance: budgets(
      where: {
        user_id: { _eq: $userId },
        start_date: { _gte: "now() - interval '${months} months'" }
      }
      order_by: { start_date: desc }
    ) {
      id
      name
      period_type
      start_date
      end_date
      total_income
      total_expenses
      total_allocated
      remaining_balance
      categories_aggregate {
        aggregate {
          count
          avg {
            percentage_used
          }
        }
      }
    }
  }
`;

// Search and filtering
export const SEARCH_BUDGET_TRANSACTIONS = gql`
  query SearchBudgetTransactions(
    $userId: uuid!,
    $budgetId: uuid!,
    $searchTerm: String!,
    $limit: Int = 20
  ) {
    transactions(
      where: {
        account: { user_id: { _eq: $userId } },
        budget_categories: { budget_id: { _eq: $budgetId } },
        _or: [
          { description: { _ilike: $searchTerm } },
          { category: { _ilike: $searchTerm } }
        ]
      }
      order_by: { date: desc }
      limit: $limit
    ) {
      id
      amount
      description
      date
      category
      account {
        name
      }
    }
  }
`;
