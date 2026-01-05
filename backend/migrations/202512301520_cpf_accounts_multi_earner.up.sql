-- Allow multiple CPF accounts per user (one per person)
-- NOTE: This migration is now a no-op - the initial schema already has the correct constraint

-- Drop old constraint if it exists
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;

-- The correct constraint (cpf_accounts_no_overlap_per_person) is created by the initial schema
-- or will be created by the persons table migration
