-- CPF Assumptions table for storing user-specific projection assumptions
CREATE TABLE cpf_assumptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    cpf_account_id uuid NOT NULL REFERENCES cpf_accounts(id) ON DELETE CASCADE,

    -- Interest rate assumptions (stored as decimals, e.g., 0.025 = 2.5%)
    interest_rate_oa numeric(6,4) DEFAULT 0.025 NOT NULL,
    interest_rate_sa numeric(6,4) DEFAULT 0.04 NOT NULL,
    interest_rate_ma numeric(6,4) DEFAULT 0.04 NOT NULL,
    interest_rate_ra numeric(6,4) DEFAULT 0.04 NOT NULL,
    extra_interest_first_60k numeric(6,4) DEFAULT 0.01 NOT NULL,
    extra_interest_first_30k_above_55 numeric(6,4) DEFAULT 0.01 NOT NULL,

    -- Growth rate assumptions
    -- NOTE: inflation_rate and salary_growth_rate are global, not CPF-specific
    frs_growth_rate numeric(6,4) DEFAULT 0.035 NOT NULL,

    -- Employment assumptions
    -- NOTE: assume_continuous_employment is a global life planning assumption
    retirement_age integer DEFAULT 65 NOT NULL,

    -- CPF LIFE assumptions
    cpf_life_plan character varying(20) DEFAULT 'standard' NOT NULL
        CHECK (cpf_life_plan IN ('standard', 'basic', 'escalating')),
    payout_start_age integer DEFAULT 65 NOT NULL
        CHECK (payout_start_age BETWEEN 65 AND 70),
    escalating_plan_growth numeric(6,4) DEFAULT 0.02 NOT NULL,

    -- Preset tracking
    preset_name character varying(20) DEFAULT 'official' NOT NULL
        CHECK (preset_name IN ('official', 'conservative', 'optimistic', 'custom')),

    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,

    UNIQUE (cpf_account_id)
);

CREATE INDEX idx_cpf_assumptions_account ON cpf_assumptions(cpf_account_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cpf_assumptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER cpf_assumptions_updated_at
    BEFORE UPDATE ON cpf_assumptions
    FOR EACH ROW
    EXECUTE FUNCTION update_cpf_assumptions_updated_at();
