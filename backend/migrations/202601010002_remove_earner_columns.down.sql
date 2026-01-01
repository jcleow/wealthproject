-- Rollback: Restore earner columns
-- Note: This will restore the columns but data will be lost

-- Step 1: Re-add the earner columns
ALTER TABLE finance_incomes ADD COLUMN IF NOT EXISTS earner VARCHAR(50) DEFAULT '';
ALTER TABLE cpf_accounts ADD COLUMN IF NOT EXISTS earner VARCHAR(50) DEFAULT '';

-- Step 2: Populate earner from person_id (if possible)
UPDATE finance_incomes fi
SET earner = COALESCE(p.name, '')
FROM persons p
WHERE fi.person_id = p.id;

UPDATE cpf_accounts ca
SET earner = COALESCE(p.name, '')
FROM persons p
WHERE ca.person_id = p.id;
