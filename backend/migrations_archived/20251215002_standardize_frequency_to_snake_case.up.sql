-- Standardize frequency values to snake_case format

-- Update frequency values in finance_incomes
UPDATE finance_incomes SET frequency = 'bi_weekly' WHERE frequency = 'biweekly';
UPDATE finance_incomes SET frequency = 'semi_annual' WHERE frequency = 'semiannual';

-- Update frequency values in finance_expenses
UPDATE finance_expenses SET frequency = 'bi_weekly' WHERE frequency = 'biweekly';
UPDATE finance_expenses SET frequency = 'semi_annual' WHERE frequency = 'semiannual';

-- Drop old CHECK constraints and add new ones with snake_case values
ALTER TABLE finance_incomes
DROP CONSTRAINT IF EXISTS finance_incomes_frequency_check;

ALTER TABLE finance_incomes
ADD CONSTRAINT finance_incomes_frequency_check
CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

ALTER TABLE finance_expenses
DROP CONSTRAINT IF EXISTS finance_expenses_frequency_check;

ALTER TABLE finance_expenses
ADD CONSTRAINT finance_expenses_frequency_check
CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

DO $$
BEGIN
    RAISE NOTICE 'Standardized frequency values to snake_case format';
END $$;
