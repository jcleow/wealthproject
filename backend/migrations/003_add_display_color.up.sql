-- Add display_color column to scenario_events table
ALTER TABLE scenario_events ADD COLUMN IF NOT EXISTS display_color VARCHAR(7);