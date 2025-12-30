-- Rollback: Drop v2 property_scenarios table and restore legacy if it exists

-- Drop v2 property_scenarios table
DROP TABLE IF EXISTS property_scenarios;

-- Restore legacy table name only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'property_scenarios_legacy'
    ) THEN
        ALTER TABLE property_scenarios_legacy RENAME TO property_scenarios;
        ALTER INDEX IF EXISTS property_scenarios_legacy_pkey RENAME TO property_scenarios_pkey;
        ALTER INDEX IF EXISTS idx_property_scenarios_legacy_user_id RENAME TO idx_property_scenarios_user_id;
        ALTER INDEX IF EXISTS property_scenarios_legacy_type_idx RENAME TO property_scenarios_type_idx;

        -- Restore FK constraints to legacy table
        ALTER TABLE growth_periods
            ADD CONSTRAINT growth_periods_property_scenario_id_fkey
            FOREIGN KEY (property_scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;
        ALTER TABLE liability_rate_periods
            ADD CONSTRAINT liability_rate_periods_property_scenario_id_fkey
            FOREIGN KEY (property_scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;
        ALTER TABLE property_fees
            ADD CONSTRAINT property_fees_scenario_id_fkey
            FOREIGN KEY (scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;
        ALTER TABLE property_links
            ADD CONSTRAINT property_links_property_scenario_id_fkey
            FOREIGN KEY (property_scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;
    END IF;
END $$;
