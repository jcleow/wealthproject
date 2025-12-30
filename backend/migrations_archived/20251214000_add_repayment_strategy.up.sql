-- Add repayment strategy columns to finance_liabilities
-- This enables per-liability repayment calculation strategies

ALTER TABLE finance_liabilities
ADD COLUMN IF NOT EXISTS repayment_strategy VARCHAR(50) DEFAULT 'standard_amortization',
ADD COLUMN IF NOT EXISTS repayment_metadata JSONB;

-- Index for strategy queries
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_repayment_strategy
ON finance_liabilities(repayment_strategy);

-- Add comments for documentation
COMMENT ON COLUMN finance_liabilities.repayment_strategy IS
'Repayment calculation strategy: standard_amortization, interest_only, minimum_payment, extra_payment';

COMMENT ON COLUMN finance_liabilities.repayment_metadata IS
'Strategy-specific parameters as JSONB (e.g., extra_payment amount, interest_only_months)';
