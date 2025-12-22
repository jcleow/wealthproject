-- Add delta_type column to all finance tables for percentage-based delta impacts
-- delta_type: 'absolute' (default) or 'percentage'
-- Only relevant for delta impacts, NULL for other impact kinds or base items

-- finance_incomes
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));

-- finance_expenses
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));

-- finance_assets
ALTER TABLE finance_assets
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));

-- finance_liabilities
ALTER TABLE finance_liabilities
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));

-- finance_investments
ALTER TABLE finance_investments
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));

-- finance_cash_accounts
ALTER TABLE finance_cash_accounts
ADD COLUMN IF NOT EXISTS delta_type VARCHAR(20) DEFAULT NULL
    CHECK (delta_type IS NULL OR delta_type IN ('absolute', 'percentage'));
