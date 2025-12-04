-- Add optional month precision to financial tables for monthly resolution support
-- Migration: 20250106000_add_monthly_precision

-- Add month columns to finance_assets
ALTER TABLE finance_assets
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

COMMENT ON COLUMN finance_assets.start_month IS 'Optional month (1-12) when item starts. NULL defaults to January (1).';
COMMENT ON COLUMN finance_assets.end_month IS 'Optional month (1-12) when item ends. NULL defaults to December (12).';

-- Add month columns to finance_liabilities
ALTER TABLE finance_liabilities
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

COMMENT ON COLUMN finance_liabilities.start_month IS 'Optional month (1-12) when item starts. NULL defaults to January (1).';
COMMENT ON COLUMN finance_liabilities.end_month IS 'Optional month (1-12) when item ends. NULL defaults to December (12).';

-- Add month columns to finance_incomes
ALTER TABLE finance_incomes
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

COMMENT ON COLUMN finance_incomes.start_month IS 'Optional month (1-12) when item starts. NULL defaults to January (1).';
COMMENT ON COLUMN finance_incomes.end_month IS 'Optional month (1-12) when item ends. NULL defaults to December (12).';

-- Add month columns to finance_expenses
ALTER TABLE finance_expenses
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

COMMENT ON COLUMN finance_expenses.start_month IS 'Optional month (1-12) when item starts. NULL defaults to January (1).';
COMMENT ON COLUMN finance_expenses.end_month IS 'Optional month (1-12) when item ends. NULL defaults to December (12).';

-- Add time resolution preference to user_settings
ALTER TABLE user_settings
  ADD COLUMN time_resolution VARCHAR(10) NOT NULL DEFAULT 'yearly'
      CHECK (time_resolution IN ('yearly', 'monthly'));

COMMENT ON COLUMN user_settings.time_resolution IS 'User preference for timeline resolution: yearly (annual snapshots) or monthly (month-by-month detail). Defaults to yearly.';
