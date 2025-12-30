-- Migration: Update unique constraints from (parent_id, start_year) to (parent_id, start_date)
-- This enables effective dating with day-level precision
-- Part 4 of 5: Constraint updates

-- ========================================
-- finance_assets
-- ========================================

-- Drop old year-based constraint/index
DROP INDEX IF EXISTS finance_assets_parent_start_year_idx;

-- Create new date-based unique constraint
-- Partial index (WHERE start_date IS NOT NULL) allows rows without dates during migration
CREATE UNIQUE INDEX finance_assets_parent_start_date_idx
  ON finance_assets (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_assets_parent_start_date_idx IS 'Ensures effective dating: one override per parent per start date. Enables day-level precision for financial item changes.';

-- ========================================
-- finance_liabilities
-- ========================================

DROP INDEX IF EXISTS finance_liabilities_parent_start_year_idx;

CREATE UNIQUE INDEX finance_liabilities_parent_start_date_idx
  ON finance_liabilities (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_liabilities_parent_start_date_idx IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_incomes
-- ========================================

DROP INDEX IF EXISTS finance_incomes_parent_start_year_idx;

CREATE UNIQUE INDEX finance_incomes_parent_start_date_idx
  ON finance_incomes (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_incomes_parent_start_date_idx IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_expenses
-- ========================================

DROP INDEX IF EXISTS finance_expenses_parent_start_year_idx;

CREATE UNIQUE INDEX finance_expenses_parent_start_date_idx
  ON finance_expenses (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_expenses_parent_start_date_idx IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- Validation
-- ========================================

-- Check for any constraint violations before enforcing
DO $$
DECLARE
    duplicates_assets INT;
    duplicates_liabilities INT;
    duplicates_incomes INT;
    duplicates_expenses INT;
BEGIN
    -- Check for duplicate (parent_id, start_date) combinations
    SELECT COUNT(*) INTO duplicates_assets
    FROM (
        SELECT parent_id, start_date, COUNT(*)
        FROM finance_assets
        WHERE start_date IS NOT NULL
        GROUP BY parent_id, start_date
        HAVING COUNT(*) > 1
    ) dup;

    SELECT COUNT(*) INTO duplicates_liabilities
    FROM (
        SELECT parent_id, start_date, COUNT(*)
        FROM finance_liabilities
        WHERE start_date IS NOT NULL
        GROUP BY parent_id, start_date
        HAVING COUNT(*) > 1
    ) dup;

    SELECT COUNT(*) INTO duplicates_incomes
    FROM (
        SELECT parent_id, start_date, COUNT(*)
        FROM finance_incomes
        WHERE start_date IS NOT NULL
        GROUP BY parent_id, start_date
        HAVING COUNT(*) > 1
    ) dup;

    SELECT COUNT(*) INTO duplicates_expenses
    FROM (
        SELECT parent_id, start_date, COUNT(*)
        FROM finance_expenses
        WHERE start_date IS NOT NULL
        GROUP BY parent_id, start_date
        HAVING COUNT(*) > 1
    ) dup;

    IF duplicates_assets > 0 OR duplicates_liabilities > 0 OR duplicates_incomes > 0 OR duplicates_expenses > 0 THEN
        RAISE WARNING 'Found duplicate (parent_id, start_date) combinations:';
        RAISE WARNING '  - Assets: %', duplicates_assets;
        RAISE WARNING '  - Liabilities: %', duplicates_liabilities;
        RAISE WARNING '  - Incomes: %', duplicates_incomes;
        RAISE WARNING '  - Expenses: %', duplicates_expenses;
        RAISE EXCEPTION 'Cannot enforce unique constraint with duplicate data. Clean up duplicates first.';
    ELSE
        RAISE NOTICE 'Constraint migration completed successfully - no duplicate (parent_id, start_date) combinations found';
    END IF;
END $$;
