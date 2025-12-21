-- Add growth strategy columns to financial tables

-- Assets: default to compound_monthly (current behavior)
ALTER TABLE finance_assets
ADD COLUMN IF NOT EXISTS growth_strategy VARCHAR(50) DEFAULT 'compound_monthly',
ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Incomes: default to annual_step (salary/bonus increases once per year)
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS growth_strategy VARCHAR(50) DEFAULT 'annual_step',
ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Expenses: default to annual_step (rent/expenses increase once per year)
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS growth_strategy VARCHAR(50) DEFAULT 'annual_step',
ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Cash Accounts: default to compound_monthly (interest accrues monthly)
ALTER TABLE cash_accounts
ADD COLUMN IF NOT EXISTS growth_strategy VARCHAR(50) DEFAULT 'compound_monthly',
ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Liabilities: default to compound_monthly (interest compounds monthly)
ALTER TABLE finance_liabilities
ADD COLUMN IF NOT EXISTS growth_strategy VARCHAR(50) DEFAULT 'compound_monthly',
ADD COLUMN IF NOT EXISTS growth_metadata JSONB;

-- Add indices for querying by strategy type
CREATE INDEX IF NOT EXISTS idx_finance_assets_growth_strategy ON finance_assets(growth_strategy);
CREATE INDEX IF NOT EXISTS idx_finance_incomes_growth_strategy ON finance_incomes(growth_strategy);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_growth_strategy ON finance_expenses(growth_strategy);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_growth_strategy ON cash_accounts(growth_strategy);
CREATE INDEX IF NOT EXISTS idx_finance_liabilities_growth_strategy ON finance_liabilities(growth_strategy);

-- Add check constraints for valid strategy types (use IF NOT EXISTS equivalent by dropping first if exists)
DO $$ BEGIN
    ALTER TABLE finance_assets ADD CONSTRAINT finance_assets_growth_strategy_check
    CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE finance_incomes ADD CONSTRAINT finance_incomes_growth_strategy_check
    CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE finance_expenses ADD CONSTRAINT finance_expenses_growth_strategy_check
    CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE cash_accounts ADD CONSTRAINT cash_accounts_growth_strategy_check
    CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE finance_liabilities ADD CONSTRAINT finance_liabilities_growth_strategy_check
    CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
