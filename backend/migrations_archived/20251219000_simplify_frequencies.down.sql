-- Rollback: Simplify scenario impact frequencies
-- WARNING: This rollback cannot restore the original amounts accurately because
-- the conversion is lossy (we don't know which records were originally which frequency).
--
-- This rollback only removes the comment. Manual data restoration would be needed
-- if you need to revert the frequency values.

COMMENT ON COLUMN scenario_event_impacts.cadence IS NULL;

-- NOTE: The original frequencies and amounts cannot be automatically restored.
-- If rollback is needed, you must restore from a database backup taken before this migration.
