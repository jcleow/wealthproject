-- Migration: Make finance_incomes.start_date optional with default now()
ALTER TABLE finance_incomes
    ALTER COLUMN start_date DROP NOT NULL,
    ALTER COLUMN start_date SET DEFAULT NOW();
