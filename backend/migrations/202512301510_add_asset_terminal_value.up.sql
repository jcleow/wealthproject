-- Add terminal value and lease start year to finance_assets
-- Terminal value: the value an asset becomes at its end_date (e.g., 0 for leasehold property at lease expiry)
-- Lease start year: convenience field for Singapore leasehold properties (e.g., 1990 for a 99-year HDB)
-- NOTE: This migration is idempotent - safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_assets' AND column_name = 'terminal_value') THEN
        ALTER TABLE finance_assets ADD COLUMN terminal_value NUMERIC(15,4) DEFAULT NULL;
        COMMENT ON COLUMN finance_assets.terminal_value IS 'Value asset becomes at end_date. NULL = current behavior (asset disappears), 0 = worthless (e.g., leasehold expires)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_assets' AND column_name = 'lease_start_year') THEN
        ALTER TABLE finance_assets ADD COLUMN lease_start_year INTEGER DEFAULT NULL;
        COMMENT ON COLUMN finance_assets.lease_start_year IS 'For leasehold properties: year lease started. Used with end_date to calculate remaining lease years.';
    END IF;
END $$;
