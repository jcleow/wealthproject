-- Convert start_date and end_date from VARCHAR(7) to TIMESTAMPTZ
-- Existing data in YYYY-MM format will be converted to first day of month at midnight UTC

-- Add temporary columns
ALTER TABLE property_fees ADD COLUMN start_date_new TIMESTAMPTZ;
ALTER TABLE property_fees ADD COLUMN end_date_new TIMESTAMPTZ;

-- Migrate existing data (YYYY-MM -> YYYY-MM-01 00:00:00 UTC)
UPDATE property_fees
SET start_date_new = (start_date || '-01')::DATE::TIMESTAMPTZ
WHERE start_date IS NOT NULL AND start_date != '';

UPDATE property_fees
SET end_date_new = (end_date || '-01')::DATE::TIMESTAMPTZ
WHERE end_date IS NOT NULL AND end_date != '';

-- Drop old columns
ALTER TABLE property_fees DROP COLUMN start_date;
ALTER TABLE property_fees DROP COLUMN end_date;

-- Rename new columns
ALTER TABLE property_fees RENAME COLUMN start_date_new TO start_date;
ALTER TABLE property_fees RENAME COLUMN end_date_new TO end_date;
