# Timeline V2 Monthly Calculation Implementation Plan

## Context
- **Goal**: Implement monthly timeline calculation (420 months) for financial projection
- **Key Requirement**: Support 10-50 different compounding strategies via pluggable growth module
- **Improvements over V1**: Better performance, cleaner architecture, new features, bug fixes

## Current State Analysis

### Existing Code Structure
From `/Users/jitcorn/assetra3/backend/internal/financial_v2/timeline/service.go`:
- `loadEffectiveRows()` - loads all financial data in parallel ✅
- `aggregateByYearMonth()` - groups data by year:month ✅
- `computeFinancialSnapshot()` - STUB with TODO comments ⚠️

### Data Flow
1. Load financial data → `EffectiveRows{NonCashAssets, CashAssets, Liabilities, Incomes, Expenses}`
2. Aggregate by time → `map[string]EffectiveRows` where key = "year:month"
3. Iterate through 420 months → Apply growth, calculate cash, compute net worth

## Recommended Architecture

### Phase 1: Growth Module Design

Create a **Strategy Pattern** for growth calculations to support 10-50 compounding types.

#### 1.1 Growth Interface
```go
// growth/strategy.go
package growth

type Strategy interface {
    // Apply calculates the new amount after applying growth
    // currentAmount: the current value
    // params: strategy-specific parameters (rate, compounding frequency, etc.)
    // elapsedPeriods: how many periods have passed (e.g., 1 month)
    Apply(currentAmount decimal.Decimal, params Params, elapsedPeriods int) decimal.Decimal

    // Name returns the strategy identifier
    Name() string
}

type Params struct {
    AnnualRatePct decimal.Decimal
    // Add more as needed for different strategies
    CustomFields map[string]interface{}
}
```

#### 1.2 Built-in Strategies (Examples)
```go
// Monthly compound: amount * (1 + rate/100)^(1/12)
type MonthlyCompoundStrategy struct{}

// Annual step: amount * (1 + rate/100) only on January
type AnnualStepStrategy struct{}

// Continuous compound: amount * e^(rate * time)
type ContinuousCompoundStrategy struct{}

// Linear growth: amount + (rate * amount / 12) per month
type LinearGrowthStrategy struct{}

// Custom user-defined strategies...
```

#### 1.3 Strategy Registry
```go
package growth

type Registry struct {
    strategies map[string]Strategy
}

func NewRegistry() *Registry {
    r := &Registry{strategies: make(map[string]Strategy)}

    // Register built-in strategies
    r.Register(&MonthlyCompoundStrategy{})
    r.Register(&AnnualStepStrategy{})
    r.Register(&ContinuousCompoundStrategy{})
    // ... more

    return r
}

func (r *Registry) Register(s Strategy) {
    r.strategies[s.Name()] = s
}

func (r *Registry) Get(name string) (Strategy, error) {
    s, ok := r.strategies[name]
    if !ok {
        return nil, fmt.Errorf("growth strategy %q not found", name)
    }
    return s, nil
}
```

### Phase 2: Monthly Timeline Calculation Logic

Based on the TODO comments in `computeFinancialSnapshot()`, implement the three core steps:

#### 2.1 Step 1: Apply Growth to Income/Expense
```go
// Pseudocode for income/expense growth
for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
    year := monthIdx / 12
    month := (monthIdx % 12) + 1

    // Get items for this month
    key := formatYearMonth(year, month)
    monthData := rowsByYearMonth[key]

    // Apply growth if not first year (monthIdx >= 12)
    if monthIdx >= 12 {
        for id, item := range state {
            // Determine which growth strategy to use
            strategy := growthRegistry.Get(item.GrowthStrategyName)

            // Check if it's time to apply growth
            if shouldApplyGrowth(monthIdx, month, strategy) {
                params := growth.Params{
                    AnnualRatePct: item.GrowthRate,
                }
                item.Amount = strategy.Apply(item.Amount, params, 1)
            }
        }
    }
}
```

#### 2.2 Step 2: Calculate Net Cash Savings
```go
// For each month, calculate income - expenses and add to cash accumulator
monthlyIncome := sumMonthlyAmounts(monthData.Incomes, state)
monthlyExpenses := sumMonthlyAmounts(monthData.Expenses, state)

monthlyNetSavings := monthlyIncome - monthlyExpenses

// Add to cash accumulator (only after month 0)
if monthIdx > 0 {
    accumulatedCash += monthlyNetSavings
}
```

