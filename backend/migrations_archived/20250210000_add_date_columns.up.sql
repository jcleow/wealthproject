-- Migration: Add start_date and end_date TIMESTAMPTZ columns to all financial tables
-- This enables day-level precision (e.g., "March 15, 2025") instead of just month-level
-- Part 1 of 5: Add columns (nullable initially for safe migration)
-- IDEMPOTENT: Uses IF NOT EXISTS to allow safe re-runs

-- Add date columns to finance_assets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_assets' AND column_name = 'start_date') THEN
    ALTER TABLE finance_assets ADD COLUMN start_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_assets.start_date IS 'Precise start date with day-level granularity. Replaces start_year + start_month. Stored in UTC.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_assets' AND column_name = 'end_date') THEN
    ALTER TABLE finance_assets ADD COLUMN end_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_assets.end_date IS 'Precise end date with day-level granularity. NULL means ongoing. Replaces end_year + end_month. Stored in UTC.';
  END IF;
END $$;

-- Add date columns to finance_liabilities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_liabilities' AND column_name = 'start_date') THEN
    ALTER TABLE finance_liabilities ADD COLUMN start_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_liabilities.start_date IS 'Precise start date with day-level granularity. Replaces start_year + start_month. Stored in UTC.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_liabilities' AND column_name = 'end_date') THEN
    ALTER TABLE finance_liabilities ADD COLUMN end_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_liabilities.end_date IS 'Precise end date with day-level granularity. NULL means ongoing. Replaces end_year + end_month. Stored in UTC.';
  END IF;
END $$;

-- Add date columns to finance_incomes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_incomes' AND column_name = 'start_date') THEN
    ALTER TABLE finance_incomes ADD COLUMN start_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_incomes.start_date IS 'Precise start date with day-level granularity. Replaces start_year + start_month. Stored in UTC.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_incomes' AND column_name = 'end_date') THEN
    ALTER TABLE finance_incomes ADD COLUMN end_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_incomes.end_date IS 'Precise end date with day-level granularity. NULL means ongoing. Stored in UTC.';
  END IF;
END $$;

-- Add date columns to finance_expenses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_expenses' AND column_name = 'start_date') THEN
    ALTER TABLE finance_expenses ADD COLUMN start_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_expenses.start_date IS 'Precise start date with day-level granularity. Replaces start_year + start_month. Stored in UTC.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_expenses' AND column_name = 'end_date') THEN
    ALTER TABLE finance_expenses ADD COLUMN end_date TIMESTAMPTZ;
    COMMENT ON COLUMN finance_expenses.end_date IS 'Precise end date with day-level granularity. NULL means ongoing. Stored in UTC.';
  END IF;
END $$;

-- Add date columns to cash_accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_accounts' AND column_name = 'start_date') THEN
    ALTER TABLE cash_accounts ADD COLUMN start_date TIMESTAMPTZ;
    COMMENT ON COLUMN cash_accounts.start_date IS 'Precise start date with day-level granularity. Replaces start_year. Stored in UTC.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_accounts' AND column_name = 'end_date') THEN
    ALTER TABLE cash_accounts ADD COLUMN end_date TIMESTAMPTZ;
    COMMENT ON COLUMN cash_accounts.end_date IS 'Precise end date with day-level granularity. NULL means ongoing. Replaces end_year. Stored in UTC.';
  END IF;
END $$;
