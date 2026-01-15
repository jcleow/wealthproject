-- Restore oaUsedForHousing and housingStartDate fields to cpf_accounts
-- (rollback migration)

ALTER TABLE cpf_accounts ADD COLUMN IF NOT EXISTS oa_used_for_housing numeric(15,4) DEFAULT 0 NOT NULL;
ALTER TABLE cpf_accounts ADD COLUMN IF NOT EXISTS housing_start_date timestamp with time zone;
