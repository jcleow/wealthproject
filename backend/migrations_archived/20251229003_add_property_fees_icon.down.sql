-- Remove icon and icon_color columns from property_fees table
ALTER TABLE property_fees
    DROP COLUMN IF EXISTS icon,
    DROP COLUMN IF EXISTS icon_color;
