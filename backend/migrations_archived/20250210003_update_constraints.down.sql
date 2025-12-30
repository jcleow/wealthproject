-- Rollback: Restore old year-based unique constraints

-- Drop new date-based constraints
DROP INDEX IF EXISTS finance_assets_parent_start_date_idx;
DROP INDEX IF EXISTS finance_liabilities_parent_start_date_idx;
DROP INDEX IF EXISTS finance_incomes_parent_start_date_idx;
DROP INDEX IF EXISTS finance_expenses_parent_start_date_idx;

-- Restore old year-based constraints (if they still make sense with the data)
CREATE UNIQUE INDEX IF NOT EXISTS finance_assets_parent_start_year_idx
  ON finance_assets (parent_id, start_year)
  WHERE start_year IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS finance_liabilities_parent_start_year_idx
  ON finance_liabilities (parent_id, start_year)
  WHERE start_year IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS finance_incomes_parent_start_year_idx
  ON finance_incomes (parent_id, start_year)
  WHERE start_year IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS finance_expenses_parent_start_year_idx
  ON finance_expenses (parent_id, start_year)
  WHERE start_year IS NOT NULL;

RAISE NOTICE 'Constraints rolled back to year-based unique indices';
