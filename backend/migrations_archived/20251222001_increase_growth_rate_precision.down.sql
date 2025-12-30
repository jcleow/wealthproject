-- Revert growth_rate precision back to original
ALTER TABLE finance_assets ALTER COLUMN growth_rate TYPE numeric(6,4);
ALTER TABLE finance_incomes ALTER COLUMN growth_rate TYPE numeric(6,4);
ALTER TABLE finance_expenses ALTER COLUMN growth_rate TYPE numeric(6,4);
ALTER TABLE finance_investments ALTER COLUMN growth_rate TYPE numeric(6,4);
