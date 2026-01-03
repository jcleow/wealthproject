-- Rollback: remove sale icon columns and rename purchase_icon back to icon

BEGIN;

-- Step 1: Drop sale icon columns
ALTER TABLE property_sg DROP COLUMN IF EXISTS sale_icon;
ALTER TABLE property_sg DROP COLUMN IF EXISTS sale_icon_color;

-- Step 2: Rename back to original column names
ALTER TABLE property_sg RENAME COLUMN purchase_icon TO icon;
ALTER TABLE property_sg RENAME COLUMN purchase_icon_color TO icon_color;

COMMIT;
