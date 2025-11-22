-- Make down_payment optional and non-negative with default 0
ALTER TABLE property_scenarios
    ALTER COLUMN down_payment DROP NOT NULL,
    ALTER COLUMN down_payment SET DEFAULT 0,
    ALTER COLUMN down_payment TYPE DOUBLE PRECISION;

-- Ensure existing NULLs (if any) are set to 0
UPDATE property_scenarios SET down_payment = 0 WHERE down_payment IS NULL;
