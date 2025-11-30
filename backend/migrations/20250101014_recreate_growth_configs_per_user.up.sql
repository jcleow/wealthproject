-- Recreate growth_configs table with per-user support
CREATE TABLE IF NOT EXISTS growth_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    category TEXT NOT NULL,
    annual_rate_pct DOUBLE PRECISION NOT NULL,
    lower_bound_pct DOUBLE PRECISION NOT NULL DEFAULT -50,
    upper_bound_pct DOUBLE PRECISION NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS growth_configs_user_id_idx ON growth_configs(user_id);
