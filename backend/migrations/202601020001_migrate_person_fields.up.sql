-- Migration: Move person-related fields from cpf_accounts to persons table
-- NOTE: This migration is now idempotent - the initial schema already has these fields
-- on the persons table and not on cpf_accounts

-- Step 1: Add new columns to persons table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'date_of_birth') THEN
        ALTER TABLE persons ADD COLUMN date_of_birth date;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'residency_status') THEN
        ALTER TABLE persons ADD COLUMN residency_status text DEFAULT 'citizen' CHECK (residency_status IN ('citizen', 'pr'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'pr_grant_date') THEN
        ALTER TABLE persons ADD COLUMN pr_grant_date date;
    END IF;
END $$;

-- Step 2: Drop columns from cpf_accounts (if they exist)
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS residency_status;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS pr_grant_date;
