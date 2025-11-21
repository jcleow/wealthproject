-- Migration: Normalize property_scenarios columns (add core fields, drop legacy blobs)
ALTER TABLE property_scenarios
    ADD COLUMN IF NOT EXISTS property_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS down_payment DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loan_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loan_tenure INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE property_scenarios
    DROP COLUMN IF EXISTS loan_inputs,
    DROP COLUMN IF EXISTS summary;
