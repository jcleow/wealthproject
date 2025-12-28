-- Create property_fees table for purchase, sale, and recurring fees
CREATE TABLE property_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES property_scenarios(id) ON DELETE CASCADE,

    fee_context VARCHAR(20) NOT NULL,          -- 'purchase' | 'sale' | 'recurring'
    fee_type VARCHAR(50) NOT NULL,              -- 'legal' | 'valuation' | 'agent' | 'property_tax' | etc.
    description VARCHAR(200),
    amount NUMERIC(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    frequency VARCHAR(20) NOT NULL DEFAULT 'one_time', -- 'one_time' | 'monthly' | 'yearly'
    start_date VARCHAR(7),                      -- For recurring fees
    end_date VARCHAR(7),                        -- For recurring fees

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_fees_scenario ON property_fees(scenario_id);
CREATE INDEX idx_property_fees_context ON property_fees(scenario_id, fee_context);

ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_context_check
    CHECK (fee_context IN ('purchase', 'sale', 'recurring'));

ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_frequency_check
    CHECK (frequency IN ('one_time', 'monthly', 'yearly'));
