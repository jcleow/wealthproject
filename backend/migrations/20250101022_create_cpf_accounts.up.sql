-- Create cpf_accounts table for per-user CPF balances and profile
CREATE TABLE IF NOT EXISTS cpf_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,

    -- Current balances (in dollars, rounded to 2 decimal places)
    oa_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    sa_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    ma_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    ra_balance NUMERIC(15,2) NOT NULL DEFAULT 0,

    -- Housing tracking (for accrued interest calculation)
    oa_used_for_housing NUMERIC(15,2) NOT NULL DEFAULT 0,
    housing_start_date TIMESTAMPTZ,

    -- User profile for contribution rates
    date_of_birth DATE NOT NULL,
    residency_status TEXT NOT NULL DEFAULT 'citizen',
    pr_grant_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One CPF account per user
    CONSTRAINT cpf_accounts_user_id_unique UNIQUE (user_id),

    -- Valid residency statuses
    CONSTRAINT cpf_accounts_residency_check CHECK (
        residency_status IN ('citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus')
    )
);

-- Index for user queries
CREATE INDEX idx_cpf_accounts_user ON cpf_accounts(user_id);

COMMENT ON TABLE cpf_accounts IS
'Per-user CPF account balances and profile. Single row per user with OA/SA/MA/RA balances.';

COMMENT ON COLUMN cpf_accounts.oa_balance IS 'Ordinary Account balance in dollars';
COMMENT ON COLUMN cpf_accounts.sa_balance IS 'Special Account balance in dollars';
COMMENT ON COLUMN cpf_accounts.ma_balance IS 'MediSave Account balance in dollars';
COMMENT ON COLUMN cpf_accounts.ra_balance IS 'Retirement Account balance in dollars (only after age 55)';
COMMENT ON COLUMN cpf_accounts.oa_used_for_housing IS 'Total OA amount used for housing in dollars (for accrued interest calculation)';
COMMENT ON COLUMN cpf_accounts.residency_status IS 'citizen, pr_year_1, pr_year_2, or pr_year_3_plus - affects contribution rates';
