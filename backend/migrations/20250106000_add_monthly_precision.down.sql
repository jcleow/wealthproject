-- Rollback monthly precision support
-- Migration: 20250106000_add_monthly_precision

-- Remove month columns from finance_assets
ALTER TABLE finance_assets
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

-- Remove month columns from finance_liabilities
ALTER TABLE finance_liabilities
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

-- Remove month columns from finance_incomes
ALTER TABLE finance_incomes
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

-- Remove month columns from finance_expenses
ALTER TABLE finance_expenses
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

-- Remove time resolution from user_settings
ALTER TABLE user_settings
  DROP COLUMN IF EXISTS time_resolution;
