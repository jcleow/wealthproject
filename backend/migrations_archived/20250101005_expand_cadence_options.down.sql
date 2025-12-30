-- Rollback cadence options to original values
-- Note: This will fail if any rows have the new cadence values

ALTER TABLE scenario_event_impacts
DROP CONSTRAINT IF EXISTS scenario_event_impacts_cadence_check;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_cadence_check
CHECK (cadence IN ('one_time', 'monthly', 'annual'));
