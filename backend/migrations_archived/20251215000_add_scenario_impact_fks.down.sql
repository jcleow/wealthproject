-- Remove FK columns from scenario_event_impacts (rollback)

DROP INDEX IF EXISTS idx_scenario_event_impacts_asset;
DROP INDEX IF EXISTS idx_scenario_event_impacts_liability;
DROP INDEX IF EXISTS idx_scenario_event_impacts_income;
DROP INDEX IF EXISTS idx_scenario_event_impacts_expense;
DROP INDEX IF EXISTS idx_scenario_event_impacts_cash_account;
DROP INDEX IF EXISTS idx_scenario_event_impacts_investment;

ALTER TABLE scenario_event_impacts
DROP COLUMN IF EXISTS target_asset_id,
DROP COLUMN IF EXISTS target_liability_id,
DROP COLUMN IF EXISTS target_income_id,
DROP COLUMN IF EXISTS target_expense_id,
DROP COLUMN IF EXISTS target_cash_account_id,
DROP COLUMN IF EXISTS target_investment_id;
