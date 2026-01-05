-- Restore fallback columns (for rollback)
-- Note: These are deprecated and should not be used

ALTER TABLE fund_flow_rules ADD COLUMN IF NOT EXISTS fallback_cpf_account_id uuid REFERENCES cpf_accounts(id) ON DELETE SET NULL;
ALTER TABLE fund_flow_rules ADD COLUMN IF NOT EXISTS fallback_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;
ALTER TABLE fund_flow_rules ADD COLUMN IF NOT EXISTS fallback_investment_id uuid REFERENCES finance_investments(id) ON DELETE SET NULL;

-- Add constraint back
ALTER TABLE fund_flow_rules ADD CONSTRAINT chk_at_most_one_fallback CHECK (
    ((fallback_cpf_account_id IS NOT NULL)::integer +
     (fallback_cash_account_id IS NOT NULL)::integer +
     (fallback_investment_id IS NOT NULL)::integer) <= 1
);
