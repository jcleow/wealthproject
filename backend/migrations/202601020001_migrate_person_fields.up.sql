-- Migration: Move person-related fields from cpf_accounts to persons table
-- This normalizes the data model so personal information is stored once per person,
-- not duplicated across CPF account versions.

-- Step 1: Add new columns to persons table
ALTER TABLE persons
    ADD COLUMN date_of_birth date,
    ADD COLUMN residency_status text DEFAULT 'citizen'
        CHECK (residency_status IN ('citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus')),
    ADD COLUMN pr_grant_date date;

-- Step 2: Migrate data from cpf_accounts to persons
-- For each person, we take the most recent CPF account's values (latest start_date)
-- This handles cases where a person might have multiple CPF account versions
UPDATE persons p
SET
    date_of_birth = subq.date_of_birth,
    residency_status = subq.residency_status,
    pr_grant_date = subq.pr_grant_date
FROM (
    SELECT DISTINCT ON (person_id)
        person_id,
        date_of_birth,
        residency_status,
        pr_grant_date
    FROM cpf_accounts
    WHERE person_id IS NOT NULL
    ORDER BY person_id, start_date DESC
) subq
WHERE p.id = subq.person_id;

-- Step 3: For persons without CPF accounts, set a default date_of_birth
-- We use 1990-01-01 as a placeholder - users will need to update this
UPDATE persons
SET date_of_birth = '1990-01-01'::date
WHERE date_of_birth IS NULL;

-- Step 4: Make date_of_birth NOT NULL now that all rows have values
ALTER TABLE persons ALTER COLUMN date_of_birth SET NOT NULL;

-- Step 5: Drop the columns from cpf_accounts
-- First drop any constraints that reference these columns
ALTER TABLE cpf_accounts
    DROP COLUMN date_of_birth,
    DROP COLUMN residency_status,
    DROP COLUMN pr_grant_date;
