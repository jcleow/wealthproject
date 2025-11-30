-- Remove year_display_format column from user_settings
ALTER TABLE user_settings DROP COLUMN IF EXISTS year_display_format;
