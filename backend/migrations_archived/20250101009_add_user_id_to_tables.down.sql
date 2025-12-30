-- Rollback user_id changes

-- Revert scenario_events user_id to UUID
ALTER TABLE scenario_events
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Revert chat_sessions user_id to UUID
ALTER TABLE chat_sessions
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Revert growth_configs
ALTER TABLE growth_configs DROP CONSTRAINT IF EXISTS growth_configs_pkey;
DELETE FROM growth_configs WHERE user_id != '__system__';
UPDATE growth_configs SET user_id = NULL;
ALTER TABLE growth_configs ADD PRIMARY KEY (category);
ALTER TABLE growth_configs DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS idx_growth_configs_user_id;

-- Remove user_id from property_scenarios
DROP INDEX IF EXISTS idx_property_scenarios_user_id;
ALTER TABLE property_scenarios DROP COLUMN IF EXISTS user_id;

-- Remove user_id from finance_expenses
DROP INDEX IF EXISTS idx_finance_expenses_user_id;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS user_id;

-- Remove user_id from finance_incomes
DROP INDEX IF EXISTS idx_finance_incomes_user_id;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS user_id;

-- Remove user_id from finance_liabilities
DROP INDEX IF EXISTS idx_finance_liabilities_user_id;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS user_id;

-- Remove user_id from finance_assets
DROP INDEX IF EXISTS idx_finance_assets_user_id;
ALTER TABLE finance_assets DROP COLUMN IF EXISTS user_id;
