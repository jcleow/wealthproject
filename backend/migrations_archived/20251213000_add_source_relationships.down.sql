-- Rollback: Remove source relationships from income and expenses

-- Drop income source columns and constraints
DROP INDEX IF EXISTS idx_finance_incomes_source;
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS chk_income_source_type;
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS chk_income_source_consistency;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS source_id;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS source_type;

-- Drop expense source column and constraint
DROP INDEX IF EXISTS idx_finance_expenses_source_liability;
ALTER TABLE finance_expenses DROP CONSTRAINT IF EXISTS fk_expense_source_liability;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS source_liability_id;
