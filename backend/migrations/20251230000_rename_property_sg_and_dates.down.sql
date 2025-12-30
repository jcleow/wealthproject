-- Rollback: Undo property_sg rename and date conversions

-- ============================================================================
-- STEP 1: Restore liability_rate_periods start_month
-- ============================================================================
ALTER TABLE liability_rate_periods ADD COLUMN start_month VARCHAR(7);

UPDATE liability_rate_periods
SET start_month = to_char(start_date, 'YYYY-MM')
WHERE start_date IS NOT NULL;

ALTER TABLE liability_rate_periods ALTER COLUMN start_month SET NOT NULL;
ALTER TABLE liability_rate_periods DROP COLUMN start_date;

-- ============================================================================
-- STEP 2: Restore growth_periods start_year/end_year
-- ============================================================================
ALTER TABLE growth_periods ADD COLUMN start_year INT;
ALTER TABLE growth_periods ADD COLUMN end_year INT;

UPDATE growth_periods
SET start_year = EXTRACT(YEAR FROM start_date)
WHERE start_date IS NOT NULL;

UPDATE growth_periods
SET end_year = EXTRACT(YEAR FROM end_date)
WHERE end_date IS NOT NULL;

ALTER TABLE growth_periods ALTER COLUMN start_year SET NOT NULL;
ALTER TABLE growth_periods DROP COLUMN start_date;
ALTER TABLE growth_periods DROP COLUMN end_date;

-- ============================================================================
-- STEP 3: Rename property_sg_id columns back to sg_details_id
-- ============================================================================

-- property_sg_grants
ALTER TABLE property_sg_grants DROP CONSTRAINT IF EXISTS property_sg_grants_property_sg_id_fkey;
DROP INDEX IF EXISTS idx_property_sg_grants_property_sg;
ALTER TABLE property_sg_grants RENAME COLUMN property_sg_id TO sg_details_id;
ALTER TABLE property_sg_grants
    ADD CONSTRAINT property_sg_grants_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg(id) ON DELETE CASCADE;
CREATE INDEX idx_property_sg_grants_sg_details ON property_sg_grants(sg_details_id);

-- liability_rate_periods
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS liability_rate_periods_property_sg_id_fkey;
ALTER TABLE liability_rate_periods DROP CONSTRAINT IF EXISTS chk_rate_period_single_entity;
DROP INDEX IF EXISTS idx_liability_rate_periods_property_sg;
DROP INDEX IF EXISTS idx_liability_rate_periods_property_sg_order;
ALTER TABLE liability_rate_periods RENAME COLUMN property_sg_id TO sg_details_id;
ALTER TABLE liability_rate_periods
    ADD CONSTRAINT liability_rate_periods_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE liability_rate_periods ADD CONSTRAINT chk_rate_period_single_entity CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (liability_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_liability_rate_periods_sg_details ON liability_rate_periods(sg_details_id);
CREATE INDEX idx_liability_rate_periods_sg_details_order ON liability_rate_periods(sg_details_id, period_order);

-- growth_periods
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS growth_periods_property_sg_id_fkey;
ALTER TABLE growth_periods DROP CONSTRAINT IF EXISTS chk_growth_period_single_entity;
DROP INDEX IF EXISTS idx_growth_periods_property_sg;
ALTER TABLE growth_periods RENAME COLUMN property_sg_id TO sg_details_id;
ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE growth_periods ADD CONSTRAINT chk_growth_period_single_entity CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int +
    (finance_asset_id IS NOT NULL)::int +
    (finance_income_id IS NOT NULL)::int +
    (finance_investment_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_growth_periods_sg_details ON growth_periods(sg_details_id);

-- property_fees
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS property_fees_property_sg_id_fkey;
ALTER TABLE property_fees DROP CONSTRAINT IF EXISTS chk_property_fee_single_parent;
DROP INDEX IF EXISTS idx_property_fees_property_sg;
DROP INDEX IF EXISTS idx_property_fees_property_sg_context;
ALTER TABLE property_fees RENAME COLUMN property_sg_id TO sg_details_id;
ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_sg_details_id_fkey
    FOREIGN KEY (sg_details_id) REFERENCES property_sg(id) ON DELETE CASCADE;
ALTER TABLE property_fees ADD CONSTRAINT chk_property_fee_single_parent CHECK (
    (sg_details_id IS NOT NULL)::int +
    (my_details_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_property_fees_sg_details ON property_fees(sg_details_id);
CREATE INDEX idx_property_fees_sg_details_context ON property_fees(sg_details_id, fee_context);

-- property_scenarios
ALTER TABLE property_scenarios RENAME COLUMN property_sg_id TO sg_details_id;

-- ============================================================================
-- STEP 4: Rename property_sg back to property_sg_details
-- ============================================================================
ALTER INDEX idx_property_sg_included RENAME TO idx_property_sg_details_included;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_property_type_check TO property_sg_details_property_type_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_property_subtype_check TO property_sg_details_property_subtype_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_loan_type_check TO property_sg_details_loan_type_check;
ALTER TABLE property_sg RENAME CONSTRAINT property_sg_borrower_type_check TO property_sg_details_borrower_type_check;
ALTER TABLE property_sg RENAME TO property_sg_details;
