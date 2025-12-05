# TODO

## Database

- [ ] Migrate `finance_*` tables from `DOUBLE PRECISION` to `NUMERIC(15,6)` for precision
  - `finance_assets.current_value`
  - `finance_liabilities.current_balance`, `minimum_payment`
  - `finance_incomes.amount`
  - `finance_expenses.amount`
  - `property_scenarios.property_price`, `down_payment`, `loan_amount`
