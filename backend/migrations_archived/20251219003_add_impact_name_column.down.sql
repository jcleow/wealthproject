-- Remove name column from scenario_event_impacts table

ALTER TABLE scenario_event_impacts
DROP COLUMN IF EXISTS name;
