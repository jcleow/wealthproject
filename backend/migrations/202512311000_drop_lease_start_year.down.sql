-- Restore lease_start_year column to finance_assets
ALTER TABLE finance_assets ADD COLUMN IF NOT EXISTS lease_start_year INTEGER DEFAULT NULL;
COMMENT ON COLUMN finance_assets.lease_start_year IS 'For leasehold properties: year lease started. Used with end_date to calculate remaining lease years.';
