-- Migration: Add indices on start_date and end_date columns for efficient date range queries
-- Part 3 of 5: Performance optimization

-- ========================================
-- finance_assets indices
-- ========================================

-- Composite index for date range queries (most common operation)
-- Query pattern: WHERE user_id = ? AND start_date <= ? AND (end_date >= ? OR end_date IS NULL)
CREATE INDEX idx_finance_assets_dates ON finance_assets (user_id, start_date, end_date)
  WHERE start_date IS NOT NULL;

-- Index for sorting by start_date (useful for timeline construction)
CREATE INDEX idx_finance_assets_start_date ON finance_assets (start_date DESC)
  WHERE start_date IS NOT NULL;

-- ========================================
-- finance_liabilities indices
-- ========================================

CREATE INDEX idx_finance_liabilities_dates ON finance_liabilities (user_id, start_date, end_date)
  WHERE start_date IS NOT NULL;

CREATE INDEX idx_finance_liabilities_start_date ON finance_liabilities (start_date DESC)
  WHERE start_date IS NOT NULL;

-- ========================================
-- finance_incomes indices
-- ========================================

CREATE INDEX idx_finance_incomes_dates ON finance_incomes (user_id, start_date, end_date)
  WHERE start_date IS NOT NULL;

CREATE INDEX idx_finance_incomes_start_date ON finance_incomes (start_date DESC)
  WHERE start_date IS NOT NULL;

-- ========================================
-- finance_expenses indices
-- ========================================

CREATE INDEX idx_finance_expenses_dates ON finance_expenses (user_id, start_date, end_date)
  WHERE start_date IS NOT NULL;

CREATE INDEX idx_finance_expenses_start_date ON finance_expenses (start_date DESC)
  WHERE start_date IS NOT NULL;

-- ========================================
-- cash_accounts indices
-- ========================================

CREATE INDEX idx_cash_accounts_dates ON cash_accounts (user_id, start_date, end_date)
  WHERE start_date IS NOT NULL;

CREATE INDEX idx_cash_accounts_start_date ON cash_accounts (start_date DESC)
  WHERE start_date IS NOT NULL;

-- ========================================
-- GIN index for JSONB growth_metadata (for future extensions)
-- ========================================

-- Only create if column exists and doesn't already have a GIN index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'finance_assets' AND column_name = 'growth_metadata'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'finance_assets' AND indexname = 'idx_finance_assets_growth_metadata'
    ) THEN
        CREATE INDEX idx_finance_assets_growth_metadata ON finance_assets USING GIN (growth_metadata);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'finance_liabilities' AND column_name = 'growth_metadata'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'finance_liabilities' AND indexname = 'idx_finance_liabilities_growth_metadata'
    ) THEN
        CREATE INDEX idx_finance_liabilities_growth_metadata ON finance_liabilities USING GIN (growth_metadata);
    END IF;
END $$;

-- Report index creation
DO $$
DECLARE
    index_count INT;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE 'idx_finance_%_dates' OR indexname LIKE 'idx_finance_%_start_date'
           OR indexname LIKE 'idx_cash_accounts_dates' OR indexname LIKE 'idx_cash_accounts_start_date');

    RAISE NOTICE 'Date indices created: % indices for date-based queries', index_count;
END $$;
