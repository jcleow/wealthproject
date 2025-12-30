-- Rollback: Remove chart_picture_in_picture column from user_settings

ALTER TABLE user_settings
  DROP COLUMN IF EXISTS chart_picture_in_picture;
