-- Revert start_date/end_date back to start_month/end_month

-- Rename columns back
ALTER TABLE scenario_event_impacts RENAME COLUMN start_date TO start_month;
ALTER TABLE scenario_event_impacts RENAME COLUMN end_date TO end_month;

-- Drop new constraints
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_date_range;
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_date_start;
ALTER TABLE scenario_event_impacts DROP CONSTRAINT IF EXISTS scenario_event_impacts_date_end;

-- Restore old constraints
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_month_range
    CHECK (end_month IS NULL OR end_month >= start_month);
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_month_start
    CHECK (date_trunc('month', start_month) = start_month);
ALTER TABLE scenario_event_impacts ADD CONSTRAINT scenario_event_impacts_month_end
    CHECK (end_month IS NULL OR date_trunc('month', end_month) = end_month);

-- Drop new index and restore old one
DROP INDEX IF EXISTS idx_scenario_event_impacts_dates;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_months ON scenario_event_impacts(start_month, end_month);
