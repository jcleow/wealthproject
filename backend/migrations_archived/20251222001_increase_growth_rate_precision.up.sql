-- Increase growth_rate precision to allow larger percentage deltas (e.g., 100%, 200%)
-- Changed from numeric(6,4) to numeric(10,4) to allow values up to 999999.9999

ALTER TABLE finance_assets ALTER COLUMN growth_rate TYPE numeric(10,4);
ALTER TABLE finance_incomes ALTER COLUMN growth_rate TYPE numeric(10,4);
ALTER TABLE finance_expenses ALTER COLUMN growth_rate TYPE numeric(10,4);
ALTER TABLE finance_investments ALTER COLUMN growth_rate TYPE numeric(10,4);
