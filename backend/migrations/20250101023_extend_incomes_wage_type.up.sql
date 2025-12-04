-- Extend finance_incomes table with wage classification for CPF calculation
ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS income_type TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS wage_type TEXT,
ADD COLUMN IF NOT EXISTS cpf_applicable BOOLEAN DEFAULT FALSE;

-- Add constraint for valid income types
ALTER TABLE finance_incomes
ADD CONSTRAINT finance_incomes_income_type_check CHECK (
    income_type IN ('salary', 'bonus', 'commission', 'rental', 'dividend', 'freelance', 'other')
);

-- Add constraint for valid wage types (OW = Ordinary Wages, AW = Additional Wages)
ALTER TABLE finance_incomes
ADD CONSTRAINT finance_incomes_wage_type_check CHECK (
    wage_type IS NULL OR wage_type IN ('ow', 'aw')
);

COMMENT ON COLUMN finance_incomes.income_type IS 'Type of income: salary, bonus, commission, rental, dividend, freelance, other';
COMMENT ON COLUMN finance_incomes.wage_type IS 'CPF wage classification: ow (Ordinary Wages - monthly), aw (Additional Wages - bonus/irregular), null (non-employment)';
COMMENT ON COLUMN finance_incomes.cpf_applicable IS 'Whether CPF contributions apply to this income (true for employment income in Singapore)';
