-- Remove wage classification columns from finance_incomes
ALTER TABLE finance_incomes
DROP CONSTRAINT IF EXISTS finance_incomes_wage_type_check,
DROP CONSTRAINT IF EXISTS finance_incomes_income_type_check,
DROP COLUMN IF EXISTS cpf_applicable,
DROP COLUMN IF EXISTS wage_type,
DROP COLUMN IF EXISTS income_type;
