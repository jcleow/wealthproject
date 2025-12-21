-- Migration: Simplify scenario impact frequencies
-- Purpose: Convert deprecated frequencies (weekly, bi_weekly, quarterly, semi_annual) to monthly
--          Only monthly and annual are allowed for new delta impacts going forward.
-- Date: 2024-12-19

-- CONVERSION FORMULAS:
-- weekly → monthly: amount × (52/12) ≈ amount × 4.333
-- bi_weekly → monthly: amount × (26/12) ≈ amount × 2.167
-- quarterly → monthly: amount ÷ 3
-- semi_annual → monthly: amount ÷ 6

-- Convert weekly to monthly (multiply by 52/12)
UPDATE scenario_event_impacts
SET
    amount = ROUND(amount * 52.0 / 12.0),
    cadence = 'monthly'
WHERE cadence = 'weekly';

-- Convert bi_weekly to monthly (multiply by 26/12)
UPDATE scenario_event_impacts
SET
    amount = ROUND(amount * 26.0 / 12.0),
    cadence = 'monthly'
WHERE cadence = 'bi_weekly';

-- Convert quarterly to monthly (divide by 3)
UPDATE scenario_event_impacts
SET
    amount = ROUND(amount / 3.0),
    cadence = 'monthly'
WHERE cadence = 'quarterly';

-- Convert semi_annual to monthly (divide by 6)
UPDATE scenario_event_impacts
SET
    amount = ROUND(amount / 6.0),
    cadence = 'monthly'
WHERE cadence = 'semi_annual';

-- Also convert one_time delta impacts to monthly (since they should apply just once at start_date,
-- the ImpactAppliesToMonth function handles the one-time vs recurring logic based on dates)
-- Actually, we want to keep one_time for non-delta impacts, so this is not needed.
-- Non-delta impacts (override, stop, start) can keep their cadence as-is since
-- it's treated as one-time in processing regardless of the stored value.

-- Add a comment documenting the valid cadences going forward
COMMENT ON COLUMN scenario_event_impacts.cadence IS 'Frequency of impact. For delta impacts: monthly or annual (recurring). For override/stop/start: implicitly one-time regardless of value.';
