-- Migration: Convert partial unique indexes to proper unique constraints
-- The partial indexes with WHERE clauses were needed during migration but are no longer necessary
-- since start_date is now NOT NULL. PostgreSQL's ON CONFLICT requires proper constraints, not just indexes.

-- ========================================
-- finance_assets
-- ========================================

-- Drop the partial unique index
DROP INDEX IF EXISTS finance_assets_parent_start_date_idx;

-- Create a proper unique constraint
ALTER TABLE finance_assets
  ADD CONSTRAINT finance_assets_parent_start_date_key
  UNIQUE (parent_id, start_date);

COMMENT ON CONSTRAINT finance_assets_parent_start_date_key ON finance_assets
  IS 'Ensures effective dating: one override per parent per start date. Enables day-level precision for financial item changes.';

-- ========================================
-- finance_liabilities
-- ========================================

DROP INDEX IF EXISTS finance_liabilities_parent_start_date_idx;

ALTER TABLE finance_liabilities
  ADD CONSTRAINT finance_liabilities_parent_start_date_key
  UNIQUE (parent_id, start_date);

COMMENT ON CONSTRAINT finance_liabilities_parent_start_date_key ON finance_liabilities
  IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_incomes
-- ========================================

DROP INDEX IF EXISTS finance_incomes_parent_start_date_idx;

ALTER TABLE finance_incomes
  ADD CONSTRAINT finance_incomes_parent_start_date_key
  UNIQUE (parent_id, start_date);

COMMENT ON CONSTRAINT finance_incomes_parent_start_date_key ON finance_incomes
  IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_expenses
-- ========================================

DROP INDEX IF EXISTS finance_expenses_parent_start_date_idx;

ALTER TABLE finance_expenses
  ADD CONSTRAINT finance_expenses_parent_start_date_key
  UNIQUE (parent_id, start_date);

COMMENT ON CONSTRAINT finance_expenses_parent_start_date_key ON finance_expenses
  IS 'Ensures effective dating: one override per parent per start date.';
