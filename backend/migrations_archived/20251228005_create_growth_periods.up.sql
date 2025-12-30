-- Create growth_periods table for property appreciation and asset growth
CREATE TABLE growth_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Polymorphic reference (one of these must be set)
    property_scenario_id UUID REFERENCES property_scenarios(id) ON DELETE CASCADE,
    asset_id UUID,  -- Future: REFERENCES finance_assets(id)

    start_year INT NOT NULL,
    end_year INT,                               -- NULL means "indefinitely"
    growth_rate NUMERIC(10,4) NOT NULL,         -- e.g., 3.0 for 3%
    growth_strategy VARCHAR(20) NOT NULL DEFAULT 'annual_step',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_growth_period_parent CHECK (
        (property_scenario_id IS NOT NULL AND asset_id IS NULL)
        OR (asset_id IS NOT NULL AND property_scenario_id IS NULL)
    )
);

CREATE INDEX idx_growth_periods_property ON growth_periods(property_scenario_id);
CREATE INDEX idx_growth_periods_asset ON growth_periods(asset_id);

ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_strategy_check
    CHECK (growth_strategy IN ('fixed', 'annual_step', 'compound_monthly', 'tiered_adb'));
