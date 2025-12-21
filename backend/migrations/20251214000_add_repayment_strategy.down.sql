-- Remove repayment strategy columns from finance_liabilities

DROP INDEX IF EXISTS idx_finance_liabilities_repayment_strategy;

ALTER TABLE finance_liabilities
DROP COLUMN IF EXISTS repayment_strategy,
DROP COLUMN IF EXISTS repayment_metadata;
