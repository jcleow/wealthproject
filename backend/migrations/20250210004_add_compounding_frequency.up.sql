-- Migration: Add compounding_frequency field to user_settings
-- Separates how growth is COMPUTED (monthly/annual compounding) from how data is DISPLAYED (time_resolution)
-- Part 5 of 5 (main migrations): User settings update

ALTER TABLE user_settings
  ADD COLUMN compounding_frequency VARCHAR(10) NOT NULL DEFAULT 'monthly'
    CHECK (compounding_frequency IN ('monthly', 'annual'));

COMMENT ON COLUMN user_settings.compounding_frequency IS
  'How growth is computed: monthly = compound 12x per year (more accurate), annual = step increases once per year (simpler). '
  'This is SEPARATE from time_resolution which controls display (yearly bars vs monthly bars). '
  'Example: You can compute with monthly compounding but display as yearly bars.';

-- Set default to 'monthly' for all users (more mathematically accurate)
-- No need to update existing rows since DEFAULT is already 'monthly'

-- Report settings
DO $$
DECLARE
    users_count INT;
BEGIN
    SELECT COUNT(*) INTO users_count FROM user_settings;
    RAISE NOTICE 'Compounding frequency added to user_settings: % users will use monthly compounding by default', users_count;
END $$;
