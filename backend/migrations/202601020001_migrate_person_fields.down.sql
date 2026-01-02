-- Rollback: Move person-related fields back from persons to cpf_accounts
-- Note: The old schema used pr_year_1/2/3_plus but the new schema uses 'pr'.
-- On rollback, we convert 'pr' back to 'pr_year_3_plus' as a safe default.

-- Step 1: Add columns back to cpf_accounts
ALTER TABLE cpf_accounts
    ADD COLUMN date_of_birth date,
    ADD COLUMN residency_status text DEFAULT 'citizen'
        CHECK (residency_status IN ('citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus')),
    ADD COLUMN pr_grant_date date;

-- Step 2: Copy data from persons back to cpf_accounts
-- Convert 'pr' to 'pr_year_3_plus' for backward compatibility
UPDATE cpf_accounts ca
SET
    date_of_birth = p.date_of_birth,
    residency_status = CASE
        WHEN p.residency_status = 'pr' THEN 'pr_year_3_plus'
        ELSE COALESCE(p.residency_status, 'citizen')
    END,
    pr_grant_date = p.pr_grant_date
FROM persons p
WHERE ca.person_id = p.id;

-- Step 3: Make date_of_birth NOT NULL in cpf_accounts
ALTER TABLE cpf_accounts ALTER COLUMN date_of_birth SET NOT NULL;

-- Step 4: Drop columns from persons table
ALTER TABLE persons
    DROP COLUMN date_of_birth,
    DROP COLUMN residency_status,
    DROP COLUMN pr_grant_date;