#### 2.3 Step 3: Apply Growth to Assets/Liabilities
```go
// Similar to income/expense growth, but for balance sheet items
for id, item := range state {
    if item.ItemType == FinNonCashAsset || item.ItemType == FinCashAsset || item.ItemType == FinLiabilities {
        strategy := growthRegistry.Get(item.GrowthStrategyName)

        if shouldApplyGrowth(monthIdx, month, strategy) {
            params := growth.Params{
                AnnualRatePct: item.GrowthRate,
            }
            item.Amount = strategy.Apply(item.Amount, params, 1)
        }
    }
}

// Special handling for cash accumulator interest
if monthIdx > 0 {
    cashStrategy := growthRegistry.Get(accumulator.GrowthStrategyName)
    interestParams := growth.Params{
        AnnualRatePct: accumulator.InterestRate,
    }
    interestEarned := cashStrategy.Apply(accumulatedCash, interestParams, 1) - accumulatedCash
    accumulatedCash += interestEarned
}
```

### Phase 3: Implementation Structure

#### File Organization
```
backend/internal/financial_v2/
├── timeline/
│   ├── service.go           # Main service with computeFinancialSnapshot()
│   ├── types.go             # Existing types
│   ├── monthly.go           # NEW: Monthly calculation logic
│   └── state.go             # NEW: Item state management
├── growth/
│   ├── strategy.go          # NEW: Strategy interface
│   ├── registry.go          # NEW: Strategy registry
│   ├── monthly_compound.go  # NEW: Monthly compound strategy
│   ├── annual_step.go       # NEW: Annual step strategy
│   └── ... (more strategies)
```

### Phase 4: Concrete Implementation for computeFinancialSnapshot

#### 4.1 Complete Function Skeleton

```go
func (s *Service) computeFinancialSnapshot(
    ctx context.Context,
    userID string,
    dateOpts repo.DateRangeOptions,
    paginationOpts repo.PaginationParams,
) (TimelineAnnualChartResponse, error) {

    // 1. Load financial data
    financialData, err := s.loadEffectiveRows(ctx, userID, dateOpts, paginationOpts)
    if err != nil {
        return TimelineAnnualChartResponse{}, fmt.Errorf("failed to fetch data: %w", err)
    }

    // 2. Organize data by year:month
    baseYear := time.Now().Year()
    rowsByYearMonth := aggregateByYearMonth(financialData, baseYear)

    // 3. Initialize growth registry (injected via Service or created here)
    growthRegistry := s.growthRegistry // Assume injected

    // 4. Calculate timeline parameters
    totalYears := 35 // or from user settings
    totalMonths := totalYears * 12 // 420 months

    // 5. Initialize state and accumulator
    state := make(map[string]*ItemState)
    accumulatedCash := decimal.NewFromFloat(0) // Start with 0 or initial balance

    // Get cash accumulator config
    accumulator, err := s.getAccumulatorAccount(ctx, userID)
    if err != nil {
        return TimelineAnnualChartResponse{}, fmt.Errorf("failed to get accumulator: %w", err)
    }

    accumulatedCash = accumulator.Balance

    // 6. Prepare result structure
    months := make([]TimelineMonthlySummary, 0, totalMonths)

    // 7. MAIN LOOP: Iterate through each month
    for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
        year := monthIdx / 12
        month := (monthIdx % 12) + 1
        key := formatYearMonth(year, month)

        // Step A: Process new items for this month
        if newItems, exists := rowsByYearMonth[key]; exists {
            for _, r := range newItems.NonCashAssets {
                state[r.ParentID] = &ItemState{
                    item:   r,
                    amount: r.Amount,
                }
            }
            // Repeat for CashAssets, Liabilities, Incomes, Expenses
        }

        // Step B: Apply growth to existing items (TODO #1 and #3)
        for id, st := range state {
            // Get the growth strategy for this item
            strategy, err := growthRegistry.Get(st.item.GrowthStrategyName)
            if err != nil {
                // Fall back to default strategy based on item type
                strategy, _ = growthRegistry.Get("monthly_compound")
            }

            // Let the strategy decide if and how to apply growth
            params := growth.Params{
                AnnualRatePct: st.item.GrowthRate,
            }
            newAmount := strategy.Apply(st.amount, params, monthIdx, month)
            st.amount = newAmount
        }

        // Step C: Calculate monthly income and expenses (TODO #2)
        var monthlyIncome decimal.Decimal
        var monthlyExpenses decimal.Decimal

        for _, st := range state {
            switch st.item.ItemType {
            case FinIncome:
                monthlyIncome = monthlyIncome.Add(convertToMonthly(st.amount, st.item.Frequency))
            case FinExpense:
                monthlyExpenses = monthlyExpenses.Add(convertToMonthly(st.amount, st.item.Frequency))
            }
        }

        monthlyNetSavings := monthlyIncome.Sub(monthlyExpenses)

        // Step D: Update cash accumulator
        if monthIdx > 0 {
            accumulatedCash = accumulatedCash.Add(monthlyNetSavings)

            // Apply interest to accumulated cash
            cashStrategy, _ := growthRegistry.Get(accumulator.GrowthStrategyName)
            cashParams := growth.Params{
                AnnualRatePct: accumulator.InterestRate,
            }
            accumulatedCash = cashStrategy.Apply(accumulatedCash, cashParams, monthIdx, month)
        }

        // Step E: Calculate net worth for this month
        totalAssets := calculateTotalAssets(state, accumulatedCash)
        totalLiabilities := calculateTotalLiabilities(state)
        netWorth := totalAssets.Sub(totalLiabilities)

        // Step F: Build monthly summary
        months = append(months, TimelineMonthlySummary{
            Month:      month,
            MonthIndex: monthIdx,
            NetWorth:   netWorth,
            // Add more fields as needed
        })

        // Step G: Remove expired items
        for id, st := range state {
            if st.item.EndDate != nil && st.item.EndDate.Before(time.Date(baseYear+year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)) {
                delete(state, id)
            }
        }
    }

    return TimelineAnnualChartResponse{
        Resolution: "monthly",
        Months:     months,
    }, nil
}
```

