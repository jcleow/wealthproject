-- Add year_display_format column to user_settings
-- Values: 'year_number' (Year 0, Year 1, etc.) or 'actual_year' (2025, 2026, etc.)
ALTER TABLE user_settings
ADD COLUMN year_display_format VARCHAR(20) NOT NULL DEFAULT 'year_number';
