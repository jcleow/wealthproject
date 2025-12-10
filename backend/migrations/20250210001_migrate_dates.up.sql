-- Migration: Populate start_date and end_date from existing year/month columns
-- Converts absolute year integers (2025, 2026) and month integers (1-12) to TIMESTAMPTZ
-- Part 2 of 5: Data migration

-- Helper function to get the last day of a given month
-- Handles varying month lengths and leap years correctly
CREATE OR REPLACE FUNCTION get_last_day_of_month(y INT, m INT) RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(y, m, 1)) + INTERVAL '1 month - 1 day'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- Migrate finance_assets
-- ========================================

-- Populate start_date (first day of month, midnight UTC)
UPDATE finance_assets
SET start_date = make_timestamptz(
  start_year,
  COALESCE(start_month, 1),  -- Default to January if NULL
  1,                          -- First day of month
  0, 0, 0,                    -- Midnight
  'UTC'
)
WHERE start_year IS NOT NULL
  AND start_date IS NULL;

-- Populate end_date (last day of month, 23:59:59 UTC)
UPDATE finance_assets
SET end_date = make_timestamptz(
  end_year,
  COALESCE(end_month, 12),                              -- Default to December if NULL
  get_last_day_of_month(end_year, COALESCE(end_month, 12)),  -- Last day of month
  23, 59, 59,                                           -- End of day
  'UTC'
)
WHERE end_year IS NOT NULL
  AND end_date IS NULL;

-- ========================================
-- Migrate finance_liabilities
-- ========================================

UPDATE finance_liabilities
SET start_date = make_timestamptz(
  start_year,
  COALESCE(start_month, 1),
  1,
  0, 0, 0,
  'UTC'
)
WHERE start_year IS NOT NULL
  AND start_date IS NULL;

UPDATE finance_liabilities
SET end_date = make_timestamptz(
  end_year,
  COALESCE(end_month, 12),
  get_last_day_of_month(end_year, COALESCE(end_month, 12)),
  23, 59, 59,
  'UTC'
)
WHERE end_year IS NOT NULL
  AND end_date IS NULL;

-- ========================================
-- Migrate finance_incomes
-- ========================================

UPDATE finance_incomes
SET start_date = make_timestamptz(
  start_year,
  COALESCE(start_month, 1),
  1,
  0, 0, 0,
  'UTC'
)
WHERE start_year IS NOT NULL
  AND start_date IS NULL;

UPDATE finance_incomes
SET end_date = make_timestamptz(
  end_year,
  COALESCE(end_month, 12),
  get_last_day_of_month(end_year, COALESCE(end_month, 12)),
  23, 59, 59,
  'UTC'
)
WHERE end_year IS NOT NULL
  AND end_date IS NULL;

-- ========================================
-- Migrate finance_expenses
-- ========================================

UPDATE finance_expenses
SET start_date = make_timestamptz(
  start_year,
  COALESCE(start_month, 1),
  1,
  0, 0, 0,
  'UTC'
)
WHERE start_year IS NOT NULL
  AND start_date IS NULL;

UPDATE finance_expenses
SET end_date = make_timestamptz(
  end_year,
  COALESCE(end_month, 12),
  get_last_day_of_month(end_year, COALESCE(end_month, 12)),
  23, 59, 59,
  'UTC'
)
WHERE end_year IS NOT NULL
  AND end_date IS NULL;

-- ========================================
-- Migrate cash_accounts
-- ========================================

UPDATE cash_accounts
SET start_date = make_timestamptz(
  start_year,
  1,  -- Cash accounts don't have start_month, default to January
  1,
  0, 0, 0,
  'UTC'
)
WHERE start_year IS NOT NULL
  AND start_date IS NULL;

UPDATE cash_accounts
SET end_date = make_timestamptz(
  end_year,
  12,  -- Cash accounts don't have end_month, default to December
  31,
  23, 59, 59,
  'UTC'
)
WHERE end_year IS NOT NULL
  AND end_date IS NULL;

-- ========================================
-- Validation
-- ========================================

-- Report conversion statistics
DO $$
DECLARE
    assets_converted INT;
    liabilities_converted INT;
    incomes_converted INT;
    expenses_converted INT;
    cash_converted INT;
BEGIN
    SELECT COUNT(*) INTO assets_converted FROM finance_assets WHERE start_date IS NOT NULL;
    SELECT COUNT(*) INTO liabilities_converted FROM finance_liabilities WHERE start_date IS NOT NULL;
    SELECT COUNT(*) INTO incomes_converted FROM finance_incomes WHERE start_date IS NOT NULL;
    SELECT COUNT(*) INTO expenses_converted FROM finance_expenses WHERE start_date IS NOT NULL;
    SELECT COUNT(*) INTO cash_converted FROM cash_accounts WHERE start_date IS NOT NULL;

    RAISE NOTICE 'Date migration completed:';
    RAISE NOTICE '  - finance_assets:      % rows converted', assets_converted;
    RAISE NOTICE '  - finance_liabilities: % rows converted', liabilities_converted;
    RAISE NOTICE '  - finance_incomes:     % rows converted', incomes_converted;
    RAISE NOTICE '  - finance_expenses:    % rows converted', expenses_converted;
    RAISE NOTICE '  - cash_accounts:       % rows converted', cash_converted;
END $$;

-- Clean up helper function (keep it for now, will be useful for future date operations)
-- DROP FUNCTION IF EXISTS get_last_day_of_month(INT, INT);
