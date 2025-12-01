-- Add auto_execute_tools column to user_settings table
-- When true, AI tool calls are executed immediately without preview/confirmation
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auto_execute_tools BOOLEAN NOT NULL DEFAULT false;