#### 4.2 Helper Types and Functions

```go
// ItemState tracks the current state of a financial item
type ItemState struct {
    item   FinancialDataRow
    amount decimal.Decimal
}

// convertToMonthly converts an amount to monthly based on frequency
func convertToMonthly(amount decimal.Decimal, freq Frequency) decimal.Decimal {
    switch freq {
    case FrequencyMonthly:
        return amount
    case FrequencyAnnual:
        return amount.Div(decimal.NewFromInt(12))
    case FrequencyWeekly:
        return amount.Mul(decimal.NewFromFloat(52.0 / 12.0))
    case FrequencyBiweekly:
        return amount.Mul(decimal.NewFromFloat(26.0 / 12.0))
    case FrequencyQuarterly:
        return amount.Div(decimal.NewFromInt(3))
    case FrequencySemiannual:
        return amount.Div(decimal.NewFromInt(6))
    default:
        return amount
    }
}

func calculateTotalAssets(state map[string]*ItemState, accumulatedCash decimal.Decimal) decimal.Decimal {
    total := accumulatedCash
    for _, st := range state {
        if st.item.ItemType == FinNonCashAsset || st.item.ItemType == FinCashAsset {
            total = total.Add(st.amount)
        }
    }
    return total
}

func calculateTotalLiabilities(state map[string]*ItemState) decimal.Decimal {
    total := decimal.NewFromInt(0)
    for _, st := range state {
        if st.item.ItemType == FinLiabilities {
            total = total.Add(st.amount)
        }
    }
    return total
}
```

#### 4.3 Growth Strategy Implementation

Since timing is embedded in the strategy, update the interface:

```go
// growth/strategy.go
type Strategy interface {
    // Apply calculates the new amount after applying growth
    // currentAmount: the current value
    // params: strategy-specific parameters
    // currentMonth: absolute month index (0-419)
    // monthOfYear: month within year (1-12)
    Apply(currentAmount decimal.Decimal, params Params, currentMonth int, monthOfYear int) decimal.Decimal

    Name() string
}

// Example: Monthly compound strategy
type MonthlyCompoundStrategy struct{}

func (m *MonthlyCompoundStrategy) Name() string {
    return "monthly_compound"
}

func (m *MonthlyCompoundStrategy) Apply(
    currentAmount decimal.Decimal,
    params Params,
    currentMonth int,
    monthOfYear int,
) decimal.Decimal {
    // Only apply after first year
    if currentMonth < 12 {
        return currentAmount
    }

    // Apply every month: amount * (1 + rate/100)^(1/12)
    monthlyRate := math.Pow(1+params.AnnualRatePct.InexactFloat64()/100, 1.0/12.0) - 1
    multiplier := decimal.NewFromFloat(1 + monthlyRate)
    return currentAmount.Mul(multiplier)
}

// Example: Annual step strategy
type AnnualStepStrategy struct{}

func (a *AnnualStepStrategy) Name() string {
    return "annual_step"
}

func (a *AnnualStepStrategy) Apply(
    currentAmount decimal.Decimal,
    params Params,
    currentMonth int,
    monthOfYear int,
) decimal.Decimal {
    // Only apply in January of each year, after first year
    if currentMonth < 12 || monthOfYear != 1 {
        return currentAmount
    }

    // Apply once per year: amount * (1 + rate/100)
    multiplier := decimal.NewFromFloat(1 + params.AnnualRatePct.InexactFloat64()/100)
    return currentAmount.Mul(multiplier)
}
```

#### 4.4 Performance Optimizations

**Pre-calculate strategy instances:**
```go
// In Service initialization
func NewService(store Store) *Service {
    registry := growth.NewRegistry()

    // Register all strategies once
    registry.Register(&growth.MonthlyCompoundStrategy{})
    registry.Register(&growth.AnnualStepStrategy{})
    registry.Register(&growth.QuarterlyStepStrategy{})
    // ... register all 10-50 strategies

    return &Service{
        store: store,
        growthRegistry: registry,
    }
}
```

