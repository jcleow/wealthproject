-- Add separate FK columns to scenario_event_impacts for proper referential integrity
-- Keeps existing target_type/target_id for backward compatibility (v1 API)

-- Add nullable FK columns for each financial item type
ALTER TABLE scenario_event_impacts
ADD COLUMN IF NOT EXISTS target_asset_id UUID REFERENCES finance_assets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_liability_id UUID REFERENCES finance_liabilities(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_income_id UUID REFERENCES finance_incomes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_expense_id UUID REFERENCES finance_expenses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_cash_account_id UUID REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS target_investment_id UUID REFERENCES finance_investments(id) ON DELETE CASCADE;

-- Create indexes for efficient JOINs
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_asset ON scenario_event_impacts(target_asset_id) WHERE target_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_liability ON scenario_event_impacts(target_liability_id) WHERE target_liability_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_income ON scenario_event_impacts(target_income_id) WHERE target_income_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_expense ON scenario_event_impacts(target_expense_id) WHERE target_expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_cash_account ON scenario_event_impacts(target_cash_account_id) WHERE target_cash_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_investment ON scenario_event_impacts(target_investment_id) WHERE target_investment_id IS NOT NULL;

-- Migrate existing data from target_type/target_id to new FK columns
UPDATE scenario_event_impacts
SET target_asset_id = target_id::uuid
WHERE target_type = 'asset' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_assets WHERE id = target_id::uuid);

UPDATE scenario_event_impacts
SET target_liability_id = target_id::uuid
WHERE target_type = 'liability' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_liabilities WHERE id = target_id::uuid);

UPDATE scenario_event_impacts
SET target_income_id = target_id::uuid
WHERE target_type = 'income' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_incomes WHERE id = target_id::uuid);

UPDATE scenario_event_impacts
SET target_expense_id = target_id::uuid
WHERE target_type = 'expense' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_expenses WHERE id = target_id::uuid);

-- Note: target_type 'cash' and 'investment' may also exist, handle them
UPDATE scenario_event_impacts
SET target_cash_account_id = target_id::uuid
WHERE target_type = 'cash' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_cash_accounts WHERE id = target_id::uuid);

UPDATE scenario_event_impacts
SET target_investment_id = target_id::uuid
WHERE target_type = 'investment' AND target_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM finance_investments WHERE id = target_id::uuid);
