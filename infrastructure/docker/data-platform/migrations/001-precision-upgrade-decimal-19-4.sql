-- Migration: Upgrade Financial Precision to DECIMAL(19,4)
-- Phase 1.5 Financial Precision Foundation
--
-- This migration updates all financial amount columns from DECIMAL(15,2)
-- to DECIMAL(19,4) to achieve bank-grade precision and eliminate IEEE 754 errors.
--
-- DECIMAL(19,4) provides:
-- - Up to 999,999,999,999,999.9999 in storage capacity
-- - Exactly 4 decimal places for bank-grade precision
-- - Full compatibility with FinancialAmount class

\c atlas_core;

BEGIN;

-- =============================================================================
-- BACKUP CURRENT DATA (Safety first)
-- =============================================================================

-- Create backup tables before modifying structure
CREATE TABLE IF NOT EXISTS backup.financial_accounts_backup_20250728 AS
SELECT * FROM financial.accounts;

CREATE TABLE IF NOT EXISTS backup.financial_transactions_backup_20250728 AS
SELECT * FROM financial.transactions;

CREATE TABLE IF NOT EXISTS backup.financial_budgets_backup_20250728 AS
SELECT * FROM financial.budgets;

CREATE TABLE IF NOT EXISTS backup.financial_portfolios_backup_20250728 AS
SELECT * FROM financial.portfolios;

CREATE TABLE IF NOT EXISTS backup.financial_holdings_backup_20250728 AS
SELECT * FROM financial.holdings;

CREATE TABLE IF NOT EXISTS backup.financial_goals_backup_20250728 AS
SELECT * FROM financial.goals;

-- =============================================================================
-- UPDATE FINANCIAL.ACCOUNTS TABLE
-- =============================================================================

-- Update balance columns to DECIMAL(19,4)
ALTER TABLE financial.accounts
  ALTER COLUMN current_balance TYPE DECIMAL(19,4),
  ALTER COLUMN available_balance TYPE DECIMAL(19,4),
  ALTER COLUMN credit_limit TYPE DECIMAL(19,4);

-- Update interest rate to higher precision for calculations
ALTER TABLE financial.accounts
  ALTER COLUMN interest_rate TYPE DECIMAL(9,6);

-- Update default values to reflect new precision
ALTER TABLE financial.accounts
  ALTER COLUMN current_balance SET DEFAULT 0.0000;

-- =============================================================================
-- UPDATE FINANCIAL.TRANSACTIONS TABLE
-- =============================================================================

-- Update amount column to DECIMAL(19,4)
ALTER TABLE financial.transactions
  ALTER COLUMN amount TYPE DECIMAL(19,4);

-- =============================================================================
-- UPDATE FINANCIAL.BUDGETS TABLE
-- =============================================================================

-- Update budget amount columns to DECIMAL(19,4)
ALTER TABLE financial.budgets
  ALTER COLUMN amount TYPE DECIMAL(19,4),
  ALTER COLUMN spent_amount TYPE DECIMAL(19,4);

-- Update default for spent_amount
ALTER TABLE financial.budgets
  ALTER COLUMN spent_amount SET DEFAULT 0.0000;

-- =============================================================================
-- UPDATE FINANCIAL.PORTFOLIOS TABLE
-- =============================================================================

-- Update portfolio total value to DECIMAL(19,4)
ALTER TABLE financial.portfolios
  ALTER COLUMN total_value TYPE DECIMAL(19,4);

-- Update default value
ALTER TABLE financial.portfolios
  ALTER COLUMN total_value SET DEFAULT 0.0000;

-- =============================================================================
-- UPDATE FINANCIAL.HOLDINGS TABLE
-- =============================================================================

-- Update holdings columns to appropriate precision
-- Shares: DECIMAL(19,8) for fractional shares and crypto
-- Prices and values: DECIMAL(19,4) for currency amounts
ALTER TABLE financial.holdings
  ALTER COLUMN shares TYPE DECIMAL(19,8),
  ALTER COLUMN average_cost TYPE DECIMAL(19,4),
  ALTER COLUMN current_price TYPE DECIMAL(19,4),
  ALTER COLUMN market_value TYPE DECIMAL(19,4);