**Batch items by strategy:**
```go
// Group items by growth strategy to enable batch optimizations
strategySets := make(map[string][]*ItemState)
for _, st := range state {
    strategySets[st.item.GrowthStrategyName] = append(strategySets[st.item.GrowthStrategyName], st)
}

// Process each strategy group
for strategyName, items := range strategySets {
    strategy, _ := growthRegistry.Get(strategyName)
    for _, st := range items {
        st.amount = strategy.Apply(st.amount, ...)
    }
}
```

## Implementation Checklist

### Core Logic (computeFinancialSnapshot)
- [ ] Initialize state map and accumulatedCash
- [ ] Create 420-month loop with year/month calculation
- [ ] Implement item expiration (check EndDate)
- [ ] Process new items from rowsByYearMonth
- [ ] Apply growth using strategy pattern
- [ ] Calculate monthly income/expense net
- [ ] Update cash accumulator with interest
- [ ] Build monthly snapshot (calculate net worth)
- [ ] Return TimelineAnnualChartResponse with Months populated

### Growth Module
- [ ] Create growth package with Strategy interface
- [ ] Implement Registry with built-in strategies
- [ ] Add timing interface for growth application
- [ ] Create at least 3-5 initial strategies (monthly, annual, quarterly, linear, continuous)
- [ ] Add tests for each strategy

### Integration
- [ ] Update FinancialDataRow to include GrowthStrategyName field
- [ ] Update database schema if needed
- [ ] Wire growth registry into Service
- [ ] Add default strategy selection logic

### Testing
- [ ] Unit tests for each growth strategy
- [ ] Integration test for full 420-month calculation
- [ ] Performance benchmarks
- [ ] Edge case tests (zero amounts, negative growth, etc.)

## Critical Files to Modify
1. `/Users/jitcorn/assetra3/backend/internal/financial_v2/timeline/service.go` - implement computeFinancialSnapshot
2. `/Users/jitcorn/assetra3/backend/internal/financial_v2/timeline/types.go` - add growth strategy field
3. Create new `growth/` package with strategy pattern

## Design Decisions (Confirmed)
1. ✅ **Per-item growth strategies** - Each financial item can have its own strategy
2. ✅ **Hybrid storage** - Strategy registry in code, strategy selection stored in DB
3. ✅ **Timing embedded in strategy** - Each strategy handles its own timing logic (when to apply)
4. ✅ **Monthly resolution only** - Focus on 420-month timeline calculation

## Does the Approach Make Sense?

**YES** - The approach outlined in your TODO comments is sound and aligns with proven financial modeling patterns. Here's why:

### ✅ TODO #1: Compute growth of income/expense on monthly basis
**Validation**: This is correct. Income and expenses need to grow over time (inflation, raises, etc.). The key insight in your comment is important:
- **Month-to-month**: Usually no change (salary stays same from Jan→Feb)
- **Year boundaries**: Apply growth rate (Dec→Jan, salary increases)

**Implementation**: Use the Strategy pattern so different items can have different compounding behaviors.

### ✅ TODO #2: Compute net cash savings
**Validation**: This is the core cash flow calculation. Essential for any financial projection:
```
Net Cash = Income - Expenses (for the month)
Accumulated Cash += Net Cash
```

**Implementation**: Simple subtraction, then add to accumulator. The accumulator then earns interest.

### ✅ TODO #3: Compute growth in assets and liabilities
**Validation**: Critical for accurate projections. Assets appreciate (stocks, real estate), liabilities accrue interest (loans, mortgages).

**Key difference from income/expense**:
- Assets/liabilities = **balance sheet** (snapshot at a point in time)
- Income/expense = **cash flow** (flow over a period)

Both need growth, but:
- Assets: `new_value = old_value * (1 + growth_rate)`
- Cash accumulator: `new_balance = old_balance + net_savings + interest_earned`

### Why the Modular Approach is Better

Your instinct to use "a function or module that assesses when/how much to apply growth" is **exactly right** because:

1. **Flexibility**: 10-50 different compounding strategies can coexist
2. **Maintainability**: Each strategy is self-contained and testable
3. **Performance**: Can optimize each strategy independently
4. **Extensibility**: Adding new strategies doesn't require changing core logic

### The Order of Operations Matters

The sequence in your TODOs is correct:
1. **First**: Apply growth to existing items (income/expense/assets/liabilities)
2. **Second**: Calculate net cash from income-expense
3. **Third**: Add net cash to accumulator
4. **Fourth**: Apply interest to accumulated cash
5. **Fifth**: Calculate net worth

This ensures growth compounds correctly and cash flows accumulate properly.
