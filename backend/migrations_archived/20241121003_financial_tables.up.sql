-- Migration: Create financial tables
CREATE TABLE IF NOT EXISTS finance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_value DOUBLE PRECISION NOT NULL,
    annual_growth_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_balance DOUBLE PRECISION NOT NULL,
    interest_rate_apr DOUBLE PRECISION NOT NULL DEFAULT 0,
    minimum_payment DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payee TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    frequency TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Normalized property scenarios table (core fields in columns, derived blobs in JSON)
CREATE TABLE IF NOT EXISTS property_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_type TEXT NOT NULL,
    headline TEXT NOT NULL,
    subheadline TEXT NOT NULL DEFAULT '',
    last_refreshed TEXT NOT NULL DEFAULT '',
    property_price DOUBLE PRECISION NOT NULL,
    down_payment DOUBLE PRECISION NOT NULL,
    loan_amount DOUBLE PRECISION NOT NULL,
    interest_rate DOUBLE PRECISION NOT NULL,
    loan_tenure INTEGER NOT NULL,
    notes TEXT,
    amortization JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    timeline JSONB NOT NULL DEFAULT '{}'::jsonb,
    milestones JSONB NOT NULL DEFAULT '{}'::jsonb,
    insights JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_scenarios_type_idx ON property_scenarios(property_type);
