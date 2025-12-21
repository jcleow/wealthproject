-- Revert 'investment' from scenario_event_impacts target_type constraint
ALTER TABLE scenario_event_impacts
DROP CONSTRAINT scenario_event_impacts_target_type_check;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_target_type_check
CHECK (target_type IN ('asset', 'liability', 'income', 'expense', 'cash'));
