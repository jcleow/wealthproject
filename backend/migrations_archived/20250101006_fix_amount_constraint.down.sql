-- Revert to original strict constraint
-- WARNING: This will fail if any override/delta/start rows have amount = 0

ALTER TABLE scenario_event_impacts
DROP CONSTRAINT IF EXISTS scenario_event_impacts_amount;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_amount CHECK (
    (impact_kind = 'stop' AND amount = 0)
    OR (impact_kind <> 'stop' AND amount <> 0)
);
