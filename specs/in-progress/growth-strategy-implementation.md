# Growth Strategy Implementation

## Overview

Implemented a modular growth strategy system that allows different types of financial items (assets, liabilities, incomes, expenses) to use different growth calculation methods.

## Key Concepts

1. **Monthly Compounding** (`compound_monthly`) - Used for assets and cash that earn interest continuously
   - Formula: `value × (1 + (1 + rate/100)^(1/12) - 1)`
   - Example: Bank accounts, investments, CPF accounts

2. **Annual Step** (`annual_step`) - Used for income/expenses that only increase once per year
   - Formula: `baseAmount × (1 + rate/100)^yearIndex`
   - Example: Salary increases, rent increases, insurance premiums

3. **Tiered ADB** (`tiered_adb`) - Used for bank accounts with tiered interest rates
   - Formula: Find applicable tier based on balance, then apply monthly compounding
   - Example: DBS Multiplier with different rates for different balance tiers

4. **Fixed** (`fixed`) - No growth
   - Formula: Returns same value
   - Example: Fixed expenses, expired items

## Implementation Pattern

Following Go best practices: **Return concrete types, consume interfaces**

```go
// Return concrete type
func NewCompoundMonthly() CompoundMonthlyStrategy {
    return CompoundMonthlyStrategy{}
}

// Consume interface
type Service struct {
    strategy growth.Strategy  // Interface
}
```

## Files Created

### 1. Growth Package
- `backend/internal/financial/growth/growth.go`
  - `Strategy` interface
  - `CompoundMonthlyStrategy` - Monthly compounding
  - `AnnualStepStrategy` - Annual step increase
  - `TieredADBStrategy` - Tiered interest rates
  - `FixedStrategy` - No growth
  - `GetStrategy()` - Convenience function

- `backend/internal/financial/growth/growth_test.go`
  - Comprehensive tests for all strategies
  - Tests verify correct behavior over time
  - Tests verify 12 months of monthly compounding equals annual rate

### 2. Database Migration
- `backend/migrations/20250106002_add_growth_strategy.up.sql`
  - Adds `growth_strategy` column (VARCHAR) to all financial tables
  - Adds `growth_metadata` column (JSONB) for strategy configuration
  - Sets appropriate defaults:
    - Assets: `compound_monthly`
    - Liabilities: `compound_monthly`
    - Incomes: `annual_step`
    - Expenses: `annual_step`
    - Cash Accounts: `compound_monthly`
  - Adds check constraints for valid strategy types
  - Adds indices for querying by strategy

- `backend/migrations/20250106002_add_growth_strategy.down.sql`
  - Rollback migration

### 3. Repository Types Updated
Updated the following types in `repository` package:
- `Asset` - Added `GrowthStrategy` and `GrowthMetadata`
- `Liability` - Added `GrowthStrategy` and `GrowthMetadata`
- `Income` - Added `GrowthStrategy` and `GrowthMetadata`
- `Expense` - Added `GrowthStrategy` and `GrowthMetadata`
- `CashAccount` - Added `GrowthStrategy` and `GrowthMetadata`

## Next Steps to Complete Integration

### 1. Run Database Migration

```bash
cd backend
# Apply migration
go run cmd/migrate/main.go up

# Or if using a different migration tool, run:
# psql -d your_database -f migrations/20250106002_add_growth_strategy.up.sql
```

### 2. Update Timeline Service

Update `backend/internal/financial/timeline/service.go` to use growth strategies:

```go
import (
    "github.com/jcleow/financial-chat-system-backend/internal/financial/growth"
)

// Replace line 777-778:
// OLD:
// monthlyRate := math.Pow(1+rate/100, 1.0/12.0) - 1
// st.amount = st.amount * (1 + monthlyRate)

// NEW:
strategyType := growth.StrategyType(st.growthStrategy)
if strategyType == "" {
    strategyType = growth.CompoundMonthly // default for backward compatibility
}
strategy := growth.GetStrategy(strategyType)
st.amount = strategy.Calculate(growth.Params{
    CurrentValue: st.amount,
    Rate:         rate,
    PeriodIndex:  monthIdx,
    Frequency:    "monthly",
    Metadata:     st.growthMetadata,
})
```

Similarly update other growth calculations in the timeline service.

### 3. Update Repository SQL Queries

Update INSERT/UPDATE/SELECT queries to include the new fields:

**Example for Assets (in `backend/internal/financial/repository/store.go`):**

```sql
-- INSERT
INSERT INTO assets (
    user_id, name, category, current_value, annual_growth_rate,
    frequency, start_year, start_month, end_year, end_month, notes,
    growth_strategy, growth_metadata  -- ADD THESE
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)

-- SELECT
SELECT id, name, category, current_value, annual_growth_rate,
       frequency, start_year, start_month, end_year, end_month, notes,
       growth_strategy, growth_metadata,  -- ADD THESE
       updated_at
FROM assets
WHERE user_id = $1
```

Do the same for liabilities, incomes, expenses, and cash_accounts tables.

### 4. Update Sample Data Mutation (Frontend)

