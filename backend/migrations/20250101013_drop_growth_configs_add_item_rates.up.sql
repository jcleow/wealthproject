-- Drop growth_configs table (defaults now stored in code)
DROP TABLE IF EXISTS growth_configs;

-- Add growth_rate column to finance_incomes
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS growth_rate DOUBLE PRECISION NOT NULL DEFAULT 3.0;

-- Add growth_rate column to finance_expenses
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS growth_rate DOUBLE PRECISION NOT NULL DEFAULT 2.0;
