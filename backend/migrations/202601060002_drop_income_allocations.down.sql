-- Rollback: Recreate income_allocations table structure
-- WARNING: This only recreates the schema, NOT the data.
-- To fully rollback, restore data from backup before running this.

CREATE TABLE IF NOT EXISTS income_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES income_allocations(id) ON DELETE SET NULL,
    income_id UUID NOT NULL REFERENCES finance_incomes(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    target_cash_account_id UUID REFERENCES finance_cash_accounts(id) ON DELETE SET NULL,
    target_investment_id UUID REFERENCES finance_investments(id) ON DELETE SET NULL,
    allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('percentage', 'fixed')),
    allocation_value NUMERIC(15, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT income_allocations_single_target CHECK (
        (target_cash_account_id IS NOT NULL AND target_investment_id IS NULL) OR
        (target_cash_account_id IS NULL AND target_investment_id IS NOT NULL)
    )
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_income_allocations_income_id ON income_allocations(income_id);
CREATE INDEX IF NOT EXISTS idx_income_allocations_parent_id ON income_allocations(parent_id);

COMMENT ON TABLE income_allocations IS 'Legacy table - use fund_flow_rules with rule_type=allocation instead';
