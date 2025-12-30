-- Effective-dated financial rows; drop overrides/custom tables

ALTER TABLE finance_assets
  ADD COLUMN IF NOT EXISTS parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS start_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_year INTEGER NULL,
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'annual';
CREATE UNIQUE INDEX IF NOT EXISTS finance_assets_parent_start_year_idx ON finance_assets(parent_id, start_year);

ALTER TABLE finance_liabilities
  ADD COLUMN IF NOT EXISTS parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS start_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_year INTEGER NULL,
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'annual';
CREATE UNIQUE INDEX IF NOT EXISTS finance_liabilities_parent_start_year_idx ON finance_liabilities(parent_id, start_year);

ALTER TABLE finance_incomes
  ADD COLUMN IF NOT EXISTS parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS start_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_year INTEGER NULL;
CREATE UNIQUE INDEX IF NOT EXISTS finance_incomes_parent_start_year_idx ON finance_incomes(parent_id, start_year);

ALTER TABLE finance_expenses
  ADD COLUMN IF NOT EXISTS parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS start_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_year INTEGER NULL;
CREATE UNIQUE INDEX IF NOT EXISTS finance_expenses_parent_start_year_idx ON finance_expenses(parent_id, start_year);

-- Drop legacy override/custom item tables
DROP TABLE IF EXISTS financial_overrides;
DROP TABLE IF EXISTS financial_items;
