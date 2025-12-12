-- Migration: Convert all financial values from DOUBLE PRECISION to NUMERIC(15, 4)
-- Standard: 4 decimal places for financial precision (Java convention)

-- Finance Assets
ALTER TABLE finance_assets
    ALTER COLUMN current_value TYPE NUMERIC(15, 4),
    ALTER COLUMN annual_growth_rate TYPE NUMERIC(6, 4);

-- Finance Liabilities
ALTER TABLE finance_liabilities
    ALTER COLUMN current_balance TYPE NUMERIC(15, 4),
    ALTER COLUMN interest_rate_apr TYPE NUMERIC(6, 4),
    ALTER COLUMN minimum_payment TYPE NUMERIC(15, 4);

-- Finance Incomes
ALTER TABLE finance_incomes
    ALTER COLUMN amount TYPE NUMERIC(15, 4),
    ALTER COLUMN growth_rate TYPE NUMERIC(6, 4);

-- Finance Expenses
ALTER TABLE finance_expenses
    ALTER COLUMN amount TYPE NUMERIC(15, 4),
    ALTER COLUMN growth_rate TYPE NUMERIC(6, 4);

-- Cash Accounts
ALTER TABLE cash_accounts
    ALTER COLUMN balance TYPE NUMERIC(15, 4),
    ALTER COLUMN interest_rate TYPE NUMERIC(6, 4);

-- CPF Accounts
ALTER TABLE cpf_accounts
    ALTER COLUMN oa_balance TYPE NUMERIC(15, 4),
    ALTER COLUMN sa_balance TYPE NUMERIC(15, 4),
    ALTER COLUMN ma_balance TYPE NUMERIC(15, 4),
    ALTER COLUMN ra_balance TYPE NUMERIC(15, 4),
    ALTER COLUMN oa_used_for_housing TYPE NUMERIC(15, 4);

COMMENT ON COLUMN finance_assets.current_value IS 'Asset value with 4 decimal precision (NUMERIC(15,4))';
COMMENT ON COLUMN finance_assets.annual_growth_rate IS 'Growth rate percentage with 4 decimal precision (NUMERIC(6,4))';
