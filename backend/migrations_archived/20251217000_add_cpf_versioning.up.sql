-- Add versioning columns to cpf_accounts for timeline-based updates
-- Follows the same pattern as other financial entities (assets, liabilities, incomes, etc.)

-- Enable btree_gist extension for exclusion constraints on ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add parent_id for version chains
ALTER TABLE cpf_accounts
ADD COLUMN parent_id UUID REFERENCES cpf_accounts(id) ON DELETE CASCADE;

-- Add start_date and end_date for temporal validity
ALTER TABLE cpf_accounts
ADD COLUMN start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE cpf_accounts
ADD COLUMN end_date TIMESTAMPTZ;

-- Drop the old unique constraint (one per user)
ALTER TABLE cpf_accounts
DROP CONSTRAINT cpf_accounts_user_id_unique;

-- Exclusion constraint: prevent overlapping date ranges for the same user
-- Uses tstzrange with '[)' bounds (inclusive start, exclusive end)
-- COALESCE end_date to 'infinity' for open-ended (current) records
ALTER TABLE cpf_accounts
ADD CONSTRAINT cpf_accounts_no_overlap EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);

-- Index for efficient parent lookups
CREATE INDEX idx_cpf_accounts_parent ON cpf_accounts(parent_id) WHERE parent_id IS NOT NULL;

-- Index for date range queries
CREATE INDEX idx_cpf_accounts_dates ON cpf_accounts(user_id, start_date, end_date);

COMMENT ON COLUMN cpf_accounts.parent_id IS 'Points to previous version in the chain (NULL for base record)';
COMMENT ON COLUMN cpf_accounts.start_date IS 'When this version becomes effective';
COMMENT ON COLUMN cpf_accounts.end_date IS 'When this version ends (NULL for current/active version)';
