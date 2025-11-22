Manual checks for multiyear growth
==================================

DB quick inspections (via worktree container)
---------------------------------------------
- List growth configs: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select category, annual_rate_pct, lower_bound_pct, upper_bound_pct from growth_configs order by category;"`
- Distinct categories in all tables: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select distinct category from finance_assets union select distinct category from finance_liabilities union select distinct category from finance_incomes union select distinct category from finance_expenses order by 1;"`
- Inspect effective-dated rows:
  - Assets: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select parent_id, name, category, start_year, end_year, frequency, current_value from finance_assets order by parent_id, start_year limit 20;"`
  - Liabilities: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select parent_id, name, category, start_year, end_year, frequency, current_balance from finance_liabilities order by parent_id, start_year limit 20;"`
  - Incomes: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select parent_id, source as name, category, start_year, end_year, frequency, amount from finance_incomes order by parent_id, start_year limit 20;"`
  - Expenses: `docker exec -it fcs-multiyear-2433db-postgres psql -U financial_user -d financial_chat -c "select parent_id, payee as name, category, start_year, end_year, frequency, amount from finance_expenses order by parent_id, start_year limit 20;"`

API quick checks
----------------
- Net worth growth sanity: `curl -s http://localhost:8080/api/v1/financial/timeline | jq '[.years[0].netWorth, .years[1].netWorth, .years[2].netWorth]'`
- Growth config via API:
  - GET: `curl -s http://localhost:8080/api/v1/financial/growth | jq`
  - PUT (defaults): `curl -X PUT http://localhost:8080/api/v1/financial/growth -H "Content-Type: application/json" -d '{"growth":[{"category":"asset_cash","annual_rate_pct":1.5},{"category":"asset_equity","annual_rate_pct":6},{"category":"asset_property","annual_rate_pct":3},{"category":"liability_debt","annual_rate_pct":-3},{"category":"income","annual_rate_pct":3},{"category":"expense","annual_rate_pct":2}]}' | jq`

What to look for
----------------
- Categories in the finance tables should map to growth keys above; uncategorized items will show 0% growth.
- start_year/end_year should keep items alive across years (end_year null means carry forward). Amount 0 at start_year means delete forward.
- Net worth array should change between year 0/1/2 when growth > 0 for any asset/income and < 0 for liabilities/expenses.
