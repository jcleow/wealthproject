-- Rollback: Remove compounding_frequency field from user_settings

ALTER TABLE user_settings DROP COLUMN IF EXISTS compounding_frequency;

RAISE NOTICE 'Compounding frequency field removed from user_settings';
