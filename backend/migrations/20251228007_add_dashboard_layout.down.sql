-- Rollback: Remove dashboard_layout field from user_settings

ALTER TABLE user_settings
  DROP COLUMN dashboard_layout;
