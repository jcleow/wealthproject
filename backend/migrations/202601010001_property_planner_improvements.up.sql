-- Property Planner Improvements Migration
-- Adds: lease tenure, per-borrower CPF tracking
-- NOTE: This migration is idempotent - safe to run multiple times

DO $$
BEGIN
    -- 1. Lease tenure field (NULL = freehold, 1-999 = years remaining)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'lease_remaining_years') THEN
        ALTER TABLE property_sg ADD COLUMN lease_remaining_years INTEGER;
    END IF;

    -- Add constraint for valid lease range (if not exists)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lease_years') THEN
        ALTER TABLE property_sg ADD CONSTRAINT chk_lease_years
            CHECK (lease_remaining_years IS NULL OR (lease_remaining_years >= 1 AND lease_remaining_years <= 999));
    END IF;

    -- 2. Per-borrower CPF OA tracking for downpayment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_downpayment_cpf_oa') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_downpayment_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_downpayment_cpf_oa') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_downpayment_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
    END IF;

    -- 3. Per-borrower monthly CPF OA payments (fixed amount per month)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_monthly_cpf_oa') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_monthly_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_monthly_cpf_oa') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_monthly_cpf_oa NUMERIC(15,4) DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 4. Migrate existing downpayment_cpf_oa data to borrower1
-- (preserves existing data - total becomes borrower1's contribution)
-- This is safe to run multiple times since it only updates where borrower1 is 0
UPDATE property_sg
SET borrower1_downpayment_cpf_oa = downpayment_cpf_oa
WHERE downpayment_cpf_oa > 0 AND borrower1_downpayment_cpf_oa = 0;

-- Note: The original downpayment_cpf_oa and downpayment_cash columns are retained
-- for backward compatibility. They can be removed in a future migration once
-- the frontend is fully migrated to per-borrower fields.
