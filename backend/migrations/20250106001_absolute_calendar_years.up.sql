-- Convert start_year and end_year from relative indices (0,1,2,3...) to absolute calendar years (2025, 2026, 2030...)
-- This migration assumes the current year is 2025. Existing data will be converted accordingly.

-- For existing data, convert relative years to absolute years by adding 2025
UPDATE finance_assets SET start_year = start_year + 2025 WHERE start_year IS NOT NULL;
UPDATE finance_assets SET end_year = end_year + 2025 WHERE end_year IS NOT NULL;

UPDATE finance_liabilities SET start_year = start_year + 2025 WHERE start_year IS NOT NULL;
UPDATE finance_liabilities SET end_year = end_year + 2025 WHERE end_year IS NOT NULL;

UPDATE finance_incomes SET start_year = start_year + 2025 WHERE start_year IS NOT NULL;
UPDATE finance_incomes SET end_year = end_year + 2025 WHERE end_year IS NOT NULL;

UPDATE finance_expenses SET start_year = start_year + 2025 WHERE start_year IS NOT NULL;
UPDATE finance_expenses SET end_year = end_year + 2025 WHERE end_year IS NOT NULL;

UPDATE cash_accounts SET start_year = start_year + 2025 WHERE start_year IS NOT NULL;
UPDATE cash_accounts SET end_year = end_year + 2025 WHERE end_year IS NOT NULL;

-- Update column comments to reflect the change
COMMENT ON COLUMN finance_assets.start_year IS 'Absolute calendar year (e.g., 2025, 2030) when this asset starts. Backend calculates year index dynamically.';
COMMENT ON COLUMN finance_assets.end_year IS 'Absolute calendar year when this asset ends. NULL means no end date.';

COMMENT ON COLUMN finance_liabilities.start_year IS 'Absolute calendar year (e.g., 2025, 2030) when this liability starts. Backend calculates year index dynamically.';
COMMENT ON COLUMN finance_liabilities.end_year IS 'Absolute calendar year when this liability ends. NULL means no end date.';

COMMENT ON COLUMN finance_incomes.start_year IS 'Absolute calendar year (e.g., 2025, 2030) when this income starts. Backend calculates year index dynamically.';
COMMENT ON COLUMN finance_incomes.end_year IS 'Absolute calendar year when this income ends. NULL means no end date.';

COMMENT ON COLUMN finance_expenses.start_year IS 'Absolute calendar year (e.g., 2025, 2030) when this expense starts. Backend calculates year index dynamically.';
COMMENT ON COLUMN finance_expenses.end_year IS 'Absolute calendar year when this expense ends. NULL means no end date.';

COMMENT ON COLUMN cash_accounts.start_year IS 'Absolute calendar year (e.g., 2025, 2030) when this cash account starts. Backend calculates year index dynamically.';
COMMENT ON COLUMN cash_accounts.end_year IS 'Absolute calendar year when this cash account ends. NULL means no end date.';
