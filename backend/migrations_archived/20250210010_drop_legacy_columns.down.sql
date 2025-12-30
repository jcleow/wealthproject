-- Rollback: Re-add legacy year/month columns and populate from dates
-- WARNING: This recreates the old schema but data may be slightly different due to:
-- - Day-level precision being reduced back to month-level
-- - Potential data modifications between migration and rollback

-- ========================================
-- Re-add year/month columns to finance_assets
-- ========================================

ALTER TABLE finance_assets
  ADD COLUMN IF NOT EXISTS start_year INT,
  ADD COLUMN IF NOT EXISTS end_year INT,
  ADD COLUMN IF NOT EXISTS start_month SMALLINT CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS end_month SMALLINT CHECK (end_month BETWEEN 1 AND 12);

-- Populate from dates
UPDATE finance_assets
SET
    start_year = EXTRACT(YEAR FROM start_date),
    start_month = EXTRACT(MONTH FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE finance_assets
SET
    end_year = EXTRACT(YEAR FROM end_date),
    end_month = EXTRACT(MONTH FROM end_date)
WHERE end_date IS NOT NULL;

-- ========================================
-- Re-add year/month columns to finance_liabilities
-- ========================================

ALTER TABLE finance_liabilities
  ADD COLUMN IF NOT EXISTS start_year INT,
  ADD COLUMN IF NOT EXISTS end_year INT,
  ADD COLUMN IF NOT EXISTS start_month SMALLINT CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS end_month SMALLINT CHECK (end_month BETWEEN 1 AND 12);

UPDATE finance_liabilities
SET
    start_year = EXTRACT(YEAR FROM start_date),
    start_month = EXTRACT(MONTH FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE finance_liabilities
SET
    end_year = EXTRACT(YEAR FROM end_date),
    end_month = EXTRACT(MONTH FROM end_date)
WHERE end_date IS NOT NULL;

-- ========================================
-- Re-add year/month columns to finance_incomes
-- ========================================

ALTER TABLE finance_incomes
  ADD COLUMN IF NOT EXISTS start_year INT,
  ADD COLUMN IF NOT EXISTS end_year INT,
  ADD COLUMN IF NOT EXISTS start_month SMALLINT CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS end_month SMALLINT CHECK (end_month BETWEEN 1 AND 12);

UPDATE finance_incomes
SET
    start_year = EXTRACT(YEAR FROM start_date),
    start_month = EXTRACT(MONTH FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE finance_incomes
SET
    end_year = EXTRACT(YEAR FROM end_date),
    end_month = EXTRACT(MONTH FROM end_date)
WHERE end_date IS NOT NULL;

-- ========================================
-- Re-add year/month columns to finance_expenses
-- ========================================

ALTER TABLE finance_expenses
  ADD COLUMN IF NOT EXISTS start_year INT,
  ADD COLUMN IF NOT EXISTS end_year INT,
  ADD COLUMN IF NOT EXISTS start_month SMALLINT CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS end_month SMALLINT CHECK (end_month BETWEEN 1 AND 12);

UPDATE finance_expenses
SET
    start_year = EXTRACT(YEAR FROM start_date),
    start_month = EXTRACT(MONTH FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE finance_expenses
SET
    end_year = EXTRACT(YEAR FROM end_date),
    end_month = EXTRACT(MONTH FROM end_date)
WHERE end_date IS NOT NULL;

-- ========================================
-- Re-add year columns to cash_accounts (no month columns)
-- ========================================

ALTER TABLE cash_accounts
  ADD COLUMN IF NOT EXISTS start_year INT,
  ADD COLUMN IF NOT EXISTS end_year INT;

UPDATE cash_accounts
SET start_year = EXTRACT(YEAR FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE cash_accounts
SET end_year = EXTRACT(YEAR FROM end_date)
WHERE end_date IS NOT NULL;

-- ========================================
-- Remove NOT NULL constraint from start_date
-- ========================================

ALTER TABLE finance_assets ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE finance_liabilities ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE finance_incomes ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE finance_expenses ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE cash_accounts ALTER COLUMN start_date DROP NOT NULL;

RAISE NOTICE 'Legacy year/month columns restored from date columns';
RAISE WARNING 'Day-level precision has been lost in this rollback - only year/month remain';
