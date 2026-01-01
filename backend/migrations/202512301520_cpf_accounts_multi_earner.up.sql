-- Allow multiple CPF accounts per user (one per earner)
-- The old constraint only checked (user_id, date_range) which prevented
-- having separate CPF accounts for different household members

-- Drop the old constraint
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;

-- Create new constraint that includes earner in the uniqueness check
-- This allows Alex and Jordan to each have their own CPF account
ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap
EXCLUDE USING gist (
  user_id WITH =,
  COALESCE(earner, '') WITH =,
  tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);
