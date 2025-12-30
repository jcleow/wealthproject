-- Create cash_accounts table for cash/liquid accounts (separate from finance_assets)
CREATE TABLE IF NOT EXISTS cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    interest_rate NUMERIC NOT NULL DEFAULT 1.5,
    bank_name VARCHAR(255),
    account_type VARCHAR(50),  -- 'checking', 'savings', 'money_market'
    is_accumulator BOOLEAN NOT NULL DEFAULT FALSE,
    start_year INT NOT NULL DEFAULT 0,
    end_year INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one accumulator account per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS cash_accounts_accumulator_idx
ON cash_accounts (user_id) WHERE is_accumulator = TRUE;

-- Index for user queries
CREATE INDEX IF NOT EXISTS cash_accounts_user_id_idx ON cash_accounts (user_id);

COMMENT ON TABLE cash_accounts IS
'Cash and liquid accounts - receives accumulated surplus from income minus expenses';
