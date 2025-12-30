-- Rollback: Convert unique constraints back to partial unique indexes

-- ========================================
-- finance_assets
-- ========================================

ALTER TABLE finance_assets
  DROP CONSTRAINT IF EXISTS finance_assets_parent_start_date_key;

CREATE UNIQUE INDEX finance_assets_parent_start_date_idx
  ON finance_assets (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_assets_parent_start_date_idx
  IS 'Ensures effective dating: one override per parent per start date. Enables day-level precision for financial item changes.';

-- ========================================
-- finance_liabilities
-- ========================================

ALTER TABLE finance_liabilities
  DROP CONSTRAINT IF EXISTS finance_liabilities_parent_start_date_key;

CREATE UNIQUE INDEX finance_liabilities_parent_start_date_idx
  ON finance_liabilities (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_liabilities_parent_start_date_idx
  IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_incomes
-- ========================================

ALTER TABLE finance_incomes
  DROP CONSTRAINT IF EXISTS finance_incomes_parent_start_date_key;

CREATE UNIQUE INDEX finance_incomes_parent_start_date_idx
  ON finance_incomes (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_incomes_parent_start_date_idx
  IS 'Ensures effective dating: one override per parent per start date.';

-- ========================================
-- finance_expenses
-- ========================================

ALTER TABLE finance_expenses
  DROP CONSTRAINT IF EXISTS finance_expenses_parent_start_date_key;

CREATE UNIQUE INDEX finance_expenses_parent_start_date_idx
  ON finance_expenses (parent_id, start_date)
  WHERE start_date IS NOT NULL;

COMMENT ON INDEX finance_expenses_parent_start_date_idx
  IS 'Ensures effective dating: one override per parent per start date.';
