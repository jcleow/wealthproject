-- Rollback: Remove persons table and restore original constraints

-- Step 1: Restore original CPF constraint (using earner text field)
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap_per_person;
ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap EXCLUDE USING gist (
    user_id WITH =,
    COALESCE(earner, '') WITH =,
    tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);

-- Step 2: Drop person_id columns and indexes
DROP INDEX IF EXISTS idx_cpf_accounts_person;
DROP INDEX IF EXISTS idx_finance_incomes_person;

ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS person_id;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS person_id;

-- Step 3: Drop persons table and indexes
DROP INDEX IF EXISTS idx_persons_user_included;
DROP INDEX IF EXISTS idx_persons_user;
DROP TABLE IF EXISTS persons;
