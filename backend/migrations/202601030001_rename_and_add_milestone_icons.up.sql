-- Rename existing icon columns to purchase_icon for clarity
-- and add new sale_icon columns for sale milestone customization

BEGIN;

-- Step 1: Rename existing columns
ALTER TABLE property_sg RENAME COLUMN icon TO purchase_icon;
ALTER TABLE property_sg RENAME COLUMN icon_color TO purchase_icon_color;

-- Step 2: Add sale icon columns with defaults matching current hardcoded values
ALTER TABLE property_sg
ADD COLUMN sale_icon VARCHAR(64) DEFAULT 'banknote',
ADD COLUMN sale_icon_color VARCHAR(16) DEFAULT '#10b981';

-- Add comments for documentation
COMMENT ON COLUMN property_sg.purchase_icon IS 'Lucide icon name for purchase milestone marker';
COMMENT ON COLUMN property_sg.purchase_icon_color IS 'Hex color for purchase milestone marker';
COMMENT ON COLUMN property_sg.sale_icon IS 'Lucide icon name for sale milestone marker';
COMMENT ON COLUMN property_sg.sale_icon_color IS 'Hex color for sale milestone marker';

COMMIT;
