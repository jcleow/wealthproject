-- Change occurs_on from DATE to TIMESTAMPTZ to retain time information
ALTER TABLE scenario_events
  ALTER COLUMN occurs_on TYPE timestamptz USING (occurs_on::timestamptz);
