-- Rollback: Revert frequency values to original format

-- Revert frequency values in finance_incomes
UPDATE finance_incomes SET frequency = 'biweekly' WHERE frequency = 'bi_weekly';
UPDATE finance_incomes SET frequency = 'semiannual' WHERE frequency = 'semi_annual';

-- Revert frequency values in finance_expenses
UPDATE finance_expenses SET frequency = 'biweekly' WHERE frequency = 'bi_weekly';
UPDATE finance_expenses SET frequency = 'semiannual' WHERE frequency = 'semi_annual';

-- Restore original CHECK constraints
ALTER TABLE finance_incomes
DROP CONSTRAINT IF EXISTS finance_incomes_frequency_check;

ALTER TABLE finance_incomes
ADD CONSTRAINT finance_incomes_frequency_check
CHECK (frequency IN ('annual', 'monthly', 'weekly', 'biweekly', 'quarterly', 'semiannual'));

ALTER TABLE finance_expenses
DROP CONSTRAINT IF EXISTS finance_expenses_frequency_check;

ALTER TABLE finance_expenses
ADD CONSTRAINT finance_expenses_frequency_check
CHECK (frequency IN ('annual', 'monthly', 'weekly', 'biweekly', 'quarterly', 'semiannual'));

DO $$
BEGIN
    RAISE NOTICE 'Reverted frequency values to original format';
END $$;
