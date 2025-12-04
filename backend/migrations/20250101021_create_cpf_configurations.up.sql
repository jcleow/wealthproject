-- Create cpf_configurations table for versioned CPF policy data
-- Government rates, ceilings, and thresholds change annually
CREATE TABLE IF NOT EXISTS cpf_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year)
);

-- Index for efficient date-based lookups
CREATE INDEX idx_cpf_config_effective ON cpf_configurations(effective_from, effective_to);

COMMENT ON TABLE cpf_configurations IS
'Versioned CPF policy configurations. Each row represents a policy year with rates, ceilings, and thresholds stored in JSONB for flexibility.';

COMMENT ON COLUMN cpf_configurations.config IS
'JSONB containing: owCeiling, annualCeiling, retirementSums (brs/frs/ers), bhs, interestRates, contributionRates (by residency and age), allocationRates (by age)';
