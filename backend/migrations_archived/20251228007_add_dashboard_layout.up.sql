-- Migration: Add dashboard_layout field to user_settings
-- Controls the dashboard layout: stacked (default), chart-left, or chart-right

ALTER TABLE user_settings
  ADD COLUMN dashboard_layout VARCHAR(20) NOT NULL DEFAULT 'stacked';

COMMENT ON COLUMN user_settings.dashboard_layout IS
  'Dashboard layout preference: stacked (chart on top), chart-left (chart left side), or chart-right (chart right side)';
