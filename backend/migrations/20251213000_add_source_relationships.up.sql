-- Migration: Add source relationships for income and expenses
-- Income can link to: finance_investments OR finance_cash_accounts (polymorphic)
-- Expenses can link to: finance_liabilities (direct FK with CASCADE)

-- ============================================================================
-- 1. Add source columns to finance_incomes (polymorphic relationship)
-- ============================================================================
ALTER TABLE finance_incomes
ADD COLUMN source_type VARCHAR(20),
ADD COLUMN source_id UUID;

-- Ensure consistency: both columns must be NULL or both must be non-NULL
ALTER TABLE finance_incomes
ADD CONSTRAINT chk_income_source_consistency
  CHECK ((source_type IS NULL AND source_id IS NULL) OR
         (source_type IS NOT NULL AND source_id IS NOT NULL));

-- Restrict source_type to valid values
ALTER TABLE finance_incomes
ADD CONSTRAINT chk_income_source_type
  CHECK (source_type IN ('investment', 'cash_account') OR source_type IS NULL);

-- Index for efficient lookups by source
CREATE INDEX idx_finance_incomes_source ON finance_incomes (source_type, source_id) WHERE source_id IS NOT NULL;

COMMENT ON COLUMN finance_incomes.source_type IS 'Type of source: investment or cash_account';
COMMENT ON COLUMN finance_incomes.source_id IS 'UUID of the source investment or cash account';

-- ============================================================================
-- 2. Add source column to finance_expenses (direct FK)
-- ============================================================================
ALTER TABLE finance_expenses
ADD COLUMN source_liability_id UUID;

-- Add foreign key with CASCADE delete
ALTER TABLE finance_expenses
ADD CONSTRAINT fk_expense_source_liability
  FOREIGN KEY (source_liability_id) REFERENCES finance_liabilities(id) ON DELETE CASCADE;

-- Index for efficient lookups
CREATE INDEX idx_finance_expenses_source_liability ON finance_expenses (source_liability_id) WHERE source_liability_id IS NOT NULL;

COMMENT ON COLUMN finance_expenses.source_liability_id IS 'Link to the liability that generates this expense (e.g., loan payment)';
