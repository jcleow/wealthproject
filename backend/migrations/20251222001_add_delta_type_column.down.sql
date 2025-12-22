-- Rollback: Remove delta_type column from all finance tables

ALTER TABLE finance_incomes DROP COLUMN IF EXISTS delta_type;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS delta_type;
ALTER TABLE finance_assets DROP COLUMN IF EXISTS delta_type;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS delta_type;
ALTER TABLE finance_investments DROP COLUMN IF EXISTS delta_type;
ALTER TABLE finance_cash_accounts DROP COLUMN IF EXISTS delta_type;
