-- Drop unused growth_metadata and repayment_metadata columns
-- These JSONB columns were never used in any business logic

-- Drop growth_metadata from all tables that have it
ALTER TABLE finance_assets DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE finance_cash_accounts DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE finance_investments DROP COLUMN IF EXISTS growth_metadata;

-- Drop repayment_metadata from liabilities
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS repayment_metadata;

-- Drop any indexes on these columns
DROP INDEX IF EXISTS idx_finance_assets_growth_metadata;
DROP INDEX IF EXISTS idx_finance_liabilities_growth_metadata;
DROP INDEX IF EXISTS idx_finance_investments_growth_metadata;
