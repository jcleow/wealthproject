-- Standardize name columns across finance_incomes and finance_expenses
-- Rename 'source' to 'name' in finance_incomes
-- Rename 'payee' to 'name' in finance_expenses

-- Rename source -> name in finance_incomes
ALTER TABLE finance_incomes
RENAME COLUMN source TO name;

-- Rename payee -> name in finance_expenses
ALTER TABLE finance_expenses
RENAME COLUMN payee TO name;

DO $$
BEGIN
    RAISE NOTICE 'Standardized name columns: finance_incomes.source -> name, finance_expenses.payee -> name';
END $$;
