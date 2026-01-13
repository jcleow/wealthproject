-- Add gender column to persons table for CPF LIFE payout calculations
-- Gender affects life expectancy and therefore CPF LIFE payout divisors

ALTER TABLE persons
ADD COLUMN gender VARCHAR(10) DEFAULT 'male' NOT NULL
CHECK (gender IN ('male', 'female'));

-- Add comment for documentation
COMMENT ON COLUMN persons.gender IS 'Gender of person (male/female), required for CPF LIFE payout calculations';
