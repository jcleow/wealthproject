DROP TRIGGER IF EXISTS cpf_assumptions_updated_at ON cpf_assumptions;
DROP FUNCTION IF EXISTS update_cpf_assumptions_updated_at();
DROP INDEX IF EXISTS idx_cpf_assumptions_account;
DROP TABLE IF EXISTS cpf_assumptions;
