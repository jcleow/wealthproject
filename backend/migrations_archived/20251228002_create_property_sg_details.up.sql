-- Create property_sg_details table for Singapore-specific property data
CREATE TABLE property_sg_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(100) NOT NULL,
    property_type VARCHAR(20) NOT NULL,          -- 'hdb' | 'private'
    property_subtype VARCHAR(30) NOT NULL,        -- 'bto' | 'resale' | 'ec' | 'new'

    -- Display
    icon VARCHAR(50),
    icon_color VARCHAR(20),
    is_included BOOLEAN NOT NULL DEFAULT true,

    -- Pricing
    property_price NUMERIC(15,4) NOT NULL,
    valuation_price NUMERIC(15,4),

    -- Loan Configuration
    loan_type VARCHAR(10) NOT NULL DEFAULT 'bank', -- 'bank' | 'hdb'

    -- Downpayment
    downpayment_cpf_oa NUMERIC(15,4) NOT NULL DEFAULT 0,
    downpayment_cash NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- Borrower Configuration
    borrower_type VARCHAR(10) NOT NULL DEFAULT 'single', -- 'single' | 'joint'
    borrower1_income_id UUID REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower1_cpf_account_id UUID REFERENCES cpf_accounts(id) ON DELETE SET NULL,
    borrower2_income_id UUID REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower2_cpf_account_id UUID REFERENCES cpf_accounts(id) ON DELETE SET NULL,

    -- Other Debt (for TDSR)
    other_debt NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- ABSD inputs (residency is DERIVED from borrower1_income_id → finance_incomes.residency_status)
    property_count INT NOT NULL DEFAULT 0,  -- Existing properties owned (0 = first property)

    -- HDB Grants
    grants NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- BTO-specific (staggered payments now in liability_rate_periods)
    bto_launch_date VARCHAR(7),              -- e.g., '2025-01'
    bto_key_collection_date VARCHAR(7),      -- e.g., '2028-06'

    -- Sale Planning
    sale_expected_date VARCHAR(7),           -- e.g., '2035-06'
    sale_expected_price NUMERIC(15,4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_property_type_check
    CHECK (property_type IN ('hdb', 'private'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_property_subtype_check
    CHECK (property_subtype IN ('bto', 'resale', 'ec', 'new'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_loan_type_check
    CHECK (loan_type IN ('bank', 'hdb'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_borrower_type_check
    CHECK (borrower_type IN ('single', 'joint'));

-- Note: residency is not stored - it's DERIVED from linked finance_incomes.residency_status
