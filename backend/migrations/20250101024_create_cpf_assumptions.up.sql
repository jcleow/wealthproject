-- Create cpf_assumptions table for user-specific CPF calculation parameters
CREATE TABLE IF NOT EXISTS cpf_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf_account_id UUID NOT NULL REFERENCES cpf_accounts(id) ON DELETE CASCADE,

    -- Interest rate assumptions (stored as decimals, e.g., 0.025 = 2.5%)
    interest_rate_oa NUMERIC(6,4) NOT NULL DEFAULT 0.025,
    interest_rate_sa NUMERIC(6,4) NOT NULL DEFAULT 0.04,
    interest_rate_ma NUMERIC(6,4) NOT NULL DEFAULT 0.04,
    interest_rate_ra NUMERIC(6,4) NOT NULL DEFAULT 0.04,
    extra_interest_first_60k NUMERIC(6,4) NOT NULL DEFAULT 0.01,
    extra_interest_first_30k_above_55 NUMERIC(6,4) NOT NULL DEFAULT 0.01,

    -- Growth rate assumptions
    inflation_rate NUMERIC(6,4) NOT NULL DEFAULT 0.02,
    frs_growth_rate NUMERIC(6,4) NOT NULL DEFAULT 0.035,
    salary_growth_rate NUMERIC(6,4) NOT NULL DEFAULT 0.03,

    -- Employment assumptions
    assume_continuous_employment BOOLEAN NOT NULL DEFAULT true,
    retirement_age INTEGER NOT NULL DEFAULT 65,

    -- CPF LIFE assumptions
    cpf_life_plan VARCHAR(20) NOT NULL DEFAULT 'standard'
        CHECK (cpf_life_plan IN ('standard', 'basic', 'escalating')),
    payout_start_age INTEGER NOT NULL DEFAULT 65
        CHECK (payout_start_age BETWEEN 65 AND 70),
    escalating_plan_growth NUMERIC(6,4) NOT NULL DEFAULT 0.02,

    -- Preset tracking
    preset_name VARCHAR(20) NOT NULL DEFAULT 'official'
        CHECK (preset_name IN ('official', 'conservative', 'optimistic', 'custom')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One set of assumptions per CPF account
    CONSTRAINT cpf_assumptions_account_unique UNIQUE (cpf_account_id)
);

-- Index for account lookups
CREATE INDEX idx_cpf_assumptions_account ON cpf_assumptions(cpf_account_id);

COMMENT ON TABLE cpf_assumptions IS
'User-specific CPF calculation assumptions. One row per CPF account with interest rates, growth rates, and retirement preferences.';

COMMENT ON COLUMN cpf_assumptions.preset_name IS 'official=CPF Board rates, conservative=lower growth, optimistic=higher growth, custom=user-defined';
COMMENT ON COLUMN cpf_assumptions.cpf_life_plan IS 'CPF LIFE plan type: standard (higher payout), basic (higher bequest), escalating (2% annual increase)';
