-- Remove redundant oaUsedForHousing and housingStartDate fields from cpf_accounts.
-- CPF housing usage is now derived from property scenarios (single source of truth).
-- See: GetCPFOAUsageByAccount() in property_planner.go

ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS oa_used_for_housing;
ALTER TABLE cpf_accounts DROP COLUMN IF EXISTS housing_start_date;
