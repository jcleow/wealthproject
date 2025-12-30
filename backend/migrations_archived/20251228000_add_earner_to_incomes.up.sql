-- Add earner column to finance_incomes for multi-borrower property scenarios
ALTER TABLE finance_incomes
    ADD COLUMN earner VARCHAR(20) DEFAULT 'self';

ALTER TABLE finance_incomes
    ADD CONSTRAINT finance_incomes_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));
