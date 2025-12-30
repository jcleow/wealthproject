-- Add name column to scenario_event_impacts table
-- Used to store the name for financial items created by start impacts

ALTER TABLE scenario_event_impacts
ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '' NOT NULL;

COMMENT ON COLUMN scenario_event_impacts.name IS 'Name for the financial item (primarily used by start impacts)';
