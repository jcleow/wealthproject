-- Rollback: Revert name columns to original names
-- Rename 'name' back to 'source' in finance_incomes
-- Rename 'name' back to 'payee' in finance_expenses

-- Rename name -> source in finance_incomes
ALTER TABLE finance_incomes
RENAME COLUMN name TO source;

-- Rename name -> payee in finance_expenses
ALTER TABLE finance_expenses
RENAME COLUMN name TO payee;

DO $$
BEGIN
    RAISE NOTICE 'Reverted name columns: finance_incomes.name -> source, finance_expenses.name -> payee';
END $$;
