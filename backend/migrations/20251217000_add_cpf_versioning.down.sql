-- Revert CPF versioning changes

-- Drop the versioning constraint and indexes
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;
DROP INDEX IF EXISTS idx_cpf_accounts_dates;
DROP INDEX IF EXISTS idx_cpf_accounts_parent;

-- Remove versioning columns
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS end_date;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS start_date;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS parent_id;

-- Restore original unique constraint (one per user)
ALTER TABLE cpf_accounts
ADD CONSTRAINT cpf_accounts_user_id_unique UNIQUE (user_id);

-- Note: btree_gist extension is left in place as it may be used elsewhere
