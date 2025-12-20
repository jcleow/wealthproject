-- Drop redundant columns from scenario_event_impacts
-- These values are now derived via JOINs to the typed FK target tables

-- Drop constraints that reference these columns first
ALTER TABLE scenario_event_impacts
DROP CONSTRAINT IF EXISTS scenario_event_impacts_amount;

-- Drop the redundant columns
ALTER TABLE scenario_event_impacts
DROP COLUMN IF EXISTS target_type,
DROP COLUMN IF EXISTS target_id,
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS name;

-- Drop indexes on dropped columns
DROP INDEX IF EXISTS idx_scenario_event_impacts_target;
DROP INDEX IF EXISTS idx_scenario_event_impacts_months;
