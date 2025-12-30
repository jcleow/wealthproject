-- Rollback effective-dated fields; recreate legacy tables (minimal)

DROP INDEX IF EXISTS finance_assets_parent_start_year_idx;
DROP INDEX IF EXISTS finance_liabilities_parent_start_year_idx;
DROP INDEX IF EXISTS finance_incomes_parent_start_year_idx;
DROP INDEX IF EXISTS finance_expenses_parent_start_year_idx;

ALTER TABLE finance_assets
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS frequency;

ALTER TABLE finance_liabilities
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year,
  DROP COLUMN IF EXISTS frequency;

ALTER TABLE finance_incomes
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year;

ALTER TABLE finance_expenses
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS start_year,
  DROP COLUMN IF EXISTS end_year;

-- Recreate legacy tables (empty shells)
CREATE TABLE IF NOT EXISTS financial_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL,
    created_year INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, item_id)
);
