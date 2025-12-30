-- Revert versioning columns from income_allocations

DROP INDEX IF EXISTS income_allocations_parent_start_date_idx;

ALTER TABLE income_allocations
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS parent_id;
