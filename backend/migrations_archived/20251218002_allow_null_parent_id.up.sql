-- Allow NULL parent_id during insert, then update to self-reference
-- This is needed because we can't reference the row's own ID in the INSERT VALUES clause

-- Drop the FK constraints first (they require NOT NULL)
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_parent_id_fk;
ALTER TABLE finance_assets DROP CONSTRAINT IF EXISTS finance_assets_parent_id_fk;
ALTER TABLE finance_liabilities DROP CONSTRAINT IF EXISTS finance_liabilities_parent_id_fk;
ALTER TABLE finance_expenses DROP CONSTRAINT IF EXISTS finance_expenses_parent_id_fk;
ALTER TABLE finance_investments DROP CONSTRAINT IF EXISTS finance_investments_parent_id_fk;
ALTER TABLE income_allocations DROP CONSTRAINT IF EXISTS income_allocations_parent_id_fk;

-- Allow NULL on parent_id columns
ALTER TABLE finance_incomes ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE finance_assets ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE finance_liabilities ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE finance_expenses ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE finance_investments ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE income_allocations ALTER COLUMN parent_id DROP NOT NULL;

-- Re-add FK constraints (now allowing NULL)
ALTER TABLE finance_incomes
ADD CONSTRAINT finance_incomes_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES finance_incomes(id) ON DELETE CASCADE;

ALTER TABLE finance_assets
ADD CONSTRAINT finance_assets_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES finance_assets(id) ON DELETE CASCADE;

ALTER TABLE finance_liabilities
ADD CONSTRAINT finance_liabilities_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES finance_liabilities(id) ON DELETE CASCADE;

ALTER TABLE finance_expenses
ADD CONSTRAINT finance_expenses_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES finance_expenses(id) ON DELETE CASCADE;

ALTER TABLE finance_investments
ADD CONSTRAINT finance_investments_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES finance_investments(id) ON DELETE CASCADE;

ALTER TABLE income_allocations
ADD CONSTRAINT income_allocations_parent_id_fk
FOREIGN KEY (parent_id) REFERENCES income_allocations(id) ON DELETE CASCADE;