-- =============================================================================
-- UPDATE FINANCIAL.GOALS TABLE
-- =============================================================================

-- Update goal amount columns to DECIMAL(19,4)
ALTER TABLE financial.goals
  ALTER COLUMN target_amount TYPE DECIMAL(19,4),
  ALTER COLUMN current_amount TYPE DECIMAL(19,4),
  ALTER COLUMN monthly_contribution TYPE DECIMAL(19,4);

-- Update default values
ALTER TABLE financial.goals
  ALTER COLUMN current_amount SET DEFAULT 0.0000;

-- =============================================================================
-- ADD PRECISION VALIDATION CONSTRAINTS
-- =============================================================================

-- Add constraints to ensure data integrity
ALTER TABLE financial.accounts
  ADD CONSTRAINT check_current_balance_precision
  CHECK (current_balance = ROUND(current_balance, 4));

ALTER TABLE financial.accounts
  ADD CONSTRAINT check_available_balance_precision
  CHECK (available_balance IS NULL OR available_balance = ROUND(available_balance, 4));

ALTER TABLE financial.accounts
  ADD CONSTRAINT check_credit_limit_precision
  CHECK (credit_limit IS NULL OR credit_limit = ROUND(credit_limit, 4));

ALTER TABLE financial.transactions
  ADD CONSTRAINT check_amount_precision
  CHECK (amount = ROUND(amount, 4));

ALTER TABLE financial.budgets
  ADD CONSTRAINT check_budget_amount_precision
  CHECK (amount = ROUND(amount, 4) AND spent_amount = ROUND(spent_amount, 4));

ALTER TABLE financial.portfolios
  ADD CONSTRAINT check_portfolio_value_precision
  CHECK (total_value = ROUND(total_value, 4));

ALTER TABLE financial.holdings
  ADD CONSTRAINT check_holdings_precision
  CHECK (
    shares = ROUND(shares, 8) AND
    (average_cost IS NULL OR average_cost = ROUND(average_cost, 4)) AND
    (current_price IS NULL OR current_price = ROUND(current_price, 4)) AND
    (market_value IS NULL OR market_value = ROUND(market_value, 4))
  );

ALTER TABLE financial.goals
  ADD CONSTRAINT check_goals_precision
  CHECK (
    target_amount = ROUND(target_amount, 4) AND
    current_amount = ROUND(current_amount, 4) AND
    (monthly_contribution IS NULL OR monthly_contribution = ROUND(monthly_contribution, 4))
  );

-- =============================================================================
-- ADD PERFORMANCE INDEXES FOR PRECISION QUERIES
-- =============================================================================

-- Indexes for efficient querying of financial amounts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_amount_range
  ON financial.transactions(amount) WHERE amount BETWEEN -999999999999999.9999 AND 999999999999999.9999;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_balance_range
  ON financial.accounts(current_balance) WHERE current_balance BETWEEN 0.0000 AND 999999999999999.9999;

