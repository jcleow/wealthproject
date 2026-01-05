-- Rollback sale proceeds transfer rules

-- Remove destination account columns from property_sg
ALTER TABLE property_sg DROP COLUMN IF EXISTS net_cash_proceeds_account_id;
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower2_cpf_refund_account_id;
ALTER TABLE property_sg DROP COLUMN IF EXISTS borrower1_cpf_refund_account_id;

-- Remove source_property_id from fund_flow_rules
DROP INDEX IF EXISTS idx_fund_flow_rules_source_property;
ALTER TABLE fund_flow_rules DROP COLUMN IF EXISTS source_property_id;
