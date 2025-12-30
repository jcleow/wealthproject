-- Migration: Add chart_picture_in_picture field to user_settings
-- Controls whether the chart shows as a floating mini version when scrolled out of view

ALTER TABLE user_settings
  ADD COLUMN chart_picture_in_picture BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_settings.chart_picture_in_picture IS
  'Whether to show a mini floating chart when the main chart is scrolled out of view';
