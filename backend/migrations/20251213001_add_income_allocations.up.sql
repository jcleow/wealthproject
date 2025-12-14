-- Add income_allocations table for distributing income to multiple destinations
-- Uses separate nullable FK columns for proper referential integrity
CREATE TABLE income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID NOT NULL REFERENCES finance_incomes(id) ON DELETE CASCADE,

  -- Target: exactly one must be non-null (enforced by CHECK constraint)
  target_cash_account_id UUID REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
  target_investment_id UUID REFERENCES finance_investments(id) ON DELETE CASCADE,

  allocation_type VARCHAR(10) NOT NULL,  -- 'percentage' or 'fixed'
  allocation_value NUMERIC(15,4) NOT NULL,  -- percentage (0-100) or fixed amount
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_allocation_type CHECK (allocation_type IN ('percentage', 'fixed')),
  CONSTRAINT chk_exactly_one_target CHECK (
    (target_cash_account_id IS NOT NULL)::int +
    (target_investment_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT chk_percentage_range CHECK (
    allocation_type != 'percentage' OR (allocation_value >= 0 AND allocation_value <= 100)
  ),
  CONSTRAINT chk_allocation_value_positive CHECK (allocation_value > 0)
);

CREATE INDEX idx_income_allocations_income ON income_allocations(income_id);
CREATE INDEX idx_income_allocations_cash_account ON income_allocations(target_cash_account_id) WHERE target_cash_account_id IS NOT NULL;
CREATE INDEX idx_income_allocations_investment ON income_allocations(target_investment_id) WHERE target_investment_id IS NOT NULL;
