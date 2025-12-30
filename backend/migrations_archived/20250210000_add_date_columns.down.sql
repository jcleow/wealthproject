-- Rollback: Remove start_date and end_date TIMESTAMPTZ columns

ALTER TABLE finance_assets DROP COLUMN IF EXISTS start_date, DROP COLUMN IF EXISTS end_date;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS start_date, DROP COLUMN IF EXISTS end_date;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS start_date, DROP COLUMN IF EXISTS end_date;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS start_date, DROP COLUMN IF EXISTS end_date;
ALTER TABLE cash_accounts DROP COLUMN IF EXISTS start_date, DROP COLUMN IF EXISTS end_date;
