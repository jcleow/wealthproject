-- Revert user_id columns back to TEXT

ALTER TABLE finance_assets
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE finance_liabilities
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE finance_incomes
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE finance_expenses
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE property_scenarios
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE growth_configs
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE chat_sessions
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE scenario_events
ALTER COLUMN user_id TYPE TEXT;
