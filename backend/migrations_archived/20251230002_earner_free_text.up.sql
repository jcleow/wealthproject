-- Remove fixed constraints from incomes to allow free-text earner names
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_earner_check;
ALTER TABLE finance_incomes ALTER COLUMN earner TYPE VARCHAR(50);
ALTER TABLE finance_incomes ALTER COLUMN earner SET DEFAULT '';
UPDATE finance_incomes SET earner = '' WHERE earner = 'self';

-- Remove fixed constraints from cpf_accounts to allow free-text earner names
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_earner_check;
ALTER TABLE cpf_accounts ALTER COLUMN earner TYPE VARCHAR(50);
ALTER TABLE cpf_accounts ALTER COLUMN earner SET DEFAULT '';
UPDATE cpf_accounts SET earner = '' WHERE earner = 'self';
