-- Restore cpf_applicable flag on finance_incomes
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS cpf_applicable BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN finance_incomes.cpf_applicable IS 'Whether CPF contributions apply to this income (legacy - now implied by cpf_wage_type)';
