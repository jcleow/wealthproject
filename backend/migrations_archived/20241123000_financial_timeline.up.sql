-- Multiyear timeline support: growth config, overrides, and custom items

CREATE TABLE IF NOT EXISTS growth_configs (
    category TEXT PRIMARY KEY,
    annual_rate_pct DOUBLE PRECISION NOT NULL,
    lower_bound_pct DOUBLE PRECISION NOT NULL,
    upper_bound_pct DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('asset','liability','income','expense')),
    category TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('annual','monthly','weekly','biweekly','quarterly','semiannual')),
    created_year INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS financial_items_created_year_idx ON financial_items(created_year);

CREATE TABLE IF NOT EXISTS financial_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 0),
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('asset','liability','income','expense')),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('annual','monthly','weekly','biweekly','quarterly','semiannual')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, item_id)
);

-- Seed balanced defaults (values can be updated via API)
INSERT INTO growth_configs (category, annual_rate_pct, lower_bound_pct, upper_bound_pct)
VALUES
    ('asset_cash', 1.5, -50, 50),
    ('asset_equity', 6.0, -50, 50),
    ('asset_property', 3.0, -50, 50),
    ('liability_debt', -3.0, -50, 50),
    ('income', 3.0, -50, 50),
    ('expense', 2.0, -50, 50)
ON CONFLICT (category) DO NOTHING;
