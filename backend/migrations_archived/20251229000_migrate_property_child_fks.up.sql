-- Migration: Change child tables (growth_periods, liability_rate_periods, property_fees)
-- to link directly to property_sg_details instead of property_scenarios
-- This makes property_sg_details self-contained and duplicatable.

-- ============================================================================
-- STEP 1: Add new FK columns to growth_periods
-- ============================================================================
ALTER TABLE growth_periods
    ADD COLUMN sg_details_id UUID,
    ADD COLUMN my_details_id UUID;

-- Migrate existing data: property_scenario_id -> sg_details_id
UPDATE growth_periods gp
SET sg_details_id = ps.sg_details_id
FROM property_scenarios ps
WHERE gp.property_scenario_id = ps.id AND ps.sg_details_id IS NOT NULL;

-- Drop old FK constraint and column
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_property_scenario_id_fkey;
DROP INDEX IF EXISTS idx_growth_periods_property;
ALTER TABLE growth_periods DROP COLUMN property_scenario_id;

-- Add new FK constraints
ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg_details(id) ON DELETE CASCADE;

-- Rename asset_id to finance_asset_id for clarity and add other entity FKs
ALTER TABLE growth_periods RENAME COLUMN asset_id TO finance_asset_id;

-- Add finance_income_id and finance_investment_id for future use
ALTER TABLE growth_periods
    ADD COLUMN finance_income_id UUID REFERENCES finance_incomes(id) ON DELETE CASCADE,
    ADD COLUMN finance_investment_id UUID REFERENCES finance_investments(id) ON DELETE CASCADE;

-- Update constraint to reflect new columns
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS chk_growth_period_parent;
ALTER TABLE growth_periods ADD CONSTRAINT chk_growth_period_single_entity CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (finance_asset_id IS NOT NULL)::int +
    (finance_income_id IS NOT NULL)::int +
    (finance_investment_id IS NOT NULL)::int = 1
);

-- Create indexes for new columns
CREATE INDEX idx_growth_periods_sg_details ON growth_periods(sg_details_id);
CREATE INDEX idx_growth_periods_finance_asset ON growth_periods(finance_asset_id);

-- ============================================================================
-- STEP 2: Add new FK columns to liability_rate_periods
-- ============================================================================
ALTER TABLE liability_rate_periods
    ADD COLUMN sg_details_id UUID,
    ADD COLUMN my_details_id UUID;

-- Migrate existing data: property_scenario_id -> sg_details_id
UPDATE liability_rate_periods lrp
SET sg_details_id = ps.sg_details_id
FROM property_scenarios ps
WHERE lrp.property_scenario_id = ps.id AND ps.sg_details_id IS NOT NULL;

-- Drop old FK constraint and column
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_property_scenario_id_fkey;
DROP INDEX IF EXISTS idx_liability_rate_periods_property;
DROP INDEX IF EXISTS idx_liability_rate_periods_order;
ALTER TABLE liability_rate_periods DROP COLUMN property_scenario_id;

-- Add new FK constraints
ALTER TABLE liability_rate_periods
    ADD CONSTRAINT liability_rate_periods_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg_details(id) ON DELETE CASCADE;

-- Update constraint to reflect new columns
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS chk_rate_period_parent;
ALTER TABLE liability_rate_periods ADD CONSTRAINT chk_rate_period_single_entity CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (liability_id IS NOT NULL)::int = 1
);

-- Create indexes for new columns
CREATE INDEX idx_liability_rate_periods_sg_details ON liability_rate_periods(sg_details_id);
CREATE INDEX idx_liability_rate_periods_sg_details_order ON liability_rate_periods(sg_details_id, period_order);

-- ============================================================================
-- STEP 3: Add new FK columns to property_fees
-- ============================================================================
ALTER TABLE property_fees
    ADD COLUMN sg_details_id UUID,
    ADD COLUMN my_details_id UUID;

-- Migrate existing data: scenario_id -> sg_details_id
UPDATE property_fees pf
SET sg_details_id = ps.sg_details_id
FROM property_scenarios ps
WHERE pf.scenario_id = ps.id AND ps.sg_details_id IS NOT NULL;

-- Drop old FK constraint and column
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_scenario_id_fkey;
DROP INDEX IF EXISTS idx_property_fees_scenario;
DROP INDEX IF EXISTS idx_property_fees_context;
ALTER TABLE property_fees DROP COLUMN scenario_id;

-- Add new FK constraints
ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg_details(id) ON DELETE CASCADE;

-- Add constraint for single parent
ALTER TABLE property_fees ADD CONSTRAINT chk_property_fee_single_parent CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int = 1
);

-- Create indexes for new columns
CREATE INDEX idx_property_fees_sg_details ON property_fees(sg_details_id);
CREATE INDEX idx_property_fees_sg_details_context ON property_fees(sg_details_id, fee_context);

-- ============================================================================
-- STEP 4: Add index for included properties (for timeline queries)
-- ============================================================================
CREATE INDEX idx_property_sg_details_included ON property_sg_details(is_included) WHERE is_included = true;
