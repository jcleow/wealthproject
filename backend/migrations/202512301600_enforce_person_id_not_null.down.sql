-- Rollback: Allow NULL person_id on finance_incomes and cpf_accounts

-- Step 1: Drop FK constraints
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_person_id_fkey;
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_person_id_fkey;

-- Step 2: Make person_id nullable
ALTER TABLE finance_incomes ALTER COLUMN person_id DROP NOT NULL;
ALTER TABLE cpf_accounts ALTER COLUMN person_id DROP NOT NULL;

-- Step 3: Restore FK constraints with SET NULL
ALTER TABLE finance_incomes
    ADD CONSTRAINT finance_incomes_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL;

ALTER TABLE cpf_accounts
    ADD CONSTRAINT cpf_accounts_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL;
