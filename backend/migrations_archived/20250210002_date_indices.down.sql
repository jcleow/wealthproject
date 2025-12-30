-- Rollback: Drop date-related indices

-- finance_assets
DROP INDEX IF EXISTS idx_finance_assets_dates;
DROP INDEX IF EXISTS idx_finance_assets_start_date;
DROP INDEX IF EXISTS idx_finance_assets_growth_metadata;

-- finance_liabilities
DROP INDEX IF EXISTS idx_finance_liabilities_dates;
DROP INDEX IF EXISTS idx_finance_liabilities_start_date;
DROP INDEX IF EXISTS idx_finance_liabilities_growth_metadata;

-- finance_incomes
DROP INDEX IF EXISTS idx_finance_incomes_dates;
DROP INDEX IF EXISTS idx_finance_incomes_start_date;

-- finance_expenses
DROP INDEX IF EXISTS idx_finance_expenses_dates;
DROP INDEX IF EXISTS idx_finance_expenses_start_date;

-- cash_accounts
DROP INDEX IF EXISTS idx_cash_accounts_dates;
DROP INDEX IF EXISTS idx_cash_accounts_start_date;

RAISE NOTICE 'Date indices dropped';
