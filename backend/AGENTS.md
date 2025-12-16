# Codebase Notes for AI Agents

## ⚠️ CRITICAL: Use financial_v2 Store, Not financial (v1)

**DO NOT use `internal/financial/repository/store.go` (v1 Store).**

The v1 Store is **DEPRECATED**. All new development and handler migrations MUST use the v2 Store:
- Import: `finRepoV2 "financial-chat-system/backend/internal/financial_v2/repository"`
- The v2 Store uses `decimal.Decimal` for monetary values (not `float64`)
- v2 methods return pointers for single-item queries (`*Type` instead of `Type`)

When migrating handlers from v1 to v2:
1. Change import from `internal/financial/repository` to `internal/financial_v2/repository`
2. Update handler constructor to accept `*finRepoV2.Store`
3. Convert float64 inputs to `decimal.Decimal` using `decimal.MustFromFloat64()`
4. Handle pointer returns appropriately

## Repository Structure

### Deprecated vs Active Code

| Path | Status | Notes |
|------|--------|-------|
| `internal/financial/repository/store.go` | **DEPRECATED** | v1 repository - DO NOT USE for new features |
| `internal/financial_v2/repository/store.go` | **ACTIVE** | v2 repository - all new features go here |
| `internal/financial_v2/repository/expense.go` | **ACTIVE** | Expense CRUD operations (v2) |
| `cmd/server/handlers/` | **ACTIVE** | HTTP handlers (being migrated to v2 store) |

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

### Type Safety

**Never use raw strings for known value sets** - Always codify as union types (TypeScript) or string constants (Go):

```typescript
// Bad: raw string type
interface Response {
  itemType: string
  frequency: string
}

// Good: union types
type ItemType = 'asset' | 'liability' | 'income' | 'expense'
type Frequency = 'monthly' | 'annual' | 'weekly'

interface Response {
  itemType: ItemType
  frequency: Frequency
}
```

```go
// Bad: raw string
type Response struct {
    ItemType string `json:"itemType"`
}

// Good: typed constant
type ItemType string
const (
    ItemTypeAsset     ItemType = "asset"
    ItemTypeLiability ItemType = "liability"
)

type Response struct {
    ItemType ItemType `json:"itemType"`
}
```

This ensures compile-time type checking and IDE autocompletion.

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
