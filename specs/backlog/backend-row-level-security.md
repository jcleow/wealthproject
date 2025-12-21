# Row-Level Security (RLS) for Multi-Tenant Data Isolation

## Status
**Draft** — Pending Review

## Problem Statement

While the backend currently filters queries by `user_id` at the application layer, this approach has inherent risks:

1. **Human error**: Developers must remember to pass `userID` to every query
2. **No defense in depth**: A single missed filter exposes all users' data
3. **Audit complexity**: Verifying every query has proper filtering is manual and error-prone
4. **New endpoints**: Each new feature requires careful review for user scoping

We need database-level enforcement that makes cross-user data access **impossible**, regardless of application code bugs.

## Current State

### What's Working
- Auth middleware extracts `userID` from headers into request context
- All handlers call `requireUserID()` before repository methods
- All repository methods include `WHERE user_id = $1` clauses
- Tables have `user_id` columns with indexes

### The Gap
Protection exists only at the application layer. A developer could:
- Forget to add `userID` filter to a new query
- Accidentally remove a filter during refactoring
- Write a raw query that bypasses the repository layer

## Proposed Solution: PostgreSQL Row-Level Security

Row-Level Security (RLS) enforces data isolation at the database level. Even if application code is buggy, the database will **never return rows belonging to other users**.

### How It Works

1. App sets a session variable before each request: `SET LOCAL app.current_user_id = '<uuid>'`
2. RLS policies filter all SELECT/INSERT/UPDATE/DELETE operations automatically
3. Queries without a valid `app.current_user_id` return zero rows (or fail, depending on policy)

## Technical Design

### 1. Database Migration

```sql
-- Migration: Enable RLS on all user-scoped tables

-- Assets
ALTER TABLE finance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_assets ON finance_assets
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Liabilities
ALTER TABLE finance_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_liabilities FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_liabilities ON finance_liabilities
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Incomes
ALTER TABLE finance_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_incomes FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_incomes ON finance_incomes
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Expenses
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_expenses ON finance_expenses
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Property Scenarios
ALTER TABLE property_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_scenarios FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_property_scenarios ON property_scenarios
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Chat Sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_chat_sessions ON chat_sessions
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Scenario Events
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_events FORCE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_scenario_events ON scenario_events
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));
```

### 2. Go Application Changes

#### Approach: Request-Scoped Transaction with RLS Context

Since every API request is already authenticated via `X-User-ID` + `X-Auth-Token` (HMAC), we extend the existing flow to set the RLS context once per request. All queries in that request automatically inherit the user scope.

```go
// internal/database/scoped.go

type ScopedTx struct {
    tx *sql.Tx
}

// BeginScopedTx starts a transaction with RLS context set
func BeginScopedTx(ctx context.Context, db *sql.DB, userID string) (*ScopedTx, error) {
    if userID == "" {
        return nil, errors.New("userID required for database access")
    }

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("begin transaction: %w", err)
    }

    // Set RLS context - this is the key line
    _, err = tx.ExecContext(ctx, "SET LOCAL app.current_user_id = $1", userID)
    if err != nil {
        tx.Rollback()
        return nil, fmt.Errorf("set user context: %w", err)
    }

    return &ScopedTx{tx: tx}, nil
}

func (s *ScopedTx) Commit() error   { return s.tx.Commit() }
func (s *ScopedTx) Rollback() error { return s.tx.Rollback() }
func (s *ScopedTx) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
    return s.tx.QueryContext(ctx, query, args...)
}
// ... other sql.Tx methods
```

**Why transactions?** `SET LOCAL` only works within a transaction and automatically clears on commit/rollback. This guarantees no state leaks between requests, even with connection pooling.

#### Request Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  HTTP Request                                                       │
│  Headers: X-User-ID: "user-123", X-Auth-Token: "hmac-signed-jwt"   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Auth Middleware (existing)                                         │
│  1. Extract X-User-ID from header                                  │
│  2. Verify HMAC signature on X-Auth-Token                          │
│  3. Store UserContext in request context                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Handler                                                            │
│  1. Get userID from context (already validated)                    │
│  2. BeginScopedTx(ctx, db, userID)                                 │
│     └─► SET LOCAL app.current_user_id = 'user-123'                 │
│  3. Execute queries (RLS auto-filters by user)                     │
│  4. Commit or Rollback (clears RLS context automatically)          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (RLS enforced)                                          │
│  SELECT * FROM finance_assets                                       │
│  → Internally becomes: WHERE user_id = 'user-123'                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Handler Changes

