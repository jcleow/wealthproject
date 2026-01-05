-- Remove unused polymorphic source_type/source_id columns from finance_incomes
-- These columns were never used in production and violate referential integrity patterns.
-- See: specs/unified-fund-flows.md for the proper fund movement model.

-- Drop the index first
DROP INDEX IF EXISTS idx_finance_incomes_source;

-- Drop the columns
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS source_type;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS source_id;