Update `frontend/src/hooks/queries/useLoadSampleDataMutation.ts` to include growth strategies:

```typescript
const sampleAssets = [
    {
        name: 'DBS Multiplier Account',
        category: 'Bank Account',
        currentValue: 25000,
        annualGrowthRate: 2.5,
        startYear: currentYear,
        growthStrategy: 'compound_monthly',  // ADD THIS
        notes: 'Main savings account with salary crediting',
    },
    // ... other assets
]

const sampleIncomes = [
    {
        source: 'Software Engineer Salary',
        category: 'Employment',
        amount: 7500,
        frequency: 'monthly',
        startYear: currentYear,
        growthRate: 4.0,
        growthStrategy: 'annual_step',  // ADD THIS
        notes: 'Mid-senior role at tech company',
    },
    // ... other incomes
]

const sampleExpenses = [
    {
        payee: 'Rent (Room)',
        category: 'Housing',
        amount: 1200,
        frequency: 'monthly',
        startYear: currentYear,
        growthRate: 3.0,
        growthStrategy: 'annual_step',  // ADD THIS
        notes: 'Master bedroom in shared HDB',
    },
    // ... other expenses
]
```

### 5. Update TypeScript Types (Frontend)

Update `frontend/src/types/financial.ts`:

```typescript
export interface Asset {
    id: string
    name: string
    // ... existing fields
    growthStrategy?: 'compound_monthly' | 'annual_step' | 'tiered_adb' | 'fixed'
    growthMetadata?: Record<string, any>
}

export interface Income {
    id: string
    source: string
    // ... existing fields
    growthStrategy?: 'compound_monthly' | 'annual_step' | 'tiered_adb' | 'fixed'
    growthMetadata?: Record<string, any>
}

export interface Expense {
    id: string
    payee: string
    // ... existing fields
    growthStrategy?: 'compound_monthly' | 'annual_step' | 'tiered_adb' | 'fixed'
    growthMetadata?: Record<string, any>
}
```

## Usage Examples

### Example 1: Basic Annual Step (Rent)

```go
// Rent increases 3% per year on January 1st
expense := Expense{
    Payee: "Rent (Room)",
    Amount: 1200,
    GrowthRate: 3.0,
    GrowthStrategy: "annual_step",
}

// Month 0-11 (Year 0): $1,200/month
// Month 12-23 (Year 1): $1,236/month (1200 × 1.03)
// Month 24-35 (Year 2): $1,273/month (1200 × 1.03²)
```

### Example 2: Monthly Compounding (Savings Account)

```go
// Savings account compounds interest monthly
asset := Asset{
    Name: "DBS Multiplier",
    CurrentValue: 25000,
    AnnualGrowthRate: 2.5,
    GrowthStrategy: "compound_monthly",
}

// Month 1: $25,051.60
// Month 2: $25,103.31
// ...
// Month 12: $25,625 (equals 25000 × 1.025)
```

### Example 3: Tiered Interest (DBS Multiplier)

```go
// DBS Multiplier with tiered rates
asset := Asset{
    Name: "DBS Multiplier",
    CurrentValue: 75000,
    GrowthStrategy: "tiered_adb",
    GrowthMetadata: map[string]interface{}{
        "tiers": []map[string]float64{
            {"threshold": 0, "rate": 0.05},
            {"threshold": 50000, "rate": 1.5},
            {"threshold": 100000, "rate": 2.5},
        },
    },
}

// Balance $75,000 uses 1.5% rate (>= 50k tier)
// If balance grows to $100,000+, switches to 2.5% rate
```

## Testing

Run the growth strategy tests:

```bash
cd backend
go test ./internal/financial/growth/... -v
```

Expected output:
- All tests pass
- Verifies monthly compounding equals annual rate after 12 months
- Verifies annual step only increases once per year
- Verifies tiered rates apply correctly

## Benefits

1. **Realistic projections** - Income/expenses now increase annually (like real life) instead of monthly
2. **Extensible** - Easy to add new growth strategies (e.g., CPF contribution schedules, stepped increases)
3. **Testable** - Each strategy is independently tested
4. **Type-safe** - Go interfaces ensure correct usage
5. **Backward compatible** - Defaults maintain existing behavior

## Migration Strategy

1. ✅ Create growth package with strategies
2. ✅ Create database migration
3. ✅ Update repository types
4. ⏳ Run migration on database
5. ⏳ Update timeline service to use strategies
6. ⏳ Update repository SQL queries
7. ⏳ Update frontend types and sample data
8. ⏳ Test E2E with Excel verification

## Current Status

- [x] Growth strategy package implemented
- [x] Tests written and passing
- [x] Database migration created
- [x] Repository types updated
- [ ] Database migration applied
- [ ] Timeline service updated to use strategies
- [ ] Repository SQL queries updated
- [ ] Frontend types updated
- [ ] Sample data updated with strategies
- [ ] E2E testing completed

## Next Immediate Action

Run the database migration to add the new columns:

```bash
cd backend
go run cmd/migrate/main.go up
```

Then update the timeline service to use the growth strategies instead of the hardcoded math.Pow calculations.
