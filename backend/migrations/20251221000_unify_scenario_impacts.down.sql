-- Rollback: Recreate scenario_event_impacts and remove scenario columns from finance tables

-- Step 1: Recreate scenario_event_impacts table
CREATE TABLE IF NOT EXISTS scenario_event_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind VARCHAR(10) NOT NULL CHECK (impact_kind IN ('delta', 'override', 'start', 'stop')),
    amount BIGINT NOT NULL,
    cadence VARCHAR(10) NOT NULL CHECK (cadence IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_asset_id UUID REFERENCES finance_assets(id) ON DELETE CASCADE,
    target_liability_id UUID REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    target_income_id UUID REFERENCES finance_incomes(id) ON DELETE CASCADE,
    target_expense_id UUID REFERENCES finance_expenses(id) ON DELETE CASCADE,
    target_cash_account_id UUID REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
    target_investment_id UUID REFERENCES finance_investments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_event ON scenario_event_impacts(event_id);
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_asset ON scenario_event_impacts(target_asset_id) WHERE target_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_liability ON scenario_event_impacts(target_liability_id) WHERE target_liability_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_income ON scenario_event_impacts(target_income_id) WHERE target_income_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_expense ON scenario_event_impacts(target_expense_id) WHERE target_expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_cash_account ON scenario_event_impacts(target_cash_account_id) WHERE target_cash_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_investment ON scenario_event_impacts(target_investment_id) WHERE target_investment_id IS NOT NULL;

-- Step 2: Migrate data back from finance tables to scenario_event_impacts

-- Migrate income impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_income_id)
SELECT
    scenario_event_id,
    impact_kind,
    (amount * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_incomes
WHERE scenario_event_id IS NOT NULL;

-- Migrate expense impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_expense_id)
SELECT
    scenario_event_id,
    impact_kind,
    (amount * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_expenses
WHERE scenario_event_id IS NOT NULL;

-- Migrate asset impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_asset_id)
SELECT
    scenario_event_id,
    impact_kind,
    (current_value * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_assets
WHERE scenario_event_id IS NOT NULL;

-- Migrate liability impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_liability_id)
SELECT
    scenario_event_id,
    impact_kind,
    (current_balance * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_liabilities
WHERE scenario_event_id IS NOT NULL;

-- Migrate investment impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_investment_id)
SELECT
    scenario_event_id,
    impact_kind,
    (current_value * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_investments
WHERE scenario_event_id IS NOT NULL;

-- Migrate cash account impacts back
INSERT INTO scenario_event_impacts (event_id, impact_kind, amount, cadence, target_cash_account_id)
SELECT
    scenario_event_id,
    impact_kind,
    (balance * 100)::bigint,
    COALESCE(impact_frequency, 'one_time'),
    parent_id
FROM finance_cash_accounts
WHERE scenario_event_id IS NOT NULL;

-- Step 3: Delete scenario impact rows from finance tables
DELETE FROM finance_incomes WHERE scenario_event_id IS NOT NULL;
DELETE FROM finance_expenses WHERE scenario_event_id IS NOT NULL;
DELETE FROM finance_assets WHERE scenario_event_id IS NOT NULL;
DELETE FROM finance_liabilities WHERE scenario_event_id IS NOT NULL;
DELETE FROM finance_investments WHERE scenario_event_id IS NOT NULL;
DELETE FROM finance_cash_accounts WHERE scenario_event_id IS NOT NULL;

-- Step 4: Drop scenario columns from finance tables
DROP INDEX IF EXISTS idx_finance_incomes_scenario;
DROP INDEX IF EXISTS idx_finance_expenses_scenario;
DROP INDEX IF EXISTS idx_finance_assets_scenario;
DROP INDEX IF EXISTS idx_finance_liabilities_scenario;
DROP INDEX IF EXISTS idx_finance_investments_scenario;
DROP INDEX IF EXISTS idx_finance_cash_accounts_scenario;

ALTER TABLE finance_incomes
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency;

ALTER TABLE finance_expenses
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency;

ALTER TABLE finance_assets
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency;

ALTER TABLE finance_liabilities
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency;

ALTER TABLE finance_investments
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency;

ALTER TABLE finance_cash_accounts
DROP COLUMN IF EXISTS scenario_event_id,
DROP COLUMN IF EXISTS impact_kind,
DROP COLUMN IF EXISTS impact_frequency,
DROP COLUMN IF EXISTS parent_id,
DROP COLUMN IF EXISTS category;
