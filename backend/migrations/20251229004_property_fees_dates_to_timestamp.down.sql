-- Revert start_date and end_date from TIMESTAMPTZ back to VARCHAR(7)

-- Add temporary columns
ALTER TABLE property_fees ADD COLUMN start_date_old VARCHAR(7);
ALTER TABLE property_fees ADD COLUMN end_date_old VARCHAR(7);

-- Migrate data back (TIMESTAMPTZ -> YYYY-MM)
UPDATE property_fees
SET start_date_old = TO_CHAR(start_date, 'YYYY-MM')
WHERE start_date IS NOT NULL;

UPDATE property_fees
SET end_date_old = TO_CHAR(end_date, 'YYYY-MM')
WHERE end_date IS NOT NULL;

-- Drop new columns
ALTER TABLE property_fees DROP COLUMN start_date;
ALTER TABLE property_fees DROP COLUMN end_date;

-- Rename old columns back
ALTER TABLE property_fees RENAME COLUMN start_date_old TO start_date;
ALTER TABLE property_fees RENAME COLUMN end_date_old TO end_date;
