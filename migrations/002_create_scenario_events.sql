-- Scenario events and impacts

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS scenario_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    occurs_on DATE NOT NULL,
    display_icon VARCHAR(50) NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    scenario_id UUID,
    is_included BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scenario_events_name_len CHECK (char_length(name) >= 1),
    CONSTRAINT scenario_events_icon_format CHECK (display_icon ~ '^[a-z0-9-]+$')
);

CREATE TABLE IF NOT EXISTS scenario_event_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES scenario_events(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('asset', 'liability', 'income', 'expense')),
    target_id UUID,
    impact_kind VARCHAR(10) NOT NULL CHECK (impact_kind IN ('delta', 'override', 'start', 'stop')),
    amount BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'SGD',
    cadence VARCHAR(10) NOT NULL CHECK (cadence IN ('one_time', 'monthly', 'annual')),
    start_month TIMESTAMPTZ NOT NULL,
    end_month TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scenario_event_impacts_amount CHECK (
        (impact_kind = 'stop' AND amount = 0)
        OR (impact_kind <> 'stop' AND amount <> 0)
    ),
    CONSTRAINT scenario_event_impacts_month_range CHECK (end_month IS NULL OR end_month >= start_month),
    CONSTRAINT scenario_event_impacts_month_start CHECK (date_trunc('month', start_month) = start_month),
    CONSTRAINT scenario_event_impacts_month_end CHECK (end_month IS NULL OR date_trunc('month', end_month) = end_month)
);

-- Indexes for performance and filtering
CREATE INDEX IF NOT EXISTS idx_scenario_events_user ON scenario_events(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_events_occurs ON scenario_events(occurs_on);
CREATE INDEX IF NOT EXISTS idx_scenario_events_included ON scenario_events(user_id, is_included);
CREATE INDEX IF NOT EXISTS idx_scenario_events_tags_gin ON scenario_events USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_scenario_events_search ON scenario_events USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_event ON scenario_event_impacts(event_id);
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_target ON scenario_event_impacts(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_scenario_event_impacts_months ON scenario_event_impacts(start_month, end_month);
