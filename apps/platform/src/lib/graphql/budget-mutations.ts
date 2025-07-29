/**
 * Budget-specific GraphQL Mutations
 * Complete set of mutations for budget management system
 */

import { gql } from '@apollo/client';
import {
  BUDGET_WITH_CATEGORIES,
  BUDGET_BASIC_FIELDS
} from '@atlas/shared/graphql/fragments';

// Budget Mutations
export const CREATE_BUDGET = gql`
  mutation CreateBudget($input: budgets_insert_input!) {
    insert_budgets_one(object: $input) {
      ...BudgetWithCategories
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`;

export const UPDATE_BUDGET = gql`
  mutation UpdateBudget($id: uuid!, $input: budgets_set_input!) {
    update_budgets_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...BudgetWithCategories
    }
  }
  ${BUDGET_WITH_CATEGORIES}
`;

export const DELETE_BUDGET = gql`
  mutation DeleteBudget($id: uuid!) {
    delete_budgets_by_pk(id: $id) {
      id
    }
  }
`;

export const CREATE_BUDGET_CATEGORY = gql`
  mutation CreateBudgetCategory($input: budget_categories_insert_input!) {
    insert_budget_categories_one(object: $input) {
      id
      name
      type
      allocated_amount
      spent_amount
      remaining_amount
      percentage_used
      created_at
    }
  }
`;

export const UPDATE_BUDGET_CATEGORY = gql`
  mutation UpdateBudgetCategory($id: uuid!, $input: budget_categories_set_input!) {
    update_budget_categories_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      name
      type
      allocated_amount
      spent_amount
      remaining_amount
      percentage_used
      updated_at
    }
  }
`;

export const DELETE_BUDGET_CATEGORY = gql`
  mutation DeleteBudgetCategory($id: uuid!) {
    delete_budget_categories_by_pk(id: $id) {
      id
    }
  }
`;

export const BULK_UPDATE_BUDGET_ALLOCATIONS = gql`
  mutation BulkUpdateBudgetAllocations($updates: [budget_categories_updates!]!) {
    update_budget_categories_many(updates: $updates) {
      affected_rows
      returning {
        id
        name
        allocated_amount
        updated_at
      }
    }
  }
`;

export const CREATE_CUSTOM_CATEGORY = gql`
  mutation CreateCustomCategory($input: categories_insert_input!) {
    insert_categories_one(object: $input) {
      id
      user_id
      name
      parent_category_id
      color
      icon
      is_income
      is_transfer
      created_at
    }
  }
`;

export const UPDATE_CUSTOM_CATEGORY = gql`
  mutation UpdateCustomCategory($id: uuid!, $input: categories_set_input!) {
    update_categories_by_pk(pk_columns: { id: $id }, _set: $input) {
      id
      name
      color
      icon
      updated_at
    }
  }
`;

export const DELETE_CUSTOM_CATEGORY = gql`
  mutation DeleteCustomCategory($id: uuid!) {
    delete_categories_by_pk(id: $id) {
      id
    }
  }
`;

// Budget tracking and spending updates
export const UPDATE_BUDGET_SPENDING = gql`
  mutation UpdateBudgetSpending($budgetId: uuid!, $categoryId: uuid!, $amount: numeric!) {
    update_budget_categories(
      where: {
        budget_id: { _eq: $budgetId },
        category_id: { _eq: $categoryId }
      },
      _inc: { spent_amount: $amount }
    ) {
      affected_rows
      returning {
        id
        spent_amount
        remaining_amount
        percentage_used
      }
    }
  }
`;

// Budget alerts and notifications
export const CREATE_BUDGET_ALERT = gql`
  mutation CreateBudgetAlert($input: budget_alerts_insert_input!) {
    insert_budget_alerts_one(object: $input) {
      id
      budget_id
      alert_type
      threshold_percentage
      is_active
      created_at
    }
  }
`;

export const UPDATE_BUDGET_ALERT_STATUS = gql`
  mutation UpdateBudgetAlertStatus($id: uuid!, $isActive: Boolean!) {
    update_budget_alerts_by_pk(
      pk_columns: { id: $id },
      _set: { is_active: $isActive }
    ) {
      id
      is_active
      updated_at
    }
  }
`;
