-- Add user_id column to all financial tables for user-scoped data access
-- user_id is TEXT to match BetterAuth's user.id format

-- Finance assets
ALTER TABLE finance_assets
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_assets_user_id ON finance_assets(user_id);

-- Finance liabilities
ALTER TABLE finance_liabilities
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_liabilities_user_id ON finance_liabilities(user_id);

-- Finance incomes
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_incomes_user_id ON finance_incomes(user_id);

-- Finance expenses
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON finance_expenses(user_id);

-- Property scenarios
ALTER TABLE property_scenarios
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_property_scenarios_user_id ON property_scenarios(user_id);

-- Growth configs - change from category-only key to user+category
-- Step 1: Add user_id column
ALTER TABLE growth_configs
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Step 2: Drop old primary key and create new composite key
-- Note: This requires the table to be empty or have default user_id values
-- For existing data, we'll keep them as "system" defaults
UPDATE growth_configs SET user_id = '__system__' WHERE user_id IS NULL;

ALTER TABLE growth_configs DROP CONSTRAINT IF EXISTS growth_configs_pkey;
ALTER TABLE growth_configs ADD PRIMARY KEY (user_id, category);

CREATE INDEX IF NOT EXISTS idx_growth_configs_user_id ON growth_configs(user_id);

-- Chat sessions - change user_id from UUID to TEXT
ALTER TABLE chat_sessions
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Scenario events - change user_id from UUID to TEXT
ALTER TABLE scenario_events
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
