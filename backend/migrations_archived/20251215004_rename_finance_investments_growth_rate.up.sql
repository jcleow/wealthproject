-- Rename investment growth column to align with API naming
ALTER TABLE finance_investments
    RENAME COLUMN annual_growth_rate TO growth_rate;

COMMENT ON COLUMN finance_investments.growth_rate IS 'Growth rate percentage with 4 decimal precision (NUMERIC(6,4))';
