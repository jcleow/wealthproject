-- Consolidated initial schema for Financial Planning System
-- Generated: 2025-12-30 15:00
-- This replaces all previous migrations (archived in migrations_archived/)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- APP_AUTH SCHEMA (BetterAuth)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS app_auth;

CREATE TABLE app_auth."user" (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE app_auth.session (
    id text NOT NULL PRIMARY KEY,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL UNIQUE,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES app_auth."user"(id) ON DELETE CASCADE
);

CREATE TABLE app_auth.account (
    id text NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES app_auth."user"(id) ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE app_auth.verification (
    id text NOT NULL PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- App auth indexes
CREATE INDEX idx_app_auth_user_email ON app_auth."user"(email);
CREATE INDEX idx_app_auth_session_user_id ON app_auth.session("userId");
CREATE INDEX idx_app_auth_session_token ON app_auth.session(token);
CREATE UNIQUE INDEX idx_app_auth_account_provider ON app_auth.account("providerId", "accountId");
CREATE INDEX idx_app_auth_account_user_id ON app_auth.account("userId");
CREATE INDEX idx_app_auth_verification_identifier ON app_auth.verification(identifier);

-- App auth roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_service') THEN
        CREATE ROLE auth_service;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend_service') THEN
        CREATE ROLE backend_service;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA app_auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_auth TO auth_service;
GRANT USAGE ON SCHEMA app_auth TO backend_service;
GRANT SELECT ON app_auth."user" TO backend_service;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
CREATE FUNCTION public.get_last_day_of_month(y integer, m integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(y, m, 1)) + INTERVAL '1 month - 1 day'));
END;
$$;

-- ============================================================================
-- CHAT & SESSION TABLES
-- ============================================================================
CREATE TABLE chat_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    state jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE conversation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id uuid REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    content text NOT NULL,
    tool_calls jsonb,
    tool_call_id text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE tool_execution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id uuid REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    call_id character varying(255) NOT NULL,
    tool_name character varying(255) NOT NULL,
    parameters jsonb,
    result jsonb,
    success boolean DEFAULT false,
    error_message text,
    execution_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE llm_usage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL,
    session_id uuid REFERENCES chat_sessions(session_id) ON DELETE SET NULL,
    request_id character varying(255) NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(100) NOT NULL,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    cached_tokens integer DEFAULT 0,
    thoughts_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    input_cost_usd numeric(12,10) DEFAULT 0,
    output_cost_usd numeric(12,10) DEFAULT 0,
    total_cost_usd numeric(12,10) DEFAULT 0,
    processing_time_ms integer,
    tool_calls_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Chat indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at);
CREATE INDEX idx_conversation_history_session_id ON conversation_history(session_id);
CREATE INDEX idx_conversation_history_created_at ON conversation_history(created_at);
CREATE INDEX idx_tool_execution_log_session_id ON tool_execution_log(session_id);
CREATE INDEX idx_tool_execution_log_call_id ON tool_execution_log(call_id);
CREATE INDEX idx_tool_execution_log_created_at ON tool_execution_log(created_at);
CREATE INDEX idx_llm_usage_user_id ON llm_usage_log(user_id);
CREATE INDEX idx_llm_usage_session_id ON llm_usage_log(session_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage_log(created_at);
CREATE INDEX idx_llm_usage_user_date ON llm_usage_log(user_id, created_at);

-- ============================================================================
-- USER SETTINGS
-- ============================================================================
CREATE TABLE user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL UNIQUE,
    starting_age integer DEFAULT 30 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    year_display_format character varying(20) DEFAULT 'year_number' NOT NULL,
    terminal_age integer DEFAULT 65 NOT NULL,
    auto_execute_tools boolean DEFAULT false NOT NULL,
    time_resolution character varying(10) DEFAULT 'yearly' NOT NULL
        CHECK (time_resolution IN ('yearly', 'monthly')),
    compounding_frequency character varying(10) DEFAULT 'monthly' NOT NULL
        CHECK (compounding_frequency IN ('monthly', 'annual')),
    group_items_by_category boolean DEFAULT true NOT NULL,
    chart_picture_in_picture boolean DEFAULT false NOT NULL,
    dashboard_layout character varying(20) DEFAULT 'stacked' NOT NULL
);

