-- Migration: Drop frequency column from finance_assets and finance_liabilities
-- Frequency only applies to recurring cash flows (incomes/expenses), not to assets/liabilities

ALTER TABLE finance_assets
  DROP COLUMN IF EXISTS frequency;

ALTER TABLE finance_liabilities
  DROP COLUMN IF EXISTS frequency;

DO $$
BEGIN
    RAISE NOTICE 'Dropped frequency column from finance_assets and finance_liabilities tables';
    RAISE NOTICE 'Frequency concept only applies to recurring cash flows (incomes/expenses)';
END $$;
