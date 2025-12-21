-- Migration: add finance_investments table and rename cash_accounts to finance_cash_accounts

-- ============================================================================
-- Create finance_investments (mirrors finance_assets effective-dated schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    current_value NUMERIC(15, 4) NOT NULL DEFAULT 0,
    annual_growth_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    notes TEXT,
    growth_strategy VARCHAR(50) DEFAULT 'compound_monthly',
    growth_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_investments_parent_start_date_key UNIQUE (parent_id, start_date),
    CONSTRAINT finance_investments_growth_strategy_check CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'))
);

CREATE INDEX IF NOT EXISTS idx_finance_investments_user_id ON finance_investments (user_id);
CREATE INDEX IF NOT EXISTS idx_finance_investments_dates ON finance_investments (user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_finance_investments_start_date ON finance_investments (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_investments_growth_strategy ON finance_investments (growth_strategy);
CREATE INDEX IF NOT EXISTS idx_finance_investments_growth_metadata ON finance_investments USING GIN (growth_metadata);

COMMENT ON TABLE finance_investments IS 'Investment holdings tracked separately from finance_assets';
COMMENT ON COLUMN finance_investments.start_date IS 'Precise start date with day-level granularity (UTC)';
COMMENT ON COLUMN finance_investments.end_date IS 'Precise end date; NULL means ongoing (UTC)';
COMMENT ON COLUMN finance_investments.current_value IS 'Investment value with 4 decimal precision (NUMERIC(15,4))';
COMMENT ON COLUMN finance_investments.annual_growth_rate IS 'Growth rate percentage with 4 decimal precision (NUMERIC(6,4))';

-- ============================================================================
-- Rename cash_accounts -> finance_cash_accounts (align naming with finance_*)
-- ============================================================================
ALTER TABLE cash_accounts RENAME TO finance_cash_accounts;

-- Rename indexes to match new table name
ALTER INDEX IF EXISTS cash_accounts_accumulator_idx RENAME TO finance_cash_accounts_accumulator_idx;
ALTER INDEX IF EXISTS cash_accounts_user_id_idx RENAME TO finance_cash_accounts_user_id_idx;
ALTER INDEX IF EXISTS idx_cash_accounts_growth_strategy RENAME TO idx_finance_cash_accounts_growth_strategy;
ALTER INDEX IF EXISTS idx_cash_accounts_dates RENAME TO idx_finance_cash_accounts_dates;
ALTER INDEX IF EXISTS idx_cash_accounts_start_date RENAME TO idx_finance_cash_accounts_start_date;

-- Rename growth strategy constraint if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cash_accounts_growth_strategy_check'
    ) THEN
        ALTER TABLE finance_cash_accounts
        RENAME CONSTRAINT cash_accounts_growth_strategy_check TO finance_cash_accounts_growth_strategy_check;
    END IF;
END $$;

