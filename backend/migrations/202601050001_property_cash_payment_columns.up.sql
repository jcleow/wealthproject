-- Add per-borrower cash payment columns to property_sg
-- These columns track cash account references and amounts for downpayment and monthly payments
-- NOTE: This migration is idempotent - safe to run multiple times

DO $$
BEGIN
    -- Borrower 1 downpayment cash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_downpayment_cash_account_id') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_downpayment_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_downpayment_cash_amount') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_downpayment_cash_amount numeric(15,4) DEFAULT 0 NOT NULL;
    END IF;

    -- Borrower 2 downpayment cash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_downpayment_cash_account_id') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_downpayment_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_downpayment_cash_amount') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_downpayment_cash_amount numeric(15,4) DEFAULT 0 NOT NULL;
    END IF;

    -- Borrower 1 monthly cash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_monthly_cash_account_id') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_monthly_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_monthly_cash_amount_type') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_monthly_cash_amount_type character varying(20) DEFAULT 'fixed' CHECK (borrower1_monthly_cash_amount_type IN ('fixed', 'remainder'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower1_monthly_cash_amount') THEN
        ALTER TABLE property_sg ADD COLUMN borrower1_monthly_cash_amount numeric(15,4) DEFAULT 0 NOT NULL;
    END IF;

    -- Borrower 2 monthly cash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_monthly_cash_account_id') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_monthly_cash_account_id uuid REFERENCES finance_cash_accounts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_monthly_cash_amount_type') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_monthly_cash_amount_type character varying(20) DEFAULT 'fixed' CHECK (borrower2_monthly_cash_amount_type IN ('fixed', 'remainder'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_sg' AND column_name = 'borrower2_monthly_cash_amount') THEN
        ALTER TABLE property_sg ADD COLUMN borrower2_monthly_cash_amount numeric(15,4) DEFAULT 0 NOT NULL;
    END IF;
END $$;
