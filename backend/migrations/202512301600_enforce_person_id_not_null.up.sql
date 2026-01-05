-- Migration: Enforce person_id NOT NULL on finance_incomes and cpf_accounts
-- NOTE: This migration is idempotent - safe to run multiple times

-- Step 1: Create a default "Primary" person for users with NULL person_id records
INSERT INTO persons (id, user_id, name, display_color, is_included, date_of_birth, created_at, updated_at)
SELECT
    gen_random_uuid(),
    user_id,
    'Primary',
    '#3B82F6',
    true,
    '1990-01-01'::date,
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT user_id FROM finance_incomes WHERE person_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM cpf_accounts WHERE person_id IS NULL
) users_needing_default
WHERE NOT EXISTS (
    SELECT 1 FROM persons p WHERE p.user_id = users_needing_default.user_id AND p.name = 'Primary'
);

-- Step 2: Update NULL person_ids to reference the Primary person
UPDATE finance_incomes fi
SET person_id = (SELECT p.id FROM persons p WHERE p.user_id = fi.user_id AND p.name = 'Primary' LIMIT 1)
WHERE fi.person_id IS NULL;

UPDATE cpf_accounts ca
SET person_id = (SELECT p.id FROM persons p WHERE p.user_id = ca.user_id AND p.name = 'Primary' LIMIT 1)
WHERE ca.person_id IS NULL;

-- Step 3: Drop old FK constraints (SET NULL behavior) if they exist
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_person_id_fkey;
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_person_id_fkey;

-- Step 4: Make person_id NOT NULL (idempotent - safe if already NOT NULL)
DO $$
BEGIN
    -- Check if finance_incomes.person_id allows NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'finance_incomes' AND column_name = 'person_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE finance_incomes ALTER COLUMN person_id SET NOT NULL;
    END IF;

    -- Check if cpf_accounts.person_id allows NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cpf_accounts' AND column_name = 'person_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE cpf_accounts ALTER COLUMN person_id SET NOT NULL;
    END IF;
END $$;

-- Step 5: Add FK constraints with CASCADE (idempotent - skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'finance_incomes_person_id_fkey' AND table_name = 'finance_incomes'
    ) THEN
        ALTER TABLE finance_incomes
            ADD CONSTRAINT finance_incomes_person_id_fkey
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'cpf_accounts_person_id_fkey' AND table_name = 'cpf_accounts'
    ) THEN
        ALTER TABLE cpf_accounts
            ADD CONSTRAINT cpf_accounts_person_id_fkey
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
    END IF;
END $$;
