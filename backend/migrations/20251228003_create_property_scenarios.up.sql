-- Rename legacy property_scenarios table to make room for v2 structure
-- First drop constraints that reference it (will be recreated or replaced)
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_property_scenario_id_fkey;
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_property_scenario_id_fkey;
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_scenario_id_fkey;
ALTER TABLE property_links DROP CONSTRAINT IF EXISTS property_links_property_scenario_id_fkey;

-- Rename legacy table
ALTER TABLE property_scenarios RENAME TO property_scenarios_legacy;
ALTER INDEX IF EXISTS property_scenarios_pkey RENAME TO property_scenarios_legacy_pkey;
ALTER INDEX IF EXISTS idx_property_scenarios_user_id RENAME TO idx_property_scenarios_legacy_user_id;
ALTER INDEX IF EXISTS property_scenarios_type_idx RENAME TO property_scenarios_legacy_type_idx;

-- Create new property_scenarios v2 header table (one per user scenario)
CREATE TABLE property_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,

    sg_details_id UUID REFERENCES property_sg_details(id) ON DELETE CASCADE,
    my_details_id UUID,  -- Future: REFERENCES property_my_details(id)

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_one_country_detail CHECK (
        (sg_details_id IS NOT NULL AND my_details_id IS NULL)
        OR (my_details_id IS NOT NULL AND sg_details_id IS NULL)
    )
);

CREATE INDEX idx_property_scenarios_user ON property_scenarios(user_id);
