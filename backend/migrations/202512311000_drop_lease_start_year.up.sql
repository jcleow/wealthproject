-- Drop lease_start_year column from finance_assets
-- The start_date field provides sufficient information for leasehold calculations
ALTER TABLE finance_assets DROP COLUMN IF EXISTS lease_start_year;
