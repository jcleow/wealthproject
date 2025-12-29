-- Rollback migration: Restore child tables to link to property_scenarios

-- ============================================================================
-- STEP 1: Restore growth_periods
-- ============================================================================
DROP INDEX IF EXISTS idx_growth_periods_sg_details;
DROP INDEX IF EXISTS idx_growth_periods_finance_asset;
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS chk_growth_period_single_entity;
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_sg_details_id_fkey;

-- Add back property_scenario_id
ALTER TABLE growth_periods ADD COLUMN property_scenario_id UUID;

-- Migrate data back: sg_details_id -> property_scenario_id
UPDATE growth_periods gp
SET property_scenario_id = ps.id
FROM property_scenarios ps
WHERE gp.sg_details_id = ps.sg_details_id;

-- Drop new columns
ALTER TABLE growth_periods DROP COLUMN sg_details_id;
ALTER TABLE growth_periods DROP COLUMN my_details_id;
ALTER TABLE growth_periods DROP COLUMN finance_income_id;
ALTER TABLE growth_periods DROP COLUMN finance_investment_id;

-- Rename back
ALTER TABLE growth_periods RENAME COLUMN finance_asset_id TO asset_id;

-- Add back old FK
ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_property_scenario_id_fkey
    FOREIGN KEY (property_scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;

-- Add back old constraint
ALTER TABLE growth_periods ADD CONSTRAINT chk_growth_period_parent CHECK (
    property_scenario_id IS NOT NULL AND asset_id IS NULL OR asset_id IS NOT NULL AND property_scenario_id IS NULL
);

CREATE INDEX idx_growth_periods_property ON growth_periods(property_scenario_id);

-- ============================================================================
-- STEP 2: Restore liability_rate_periods
-- ============================================================================
DROP INDEX IF EXISTS idx_liability_rate_periods_sg_details;
DROP INDEX IF EXISTS idx_liability_rate_periods_sg_details_order;
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS chk_rate_period_single_entity;
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_sg_details_id_fkey;

-- Add back property_scenario_id
ALTER TABLE liability_rate_periods ADD COLUMN property_scenario_id UUID;

-- Migrate data back
UPDATE liability_rate_periods lrp
SET property_scenario_id = ps.id
FROM property_scenarios ps
WHERE lrp.sg_details_id = ps.sg_details_id;

-- Drop new columns
ALTER TABLE liability_rate_periods DROP COLUMN sg_details_id;
ALTER TABLE liability_rate_periods DROP COLUMN my_details_id;

-- Add back old FK
ALTER TABLE liability_rate_periods
    ADD CONSTRAINT liability_rate_periods_property_scenario_id_fkey
    FOREIGN KEY (property_scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;

-- Add back old constraint
ALTER TABLE liability_rate_periods ADD CONSTRAINT chk_rate_period_parent CHECK (
    property_scenario_id IS NOT NULL AND liability_id IS NULL OR liability_id IS NOT NULL AND property_scenario_id IS NULL
);

CREATE INDEX idx_liability_rate_periods_property ON liability_rate_periods(property_scenario_id);
CREATE INDEX idx_liability_rate_periods_order ON liability_rate_periods(property_scenario_id, period_order);

-- ============================================================================
-- STEP 3: Restore property_fees
-- ============================================================================
DROP INDEX IF EXISTS idx_property_fees_sg_details;
DROP INDEX IF EXISTS idx_property_fees_sg_details_context;
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS chk_property_fee_single_parent;
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_sg_details_id_fkey;

-- Add back scenario_id
ALTER TABLE property_fees ADD COLUMN scenario_id UUID;

-- Migrate data back
UPDATE property_fees pf
SET scenario_id = ps.id
FROM property_scenarios ps
WHERE pf.sg_details_id = ps.sg_details_id;

-- Make scenario_id NOT NULL after migration
ALTER TABLE property_fees ALTER COLUMN scenario_id SET NOT NULL;

-- Drop new columns
ALTER TABLE property_fees DROP COLUMN sg_details_id;
ALTER TABLE property_fees DROP COLUMN my_details_id;

-- Add back old FK
ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_scenario_id_fkey
    FOREIGN KEY (scenario_id) REFERENCES property_scenarios(id) ON DELETE CASCADE;

CREATE INDEX idx_property_fees_scenario ON property_fees(scenario_id);
CREATE INDEX idx_property_fees_context ON property_fees(scenario_id, fee_context);

-- ============================================================================
-- STEP 4: Drop included index
-- ============================================================================
DROP INDEX IF EXISTS idx_property_sg_details_included;
