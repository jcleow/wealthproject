# Codebase Notes for AI Agents

## Repository Structure

### Deprecated vs Active Code

| Path | Status | Notes |
|------|--------|-------|
| `internal/financial/repository/store.go` | **DEPRECATED** | v1 repository - do not add new features here |
| `internal/financial_v2/repository/store.go` | **ACTIVE** | v2 repository - all new features go here |
| `cmd/server/handlers/` | **ACTIVE** | HTTP handlers using v1 store (being migrated) |

### Key Differences: v1 vs v2

| Feature | v1 (`financial/`) | v2 (`financial_v2/`) |
|---------|-------------------|----------------------|
| Decimal handling | `float64` | `decimal.Decimal` |
| Error handling | `repository.ErrNotFound` | `repository.ErrNotFound` |
| Return types | Direct structs | Pointer returns (`*Type`) |
| Query logging | None | `logQuery()` debug support |

## Database Schema

### Entity Relationships

See `/specs/income-relationships-schema.md` for full ERD documentation.

Key tables:
- `finance_incomes` - Income records with optional source (polymorphic FK)
- `finance_expenses` - Expense records with optional liability source
- `finance_investments` - Investment accounts
- `finance_cash_accounts` - Cash/bank accounts
- `finance_liabilities` - Loans/debts
- `income_allocations` - Distribution of income to destinations (v2 only)

### Foreign Key Patterns

1. **Direct FK** (DB-enforced): Used when target is single table
   - `income_allocations.target_cash_account_id -> finance_cash_accounts.id`
   - `income_allocations.target_investment_id -> finance_investments.id`

2. **Polymorphic FK** (App-enforced): Used when target can be multiple tables
   - `finance_incomes.source_type + source_id` -> investments OR cash_accounts
   - Requires app-level cascade delete

### Cascade Delete Behavior

| Relationship | Type | Cascade |
|--------------|------|---------|
| income -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| cash_account -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| investment -> allocations | DB FK | DB-level (ON DELETE CASCADE) |
| investment -> incomes (source) | Polymorphic | App-level (handler code) |
| cash_account -> incomes (source) | Polymorphic | App-level (handler code) |
| liability -> expenses | DB FK | DB-level (ON DELETE CASCADE) |

## Development Guidelines

### Adding New Features

1. Add models and methods to `internal/financial_v2/repository/store.go`
2. Use `decimal.Decimal` for all monetary values
3. Return pointers for single-item queries
4. Use proper error wrapping with `fmt.Errorf`

### SQL Style

1. **Use CTEs over nested subqueries** - CTEs (`WITH` clauses) are more readable
   ```sql
   -- Good: CTE
   WITH paginated_events AS (
       SELECT * FROM scenario_events
       WHERE user_id = $1
       LIMIT $2 OFFSET $3
   )
   SELECT e.*, i.*
   FROM paginated_events e
   LEFT JOIN scenario_event_impacts i ON i.event_id = e.id

   -- Avoid: Nested subquery
   SELECT e.*, i.*
   FROM (SELECT * FROM scenario_events WHERE user_id = $1 LIMIT $2 OFFSET $3) e
   LEFT JOIN scenario_event_impacts i ON i.event_id = e.id
   ```

2. **Avoid N+1 queries** - Use JOINs or batch queries instead of looping
3. **Use pgx directly** - `financial_v2` uses `pgxpool`, not `database/sql`

### Database Migrations

Migrations are in `backend/migrations/` with naming convention:
```
YYYYMMDDNNN_description.up.sql
YYYYMMDDNNN_description.down.sql
```

### Testing Queries

Enable SQL logging by setting `repository.DebugSQL = true` in v2 store.
