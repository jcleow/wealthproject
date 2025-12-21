-- Rollback: Add frequency column back to finance_assets and finance_liabilities
-- Note: This restores the column structure but data will be lost

ALTER TABLE finance_assets
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'annual';

ALTER TABLE finance_liabilities
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'annual';

DO $$
BEGIN
    RAISE NOTICE 'Restored frequency column to finance_assets and finance_liabilities tables';
END $$;
