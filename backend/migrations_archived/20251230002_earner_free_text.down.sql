-- Restore constraints and defaults for finance_incomes
UPDATE finance_incomes SET earner = 'self' WHERE earner = '';
ALTER TABLE finance_incomes ALTER COLUMN earner SET DEFAULT 'self';
ALTER TABLE finance_incomes ALTER COLUMN earner TYPE VARCHAR(20);
ALTER TABLE finance_incomes ADD CONSTRAINT finance_incomes_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));

-- Restore constraints and defaults for cpf_accounts
UPDATE cpf_accounts SET earner = 'self' WHERE earner = '';
ALTER TABLE cpf_accounts ALTER COLUMN earner SET DEFAULT 'self';
ALTER TABLE cpf_accounts ALTER COLUMN earner TYPE VARCHAR(20);
ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));
