-- Remove growth_rate column from finance_incomes
ALTER TABLE finance_incomes
DROP COLUMN IF EXISTS growth_rate;

-- Remove growth_rate column from finance_expenses
ALTER TABLE finance_expenses
DROP COLUMN IF EXISTS growth_rate;

-- Recreate growth_configs table
CREATE TABLE IF NOT EXISTS growth_configs (
    category TEXT PRIMARY KEY,
    annual_rate_pct DOUBLE PRECISION NOT NULL,
    lower_bound_pct DOUBLE PRECISION NOT NULL,
    upper_bound_pct DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed balanced defaults
INSERT INTO growth_configs (category, annual_rate_pct, lower_bound_pct, upper_bound_pct)
VALUES
    ('asset_cash', 1.5, -50, 50),
    ('asset_equity', 6.0, -50, 50),
    ('asset_property', 3.0, -50, 50),
    ('liability_debt', -3.0, -50, 50),
    ('income', 3.0, -50, 50),
    ('expense', 2.0, -50, 50)
ON CONFLICT (category) DO NOTHING;
