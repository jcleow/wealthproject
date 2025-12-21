-- Rollback: Convert absolute calendar years back to relative indices
-- This assumes the current year is 2025

UPDATE finance_assets SET start_year = start_year - 2025 WHERE start_year IS NOT NULL;
UPDATE finance_assets SET end_year = end_year - 2025 WHERE end_year IS NOT NULL;

UPDATE finance_liabilities SET start_year = start_year - 2025 WHERE start_year IS NOT NULL;
UPDATE finance_liabilities SET end_year = end_year - 2025 WHERE end_year IS NOT NULL;

UPDATE finance_incomes SET start_year = start_year - 2025 WHERE start_year IS NOT NULL;
UPDATE finance_incomes SET end_year = end_year - 2025 WHERE end_year IS NOT NULL;

UPDATE finance_expenses SET start_year = start_year - 2025 WHERE start_year IS NOT NULL;
UPDATE finance_expenses SET end_year = end_year - 2025 WHERE end_year IS NOT NULL;

UPDATE cash_accounts SET start_year = start_year - 2025 WHERE start_year IS NOT NULL;
UPDATE cash_accounts SET end_year = end_year - 2025 WHERE end_year IS NOT NULL;

-- Restore original column comments
COMMENT ON COLUMN finance_assets.start_year IS NULL;
COMMENT ON COLUMN finance_assets.end_year IS NULL;
COMMENT ON COLUMN finance_liabilities.start_year IS NULL;
COMMENT ON COLUMN finance_liabilities.end_year IS NULL;
COMMENT ON COLUMN finance_incomes.start_year IS NULL;
COMMENT ON COLUMN finance_incomes.end_year IS NULL;
COMMENT ON COLUMN finance_expenses.start_year IS NULL;
COMMENT ON COLUMN finance_expenses.end_year IS NULL;
COMMENT ON COLUMN cash_accounts.start_year IS NULL;
COMMENT ON COLUMN cash_accounts.end_year IS NULL;
