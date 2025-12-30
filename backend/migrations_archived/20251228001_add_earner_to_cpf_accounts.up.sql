-- Add earner column to cpf_accounts for multi-borrower property scenarios
ALTER TABLE cpf_accounts
    ADD COLUMN earner VARCHAR(20) DEFAULT 'self';

ALTER TABLE cpf_accounts
    ADD CONSTRAINT cpf_accounts_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));
