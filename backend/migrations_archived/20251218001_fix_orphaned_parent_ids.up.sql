-- Fix orphaned parent_id references where parent_id points to non-existent records
-- For root records, parent_id should equal id (self-reference)

-- Fix finance_incomes: set parent_id = id where parent doesn't exist
UPDATE finance_incomes SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM finance_incomes p WHERE p.id = finance_incomes.parent_id);

-- Fix finance_assets: set parent_id = id where parent doesn't exist
UPDATE finance_assets SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM finance_assets p WHERE p.id = finance_assets.parent_id);

-- Fix finance_liabilities: set parent_id = id where parent doesn't exist
UPDATE finance_liabilities SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM finance_liabilities p WHERE p.id = finance_liabilities.parent_id);

-- Fix finance_expenses: set parent_id = id where parent doesn't exist
UPDATE finance_expenses SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM finance_expenses p WHERE p.id = finance_expenses.parent_id);

-- Fix finance_investments: set parent_id = id where parent doesn't exist
UPDATE finance_investments SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM finance_investments p WHERE p.id = finance_investments.parent_id);

-- Fix income_allocations: set parent_id = id where parent doesn't exist
UPDATE income_allocations SET parent_id = id
WHERE parent_id IS NOT NULL
  AND parent_id != id
  AND NOT EXISTS (SELECT 1 FROM income_allocations p WHERE p.id = income_allocations.parent_id);

-- Drop the DEFAULT gen_random_uuid() from parent_id columns
ALTER TABLE finance_incomes ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE finance_assets ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE finance_liabilities ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE finance_expenses ALTER COLUMN parent_id DROP DEFAULT;
ALTER TABLE finance_investments ALTER COLUMN parent_id DROP DEFAULT;

-- Add self-referencing FK constraints to enforce data integrity
-- parent_id must reference an existing id in the same table
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
