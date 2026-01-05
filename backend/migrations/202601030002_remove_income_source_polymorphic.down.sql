-- Restore polymorphic source_type/source_id columns to finance_incomes
-- Note: These columns were unused, so no data restoration is needed.

ALTER TABLE finance_incomes
ADD COLUMN source_type VARCHAR(20) CHECK (source_type IS NULL OR source_type IN ('investment', 'cash_account'));

ALTER TABLE finance_incomes
ADD COLUMN source_id uuid;

-- Recreate the index
CREATE INDEX idx_finance_incomes_source ON finance_incomes(source_type, source_id) WHERE source_id IS NOT NULL;

-- Recreate the consistency constraint
ALTER TABLE finance_incomes
ADD CONSTRAINT chk_income_source_consistency CHECK (
    (source_type IS NULL AND source_id IS NULL) OR
    (source_type IS NOT NULL AND source_id IS NOT NULL)
);
