-- Down migration: Remove terminal_value and lease_start_year columns from finance_assets
ALTER TABLE finance_assets
DROP COLUMN IF EXISTS terminal_value,
DROP COLUMN IF EXISTS lease_start_year;
