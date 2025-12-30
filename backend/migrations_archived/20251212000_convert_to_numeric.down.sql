-- Rollback: Convert NUMERIC back to DOUBLE PRECISION (not recommended for production!)

-- Finance Assets
ALTER TABLE finance_assets
    ALTER COLUMN current_value TYPE DOUBLE PRECISION,
    ALTER COLUMN annual_growth_rate TYPE DOUBLE PRECISION;

-- Finance Liabilities
ALTER TABLE finance_liabilities
    ALTER COLUMN current_balance TYPE DOUBLE PRECISION,
    ALTER COLUMN interest_rate_apr TYPE DOUBLE PRECISION,
    ALTER COLUMN minimum_payment TYPE DOUBLE PRECISION;

-- Finance Incomes
ALTER TABLE finance_incomes
    ALTER COLUMN amount TYPE DOUBLE PRECISION,
    ALTER COLUMN growth_rate TYPE DOUBLE PRECISION;

-- Finance Expenses
ALTER TABLE finance_expenses
    ALTER COLUMN amount TYPE DOUBLE PRECISION,
    ALTER COLUMN growth_rate TYPE DOUBLE PRECISION;

-- Cash Accounts
ALTER TABLE cash_accounts
    ALTER COLUMN balance TYPE DOUBLE PRECISION,
    ALTER COLUMN interest_rate TYPE DOUBLE PRECISION;

-- CPF Accounts
ALTER TABLE cpf_accounts
    ALTER COLUMN oa_balance TYPE DOUBLE PRECISION,
    ALTER COLUMN sa_balance TYPE DOUBLE PRECISION,
    ALTER COLUMN ma_balance TYPE DOUBLE PRECISION,
    ALTER COLUMN ra_balance TYPE DOUBLE PRECISION,
    ALTER COLUMN oa_used_for_housing TYPE DOUBLE PRECISION;