CREATE INDEX user_settings_user_id_idx ON user_settings(user_id);

-- ============================================================================
-- SCENARIO EVENTS
-- ============================================================================
CREATE TABLE scenario_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    name character varying(100) NOT NULL CHECK (char_length(name) >= 1),
    description text,
    occurs_on timestamp with time zone NOT NULL,
    display_icon character varying(50) NOT NULL CHECK (display_icon ~ '^[a-z0-9-]+$'),
    display_color text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    scenario_id uuid,
    is_included boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_scenario_events_user ON scenario_events(user_id);
CREATE INDEX idx_scenario_events_occurs ON scenario_events(occurs_on);
CREATE INDEX idx_scenario_events_included ON scenario_events(user_id, is_included);
CREATE INDEX idx_scenario_events_tags_gin ON scenario_events USING gin(tags);
CREATE INDEX idx_scenario_events_search ON scenario_events USING gin(to_tsvector('simple', COALESCE(name::text, '') || ' ' || COALESCE(description, '')));

-- ============================================================================
-- CORE FINANCIAL TABLES
-- ============================================================================

-- Finance Assets
CREATE TABLE finance_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36),
    parent_id uuid REFERENCES finance_assets(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL,
    current_value numeric(15,4) NOT NULL,
    growth_rate numeric(10,4) DEFAULT 0 NOT NULL,
    growth_strategy character varying(50) DEFAULT 'compound_monthly'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    terminal_value numeric(15,4) DEFAULT NULL,
    CONSTRAINT finance_assets_parent_start_date_key UNIQUE (parent_id, start_date)
);

-- Finance Liabilities
CREATE TABLE finance_liabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36),
    parent_id uuid REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL,
    current_balance numeric(15,4) NOT NULL,
    interest_rate_apr numeric(6,4) DEFAULT 0 NOT NULL,
    minimum_payment numeric(15,4) DEFAULT 0 NOT NULL,
    growth_strategy character varying(50) DEFAULT 'compound_monthly'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    repayment_strategy character varying(50) DEFAULT 'standard_amortization',
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    CONSTRAINT finance_liabilities_parent_start_date_key UNIQUE (parent_id, start_date)
);

-- Finance Incomes
CREATE TABLE finance_incomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36),
    parent_id uuid REFERENCES finance_incomes(id) ON DELETE CASCADE,
    name text NOT NULL,
    amount numeric(15,4) NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    category text NOT NULL,
    income_type text DEFAULT 'other' CHECK (income_type IN ('salary', 'bonus', 'commission', 'rental', 'dividend', 'freelance', 'other')),
    cpf_wage_type text CHECK (cpf_wage_type IS NULL OR cpf_wage_type IN ('ow', 'aw')),
    growth_rate numeric(10,4) DEFAULT 3.0 NOT NULL,
    growth_strategy character varying(50) DEFAULT 'annual_step'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    person_id uuid,
    CONSTRAINT finance_incomes_parent_start_date_key UNIQUE (parent_id, start_date)
);

-- Finance Expenses
CREATE TABLE finance_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36),
    parent_id uuid REFERENCES finance_expenses(id) ON DELETE CASCADE,
    name text NOT NULL,
    amount numeric(15,4) NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    category text NOT NULL,
    growth_rate numeric(10,4) DEFAULT 2.0 NOT NULL,
    growth_strategy character varying(50) DEFAULT 'annual_step'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    source_liability_id uuid REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    CONSTRAINT finance_expenses_parent_start_date_key UNIQUE (parent_id, start_date)
);

-- Finance Investments
CREATE TABLE finance_investments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    parent_id uuid REFERENCES finance_investments(id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    current_value numeric(15,4) DEFAULT 0 NOT NULL,
    growth_rate numeric(10,4) DEFAULT 0 NOT NULL,
    growth_strategy character varying(50) DEFAULT 'compound_monthly'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
    CONSTRAINT finance_investments_parent_start_date_key UNIQUE (parent_id, start_date)
);

