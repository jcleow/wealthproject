-- Add NOT NULL constraint to target_id in scenario_event_impacts
-- Every impact must reference a specific financial item:
-- - delta/override: references existing item to modify
-- - start: references newly created item (create item first, then scenario)
-- - stop: references existing item to stop

-- First, clean up any existing NULL target_id rows (shouldn't be any in production)
DELETE FROM scenario_event_impacts WHERE target_id IS NULL;

-- Add the NOT NULL constraint
ALTER TABLE scenario_event_impacts ALTER COLUMN target_id SET NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON COLUMN scenario_event_impacts.target_id IS 'Required: references the financial item (asset/liability/income/expense) this impact affects';
