-- Rename asset growth column to be consistent with other tables
ALTER TABLE finance_assets
    RENAME COLUMN annual_growth_rate TO growth_rate;

COMMENT ON COLUMN finance_assets.growth_rate IS 'Growth rate percentage with 4 decimal precision (NUMERIC(6,4))';
