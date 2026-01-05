-- Remove deprecated fallback columns from fund_flow_rules
-- These were replaced by the priority-based multi-rule approach
-- (use multiple rules with different priorities instead of fallback accounts)

-- Drop the constraint first
ALTER TABLE fund_flow_rules DROP CONSTRAINT IF EXISTS chk_at_most_one_fallback;

-- Drop the fallback columns
ALTER TABLE fund_flow_rules DROP COLUMN IF EXISTS fallback_cpf_account_id;
ALTER TABLE fund_flow_rules DROP COLUMN IF EXISTS fallback_cash_account_id;
ALTER TABLE fund_flow_rules DROP COLUMN IF EXISTS fallback_investment_id;
