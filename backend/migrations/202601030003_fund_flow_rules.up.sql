-- Fund Flow Rules - Phase 1 (Payment Rules)
-- Unified abstraction for internal money movements between balances
-- NOTE: This migration is idempotent - safe to run multiple times

CREATE TABLE IF NOT EXISTS fund_flow_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- =========================================================================
    -- RULE TYPE
    -- =========================================================================
    -- All rule types are INTERNAL balance movements (no external flows)
    -- Phase 1: 'payment' only
    -- Phase 2: + 'allocation'
    -- Phase 3: + 'transfer'
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN (
        'payment',     -- account → liability/property (Phase 1)
        'allocation',  -- income → account (Phase 2, replaces income_allocations)
        'transfer'     -- account → account (Phase 3: CPF top-ups, withdrawals)
    )),

    -- =========================================================================
    -- SOURCE: which balance to deduct from
    -- =========================================================================
    -- For 'allocation': source_income_id required (routes incoming money)
    -- For 'payment'/'transfer': exactly one source account required
    source_income_id uuid REFERENCES finance_incomes(id) ON DELETE CASCADE,
    source_cpf_account_id uuid REFERENCES cpf_accounts(id) ON DELETE CASCADE,
    source_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
    source_investment_id uuid REFERENCES finance_investments(id) ON DELETE CASCADE,

    -- =========================================================================
    -- TARGET: which balance to credit (or reduce for liabilities)
    -- =========================================================================
    -- For 'allocation'/'transfer': exactly one target account required
    -- For 'payment': exactly one target liability/property required
    target_cpf_account_id uuid REFERENCES cpf_accounts(id) ON DELETE CASCADE,
    target_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
    target_investment_id uuid REFERENCES finance_investments(id) ON DELETE CASCADE,
    target_liability_id uuid REFERENCES finance_liabilities(id) ON DELETE CASCADE,
    target_property_id uuid REFERENCES property_sg(id) ON DELETE CASCADE,

    -- =========================================================================
    -- AMOUNT SPECIFICATION
    -- =========================================================================
    amount_type VARCHAR(20) NOT NULL CHECK (amount_type IN (
        'fixed',           -- Exact amount specified by user
        'percentage',      -- Percentage of base amount
        'remainder',       -- Whatever's left after higher-priority rules
        'target_required', -- Derive from target's required payment (liability/property)
        'max_available'    -- Use up to source balance, optionally capped
    )),

    -- amount_value interpretation by type:
    -- 'fixed':           Required. The exact amount to transfer.
    -- 'percentage':      Required. Percentage (0-100) of base amount.
    -- 'remainder':       Ignored. Takes whatever's left.
    -- 'target_required': Optional. If set, caps the target's required amount.
    -- 'max_available':   Optional. If set, caps how much to take from source.
    amount_value NUMERIC(15,4),

    -- =========================================================================
    -- ORDERING
    -- =========================================================================
    -- Priority for multiple rules on same target (lower = higher priority)
    -- Use multiple rules with different priorities instead of fallback columns
    priority INT DEFAULT 0 NOT NULL,

    -- =========================================================================
    -- TIMING
    -- =========================================================================
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,  -- NULL = no end

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- =========================================================================
    -- CONSTRAINTS
    -- =========================================================================

    -- Amount value required for fixed and percentage types
    CONSTRAINT chk_amount_value CHECK (
        amount_type IN ('remainder', 'target_required', 'max_available')
        OR amount_value IS NOT NULL
    ),

    -- Percentage must be 0-100
    CONSTRAINT chk_percentage_range CHECK (
        amount_type <> 'percentage' OR (amount_value >= 0 AND amount_value <= 100)
    )

    -- Note: Source/target validation done at application layer per rule_type
    -- (more flexible than trying to encode all combinations in CHECK constraints)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_user ON fund_flow_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_type ON fund_flow_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_dates ON fund_flow_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_income ON fund_flow_rules(source_income_id)
    WHERE source_income_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_liability ON fund_flow_rules(target_liability_id)
    WHERE target_liability_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fund_flow_rules_property ON fund_flow_rules(target_property_id)
    WHERE target_property_id IS NOT NULL;

COMMENT ON TABLE fund_flow_rules IS 'Unified table for internal money movements: payments, allocations, transfers';
COMMENT ON COLUMN fund_flow_rules.rule_type IS 'payment: account→liability/property, allocation: income→account, transfer: account→account';
COMMENT ON COLUMN fund_flow_rules.amount_type IS 'fixed: exact amount, percentage: % of base, remainder: leftover, target_required: what target needs, max_available: source balance';
COMMENT ON COLUMN fund_flow_rules.priority IS 'Lower number = higher priority. Used when multiple rules target same obligation.';
