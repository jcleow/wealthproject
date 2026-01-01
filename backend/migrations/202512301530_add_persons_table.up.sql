-- Migration: Add persons table for multi-person household support
-- This allows tracking multiple income earners (e.g., self, spouse) and filtering their data

-- Step 1: Create persons table
CREATE TABLE persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    name character varying(100) NOT NULL CHECK (char_length(name) >= 1),
    display_color character varying(20),
    is_included boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, name)
);

CREATE INDEX idx_persons_user ON persons(user_id);
CREATE INDEX idx_persons_user_included ON persons(user_id, is_included) WHERE is_included = true;

-- Step 2: Add person_id FK to finance_incomes
ALTER TABLE finance_incomes ADD COLUMN person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
CREATE INDEX idx_finance_incomes_person ON finance_incomes(person_id) WHERE person_id IS NOT NULL;

-- Step 3: Add person_id FK to cpf_accounts
ALTER TABLE cpf_accounts ADD COLUMN person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
CREATE INDEX idx_cpf_accounts_person ON cpf_accounts(person_id) WHERE person_id IS NOT NULL;

-- Step 4: Migrate existing earner data to persons table
-- Extract unique earners from finance_incomes
INSERT INTO persons (user_id, name, created_at, updated_at)
SELECT DISTINCT
    user_id,
    earner,
    NOW(),
    NOW()
FROM finance_incomes
WHERE earner IS NOT NULL AND earner <> ''
ON CONFLICT (user_id, name) DO NOTHING;

-- Extract unique earners from cpf_accounts
INSERT INTO persons (user_id, name, created_at, updated_at)
SELECT DISTINCT
    user_id,
    earner,
    NOW(),
    NOW()
FROM cpf_accounts
WHERE earner IS NOT NULL AND earner <> ''
ON CONFLICT (user_id, name) DO NOTHING;

-- Step 5: Link existing records to migrated persons
UPDATE finance_incomes fi
SET person_id = p.id
FROM persons p
WHERE fi.user_id = p.user_id
  AND fi.earner = p.name
  AND fi.earner IS NOT NULL
  AND fi.earner <> '';

UPDATE cpf_accounts ca
SET person_id = p.id
FROM persons p
WHERE ca.user_id = p.user_id
  AND ca.earner = p.name
  AND ca.earner IS NOT NULL
  AND ca.earner <> '';

-- Step 6: Update CPF constraint for multi-person support
-- The existing constraint uses earner text, we need to use person_id instead
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap_per_person;

ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap_per_person EXCLUDE USING gist (
    user_id WITH =,
    COALESCE(person_id::text, '') WITH =,
    tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);
