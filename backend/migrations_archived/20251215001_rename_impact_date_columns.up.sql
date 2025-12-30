-- Rename start_month/end_month to start_date/end_date in scenario_event_impacts
-- for consistency with other tables (finance_assets, finance_liabilities, etc.)

-- Rename columns
ALTER TABLE scenario_event_impacts RENAME COLUMN start_month TO start_date;
ALTER TABLE scenario_event_impacts RENAME COLUMN end_month TO end_date;

-- Drop old constraints that reference the old column names
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_month_range;
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_month_start;
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_month_end;

-- Add new constraints with corrected names
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_date_range
    CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_date_start
    CHECK (date_trunc('month', start_date) = start_date);
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_date_end
    CHECK (end_date IS NULL OR date_trunc('month', end_date) = end_date);

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS idx_scenario_event_impacts_months;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_dates ON scenario_event_impacts(start_date, end_date);
