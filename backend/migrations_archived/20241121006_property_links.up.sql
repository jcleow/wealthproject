-- Migration: Create property_links bridge table
CREATE TABLE IF NOT EXISTS property_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_scenario_id UUID NOT NULL REFERENCES property_scenarios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES finance_assets(id) ON DELETE CASCADE,
    liability_id UUID NOT NULL REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_links_scenario_idx ON property_links(property_scenario_id);
CREATE INDEX IF NOT EXISTS property_links_asset_idx ON property_links(asset_id);
CREATE INDEX IF NOT EXISTS property_links_liability_idx ON property_links(liability_id);

-- Enforce one loan per asset per scenario (current rule) and prevent duplicates.
ALTER TABLE property_links
    ADD CONSTRAINT property_links_unique_scenario_asset UNIQUE (property_scenario_id, asset_id);

ALTER TABLE property_links
    ADD CONSTRAINT property_links_unique_triplet UNIQUE (property_scenario_id, asset_id, liability_id);