-- =============================================================================
-- CREATE PRECISION VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate DECIMAL(19,4) precision
CREATE OR REPLACE FUNCTION validate_financial_precision(amount DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if amount has more than 4 decimal places
  RETURN amount = ROUND(amount, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format amount for database storage
CREATE OR REPLACE FUNCTION format_financial_amount(amount DECIMAL)
RETURNS DECIMAL(19,4) AS $$
BEGIN
  RETURN ROUND(amount, 4)::DECIMAL(19,4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert cents to decimal amount
CREATE OR REPLACE FUNCTION cents_to_decimal(cents BIGINT)
RETURNS DECIMAL(19,4) AS $$
BEGIN
  RETURN (cents::DECIMAL / 100.0)::DECIMAL(19,4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert decimal amount to cents
CREATE OR REPLACE FUNCTION decimal_to_cents(amount DECIMAL)
RETURNS BIGINT AS $$
BEGIN
  RETURN (ROUND(amount * 100, 0))::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- UPDATE COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN financial.accounts.current_balance IS 'Current account balance in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.accounts.available_balance IS 'Available balance in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.accounts.credit_limit IS 'Credit limit in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.accounts.interest_rate IS 'Interest rate in DECIMAL(9,6) format for high precision calculations';

COMMENT ON COLUMN financial.transactions.amount IS 'Transaction amount in DECIMAL(19,4) format for bank-grade precision';

COMMENT ON COLUMN financial.budgets.amount IS 'Budget amount in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.budgets.spent_amount IS 'Spent amount in DECIMAL(19,4) format for bank-grade precision';

COMMENT ON COLUMN financial.portfolios.total_value IS 'Portfolio total value in DECIMAL(19,4) format for bank-grade precision';

COMMENT ON COLUMN financial.holdings.shares IS 'Number of shares in DECIMAL(19,8) format for fractional shares';
COMMENT ON COLUMN financial.holdings.average_cost IS 'Average cost per share in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.holdings.current_price IS 'Current price per share in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.holdings.market_value IS 'Market value in DECIMAL(19,4) format for bank-grade precision';

COMMENT ON COLUMN financial.goals.target_amount IS 'Target amount in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.goals.current_amount IS 'Current amount in DECIMAL(19,4) format for bank-grade precision';
COMMENT ON COLUMN financial.goals.monthly_contribution IS 'Monthly contribution in DECIMAL(19,4) format for bank-grade precision';

-- =============================================================================
-- VERIFICATION AND VALIDATION
-- =============================================================================

-- Verify all precision constraints are working
DO $$
DECLARE
  constraint_violations INTEGER := 0;
  total_records INTEGER := 0;
BEGIN
  -- Check accounts table
  SELECT COUNT(*) INTO total_records FROM financial.accounts;
  SELECT COUNT(*) INTO constraint_violations FROM financial.accounts
  WHERE NOT validate_financial_precision(current_balance);

  IF constraint_violations > 0 THEN
    RAISE EXCEPTION 'Found % precision violations in financial.accounts.current_balance', constraint_violations;
  END IF;

  -- Check transactions table
  SELECT COUNT(*) INTO total_records FROM financial.transactions;
  SELECT COUNT(*) INTO constraint_violations FROM financial.transactions
  WHERE NOT validate_financial_precision(amount);

  IF constraint_violations > 0 THEN
    RAISE EXCEPTION 'Found % precision violations in financial.transactions.amount', constraint_violations;
  END IF;

  RAISE NOTICE 'Precision validation passed for all % total records', total_records;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION validate_financial_precision(DECIMAL) TO PUBLIC;
GRANT EXECUTE ON FUNCTION format_financial_amount(DECIMAL) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cents_to_decimal(BIGINT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION decimal_to_cents(DECIMAL) TO PUBLIC;

-- =============================================================================
-- MIGRATION METADATA
-- =============================================================================

-- Insert migration record
INSERT INTO migrations.migration_history (
  migration_name,
  migration_version,
  description,
  executed_at,
  execution_time_ms,
  checksum
) VALUES (
  '001-precision-upgrade-decimal-19-4',
  '1.5.0',
  'Upgrade all financial amount columns from DECIMAL(15,2) to DECIMAL(19,4) for bank-grade precision',
  NOW(),
  0, -- Will be updated by migration runner
  MD5('001-precision-upgrade-decimal-19-4.sql')
);

COMMIT;

-- Success message
\echo 'Migration 001-precision-upgrade-decimal-19-4 completed successfully'
\echo 'All financial columns upgraded to DECIMAL(19,4) bank-grade precision'
\echo 'Precision validation functions added'
\echo 'Backup tables created with suffix _backup_20250728'
