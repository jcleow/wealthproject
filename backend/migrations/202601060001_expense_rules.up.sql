-- Fund Flow Rules - Phase 4 (Expense Rules)
-- Enables priority-based source accounts for expenses
-- Source: Only cash accounts (CPF/investments must transfer to cash first)
-- Target: External expense (outflow from the system)

-- Add target_expense_id column to fund_flow_rules
ALTER TABLE fund_flow_rules
    ADD COLUMN IF NOT EXISTS target_expense_id uuid REFERENCES finance_expenses(id) ON DELETE CASCADE;

-- Update rule_type CHECK constraint to include 'expense'
-- First drop the existing constraint, then recreate with new value
ALTER TABLE fund_flow_rules DROP CONSTRAINT IF EXISTS fund_flow_rules_rule_type_check;
ALTER TABLE fund_flow_rules ADD CONSTRAINT fund_flow_rules_rule_type_check
    CHECK (rule_type IN ('payment', 'allocation', 'transfer', 'expense'));

-- Index for efficient expense rule lookups
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_expense ON fund_flow_rules(target_expense_id)
    WHERE target_expense_id IS NOT NULL;

-- Update table comment
COMMENT ON COLUMN fund_flow_rules.target_expense_id IS 'For expense rules: the expense this rule pays (external outflow)';
COMMENT ON COLUMN fund_flow_rules.rule_type IS 'payment: account→liability/property, allocation: income→account, transfer: account→account, expense: cash→expense';
