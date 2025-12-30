-- Restore growth_metadata and repayment_metadata columns (rollback)

-- Re-add growth_metadata to all tables
ALTER TABLE finance_assets ADD COLUMN IF NOT EXISTS growth_metadata JSONB;
ALTER TABLE finance_liabilities ADD COLUMN IF NOT EXISTS growth_metadata JSONB;
ALTER TABLE finance_incomes ADD COLUMN IF NOT EXISTS growth_metadata JSONB;
ALTER TABLE finance_expenses ADD COLUMN IF NOT EXISTS growth_metadata JSONB;
ALTER TABLE finance_cash_accounts ADD COLUMN IF NOT EXISTS growth_metadata JSONB;
ALTER TABLE finance_investments ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Re-add repayment_metadata to liabilities
ALTER TABLE finance_liabilities ADD COLUMN IF NOT EXISTS repayment_metadata JSONB;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_finance_assets_growth_metadata ON finance_assets USING GIN (growth_metadata);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_growth_metadata ON finance_liabilities USING GIN (growth_metadata);
CREATE INDEX IF NOT EXISTS idx_finance_investments_growth_metadata ON finance_investments USING GIN (growth_metadata);
