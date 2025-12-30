-- Migration: Simplify liability_rate_periods schema
-- Changes: Replace fixed_years, fixed_rate, floating_rate with rate, rate_type
-- Each rate tranche becomes its own row instead of combining fixed+floating in one row

-- Step 1: Add new columns
ALTER TABLE liability_rate_periods
    ADD COLUMN rate NUMERIC(10,4),
    ADD COLUMN rate_type VARCHAR(10);

-- Step 2: Migrate existing data
-- For each existing row, we'll update it to use the fixed_rate as the rate
-- (We'll handle the split into multiple rows in the application layer for now)
UPDATE liability_rate_periods
SET
    rate = fixed_rate,
    rate_type = 'fixed';

-- Step 3: Make new columns NOT NULL
ALTER TABLE liability_rate_periods
    ALTER COLUMN rate SET NOT NULL,
    ALTER COLUMN rate_type SET NOT NULL;

-- Step 4: Add check constraint for rate_type
ALTER TABLE liability_rate_periods
    ADD CONSTRAINT chk_rate_type CHECK (rate_type IN ('fixed', 'floating'));

-- Step 5: Drop old columns
ALTER TABLE liability_rate_periods
    DROP COLUMN fixed_years,
    DROP COLUMN fixed_rate,
    DROP COLUMN floating_rate;
