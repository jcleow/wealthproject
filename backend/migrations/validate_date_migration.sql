-- Validation Script for Date Migration
-- Run this after applying migrations 20250210000 through 20250210004
-- Verifies that date conversion is accurate and complete

\echo '========================================'
\echo 'Date Migration Validation Report'
\echo '========================================'
\echo ''

-- ========================================
-- 1. Check conversion accuracy
-- ========================================

\echo '1. Checking year/month -> date conversion accuracy...'
\echo ''

-- Assets: Check that extracted year matches original start_year
SELECT
    'finance_assets' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as rows_with_start_date,
    COUNT(CASE WHEN start_year IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(YEAR FROM start_date) != start_year THEN 1 END) as year_mismatches,
    COUNT(CASE WHEN start_month IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(MONTH FROM start_date) != start_month THEN 1 END) as month_mismatches
FROM finance_assets;

SELECT
    'finance_liabilities' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as rows_with_start_date,
    COUNT(CASE WHEN start_year IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(YEAR FROM start_date) != start_year THEN 1 END) as year_mismatches,
    COUNT(CASE WHEN start_month IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(MONTH FROM start_date) != start_month THEN 1 END) as month_mismatches
FROM finance_liabilities;

SELECT
    'finance_incomes' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as rows_with_start_date,
    COUNT(CASE WHEN start_year IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(YEAR FROM start_date) != start_year THEN 1 END) as year_mismatches,
    COUNT(CASE WHEN start_month IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(MONTH FROM start_date) != start_month THEN 1 END) as month_mismatches
FROM finance_incomes;

SELECT
    'finance_expenses' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as rows_with_start_date,
    COUNT(CASE WHEN start_year IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(YEAR FROM start_date) != start_year THEN 1 END) as year_mismatches,
    COUNT(CASE WHEN start_month IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(MONTH FROM start_date) != start_month THEN 1 END) as month_mismatches
FROM finance_expenses;

SELECT
    'cash_accounts' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as rows_with_start_date,
    COUNT(CASE WHEN start_year IS NOT NULL AND start_date IS NOT NULL
               AND EXTRACT(YEAR FROM start_date) != start_year THEN 1 END) as year_mismatches
FROM cash_accounts;

\echo ''

-- ========================================
-- 2. Check timezone consistency
-- ========================================

\echo '2. Checking timezone consistency (should all be UTC = 0)...'
\echo ''

SELECT DISTINCT
    'finance_assets' as table_name,
    EXTRACT(TIMEZONE FROM start_date) as timezone_offset_seconds
FROM finance_assets
WHERE start_date IS NOT NULL
UNION
SELECT DISTINCT
    'finance_liabilities',
    EXTRACT(TIMEZONE FROM start_date)
FROM finance_liabilities
WHERE start_date IS NOT NULL
UNION
SELECT DISTINCT
    'finance_incomes',
    EXTRACT(TIMEZONE FROM start_date)
FROM finance_incomes
WHERE start_date IS NOT NULL
UNION
SELECT DISTINCT
    'finance_expenses',
    EXTRACT(TIMEZONE FROM start_date)
FROM finance_expenses
WHERE start_date IS NOT NULL
UNION
SELECT DISTINCT
    'cash_accounts',
    EXTRACT(TIMEZONE FROM start_date)
FROM cash_accounts
WHERE start_date IS NOT NULL;

\echo ''

-- ========================================
-- 3. Check for NULL dates where there should be data
-- ========================================

\echo '3. Checking for missing date migrations...'
\echo ''

SELECT
    'Rows with start_year but no start_date' as issue,
    COUNT(*) as count
FROM (
    SELECT 1 FROM finance_assets WHERE start_year IS NOT NULL AND start_date IS NULL
    UNION ALL
    SELECT 1 FROM finance_liabilities WHERE start_year IS NOT NULL AND start_date IS NULL
    UNION ALL
    SELECT 1 FROM finance_incomes WHERE start_year IS NOT NULL AND start_date IS NULL
    UNION ALL
    SELECT 1 FROM finance_expenses WHERE start_year IS NOT NULL AND start_date IS NULL
    UNION ALL
    SELECT 1 FROM cash_accounts WHERE start_year IS NOT NULL AND start_date IS NULL
) missing;

\echo ''

-- ========================================
-- 4. Check unique constraints
-- ========================================

\echo '4. Checking for duplicate (parent_id, start_date) combinations...'
\echo ''

SELECT
    'finance_assets' as table_name,
    COUNT(*) as duplicate_groups,
    SUM(dup_count) as total_duplicates
FROM (
    SELECT parent_id, start_date, COUNT(*) as dup_count
    FROM finance_assets
    WHERE start_date IS NOT NULL
    GROUP BY parent_id, start_date
    HAVING COUNT(*) > 1
) dup;

SELECT
    'finance_liabilities' as table_name,
    COUNT(*) as duplicate_groups,
    SUM(dup_count) as total_duplicates
FROM (
    SELECT parent_id, start_date, COUNT(*) as dup_count
    FROM finance_liabilities
    WHERE start_date IS NOT NULL
    GROUP BY parent_id, start_date
    HAVING COUNT(*) > 1
) dup;

SELECT
    'finance_incomes' as table_name,
    COUNT(*) as duplicate_groups,
    SUM(dup_count) as total_duplicates
FROM (
    SELECT parent_id, start_date, COUNT(*) as dup_count
    FROM finance_incomes
    WHERE start_date IS NOT NULL
    GROUP BY parent_id, start_date
    HAVING COUNT(*) > 1
) dup;

SELECT
    'finance_expenses' as table_name,
    COUNT(*) as duplicate_groups,
    SUM(dup_count) as total_duplicates
FROM (
    SELECT parent_id, start_date, COUNT(*) as dup_count
    FROM finance_expenses
    WHERE start_date IS NOT NULL
    GROUP BY parent_id, start_date
    HAVING COUNT(*) > 1
) dup;

\echo ''

-- ========================================
-- 5. Check indices exist
-- ========================================

\echo '5. Checking that date indices were created...'
\echo ''

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_finance_%_dates'
    OR indexname LIKE 'idx_finance_%_start_date'
    OR indexname LIKE 'idx_cash_accounts_dates'
    OR indexname LIKE 'idx_cash_accounts_start_date'
    OR indexname LIKE '%_parent_start_date_idx'
  )
ORDER BY tablename, indexname;

\echo ''

-- ========================================
-- 6. Check compounding_frequency field
-- ========================================

\echo '6. Checking compounding_frequency in user_settings...'
\echo ''

SELECT
    compounding_frequency,
    COUNT(*) as user_count
FROM user_settings
GROUP BY compounding_frequency;

\echo ''
\echo '========================================'
\echo 'Validation Complete'
\echo '========================================'
\echo ''
\echo 'Expected results:'
\echo '  - Zero year/month mismatches'
\echo '  - All timezones should be 0 (UTC)'
\echo '  - Zero missing date migrations'
\echo '  - Zero duplicate (parent_id, start_date) combinations'
\echo '  - All date indices should exist'
\echo '  - All users should have compounding_frequency = monthly'
\echo ''