Handlers can be simplified once RLS is in place:

```go
// Before: Manual userID passing
func (h *AssetHandler) list(w http.ResponseWriter, r *http.Request) {
    userID, ok := requireUserID(w, r)
    if !ok {
        return
    }
    items, err := h.store.ListAssets(r.Context(), userID)  // userID passed explicitly
}

// After: RLS handles filtering automatically
func (h *AssetHandler) list(w http.ResponseWriter, r *http.Request) {
    userID, ok := requireUserID(w, r)
    if !ok {
        return
    }

    tx, err := database.BeginScopedTx(r.Context(), h.db, userID)
    if err != nil {
        http.Error(w, "database error", 500)
        return
    }
    defer tx.Rollback()

    items, err := h.store.ListAssets(r.Context(), tx)  // No userID needed in query!
    // ...
    tx.Commit()
}
```

### 4. Repository Changes

Remove `user_id` from WHERE clauses (RLS handles it):

```go
// Before
func (s *Store) ListAssets(ctx context.Context, userID string) ([]Asset, error) {
    query := `SELECT ... FROM finance_assets WHERE user_id = $1`
    rows, err := s.db.QueryContext(ctx, query, userID)
}

// After
func (s *Store) ListAssets(ctx context.Context, tx *ScopedTx) ([]Asset, error) {
    query := `SELECT ... FROM finance_assets`  // RLS filters automatically
    rows, err := tx.QueryContext(ctx, query)
}
```

## Migration Plan

### Phase 1: Add RLS Policies (Non-Breaking)
1. Create migration to enable RLS on all tables
2. Deploy migration — existing queries still work (they pass user_id explicitly)
3. RLS acts as a second layer of defense

### Phase 2: Update Application Code
1. Implement `ScopedTx` wrapper
2. Update handlers to use scoped transactions
3. Simplify repository methods (remove explicit user_id filters)
4. Remove redundant `WHERE user_id = $1` clauses

### Phase 3: Verification
1. Write integration tests that attempt cross-user access
2. Verify RLS blocks unauthorized access even without WHERE clauses
3. Load test to ensure no performance regression

## Rollback Plan

RLS can be disabled per-table without data loss:

```sql
ALTER TABLE finance_assets DISABLE ROW LEVEL SECURITY;
DROP POLICY user_isolation_assets ON finance_assets;
```

Application code with explicit `WHERE user_id = $1` will continue to work.

## Performance Considerations

- **Minimal overhead**: RLS adds a simple equality check per row
- **Index utilization**: Existing `idx_*_user_id` indexes will be used
- **Connection pooling**: `SET LOCAL` is transaction-scoped, doesn't affect other connections
- **Prepared statements**: Still work normally with RLS

## Security Considerations

### What RLS Protects Against
- Application bugs that forget user filtering
- SQL injection that attempts to access other users' data
- Direct database access without proper context (returns empty results)

### What RLS Does NOT Protect Against
- Compromised database credentials (superuser bypasses RLS)
- Application setting wrong `user_id` in context
- Bugs in the auth layer that extract wrong user from token

### Recommendations
- Use a non-superuser database role for the application
- Never bypass RLS with `SECURITY DEFINER` functions unless absolutely necessary
- Log all `SET LOCAL app.current_user_id` calls for audit trail

## Open Questions

1. **Admin access**: How should admin users access all data? Options:
   - Separate admin database role that bypasses RLS
   - Special policy for admin user IDs
   - Separate admin endpoints with different connection

2. **Background jobs**: How do cron jobs/workers set user context?
   - Service account with explicit user_id in each job
   - Bypass RLS for system operations (requires careful review)

3. **Reporting/Analytics**: Cross-user aggregations?
   - Separate read replica without RLS for analytics
   - Materialized views with aggregated data

## Success Metrics

- Zero cross-user data access incidents
- All new queries automatically scoped without developer action
- No measurable latency increase (< 1ms p99)

## Timeline

| Phase | Scope | Duration |
|-------|-------|----------|
| Phase 1 | RLS migration + defense in depth | 1-2 days |
| Phase 2 | Application code refactor | 3-5 days |
| Phase 3 | Testing + verification | 2-3 days |

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Crunchy Data RLS Best Practices](https://www.crunchydata.com/blog/a-postgresql-row-level-security-primer)
