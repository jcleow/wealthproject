-- Rollback: Restore original liability_rate_periods schema

-- Step 1: Add back old columns
ALTER TABLE liability_rate_periods
    ADD COLUMN fixed_years INT NOT NULL DEFAULT 0,
    ADD COLUMN fixed_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
    ADD COLUMN floating_rate NUMERIC(10,4) NOT NULL DEFAULT 0;

-- Step 2: Migrate data back (set fixed_rate from rate where rate_type='fixed')
UPDATE liability_rate_periods
SET
    fixed_rate = CASE WHEN rate_type = 'fixed' THEN rate ELSE 0 END,
    floating_rate = CASE WHEN rate_type = 'floating' THEN rate ELSE 0 END;

-- Step 3: Drop new columns and constraint
ALTER TABLE liability_rate_periods
    DROP CONSTRAINT IF EXISTS chk_rate_type,
    DROP COLUMN rate,
    DROP COLUMN rate_type;
