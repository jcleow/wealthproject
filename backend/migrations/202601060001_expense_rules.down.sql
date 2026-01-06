-- Rollback Phase 4 (Expense Rules)
-- WARNING: This will delete all expense rules!

-- Delete all expense rules first (referential integrity)
DELETE FROM fund_flow_rules WHERE rule_type = 'expense';

-- Drop the expense index
DROP INDEX IF EXISTS idx_fund_flow_rules_expense;

-- Remove target_expense_id column
ALTER TABLE fund_flow_rules DROP COLUMN IF EXISTS target_expense_id;

-- Restore original rule_type CHECK constraint (without 'expense')
ALTER TABLE fund_flow_rules DROP CONSTRAINT IF EXISTS fund_flow_rules_rule_type_check;
ALTER TABLE fund_flow_rules ADD CONSTRAINT fund_flow_rules_rule_type_check
    CHECK (rule_type IN ('payment', 'allocation', 'transfer'));
