-- Rename existing icon columns to purchase_icon for clarity
-- and add new sale_icon columns for sale milestone customization
-- NOTE: This migration is idempotent - it's safe to run even if columns already exist

-- Step 1: Rename existing columns (if they exist with old names)
DO $$
BEGIN
    -- Only rename if old column exists and new doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'icon')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'purchase_icon')
    THEN
        ALTER TABLE property_sg RENAME COLUMN icon TO purchase_icon;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'icon_color')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'purchase_icon_color')
    THEN
        ALTER TABLE property_sg RENAME COLUMN icon_color TO purchase_icon_color;
    END IF;
END $$;

-- Step 2: Add sale icon columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'sale_icon') THEN
        ALTER TABLE property_sg ADD COLUMN sale_icon VARCHAR(64) DEFAULT 'banknote';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'sale_icon_color') THEN
        ALTER TABLE property_sg ADD COLUMN sale_icon_color VARCHAR(16) DEFAULT '#10b981';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN property_sg.purchase_icon IS 'Lucide icon name for purchase milestone marker';
COMMENT ON COLUMN property_sg.purchase_icon_color IS 'Hex color for purchase milestone marker';
COMMENT ON COLUMN property_sg.sale_icon IS 'Lucide icon name for sale milestone marker';
COMMENT ON COLUMN property_sg.sale_icon_color IS 'Hex color for sale milestone marker';
