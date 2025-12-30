-- Migration: Add group_items_by_category field to user_settings
-- Controls whether financial items are grouped by category in the UI

ALTER TABLE user_settings
  ADD COLUMN group_items_by_category BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN user_settings.group_items_by_category IS
  'Whether to group financial items by category in collapsible sections in the UI';
