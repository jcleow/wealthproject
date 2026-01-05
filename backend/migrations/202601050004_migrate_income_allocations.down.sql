-- Rollback: Remove migrated income allocations from fund_flow_rules
-- This only removes allocation-type rules, preserving payment and transfer rules.

DELETE FROM fund_flow_rules
WHERE rule_type = 'allocation'
  AND id IN (SELECT id FROM income_allocations WHERE parent_id IS NULL);

-- Note: The original income_allocations table is preserved and still functional.
-- No data loss occurs from this rollback.
