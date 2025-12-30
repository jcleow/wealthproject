-- Remove NOT NULL constraint from target_id (rollback)
ALTER TABLE scenario_event_impacts ALTER COLUMN target_id DROP NOT NULL;

-- Remove comment
COMMENT ON COLUMN scenario_event_impacts.target_id IS NULL;
