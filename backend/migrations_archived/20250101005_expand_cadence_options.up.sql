-- Expand cadence options to include more frequencies
-- Add: weekly, bi_weekly, quarterly, semi_annual

ALTER TABLE scenario_event_impacts
DROP CONSTRAINT IF EXISTS scenario_event_impacts_cadence_check;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_cadence_check
CHECK (cadence IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'));
