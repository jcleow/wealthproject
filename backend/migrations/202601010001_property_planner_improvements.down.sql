-- Rollback: Property Planner Improvements

-- Remove per-borrower monthly CPF fields
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower1_monthly_cpf_oa;
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower2_monthly_cpf_oa;

-- Remove per-borrower downpayment CPF fields
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower1_downpayment_cpf_oa;
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower2_downpayment_cpf_oa;

-- Remove lease constraint and field
ALTER TABLE property_sg DROP CONSTRAINT IF EXISTS chk_lease_years;
ALTER TABLE property_sg DROP COLUMN IF EXISTS lease_remaining_years;
