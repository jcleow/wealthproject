-- Sale Proceeds Transfer Rules
-- Adds support for auto-generated transfer rules from property sales
-- Phase 3 fund flow rules: property sale → CPF OA refund + cash account

-- ============================================================================
-- 1. Add source_property_id to fund_flow_rules for transfer rules
-- ============================================================================
-- Transfer rules from property sales reference the source property
-- (distinct from target_property_id which is for payment rules TO properties)
ALTER TABLE fund_flow_rules ADD COLUMN IF NOT EXISTS source_property_id UUID
    REFERENCES property_sg(id) ON DELETE CASCADE;

-- Index for efficient lookup when deleting/updating property-linked rules
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_source_property
    ON fund_flow_rules(source_property_id)
    WHERE source_property_id IS NOT NULL;

COMMENT ON COLUMN fund_flow_rules.source_property_id IS
    'For transfer rules: the property sale that generates this transfer (CPF refund, net proceeds)';

-- ============================================================================
-- 2. Add destination account columns to property_sg for sale proceeds
-- ============================================================================
-- These columns store where sale proceeds should be directed

-- Per-borrower CPF refund destination accounts
ALTER TABLE property_sg ADD COLUMN IF NOT EXISTS borrower1_cpf_refund_account_id UUID
    REFERENCES cpf_accounts(id) ON DELETE SET NULL;
ALTER TABLE property_sg ADD COLUMN IF NOT EXISTS borrower2_cpf_refund_account_id UUID
    REFERENCES cpf_accounts(id) ON DELETE SET NULL;

-- Net cash proceeds destination account
ALTER TABLE property_sg ADD COLUMN IF NOT EXISTS net_cash_proceeds_account_id UUID
    REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN property_sg.borrower1_cpf_refund_account_id IS
    'CPF OA account where borrower 1 CPF refund (principal + accrued interest) is deposited on sale';
COMMENT ON COLUMN property_sg.borrower2_cpf_refund_account_id IS
    'CPF OA account where borrower 2 CPF refund (principal + accrued interest) is deposited on sale (joint only)';
COMMENT ON COLUMN property_sg.net_cash_proceeds_account_id IS
    'Cash account where net proceeds (sale price - loan - CPF refund - fees) are deposited on sale';
