-- Fix amount constraint to allow override with amount = 0
-- Use case: "Income becomes $0" (job loss scenario)

ALTER TABLE scenario_event_impacts
DROP CONSTRAINT IF EXISTS scenario_event_impacts_amount;

-- New constraint: only require amount = 0 for 'stop', allow 0 for other types
ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_amount CHECK (
    impact_kind <> 'stop' OR amount = 0
);
