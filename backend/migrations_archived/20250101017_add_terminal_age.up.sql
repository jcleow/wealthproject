-- Add terminal_age column to user_settings for planning horizon
ALTER TABLE user_settings
ADD COLUMN terminal_age INTEGER NOT NULL DEFAULT 65;
