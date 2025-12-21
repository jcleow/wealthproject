-- Rollback: Remove group_items_by_category field from user_settings

ALTER TABLE user_settings
  DROP COLUMN IF EXISTS group_items_by_category;
