-- Remove growth strategy columns and constraints

-- Drop check constraints
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_growth_strategy_check;
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_growth_strategy_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_growth_strategy_check;
ALTER TABLE cash_accounts DROP CONSTRAINT IF EXISTS cash_accounts_growth_strategy_check;
ALTER TABLE liabilities DROP CONSTRAINT IF EXISTS liabilities_growth_strategy_check;

-- Drop indices
DROP INDEX IF EXISTS idx_assets_growth_strategy;
DROP INDEX IF EXISTS idx_incomes_growth_strategy;
DROP INDEX IF EXISTS idx_expenses_growth_strategy;
DROP INDEX IF EXISTS idx_cash_accounts_growth_strategy;
DROP INDEX IF EXISTS idx_liabilities_growth_strategy;

-- Drop columns
ALTER TABLE assets DROP COLUMN IF EXISTS growth_strategy, DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE incomes DROP COLUMN IF EXISTS growth_strategy, DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE expenses DROP COLUMN IF EXISTS growth_strategy, DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE cash_accounts DROP COLUMN IF EXISTS growth_strategy, DROP COLUMN IF EXISTS growth_metadata;
ALTER TABLE liabilities DROP COLUMN IF EXISTS growth_strategy, DROP COLUMN IF EXISTS growth_metadata;