-- Finance Cash Accounts
CREATE TABLE finance_cash_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    parent_id uuid REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    category character varying(255) DEFAULT 'savings',
    balance numeric(15,4) DEFAULT 0 NOT NULL,
    interest_rate numeric(6,4) DEFAULT 1.5 NOT NULL,
    bank_name character varying(255),
    account_type character varying(50),
    is_accumulator boolean DEFAULT false NOT NULL,
    growth_strategy character varying(50) DEFAULT 'compound_monthly'
        CHECK (growth_strategy IN ('compound_monthly', 'annual_step', 'tiered_adb', 'fixed')),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scenario_event_id uuid REFERENCES scenario_events(id) ON DELETE CASCADE,
    impact_kind character varying(10) CHECK (impact_kind IS NULL OR impact_kind IN ('delta', 'override', 'start', 'stop')),
    impact_frequency character varying(20) CHECK (impact_frequency IS NULL OR impact_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'))
);

-- Cash accounts unique accumulator constraint
CREATE UNIQUE INDEX finance_cash_accounts_accumulator_idx ON finance_cash_accounts(user_id) WHERE is_accumulator = true;

-- Financial table indexes
CREATE INDEX idx_finance_assets_user_id ON finance_assets(user_id);
CREATE INDEX idx_finance_assets_dates ON finance_assets(user_id, start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_assets_start_date ON finance_assets(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_assets_growth_strategy ON finance_assets(growth_strategy);
CREATE INDEX idx_finance_assets_scenario ON finance_assets(scenario_event_id) WHERE scenario_event_id IS NOT NULL;

CREATE INDEX idx_finance_liabilities_user_id ON finance_liabilities(user_id);
CREATE INDEX idx_finance_liabilities_dates ON finance_liabilities(user_id, start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_liabilities_start_date ON finance_liabilities(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_liabilities_growth_strategy ON finance_liabilities(growth_strategy);
CREATE INDEX idx_finance_liabilities_repayment_strategy ON finance_liabilities(repayment_strategy);
CREATE INDEX idx_finance_liabilities_scenario ON finance_liabilities(scenario_event_id) WHERE scenario_event_id IS NOT NULL;

CREATE INDEX idx_finance_incomes_user_id ON finance_incomes(user_id);
CREATE INDEX idx_finance_incomes_dates ON finance_incomes(user_id, start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_incomes_start_date ON finance_incomes(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_incomes_growth_strategy ON finance_incomes(growth_strategy);
CREATE INDEX idx_finance_incomes_scenario ON finance_incomes(scenario_event_id) WHERE scenario_event_id IS NOT NULL;
CREATE INDEX idx_finance_incomes_person ON finance_incomes(person_id) WHERE person_id IS NOT NULL;

CREATE INDEX idx_finance_expenses_user_id ON finance_expenses(user_id);
CREATE INDEX idx_finance_expenses_dates ON finance_expenses(user_id, start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_expenses_start_date ON finance_expenses(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_expenses_growth_strategy ON finance_expenses(growth_strategy);
CREATE INDEX idx_finance_expenses_source_liability ON finance_expenses(source_liability_id) WHERE source_liability_id IS NOT NULL;
CREATE INDEX idx_finance_expenses_scenario ON finance_expenses(scenario_event_id) WHERE scenario_event_id IS NOT NULL;

CREATE INDEX idx_finance_investments_user_id ON finance_investments(user_id);
CREATE INDEX idx_finance_investments_dates ON finance_investments(user_id, start_date, end_date);
CREATE INDEX idx_finance_investments_start_date ON finance_investments(start_date DESC);
CREATE INDEX idx_finance_investments_growth_strategy ON finance_investments(growth_strategy);
CREATE INDEX idx_finance_investments_scenario ON finance_investments(scenario_event_id) WHERE scenario_event_id IS NOT NULL;

CREATE INDEX finance_cash_accounts_user_id_idx ON finance_cash_accounts(user_id);
CREATE INDEX idx_finance_cash_accounts_dates ON finance_cash_accounts(user_id, start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_cash_accounts_start_date ON finance_cash_accounts(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX idx_finance_cash_accounts_growth_strategy ON finance_cash_accounts(growth_strategy);
CREATE INDEX idx_finance_cash_accounts_scenario ON finance_cash_accounts(scenario_event_id) WHERE scenario_event_id IS NOT NULL;

-- ============================================================================
-- PERSONS (multi-person household support)
-- ============================================================================
CREATE TABLE persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    name character varying(100) NOT NULL CHECK (char_length(name) >= 1),
    display_color character varying(20),
    is_included boolean DEFAULT true NOT NULL,
    date_of_birth date NOT NULL,
    residency_status text DEFAULT 'citizen' CHECK (residency_status IN ('citizen', 'pr')),
    pr_grant_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, name)
);

CREATE INDEX idx_persons_user ON persons(user_id);
CREATE INDEX idx_persons_user_included ON persons(user_id, is_included) WHERE is_included = true;

-- ============================================================================
-- CPF ACCOUNTS
-- ============================================================================
CREATE TABLE cpf_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    parent_id uuid REFERENCES cpf_accounts(id) ON DELETE CASCADE,
    oa_balance numeric(15,4) DEFAULT 0 NOT NULL,
    sa_balance numeric(15,4) DEFAULT 0 NOT NULL,
    ma_balance numeric(15,4) DEFAULT 0 NOT NULL,
    ra_balance numeric(15,4) DEFAULT 0 NOT NULL,
    oa_used_for_housing numeric(15,4) DEFAULT 0 NOT NULL,
    housing_start_date timestamp with time zone,
    person_id uuid REFERENCES persons(id) ON DELETE SET NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cpf_accounts_no_overlap_per_person EXCLUDE USING gist (
        user_id WITH =,
        COALESCE(person_id::text, '') WITH =,
        tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
    )
);

CREATE INDEX idx_cpf_accounts_user ON cpf_accounts(user_id);
CREATE INDEX idx_cpf_accounts_dates ON cpf_accounts(user_id, start_date, end_date);
CREATE INDEX idx_cpf_accounts_parent ON cpf_accounts(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_cpf_accounts_person ON cpf_accounts(person_id) WHERE person_id IS NOT NULL;

-- ============================================================================
-- INCOME ALLOCATIONS
-- ============================================================================
CREATE TABLE income_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    income_id uuid NOT NULL REFERENCES finance_incomes(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES income_allocations(id) ON DELETE CASCADE,
    target_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
    target_investment_id uuid REFERENCES finance_investments(id) ON DELETE CASCADE,
    allocation_type character varying(10) NOT NULL CHECK (allocation_type IN ('percentage', 'fixed')),
    allocation_value numeric(15,4) NOT NULL CHECK (allocation_value > 0),
    start_date timestamp with time zone DEFAULT '2025-01-01'::timestamptz NOT NULL,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_exactly_one_target CHECK (
        ((target_cash_account_id IS NOT NULL)::int + (target_investment_id IS NOT NULL)::int) = 1
    ),
    CONSTRAINT chk_percentage_range CHECK (
        allocation_type <> 'percentage' OR (allocation_value >= 0 AND allocation_value <= 100)
    )
);

CREATE UNIQUE INDEX income_allocations_parent_start_date_idx ON income_allocations(parent_id, start_date);
CREATE INDEX idx_income_allocations_income ON income_allocations(income_id);
CREATE INDEX idx_income_allocations_cash_account ON income_allocations(target_cash_account_id) WHERE target_cash_account_id IS NOT NULL;
CREATE INDEX idx_income_allocations_investment ON income_allocations(target_investment_id) WHERE target_investment_id IS NOT NULL;

-- ============================================================================
-- GROWTH CONFIGS
-- ============================================================================
CREATE TABLE growth_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(255) NOT NULL,
    category text NOT NULL,
    annual_rate_pct double precision NOT NULL,
    lower_bound_pct double precision DEFAULT -50 NOT NULL,
    upper_bound_pct double precision DEFAULT 50 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, category)
);

CREATE INDEX growth_configs_user_id_idx ON growth_configs(user_id);

-- ============================================================================
-- PROPERTY TABLES (Singapore)
-- ============================================================================
CREATE TABLE property_sg (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    property_type character varying(20) NOT NULL CHECK (property_type IN ('hdb', 'private')),
    property_subtype character varying(30) NOT NULL CHECK (property_subtype IN ('bto', 'resale', 'ec', 'new')),
    purchase_icon character varying(64),
    purchase_icon_color character varying(16),
    sale_icon character varying(64) DEFAULT 'banknote',
    sale_icon_color character varying(16) DEFAULT '#10b981',
    is_included boolean DEFAULT true NOT NULL,
    property_price numeric(15,4) NOT NULL,
    valuation_price numeric(15,4),
    loan_type character varying(10) DEFAULT 'bank' NOT NULL CHECK (loan_type IN ('bank', 'hdb')),
    downpayment_cpf_oa numeric(15,4) DEFAULT 0 NOT NULL,
    downpayment_cash numeric(15,4) DEFAULT 0 NOT NULL,
    borrower_type character varying(10) DEFAULT 'single' NOT NULL CHECK (borrower_type IN ('single', 'joint')),
    borrower1_income_id uuid REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower1_cpf_account_id uuid REFERENCES cpf_accounts(id) ON DELETE SET NULL,
    borrower2_income_id uuid REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower2_cpf_account_id uuid REFERENCES cpf_accounts(id) ON DELETE SET NULL,
    other_debt numeric(15,4) DEFAULT 0 NOT NULL,
    property_count integer DEFAULT 0 NOT NULL,
    bto_launch_date character varying(7),
    bto_key_collection_date character varying(7),
    sale_expected_date character varying(7),
    sale_expected_price numeric(15,4),
    lease_remaining_years integer CHECK (lease_remaining_years IS NULL OR (lease_remaining_years >= 1 AND lease_remaining_years <= 999)),
    borrower1_downpayment_cpf_oa numeric(15,4) DEFAULT 0 NOT NULL,
    borrower2_downpayment_cpf_oa numeric(15,4) DEFAULT 0 NOT NULL,
    borrower1_monthly_cpf_oa numeric(15,4) DEFAULT 0 NOT NULL,
    borrower2_monthly_cpf_oa numeric(15,4) DEFAULT 0 NOT NULL,
    borrower1_downpayment_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL,
    borrower1_downpayment_cash_amount numeric(15,4) DEFAULT 0 NOT NULL,
    borrower2_downpayment_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL,
    borrower2_downpayment_cash_amount numeric(15,4) DEFAULT 0 NOT NULL,
    borrower1_monthly_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL,
    borrower1_monthly_cash_amount_type character varying(20) DEFAULT 'fixed' CHECK (borrower1_monthly_cash_amount_type IN ('fixed', 'remainder')),
    borrower1_monthly_cash_amount numeric(15,4) DEFAULT 0 NOT NULL,
    borrower2_monthly_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL,
    borrower2_monthly_cash_amount_type character varying(20) DEFAULT 'fixed' CHECK (borrower2_monthly_cash_amount_type IN ('fixed', 'remainder')),
    borrower2_monthly_cash_amount numeric(15,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_property_sg_included ON property_sg(is_included) WHERE is_included = true;

CREATE TABLE property_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    property_sg_id uuid REFERENCES property_sg(id) ON DELETE CASCADE,
    my_details_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_one_country_detail CHECK (
        (property_sg_id IS NOT NULL AND my_details_id IS NULL) OR
        (my_details_id IS NOT NULL AND property_sg_id IS NULL)
    )
);

CREATE INDEX idx_property_scenarios_user ON property_scenarios(user_id);

CREATE TABLE property_sg_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    property_sg_id uuid NOT NULL REFERENCES property_sg(id) ON DELETE CASCADE,
    name character varying(100) NOT NULL,
    amount numeric(15,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_property_sg_grants_property_sg ON property_sg_grants(property_sg_id);

CREATE TABLE property_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    property_sg_id uuid REFERENCES property_sg(id) ON DELETE CASCADE,
    my_details_id uuid,
    fee_context character varying(20) NOT NULL CHECK (fee_context IN ('purchase', 'sale', 'recurring')),
    fee_type character varying(50) NOT NULL,
    description character varying(200),
    amount numeric(15,4) NOT NULL,
    currency character varying(3) DEFAULT 'SGD' NOT NULL,
    is_percentage boolean DEFAULT false NOT NULL,
    frequency character varying(20) DEFAULT 'one_time' NOT NULL CHECK (frequency IN ('one_time', 'monthly', 'yearly')),
    icon character varying(50) DEFAULT 'receipt',
    icon_color character varying(20) DEFAULT '#64748b',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_property_fee_single_parent CHECK (
        ((property_sg_id IS NOT NULL)::int + (my_details_id IS NOT NULL)::int) = 1
    )
);

CREATE INDEX idx_property_fees_property_sg ON property_fees(property_sg_id);
CREATE INDEX idx_property_fees_property_sg_context ON property_fees(property_sg_id, fee_context);

CREATE TABLE property_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    property_scenario_id uuid NOT NULL,
    asset_id uuid NOT NULL REFERENCES finance_assets(id) ON DELETE CASCADE,
    liability_id uuid NOT NULL REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (property_scenario_id, asset_id),
    UNIQUE (property_scenario_id, asset_id, liability_id)
);

CREATE INDEX property_links_scenario_idx ON property_links(property_scenario_id);
CREATE INDEX property_links_asset_idx ON property_links(asset_id);
CREATE INDEX property_links_liability_idx ON property_links(liability_id);

-- ============================================================================
-- GROWTH & RATE PERIODS
-- ============================================================================
CREATE TABLE growth_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    property_sg_id uuid REFERENCES property_sg(id) ON DELETE CASCADE,
    my_details_id uuid,
    finance_asset_id uuid,
    finance_income_id uuid REFERENCES finance_incomes(id) ON DELETE CASCADE,
    finance_investment_id uuid REFERENCES finance_investments(id) ON DELETE CASCADE,
    growth_rate numeric(10,4) NOT NULL,
    growth_strategy character varying(20) DEFAULT 'annual_step' NOT NULL
        CHECK (growth_strategy IN ('fixed', 'annual_step', 'compound_monthly', 'tiered_adb')),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_growth_period_single_entity CHECK (
        ((property_sg_id IS NOT NULL)::int +
         (my_details_id IS NOT NULL)::int +
         (finance_asset_id IS NOT NULL)::int +
         (finance_income_id IS NOT NULL)::int +
         (finance_investment_id IS NOT NULL)::int) = 1
    )
);

CREATE INDEX idx_growth_periods_property_sg ON growth_periods(property_sg_id);
CREATE INDEX idx_growth_periods_asset ON growth_periods(finance_asset_id);
CREATE INDEX idx_growth_periods_finance_asset ON growth_periods(finance_asset_id);

CREATE TABLE liability_rate_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    property_sg_id uuid REFERENCES property_sg(id) ON DELETE CASCADE,
    my_details_id uuid,
    liability_id uuid,
    period_order integer DEFAULT 0 NOT NULL,
    rate numeric(10,4) NOT NULL,
    rate_type character varying(10) NOT NULL CHECK (rate_type IN ('fixed', 'floating')),
    term_years integer NOT NULL,
    start_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_rate_period_single_entity CHECK (
        ((property_sg_id IS NOT NULL)::int +
         (my_details_id IS NOT NULL)::int +
         (liability_id IS NOT NULL)::int) = 1
    )
);

CREATE INDEX idx_liability_rate_periods_property_sg ON liability_rate_periods(property_sg_id);
CREATE INDEX idx_liability_rate_periods_property_sg_order ON liability_rate_periods(property_sg_id, period_order);
CREATE INDEX idx_liability_rate_periods_liability ON liability_rate_periods(liability_id);

-- ============================================================================
-- HEALTH CHECK (for development/Docker)
-- ============================================================================
CREATE TABLE health_check (
    id serial PRIMARY KEY,
    status text DEFAULT 'healthy',
    checked_at timestamp DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('Database initialized successfully');
