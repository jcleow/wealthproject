-- Migrate property_scenarios to v2 structure
-- This migration handles both fresh db and existing db with legacy data

-- First, check if we have the legacy table structure (has property_type column)
-- and need to migrate it to the new v2 structure
DO $$
BEGIN
    -- Check if property_scenarios has the legacy structure (property_type column)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'property_scenarios' AND column_name = 'property_type'
    ) THEN
        -- Drop constraints from tables that reference the legacy property_scenarios
        -- Only drop if those tables actually exist (for existing db migration)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'growth_periods') THEN
            ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_property_scenario_id_fkey;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'liability_rate_periods') THEN
            ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_property_scenario_id_fkey;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_fees') THEN
            ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_scenario_id_fkey;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_links') THEN
            ALTER TABLE property_links DROP CONSTRAINT IF EXISTS property_links_property_scenario_id_fkey;
        END IF;

        -- Drop any existing legacy table from previous failed migration
        DROP TABLE IF EXISTS property_scenarios_legacy CASCADE;

        -- Rename legacy table
        ALTER TABLE property_scenarios RENAME TO property_scenarios_legacy;
        ALTER INDEX IF EXISTS property_scenarios_pkey RENAME TO property_scenarios_legacy_pkey;
        ALTER INDEX IF EXISTS idx_property_scenarios_user_id RENAME TO idx_property_scenarios_legacy_user_id;
        ALTER INDEX IF EXISTS property_scenarios_type_idx RENAME TO property_scenarios_legacy_type_idx;
    END IF;
END $$;

-- Create new property_scenarios v2 header table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_scenarios (
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

CREATE INDEX IF NOT EXISTS idx_property_scenarios_user ON property_scenarios(user_id);
