-- Change user_id columns from TEXT to VARCHAR(36) for better storage efficiency
-- VARCHAR(36) is the exact length of a UUID string (32 hex chars + 4 hyphens)

ALTER TABLE finance_assets
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE finance_liabilities
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE finance_incomes
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE finance_expenses
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE property_scenarios
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE growth_configs
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE chat_sessions
ALTER COLUMN user_id TYPE VARCHAR(36);

ALTER TABLE scenario_events
ALTER COLUMN user_id TYPE VARCHAR(36);
