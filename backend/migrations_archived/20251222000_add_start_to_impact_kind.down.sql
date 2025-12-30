-- Revert impact_kind constraints to exclude 'start'

-- finance_incomes
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_impact_kind_check;
ALTER TABLE finance_incomes ADD CONSTRAINT finance_incomes_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));

-- finance_expenses
ALTER TABLE finance_expenses DROP CONSTRAINT IF EXISTS finance_expenses_impact_kind_check;
ALTER TABLE finance_expenses ADD CONSTRAINT finance_expenses_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));

-- finance_assets
ALTER TABLE finance_assets DROP CONSTRAINT IF EXISTS finance_assets_impact_kind_check;
ALTER TABLE finance_assets ADD CONSTRAINT finance_assets_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));

-- finance_liabilities
ALTER TABLE finance_liabilities DROP CONSTRAINT IF EXISTS finance_liabilities_impact_kind_check;
ALTER TABLE finance_liabilities ADD CONSTRAINT finance_liabilities_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));

-- finance_investments
ALTER TABLE finance_investments DROP CONSTRAINT IF EXISTS finance_investments_impact_kind_check;
ALTER TABLE finance_investments ADD CONSTRAINT finance_investments_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));

-- finance_cash_accounts
ALTER TABLE finance_cash_accounts DROP CONSTRAINT IF EXISTS finance_cash_accounts_impact_kind_check;
ALTER TABLE finance_cash_accounts ADD CONSTRAINT finance_cash_accounts_impact_kind_check
    CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override'));
