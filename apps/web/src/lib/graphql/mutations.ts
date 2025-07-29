import { gql } from '@apollo/client'
import {
  ACCOUNT_BASIC_FIELDS,
  TRANSACTION_BASIC_FIELDS,
  USER_BASIC_FIELDS,
  FINANCIAL_GOAL_BASIC_FIELDS,
  FINANCIAL_GOAL_WITH_DETAILS,
  GOAL_MILESTONE_FIELDS,
  GOAL_CONTRIBUTION_FIELDS,
  GOAL_ALLOCATION_FIELDS,
  GOAL_INSIGHT_FIELDS
} from './fragments'

// Account Mutations
export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($input: accounts_insert_input!) {
    insert_accounts_one(object: $input) {
      ...AccountBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($id: uuid!, $input: accounts_set_input!) {
    update_accounts_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...AccountBasicFields
    }
  }
  ${ACCOUNT_BASIC_FIELDS}
`

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: uuid!) {
    delete_accounts_by_pk(id: $id) {
      id
    }
  }
`

// Transaction Mutations
export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: transactions_insert_input!) {
    insert_transactions_one(object: $input) {
      ...TransactionBasicFields
      account_id
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($id: uuid!, $input: transactions_set_input!) {
    update_transactions_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...TransactionBasicFields
    }
  }
  ${TRANSACTION_BASIC_FIELDS}
`

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: uuid!) {
    delete_transactions_by_pk(id: $id) {
      id
    }
  }
`

export const BULK_CREATE_TRANSACTIONS = gql`
  mutation BulkCreateTransactions($transactions: [transactions_insert_input!]!) {
    insert_transactions(objects: $transactions) {
      affected_rows
      returning {
        ...TransactionBasicFields
      }
    }
  }
`


// Financial Goal Mutations
export const CREATE_FINANCIAL_GOAL = gql`
  mutation CreateFinancialGoal($input: financial_goals_insert_input!) {
    insert_financial_goals_one(object: $input) {
      ...FinancialGoalBasicFields
    }
  }
  ${FINANCIAL_GOAL_BASIC_FIELDS}
`

export const UPDATE_FINANCIAL_GOAL = gql`
  mutation UpdateFinancialGoal($id: uuid!, $input: financial_goals_set_input!) {
    update_financial_goals_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...FinancialGoalBasicFields
    }
  }
  ${FINANCIAL_GOAL_BASIC_FIELDS}
`

export const DELETE_FINANCIAL_GOAL = gql`
  mutation DeleteFinancialGoal($id: uuid!) {
    delete_financial_goals_by_pk(id: $id) {
      id
    }
  }
`

export const ARCHIVE_FINANCIAL_GOAL = gql`
  mutation ArchiveFinancialGoal($id: uuid!) {
    update_financial_goals_by_pk(pk_columns: { id: $id }, _set: { is_active: false }) {
      id
      is_active
    }
  }
`

// Goal Milestone Mutations
export const CREATE_GOAL_MILESTONE = gql`
  mutation CreateGoalMilestone($input: goal_milestones_insert_input!) {
    insert_goal_milestones_one(object: $input) {
      ...GoalMilestoneFields
    }
  }
  ${GOAL_MILESTONE_FIELDS}
`

export const UPDATE_GOAL_MILESTONE = gql`
  mutation UpdateGoalMilestone($id: uuid!, $input: goal_milestones_set_input!) {
    update_goal_milestones_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...GoalMilestoneFields
    }
  }
  ${GOAL_MILESTONE_FIELDS}
`

export const ACHIEVE_GOAL_MILESTONE = gql`
  mutation AchieveGoalMilestone($id: uuid!, $achievedDate: timestamptz!) {
    update_goal_milestones_by_pk(
      pk_columns: { id: $id },
      _set: { is_achieved: true, achieved_date: $achievedDate }
    ) {
      ...GoalMilestoneFields
    }
  }
  ${GOAL_MILESTONE_FIELDS}
`

export const DELETE_GOAL_MILESTONE = gql`
  mutation DeleteGoalMilestone($id: uuid!) {
    delete_goal_milestones_by_pk(id: $id) {
      id
    }
  }
`

// Goal Contribution Mutations
export const CREATE_GOAL_CONTRIBUTION = gql`
  mutation CreateGoalContribution($input: goal_contributions_insert_input!) {
    insert_goal_contributions_one(object: $input) {
      ...GoalContributionFields
    }
  }
  ${GOAL_CONTRIBUTION_FIELDS}
`

export const UPDATE_GOAL_CONTRIBUTION = gql`
  mutation UpdateGoalContribution($id: uuid!, $input: goal_contributions_set_input!) {
    update_goal_contributions_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...GoalContributionFields
    }
  }
  ${GOAL_CONTRIBUTION_FIELDS}
`

export const DELETE_GOAL_CONTRIBUTION = gql`
  mutation DeleteGoalContribution($id: uuid!) {
    delete_goal_contributions_by_pk(id: $id) {
      id
    }
  }
`

export const BULK_CREATE_GOAL_CONTRIBUTIONS = gql`
  mutation BulkCreateGoalContributions($contributions: [goal_contributions_insert_input!]!) {
    insert_goal_contributions(objects: $contributions) {
      affected_rows
      returning {
        ...GoalContributionFields
      }
    }
  }
  ${GOAL_CONTRIBUTION_FIELDS}
`

// Goal Allocation Mutations
export const CREATE_GOAL_ALLOCATION = gql`
  mutation CreateGoalAllocation($input: goal_allocations_insert_input!) {
    insert_goal_allocations_one(object: $input) {
      ...GoalAllocationFields
    }
  }
  ${GOAL_ALLOCATION_FIELDS}
`

export const UPDATE_GOAL_ALLOCATION = gql`
  mutation UpdateGoalAllocation($id: uuid!, $input: goal_allocations_set_input!) {
    update_goal_allocations_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...GoalAllocationFields
    }
  }
  ${GOAL_ALLOCATION_FIELDS}
`

export const DELETE_GOAL_ALLOCATION = gql`
  mutation DeleteGoalAllocation($id: uuid!) {
    delete_goal_allocations_by_pk(id: $id) {
      id
    }
  }
`

export const TOGGLE_GOAL_ALLOCATION = gql`
  mutation ToggleGoalAllocation($id: uuid!, $isActive: Boolean!) {
    update_goal_allocations_by_pk(pk_columns: { id: $id }, _set: { is_active: $isActive }) {
      id
      is_active
    }
  }
`

// Goal Insight Mutations
export const CREATE_GOAL_INSIGHT = gql`
  mutation CreateGoalInsight($input: goal_insights_insert_input!) {
    insert_goal_insights_one(object: $input) {
      ...GoalInsightFields
    }
  }
  ${GOAL_INSIGHT_FIELDS}
`

export const DISMISS_GOAL_INSIGHT = gql`
  mutation DismissGoalInsight($id: uuid!) {
    update_goal_insights_by_pk(pk_columns: { id: $id }, _set: { is_dismissed: true }) {
      id
      is_dismissed
    }
  }
`

export const BULK_DISMISS_GOAL_INSIGHTS = gql`
  mutation BulkDismissGoalInsights($insightIds: [uuid!]!) {
    update_goal_insights(where: { id: { _in: $insightIds } }, _set: { is_dismissed: true }) {
      affected_rows
    }
  }
`

// Batch Goal Operations
export const BULK_UPDATE_GOAL_PRIORITIES = gql`
  mutation BulkUpdateGoalPriorities($updates: [goal_priority_update!]!) {
    update_goal_priorities(updates: $updates) {
      affected_rows
    }
  }
`

export const PROCESS_GOAL_ALLOCATION = gql`
  mutation ProcessGoalAllocation($allocationId: uuid!, $amount: numeric!, $contributionDate: date!) {
    processGoalAllocation(allocation_id: $allocationId, amount: $amount, contribution_date: $contributionDate) {
      success
      contribution_id
      updated_goal_amount
      message
    }
  }
`
