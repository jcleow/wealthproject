-- Rollback: restore NOT NULL constraint on parent_id columns
-- First set any NULL parent_ids to the row's own id
UPDATE finance_incomes SET parent_id = id WHERE parent_id IS NULL;
UPDATE finance_assets SET parent_id = id WHERE parent_id IS NULL;
UPDATE finance_liabilities SET parent_id = id WHERE parent_id IS NULL;
UPDATE finance_expenses SET parent_id = id WHERE parent_id IS NULL;
UPDATE finance_investments SET parent_id = id WHERE parent_id IS NULL;

-- Then restore NOT NULL
ALTER TABLE finance_incomes ALTER COLUMN parent_id SET NOT NULL;
ALTER TABLE finance_assets ALTER COLUMN parent_id SET NOT NULL;
ALTER TABLE finance_liabilities ALTER COLUMN parent_id SET NOT NULL;
ALTER TABLE finance_expenses ALTER COLUMN parent_id SET NOT NULL;
ALTER TABLE finance_investments ALTER COLUMN parent_id SET NOT NULL;
