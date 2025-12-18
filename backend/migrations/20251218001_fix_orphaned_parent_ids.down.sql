-- Rollback: remove FK constraints and restore defaults

-- Drop FK constraints
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_parent_id_fk;
ALTER TABLE finance_assets DROP CONSTRAINT IF EXISTS finance_assets_parent_id_fk;
ALTER TABLE finance_liabilities DROP CONSTRAINT IF EXISTS finance_liabilities_parent_id_fk;
ALTER TABLE finance_expenses DROP CONSTRAINT IF EXISTS finance_expenses_parent_id_fk;
ALTER TABLE finance_investments DROP CONSTRAINT IF EXISTS finance_investments_parent_id_fk;

-- Restore defaults (not recommended, but needed for rollback)
ALTER TABLE finance_incomes ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
ALTER TABLE finance_assets ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
ALTER TABLE finance_liabilities ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
ALTER TABLE finance_expenses ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
ALTER TABLE finance_investments ALTER COLUMN parent_id SET DEFAULT gen_random_uuid();
