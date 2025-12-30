-- Restore dropped columns to scenario_event_impacts

ALTER TABLE scenario_event_impacts
ADD COLUMN IF NOT EXISTS target_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS target_id UUID,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'SGD',
ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '';

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_target ON scenario_event_impacts(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_months ON scenario_event_impacts(start_date, end_date);

-- Populate target_type and target_id from typed FK columns
UPDATE scenario_event_impacts SET target_type = 'asset', target_id = target_asset_id WHERE target_asset_id IS NOT NULL;
UPDATE scenario_event_impacts SET target_type = 'liability', target_id = target_liability_id WHERE target_liability_id IS NOT NULL;
UPDATE scenario_event_impacts SET target_type = 'income', target_id = target_income_id WHERE target_income_id IS NOT NULL;
UPDATE scenario_event_impacts SET target_type = 'expense', target_id = target_expense_id WHERE target_expense_id IS NOT NULL;
UPDATE scenario_event_impacts SET target_type = 'cash', target_id = target_cash_account_id WHERE target_cash_account_id IS NOT NULL;
UPDATE scenario_event_impacts SET target_type = 'investment', target_id = target_investment_id WHERE target_investment_id IS NOT NULL;
