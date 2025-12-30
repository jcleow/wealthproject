-- Unify scenario impacts into finance tables
-- Instead of a separate scenario_event_impacts table, impacts are stored directly
-- in finance_* tables with scenario_event_id FK linking them to the event.

-- Step 1: Add scenario columns to all finance tables

-- finance_incomes
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- finance_expenses
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- finance_assets
ALTER TABLE finance_assets
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- finance_liabilities
ALTER TABLE finance_liabilities
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- finance_investments
ALTER TABLE finance_investments
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- finance_cash_accounts (also add parent_id for versioning support)
ALTER TABLE finance_cash_accounts
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'savings',
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS impact_kind VARCHAR(10) DEFAULT NULL
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override')),
ADD COLUMN IF NOT EXISTS impact_frequency VARCHAR(20) DEFAULT NULL
    CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- Step 2: Create indexes for efficient scenario filtering

CREATE INDEX IF NOT EXISTS idx_finance_incomes_scenario ON finance_incomes(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_expenses_scenario ON finance_expenses(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_assets_scenario ON finance_assets(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_liabilities_scenario ON finance_liabilities(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_investments_scenario ON finance_investments(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_cash_accounts_scenario ON finance_cash_accounts(scenario_event_id)
    WHERE scenario_event_id IS NOT NULL;

-- Step 3: Migrate existing impacts from scenario_event_impacts to finance tables
-- For each impact, we create a new row in the target finance table
--
-- Impact kinds:
--   'delta' -> impact_kind='delta' (additive adjustment)
--   'override' -> impact_kind='override' (replaces base)
--   'start' -> impact_kind=NULL (creates new scenario-driven item without base parent)
--   'stop' -> sets end_date on base item (handled via UPDATE, not INSERT)

-- Migrate income delta/override impacts
INSERT INTO finance_incomes (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fi.user_id,
    fi.id AS parent_id,  -- Link to the base item
    fi.name,
    sei.amount::numeric / 100.0,  -- Convert from cents to decimal
    fi.frequency,  -- Inherit frequency from base
    fi.category,
    NULL AS notes,
    se.occurs_on AS start_date,  -- Impact starts when event occurs
    NULL AS end_date,
    fi.growth_rate,
    fi.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_incomes fi ON sei.target_income_id = fi.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_income_id IS NOT NULL
  AND fi.parent_id IS NULL  -- Only link to root/base items
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate income 'start' impacts (creates new scenario-driven item)
INSERT INTO finance_incomes (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fi.user_id,
    fi.id AS parent_id,  -- Link to the base item for reference
    fi.name,
    fi.amount,  -- Use base amount for 'start'
    fi.frequency,
    fi.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fi.growth_rate,
    fi.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,  -- 'start' becomes NULL impact_kind (new scenario-driven item)
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_incomes fi ON sei.target_income_id = fi.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_income_id IS NOT NULL
  AND fi.parent_id IS NULL
  AND sei.impact_kind = 'start';

-- Handle income 'stop' impacts by setting end_date on a new version
INSERT INTO finance_incomes (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fi.user_id,
    fi.id AS parent_id,
    fi.name,
    fi.amount,
    fi.frequency,
    fi.category,
    NULL AS notes,
    fi.start_date,  -- Keep original start date
    se.occurs_on AS end_date,  -- End when event occurs
    fi.growth_rate,
    fi.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,  -- 'stop' becomes an override that ends the item
    NULL AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_incomes fi ON sei.target_income_id = fi.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_income_id IS NOT NULL
  AND fi.parent_id IS NULL
  AND sei.impact_kind = 'stop';

-- Migrate expense delta/override impacts
INSERT INTO finance_expenses (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fe.user_id,
    fe.id AS parent_id,
    fe.name,
    sei.amount::numeric / 100.0,
    fe.frequency,
    fe.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fe.growth_rate,
    fe.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_expenses fe ON sei.target_expense_id = fe.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_expense_id IS NOT NULL
  AND fe.parent_id IS NULL
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate expense 'start' impacts
INSERT INTO finance_expenses (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fe.user_id,
    fe.id AS parent_id,
    fe.name,
    fe.amount,
    fe.frequency,
    fe.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fe.growth_rate,
    fe.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_expenses fe ON sei.target_expense_id = fe.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_expense_id IS NOT NULL
  AND fe.parent_id IS NULL
  AND sei.impact_kind = 'start';

-- Handle expense 'stop' impacts
INSERT INTO finance_expenses (
    user_id, parent_id, name, amount, frequency, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fe.user_id,
    fe.id AS parent_id,
    fe.name,
    fe.amount,
    fe.frequency,
    fe.category,
    NULL AS notes,
    fe.start_date,
    se.occurs_on AS end_date,
    fe.growth_rate,
    fe.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,
    NULL AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_expenses fe ON sei.target_expense_id = fe.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_expense_id IS NOT NULL
  AND fe.parent_id IS NULL
  AND sei.impact_kind = 'stop';

-- Migrate asset delta/override impacts
INSERT INTO finance_assets (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fa.user_id,
    fa.id AS parent_id,
    fa.name,
    sei.amount::numeric / 100.0,
    fa.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fa.growth_rate,
    fa.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_assets fa ON sei.target_asset_id = fa.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_asset_id IS NOT NULL
  AND fa.parent_id IS NULL
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate asset 'start' impacts
INSERT INTO finance_assets (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fa.user_id,
    fa.id AS parent_id,
    fa.name,
    fa.current_value,
    fa.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fa.growth_rate,
    fa.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_assets fa ON sei.target_asset_id = fa.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_asset_id IS NOT NULL
  AND fa.parent_id IS NULL
  AND sei.impact_kind = 'start';

-- Handle asset 'stop' impacts
INSERT INTO finance_assets (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fa.user_id,
    fa.id AS parent_id,
    fa.name,
    fa.current_value,
    fa.category,
    NULL AS notes,
    fa.start_date,
    se.occurs_on AS end_date,
    fa.growth_rate,
    fa.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,
    NULL AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_assets fa ON sei.target_asset_id = fa.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_asset_id IS NOT NULL
  AND fa.parent_id IS NULL
  AND sei.impact_kind = 'stop';

-- Migrate liability delta/override impacts
INSERT INTO finance_liabilities (
    user_id, parent_id, name, current_balance, category, notes,
    start_date, end_date, interest_rate_apr, minimum_payment, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fl.user_id,
    fl.id AS parent_id,
    fl.name,
    sei.amount::numeric / 100.0,
    fl.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fl.interest_rate_apr,
    fl.minimum_payment,
    fl.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_liabilities fl ON sei.target_liability_id = fl.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_liability_id IS NOT NULL
  AND fl.parent_id IS NULL
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate liability 'start' impacts
INSERT INTO finance_liabilities (
    user_id, parent_id, name, current_balance, category, notes,
    start_date, end_date, interest_rate_apr, minimum_payment, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fl.user_id,
    fl.id AS parent_id,
    fl.name,
    fl.current_balance,
    fl.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fl.interest_rate_apr,
    fl.minimum_payment,
    fl.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_liabilities fl ON sei.target_liability_id = fl.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_liability_id IS NOT NULL
  AND fl.parent_id IS NULL
  AND sei.impact_kind = 'start';

-- Handle liability 'stop' impacts
INSERT INTO finance_liabilities (
    user_id, parent_id, name, current_balance, category, notes,
    start_date, end_date, interest_rate_apr, minimum_payment, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    fl.user_id,
    fl.id AS parent_id,
    fl.name,
    fl.current_balance,
    fl.category,
    NULL AS notes,
    fl.start_date,
    se.occurs_on AS end_date,
    fl.interest_rate_apr,
    fl.minimum_payment,
    fl.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,
    NULL AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_liabilities fl ON sei.target_liability_id = fl.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_liability_id IS NOT NULL
  AND fl.parent_id IS NULL
  AND sei.impact_kind = 'stop';

-- Migrate investment delta/override impacts
INSERT INTO finance_investments (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    finv.user_id,
    finv.id AS parent_id,
    finv.name,
    sei.amount::numeric / 100.0,
    finv.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    finv.growth_rate,
    finv.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_investments finv ON sei.target_investment_id = finv.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_investment_id IS NOT NULL
  AND finv.parent_id IS NULL
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate investment 'start' impacts
INSERT INTO finance_investments (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    finv.user_id,
    finv.id AS parent_id,
    finv.name,
    finv.current_value,
    finv.category,
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    finv.growth_rate,
    finv.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,
    sei.cadence AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_investments finv ON sei.target_investment_id = finv.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_investment_id IS NOT NULL
  AND finv.parent_id IS NULL
  AND sei.impact_kind = 'start';

-- Handle investment 'stop' impacts
INSERT INTO finance_investments (
    user_id, parent_id, name, current_value, category, notes,
    start_date, end_date, growth_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency
)
SELECT
    finv.user_id,
    finv.id AS parent_id,
    finv.name,
    finv.current_value,
    finv.category,
    NULL AS notes,
    finv.start_date,
    se.occurs_on AS end_date,
    finv.growth_rate,
    finv.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,
    NULL AS impact_frequency
FROM scenario_event_impacts sei
JOIN finance_investments finv ON sei.target_investment_id = finv.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_investment_id IS NOT NULL
  AND finv.parent_id IS NULL
  AND sei.impact_kind = 'stop';

-- Migrate cash account delta/override impacts
INSERT INTO finance_cash_accounts (
    user_id, parent_id, name, balance, category, notes,
    start_date, end_date, interest_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency, is_accumulator
)
SELECT
    fca.user_id,
    fca.id AS parent_id,
    fca.name,
    sei.amount::numeric / 100.0,
    COALESCE(fca.category, 'savings'),
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fca.interest_rate,
    fca.growth_strategy,
    sei.event_id AS scenario_event_id,
    sei.impact_kind,
    sei.cadence AS impact_frequency,
    false AS is_accumulator
FROM scenario_event_impacts sei
JOIN finance_cash_accounts fca ON sei.target_cash_account_id = fca.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_cash_account_id IS NOT NULL
  AND sei.impact_kind IN ('delta', 'override');

-- Migrate cash account 'start' impacts
INSERT INTO finance_cash_accounts (
    user_id, parent_id, name, balance, category, notes,
    start_date, end_date, interest_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency, is_accumulator
)
SELECT
    fca.user_id,
    fca.id AS parent_id,
    fca.name,
    fca.balance,
    COALESCE(fca.category, 'savings'),
    NULL AS notes,
    se.occurs_on AS start_date,
    NULL AS end_date,
    fca.interest_rate,
    fca.growth_strategy,
    sei.event_id AS scenario_event_id,
    NULL AS impact_kind,
    sei.cadence AS impact_frequency,
    false AS is_accumulator
FROM scenario_event_impacts sei
JOIN finance_cash_accounts fca ON sei.target_cash_account_id = fca.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_cash_account_id IS NOT NULL
  AND sei.impact_kind = 'start';

-- Handle cash account 'stop' impacts
INSERT INTO finance_cash_accounts (
    user_id, parent_id, name, balance, category, notes,
    start_date, end_date, interest_rate, growth_strategy,
    scenario_event_id, impact_kind, impact_frequency, is_accumulator
)
SELECT
    fca.user_id,
    fca.id AS parent_id,
    fca.name,
    fca.balance,
    COALESCE(fca.category, 'savings'),
    NULL AS notes,
    fca.start_date,
    se.occurs_on AS end_date,
    fca.interest_rate,
    fca.growth_strategy,
    sei.event_id AS scenario_event_id,
    'override' AS impact_kind,
    NULL AS impact_frequency,
    false AS is_accumulator
FROM scenario_event_impacts sei
JOIN finance_cash_accounts fca ON sei.target_cash_account_id = fca.id
JOIN scenario_events se ON sei.event_id = se.id
WHERE sei.target_cash_account_id IS NOT NULL
  AND sei.impact_kind = 'stop';

-- Step 4: Drop the scenario_event_impacts table
DROP TABLE IF EXISTS scenario_event_impacts;
