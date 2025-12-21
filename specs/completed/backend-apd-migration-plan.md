# APD Decimal Migration Plan

## Status: IN PROGRESS

Branch: `feat/migrate-to-apd-decimals`

## Objective

Migrate entire backend from `float64` to `apd` decimals for accurate financial calculations.

## Completed ✅

1. **Install apd package** - `github.com/cockroachdb/apd/v3`
2. **Create decimal helper package** - `backend/internal/decimal/`
3. **Migrate growth package** - All strategies now use `*decimal.Decimal`

## Next Steps

### Phase 1: Core Financial Types (HIGH PRIORITY)
- [ ] Update `timeline/types.go` - TimelineItem, TimelineYear, TimelineMonth
- [ ] Update `repository/types.go` - Asset, Liability, Income, Expense models
- [ ] Update `repository/growth.go` - GrowthConfig to store rates as basis points (int64)

### Phase 2: Timeline Service (CRITICAL PATH)
- [ ] Update `timeline/service.go` - All calculation methods
- [ ] Update cash account calculations
- [ ] Update net worth calculations
- [ ] Fix all growth application logic

### Phase 3: Repository Layer
- [ ] Update `repository/store.go` - Database scan/value methods
- [ ] Update `repository/assets.go` - CRUD operations
- [ ] Update `repository/liabilities.go` - CRUD operations
- [ ] Update `repository/incomes.go` - CRUD operations
- [ ] Update `repository/expenses.go` - CRUD operations
- [ ] Update `repository/cash_accounts.go` - CRUD operations

### Phase 4: API Handlers
- [ ] Update `handlers/assets.go` - JSON serialization
- [ ] Update `handlers/liabilities.go`
- [ ] Update `handlers/timeline.go`
- [ ] Update `handlers/scenario_events.go`

### Phase 5: Database Schema
- [ ] Create migration to change BIGINT → NUMERIC(15,2) for amounts
- [ ] Create migration to change REAL → NUMERIC(8,4) for rates/percentages
- [ ] Update existing data (cents → dollars)

### Phase 6: Supporting Packages
- [ ] Update `financial/client.go` - Analysis methods
- [ ] Update `financial/calculator.go`
- [ ] Update `scenario/service.go`
- [ ] Leave CPF package as-is for now (separate concern)
- [ ] Leave LLM/usage packages as-is (not financial calculations)

### Phase 7: Testing
- [ ] Update all tests to use decimal
- [ ] Add integration tests for growth calculations
- [ ] Test JSON serialization/deserialization
- [ ] Test database operations

## Strategy

### Storage Approach
- **Database**: Use `NUMERIC` type (PostgreSQL arbitrary precision)
- **Go Models**: Use `*decimal.Decimal` for all financial amounts and rates
- **JSON API**: Serialize as strings (e.g., `"100.50"`)

### Rate Storage
- **Growth rates**: Store as basis points (int64) in DB, convert to decimal for calculations
- **Interest rates**: Store as NUMERIC(8,4) percentage (e.g., 3.5000 for 3.5%)

### Conversion Pattern
```go
// Database → Go
func scanAmount(src interface{}) (*decimal.Decimal, error) {
    // Use decimal.Decimal.Scan()
}

// Go → Database
func (d *decimal.Decimal) Value() (driver.Value, error) {
    // Use decimal.Decimal.Value()
}

// JSON → Go
func (d *decimal.Decimal) UnmarshalJSON(data []byte) error {
    // Parse string representation
}

// Go → JSON
func (d decimal.Decimal) MarshalJSON() ([]byte, error) {
    // Return string representation
}
```

## Breaking Changes

1. **API Response Format**: Amounts change from `float64` to `string`
   - Before: `{"amount": 100.5}`
   - After: `{"amount": "100.50"}`

2. **Database Schema**: Column types change
   - Before: `BIGINT` (cents) or `REAL` (dollars)
   - After: `NUMERIC(15,2)` for amounts, `NUMERIC(8,4)` for rates

## Rollout Plan

1. Complete migration on feature branch
2. Update frontend to handle string amounts
3. Test thoroughly in development
4. Run database migration
5. Deploy backend + frontend together (coordinated release)

## Risks & Mitigations

**Risk**: Large codebase, many files to change
**Mitigation**: Incremental commits, compile after each package

**Risk**: Performance degradation
**Mitigation**: apd is fast enough for our use case, profile if needed

**Risk**: Breaking API changes
**Mitigation**: Version API or coordinate frontend/backend deploy

**Risk**: Database migration on production data
**Mitigation**: Test migration on copy of production data first

## Notes

- apd's `Pow()` function supports fractional exponents (unlike shopspring)
- Context-based precision control allows explicit rounding
- PostgreSQL NUMERIC maps perfectly to apd.Decimal
- All errors from decimal operations must be handled
