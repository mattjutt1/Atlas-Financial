/**
 * Budget Components Export Index
 *
 * Complete budgeting system for Atlas Financial
 * Includes budget creation, tracking, allocation, and category management
 */

export { BudgetCreationWizard } from './BudgetCreationWizard';
export { BudgetDashboard } from './BudgetDashboard';
export { BudgetCategoryCard } from './BudgetCategoryCard';
export { BudgetProgressChart } from './BudgetProgressChart';
export { BudgetAlerts } from './BudgetAlerts';
export { BudgetAllocationInterface } from './BudgetAllocationInterface';
export { CategoryManagement } from './CategoryManagement';

// Re-export GraphQL operations for convenience
export * from '../../lib/graphql/budget-mutations';
export * from '../../lib/graphql/budget-queries';
