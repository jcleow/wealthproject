-- Add versioning columns to income_allocations for timeline-aware edits/deletes
-- Pattern: parent_id groups versions, start_date/end_date define active period

ALTER TABLE income_allocations
  ADD COLUMN parent_id UUID,
  ADD COLUMN start_date TIMESTAMPTZ NOT NULL DEFAULT '2025-01-01T00:00:00Z',
  ADD COLUMN end_date TIMESTAMPTZ NULL;

-- Backfill parent_id for existing rows (each row becomes its own parent)
UPDATE income_allocations SET parent_id = id WHERE parent_id IS NULL;

-- Make parent_id NOT NULL after backfill
ALTER TABLE income_allocations ALTER COLUMN parent_id SET NOT NULL;

-- Allow multiple versions of same logical allocation (unique per parent + start_date)
CREATE UNIQUE INDEX income_allocations_parent_start_date_idx
  ON income_allocations(parent_id, start_date);
