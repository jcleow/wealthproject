-- Migration: Rename property_sg_details -> property_sg
-- And rename sg_details_id FK columns -> property_sg_id
-- Also convert growth_periods and liability_rate_periods to use timestamptz dates

-- ============================================================================
-- STEP 1: Rename property_sg_details table to property_sg
-- ============================================================================
ALTER TABLE property_sg_details RENAME TO property_sg;

-- Update constraint names to match new table name
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_details_property_type_check TO property_sg_property_type_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_details_property_subtype_check TO property_sg_property_subtype_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_details_loan_type_check TO property_sg_loan_type_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_details_borrower_type_check TO property_sg_borrower_type_check;

-- Rename index
ALTER INDEX idx_property_sg_details_included RENAME TO idx_property_sg_included;

-- ============================================================================
-- STEP 2: Rename sg_details_id columns to property_sg_id in all tables
-- ============================================================================

-- property_scenarios
ALTER TABLE property_scenarios RENAME COLUMN sg_details_id TO property_sg_id;

-- property_fees
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_sg_details_id_fkey;
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS chk_property_fee_single_parent;
DROP INDEX IF EXISTS idx_property_fees_sg_details;
DROP INDEX IF EXISTS idx_property_fees_sg_details_context;

ALTER TABLE property_fees RENAME COLUMN sg_details_id TO property_sg_id;

ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_property_sg_id_fkey
    FOREIGN KEY (property_sg_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE property_fees ADD CONSTRAINT chk_property_fee_single_parent CHECK (
    (property_sg_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_property_fees_property_sg ON property_fees(property_sg_id);
CREATE INDEX idx_property_fees_property_sg_context ON property_fees(property_sg_id, fee_context);

-- growth_periods
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_sg_details_id_fkey;
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS chk_growth_period_single_entity;
DROP INDEX IF EXISTS idx_growth_periods_sg_details;

ALTER TABLE growth_periods RENAME COLUMN sg_details_id TO property_sg_id;

ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_property_sg_id_fkey
    FOREIGN KEY (property_sg_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE growth_periods ADD CONSTRAINT chk_growth_period_single_entity CHECK (
    (property_sg_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (finance_asset_id IS NOT NULL)::int +
    (finance_income_id IS NOT NULL)::int +
    (finance_investment_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_growth_periods_property_sg ON growth_periods(property_sg_id);

-- liability_rate_periods
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_sg_details_id_fkey;
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS chk_rate_period_single_entity;
DROP INDEX IF EXISTS idx_liability_rate_periods_sg_details;
DROP INDEX IF EXISTS idx_liability_rate_periods_sg_details_order;

ALTER TABLE liability_rate_periods RENAME COLUMN sg_details_id TO property_sg_id;

ALTER TABLE liability_rate_periods
    ADD CONSTRAINT liability_rate_periods_property_sg_id_fkey
    FOREIGN KEY (property_sg_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE liability_rate_periods ADD CONSTRAINT chk_rate_period_single_entity CHECK (
    (property_sg_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (liability_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_liability_rate_periods_property_sg ON liability_rate_periods(property_sg_id);
CREATE INDEX idx_liability_rate_periods_property_sg_order ON liability_rate_periods(property_sg_id, period_order);

-- property_sg_grants
ALTER TABLE property_sg_grants DROP CONSTRAINT IF EXISTS property_sg_grants_sg_details_id_fkey;
DROP INDEX IF EXISTS idx_property_sg_grants_sg_details;

ALTER TABLE property_sg_grants RENAME COLUMN sg_details_id TO property_sg_id;

ALTER TABLE property_sg_grants
    ADD CONSTRAINT property_sg_grants_property_sg_id_fkey
    FOREIGN KEY (property_sg_id) REFERENCES property_sg(id) ON DELETE CASCADE;
CREATE INDEX idx_property_sg_grants_property_sg ON property_sg_grants(property_sg_id);

-- ============================================================================
-- STEP 3: Convert growth_periods start_year/end_year to start_date/end_date
-- ============================================================================

-- Add new timestamptz columns
ALTER TABLE growth_periods ADD COLUMN start_date TIMESTAMPTZ;
ALTER TABLE growth_periods ADD COLUMN end_date TIMESTAMPTZ;

-- Migrate data: convert year to January 1st of that year
UPDATE growth_periods
SET start_date = make_timestamptz(start_year, 1, 1, 0, 0, 0, 'UTC')
WHERE start_year IS NOT NULL;

UPDATE growth_periods
SET end_date = make_timestamptz(end_year, 12, 31, 23, 59, 59, 'UTC')
WHERE end_year IS NOT NULL;

-- Make start_date NOT NULL after migration
ALTER TABLE growth_periods ALTER COLUMN start_date SET NOT NULL;

-- Drop old columns
ALTER TABLE growth_periods DROP COLUMN start_year;
ALTER TABLE growth_periods DROP COLUMN end_year;

-- ============================================================================
-- STEP 4: Convert liability_rate_periods start_month to start_date
-- ============================================================================

-- Add new timestamptz column
ALTER TABLE liability_rate_periods ADD COLUMN start_date TIMESTAMPTZ;

-- Migrate data: convert 'YYYY-MM' string to first day of month
UPDATE liability_rate_periods
SET start_date = (start_month || '-01')::date::timestamptz
WHERE start_month IS NOT NULL AND start_month ~ '^\d{4}-\d{2}$';

-- Make start_date NOT NULL after migration
ALTER TABLE liability_rate_periods ALTER COLUMN start_date SET NOT NULL;

-- Drop old column
ALTER TABLE liability_rate_periods DROP COLUMN start_month;
