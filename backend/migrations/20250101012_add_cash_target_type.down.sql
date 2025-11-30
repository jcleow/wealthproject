-- Revert target_type constraint to original (without 'cash')
-- Note: This will fail if any rows have target_type='cash'
ALTER TABLE scenario_event_impacts
DROP CONSTRAINT scenario_event_impacts_target_type_check;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_target_type_check
CHECK (target_type IN ('asset', 'liability', 'income', 'expense'));
