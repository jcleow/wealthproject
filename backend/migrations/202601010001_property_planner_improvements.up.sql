-- Property Planner Improvements Migration
-- Adds: lease tenure, per-borrower CPF tracking

-- 1. Lease tenure field (NULL = freehold, 1-999 = years remaining)
ALTER TABLE property_sg ADD COLUMN lease_remaining_years INTEGER;

-- Add constraint for valid lease range
ALTER TABLE property_sg ADD CONSTRAINT chk_lease_years
    CHECK (lease_remaining_years IS NULL OR (lease_remaining_years >= 1 AND lease_remaining_years <= 999));

-- 2. Per-borrower CPF OA tracking for downpayment
ALTER TABLE property_sg ADD COLUMN borrower1_downpayment_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
ALTER TABLE property_sg ADD COLUMN borrower2_downpayment_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;

-- 3. Per-borrower monthly CPF OA payments (fixed amount per month)
ALTER TABLE property_sg ADD COLUMN borrower1_monthly_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
ALTER TABLE property_sg ADD COLUMN borrower2_monthly_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;

-- 4. Migrate existing downpayment_cpf_oa data to borrower1
-- (preserves existing data - total becomes borrower1's contribution)
UPDATE property_sg
SET borrower1_downpayment_cpf_oa = downpayment_cpf_oa
WHERE downpayment_cpf_oa > 0;

-- Note: The original downpayment_cpf_oa and downpayment_cash columns are retained
-- for backward compatibility. They can be removed in a future migration once
-- the frontend is fully migrated to per-borrower fields.
