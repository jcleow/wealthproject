-- Migration: Remove deprecated earner columns
-- The earner field has been replaced by person_id foreign key to persons table.
-- All existing earner data has been migrated to persons table and linked via person_id.
-- The unique constraint already uses person_id (cpf_accounts_no_overlap_per_person).

-- Drop the deprecated earner columns
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS earner;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS earner;
