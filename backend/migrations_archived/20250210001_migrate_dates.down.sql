-- Rollback: Clear the populated start_date and end_date columns
-- This restores the state before data migration (old year/month columns remain intact)

UPDATE finance_assets SET start_date = NULL, end_date = NULL;
UPDATE finance_liabilities SET start_date = NULL, end_date = NULL;
UPDATE finance_incomes SET start_date = NULL, end_date = NULL;
UPDATE finance_expenses SET start_date = NULL, end_date = NULL;
UPDATE cash_accounts SET start_date = NULL, end_date = NULL;

-- Drop the helper function
DROP FUNCTION IF EXISTS get_last_day_of_month(INT, INT);

RAISE NOTICE 'Date migration rolled back - all start_date and end_date columns cleared';
