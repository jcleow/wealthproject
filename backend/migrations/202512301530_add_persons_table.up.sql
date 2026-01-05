-- Migration: Add persons table for multi-person household support
-- NOTE: This migration is now idempotent - the initial schema already has the persons table

-- Step 1: Create persons table (if not exists)
CREATE TABLE IF NOT EXISTS persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    name character varying(100) NOT NULL CHECK (char_length(name) >= 1),
    display_color character varying(20),
    is_included boolean DEFAULT true NOT NULL,
    date_of_birth date,
    residency_status text DEFAULT 'citizen' CHECK (residency_status IN ('citizen', 'pr')),
    pr_grant_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_persons_user ON persons(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_user_included ON persons(user_id, is_included) WHERE is_included = true;

-- Step 2: Add person_id FK to finance_incomes (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_incomes' AND column_name = 'person_id') THEN
        ALTER TABLE finance_incomes ADD COLUMN person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
        CREATE INDEX idx_finance_incomes_person ON finance_incomes(person_id) WHERE person_id IS NOT NULL;
    END IF;
END $$;

-- Step 3: Ensure CPF constraint uses person_id
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap_per_person;

-- Recreate with person_id (this constraint should already exist from initial schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpf_accounts_no_overlap_per_person') THEN
        ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap_per_person EXCLUDE USING gist (
            user_id WITH =,
            COALESCE(person_id::text, '') WITH =,
            tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
        );
    END IF;
END $$;
