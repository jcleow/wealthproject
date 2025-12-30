-- Revert occurs_on back to DATE (drops time information)
ALTER TABLE scenario_events
  ALTER COLUMN occurs_on TYPE date USING (occurs_on::date);
