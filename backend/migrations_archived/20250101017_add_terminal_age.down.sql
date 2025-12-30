-- Remove terminal_age column from user_settings
ALTER TABLE user_settings DROP COLUMN IF EXISTS terminal_age;
