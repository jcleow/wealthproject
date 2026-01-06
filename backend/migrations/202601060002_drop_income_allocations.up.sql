-- Migration: Drop income_allocations table (Phase 2d - Final)
-- This is the final phase of the income_allocations → fund_flow_rules migration.
-- The income_allocations table is no longer used by the application:
-- - Timeline service reads from fund_flow_rules (rule_type='allocation')
-- - API endpoints have been removed (/api/v2/income-allocations)
-- - Repository methods have been removed
--
-- Prerequisites:
-- - Migration 202601050004 must have run (data migrated to fund_flow_rules)
-- - All application code must read from fund_flow_rules only
--
-- Safety: The down migration will recreate the table structure but NOT the data.
-- If you need to rollback, restore from backup first.

-- Step 1: First remove from ResetAllUserData sequence (inline in store.go)
-- Note: The application code handles this gracefully - if the table doesn't exist,
-- the DELETE will fail but ResetAllUserData should handle it.

-- Step 2: Drop the table
DROP TABLE IF EXISTS income_allocations CASCADE;
