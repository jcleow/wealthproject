-- Rollback: drop finance_investments and revert finance_cash_accounts rename

DROP TABLE IF EXISTS finance_investments;

-- Revert table name
ALTER TABLE finance_cash_accounts RENAME TO cash_accounts;

-- Restore index names
ALTER INDEX IF EXISTS finance_cash_accounts_accumulator_idx RENAME TO cash_accounts_accumulator_idx;
ALTER INDEX IF EXISTS finance_cash_accounts_user_id_idx RENAME TO cash_accounts_user_id_idx;
ALTER INDEX IF EXISTS idx_finance_cash_accounts_growth_strategy RENAME TO idx_cash_accounts_growth_strategy;
ALTER INDEX IF EXISTS idx_finance_cash_accounts_dates RENAME TO idx_cash_accounts_dates;
ALTER INDEX IF EXISTS idx_finance_cash_accounts_start_date RENAME TO idx_cash_accounts_start_date;

-- Restore constraint name if it exists under the new table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'finance_cash_accounts_growth_strategy_check'
    ) THEN
        ALTER TABLE cash_accounts
        RENAME CONSTRAINT finance_cash_accounts_growth_strategy_check TO cash_accounts_growth_strategy_check;
    END IF;
END $$;

