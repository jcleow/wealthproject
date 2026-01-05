-- Migration: income_allocations → fund_flow_rules (Phase 2a)
-- This migration copies existing income allocations to fund_flow_rules table.
-- Both tables will coexist during the transition period (Phase 2a dual-read).
-- The application reads from fund_flow_rules when allocation rules exist,
-- otherwise falls back to income_allocations.

-- Step 1: Migrate all existing income_allocations to fund_flow_rules
-- The query gets the user_id by joining through finance_incomes
INSERT INTO fund_flow_rules (
    id,
    user_id,
    name,
    rule_type,
    source_income_id,
    target_cash_account_id,
    target_investment_id,
    amount_type,
    amount_value,
    priority,
    start_date,
    end_date,
    created_at,
    updated_at
)
SELECT
    ia.id,                                              -- Preserve original ID
    fi.user_id,                                         -- Get user_id from income
    COALESCE(                                           -- Generate name
        CASE
            WHEN ia.target_investment_id IS NOT NULL THEN
                fi.name || ' → Investment'
            WHEN ia.target_cash_account_id IS NOT NULL THEN
                fi.name || ' → Cash'
        END,
        'Income Allocation'
    ) AS name,
    'allocation'::VARCHAR(20) AS rule_type,             -- New rule type
    ia.income_id AS source_income_id,                   -- Source is the income
    ia.target_cash_account_id,                          -- Target (if cash)
    ia.target_investment_id,                            -- Target (if investment)
    ia.allocation_type AS amount_type,                  -- Same values: 'percentage', 'fixed'
    ia.allocation_value AS amount_value,
    0 AS priority,                                      -- Default priority
    ia.start_date,
    ia.end_date,
    COALESCE(ia.created_at, NOW()) AS created_at,
    NOW() AS updated_at
FROM income_allocations ia
JOIN finance_incomes fi ON fi.id = ia.income_id
WHERE ia.parent_id IS NULL                              -- Only migrate root allocations (not versions)
ON CONFLICT (id) DO NOTHING;                            -- Idempotent: skip if already migrated

-- Note: We keep the income_allocations table intact for rollback safety.
-- Phase 2b will add dual-write (write to both tables).
-- Phase 2c will remove writes to income_allocations.
-- Phase 2d will drop the income_allocations table.

COMMENT ON TABLE fund_flow_rules IS 'Unified table for internal money movements: payments, allocations, transfers. Includes migrated income allocations.';
