-- Revert to original constraint (single CPF account per user per time period)
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;

ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap
EXCLUDE USING gist (
  user_id WITH =,
  tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);
