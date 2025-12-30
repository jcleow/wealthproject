-- Revert asset growth column rename
ALTER TABLE finance_assets
    RENAME COLUMN growth_rate TO annual_growth_rate;

COMMENT ON COLUMN finance_assets.annual_growth_rate IS 'Growth rate percentage with 4 decimal precision (NUMERIC(6,4))';
