-- Remove redundant cpf_applicable flag; CPF applicability is implied by cpf_wage_type
ALTER TABLE finance_incomes
DROP COLUMN IF EXISTS cpf_applicable;
