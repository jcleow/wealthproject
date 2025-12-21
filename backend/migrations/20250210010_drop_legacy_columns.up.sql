-- Migration: Drop legacy year/month columns after validating date migration
-- WARNING: This is a DESTRUCTIVE operation. Run ONLY after:
-- 1. Validating 100% data conversion accuracy
-- 2. Updating all application code to use start_date/end_date
-- 3. Testing in staging environment
-- 4. Having recent database backups
-- Cleanup phase: Remove old schema

-- ========================================
-- Validation before cleanup
-- ========================================

DO $$
DECLARE
    rows_without_dates INT := 0;
    total_rows INT := 0;
BEGIN
    -- Check that all rows have been migrated to dates
    SELECT COUNT(*) INTO rows_without_dates
    FROM (
        SELECT 'assets' as tbl FROM finance_assets WHERE start_year IS NOT NULL AND start_date IS NULL
        UNION ALL
        SELECT 'liabilities' FROM finance_liabilities WHERE start_year IS NOT NULL AND start_date IS NULL
        UNION ALL
        SELECT 'incomes' FROM finance_incomes WHERE start_year IS NOT NULL AND start_date IS NULL
        UNION ALL
        SELECT 'expenses' FROM finance_expenses WHERE start_year IS NOT NULL AND start_date IS NULL
        UNION ALL
        SELECT 'cash' FROM cash_accounts WHERE start_year IS NOT NULL AND start_date IS NULL
    ) missing;

    SELECT
        (SELECT COUNT(*) FROM finance_assets) +
        (SELECT COUNT(*) FROM finance_liabilities) +
        (SELECT COUNT(*) FROM finance_incomes) +
        (SELECT COUNT(*) FROM finance_expenses) +
        (SELECT COUNT(*) FROM cash_accounts)
    INTO total_rows;

    IF rows_without_dates > 0 THEN
        RAISE EXCEPTION 'Cannot drop legacy columns: % rows have not been migrated to dates. Run migration 20250210001_migrate_dates.up.sql first.', rows_without_dates;
    END IF;

    RAISE NOTICE 'Validation passed: All % rows have been migrated to dates', total_rows;
END $$;

-- ========================================
-- Make start_date required (NOT NULL)
-- ========================================

ALTER TABLE finance_assets ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE finance_liabilities ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE finance_incomes ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE finance_expenses ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE cash_accounts ALTER COLUMN start_date SET NOT NULL;

DO $$
BEGIN
    RAISE NOTICE 'start_date columns are now NOT NULL';
END $$;

-- ========================================
-- Drop legacy year/month columns
-- ========================================

ALTER TABLE finance_assets
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

ALTER TABLE finance_liabilities
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

ALTER TABLE finance_incomes
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

ALTER TABLE finance_expenses
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS start_month,
  DROP COLUMN IF EXISTS end_month;

-- cash_accounts doesn't have month columns
ALTER TABLE cash_accounts
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year;

-- ========================================
-- Final report
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Legacy column cleanup completed successfully';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Dropped columns:';
    RAISE NOTICE '  - start_year, end_year, start_month, end_month';
    RAISE NOTICE '  ';
    RAISE NOTICE 'All financial tables now use TIMESTAMPTZ columns:';
    RAISE NOTICE '  - start_date (NOT NULL)';
    RAISE NOTICE '  - end_date (nullable for ongoing items)';
    RAISE NOTICE '  ';
    RAISE NOTICE 'Migration to day-level precision is complete!';
    RAISE NOTICE '=====================================================';
END $$;
