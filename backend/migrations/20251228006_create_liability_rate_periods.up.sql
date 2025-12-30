-- Create liability_rate_periods table for loan segments/refinancing scenarios
CREATE TABLE liability_rate_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Polymorphic reference
    property_scenario_id UUID REFERENCES property_scenarios(id) ON DELETE CASCADE,
    liability_id UUID,  -- Future: REFERENCES finance_liabilities(id)

    period_order INT NOT NULL DEFAULT 0,        -- For ordering segments
    start_month VARCHAR(7) NOT NULL,            -- e.g., '2025-01'
    term_years INT NOT NULL,                    -- Duration of this segment
    fixed_years INT NOT NULL DEFAULT 0,
    fixed_rate NUMERIC(10,4) NOT NULL,
    floating_rate NUMERIC(10,4) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rate_period_parent CHECK (
        (property_scenario_id IS NOT NULL AND liability_id IS NULL)
        OR (liability_id IS NOT NULL AND property_scenario_id IS NULL)
    )
);

CREATE INDEX idx_liability_rate_periods_property ON liability_rate_periods(property_scenario_id);
CREATE INDEX idx_liability_rate_periods_liability ON liability_rate_periods(liability_id);
CREATE INDEX idx_liability_rate_periods_order ON liability_rate_periods(property_scenario_id, period_order);
