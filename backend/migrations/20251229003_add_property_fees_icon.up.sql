-- Add icon and icon_color columns to property_fees table
-- These allow users to customize the visual representation of each fee
ALTER TABLE property_fees
    ADD COLUMN icon VARCHAR(50) DEFAULT 'receipt',
    ADD COLUMN icon_color VARCHAR(20) DEFAULT '#64748b';
