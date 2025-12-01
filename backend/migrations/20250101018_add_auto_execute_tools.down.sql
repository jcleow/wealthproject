-- Remove auto_execute_tools column from user_settings table
ALTER TABLE user_settings DROP COLUMN IF EXISTS auto_execute_tools;
