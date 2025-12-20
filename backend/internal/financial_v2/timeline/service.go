package timeline_v2

import (
	"context"
	"fmt"
	"sort"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/cpf/account"
	cpfProcessor "financial-chat-system/backend/internal/cpf/processor"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
	"financial-chat-system/backend/internal/financial_v2/repayment"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"

	"golang.org/x/sync/errgroup"
)

// =============================================================================
// Types
// =============================================================================

type Service struct {
	store Store
}

type FinancialDataRow struct {
	ID            string
	ParentID      string
	Name          string
	Category      string
	Amount        decimal.Decimal
	Frequency     Frequency
	StartDate     time.Time
	EndDate       *time.Time
	ItemType      FinancialDataType
	GrowthRate    decimal.Decimal // Per-item growth rate (percentage)
	InterestRate  decimal.Decimal // APR for liabilities
	MinimumPay    decimal.Decimal // Minimum payment for liabilities
	IsAccumulator bool            // For cash accounts - identifies the accumulator account
	// CPF-related fields (for incomes)
	CPFWageType cpfProcessor.CPFWageType // CPFWageTypeOW (Ordinary Wages) or CPFWageTypeAW (Additional Wages)
	// Expense-liability linkage
	SourceLiabilityID *string // For expenses - link to liability this expense pays down
	// Liability repayment
	RepaymentStrategy string // Repayment strategy for liabilities (standard_amortization, interest_only, etc.)
}

// EffectiveRows holds all financial data organized by type
type EffectiveRows struct {
	NonCashAssets []FinancialDataRow
	Investments   []FinancialDataRow
	CashAssets    []FinancialDataRow
	Liabilities   []FinancialDataRow
	Incomes       []FinancialDataRow
	Expenses      []FinancialDataRow
}

// SGFinancialDataRows wraps financial data with Singapore-specific CPF account
type SGFinancialDataRows struct {
	Rows              EffectiveRows
	CPFAccount        *account.CPFAccount
	IncomeAllocations []repo.IncomeAllocation
	// Map of liability ID -> linked expense (for open-ended liabilities paid by expenses)
	LinkedExpensesByLiability map[string]FinancialDataRow
	// ScenarioImpacts holds pre-indexed scenario impacts (nil if includeScenarios=false)
	ScenarioImpacts *scenario.ImpactContext
}

// ItemState tracks the current computed state of a financial item
type ItemState struct {
	Row        FinancialDataRow
	Balance    *decimal.Decimal // Current computed balance/amount
	StartYear  int              // Year index when item was created (relative to base year)
	StartMonth int              // Month when item was created (1-12)
}

// ItemStateMap maps item IDs to their computed state
type ItemStateMap map[string]*ItemState

// =============================================================================
// Constructor
// =============================================================================

// NewService creates a new timeline service
func NewService(store Store) *Service {
	return &Service{store: store}
}

// =============================================================================
// Data Loading (used by ComputeFinancialSnapshot)
// =============================================================================

func (s *Service) loadEffectiveRows(
	ctx context.Context,
	userID string,
	dateOpts repo.DateRangeOptions,
	paginationOpts repo.PaginationParams,
	includeScenarios bool,
) (SGFinancialDataRows, error) {
	var (
		nonCashAssets     repo.PaginatedResult[repo.NonCashAsset]
		investments       repo.PaginatedResult[repo.Investment]
		cashAssets        repo.PaginatedResult[repo.CashAsset]
		liabilities       repo.PaginatedResult[repo.Liability]
		incomes           repo.PaginatedResult[repo.Income]
		expenses          repo.PaginatedResult[repo.Expense]
		cpfAccount        *repo.CPFAccount
		incomeAllocations []repo.IncomeAllocation
		excludedTargets   repo.ExcludedTargets
		scenarioEvents    []repo.ScenarioEvent
	)

	g, gctx := errgroup.WithContext(ctx)

	listQuery := repo.ListQuery{
		UserID:     userID,
		DateRange:  dateOpts,
		Pagination: paginationOpts,
	}

	g.Go(func() error {
		var err error
		nonCashAssets, err = s.store.ListNonCashAssets(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		investments, err = s.store.ListInvestments(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		cashAssets, err = s.store.ListCashAssets(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		liabilities, err = s.store.ListLiabilities(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		incomes, err = s.store.ListIncomes(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		expenses, err = s.store.ListExpenses(gctx, listQuery)
		return err
	})

	g.Go(func() error {
		var err error
		cpfAccount, err = s.store.GetCPFAccount(gctx, userID)
		return err
	})

	g.Go(func() error {
		var err error
		incomeAllocations, err = s.store.ListAllIncomeAllocations(gctx, userID)
		return err
	})

	g.Go(func() error {
		var err error
		excludedTargets, err = s.store.GetExcludedScenarioTargetIDs(gctx, userID)
		return err
	})

	// Load scenario events if requested
	g.Go(func() error {
		if !includeScenarios {
			return nil
		}
		var err error
		scenarioEvents, err = s.store.ListIncludedScenarioEvents(gctx, userID)
		return err
	})

	if err := g.Wait(); err != nil {
		return SGFinancialDataRows{}, err
	}

	// Build scenario impact context if scenarios are included
	var impactCtx *scenario.ImpactContext
	if includeScenarios && len(scenarioEvents) > 0 {
		impactCtx = scenario.BuildImpactContext(scenarioEvents)
	}

	// Transform repository types to FinancialDataRow
	// Filter out items from excluded scenarios
	rows := EffectiveRows{
		NonCashAssets: filterExcludedAssets(transformNonCashAssets(nonCashAssets.Data), excludedTargets.AssetIDs),
		Investments:   filterExcludedInvestments(transformInvestments(investments.Data), excludedTargets.InvestmentIDs),
		CashAssets:    filterExcludedCashAssets(transformCashAssets(cashAssets.Data), excludedTargets.CashAccountIDs),
		Liabilities:   filterExcludedLiabilities(transformLiabilities(liabilities.Data), excludedTargets.LiabilityIDs),
		Incomes:       filterExcludedIncomes(transformIncomes(incomes.Data), excludedTargets.IncomeIDs),
		Expenses:      filterExcludedExpenses(transformExpenses(expenses.Data), excludedTargets.ExpenseIDs),
	}

	return SGFinancialDataRows{
		Rows:              rows,
		CPFAccount:        mapToCPFAccount(cpfAccount),
		IncomeAllocations: incomeAllocations,
		ScenarioImpacts:   impactCtx,
	}, nil
}

// =============================================================================
// Scenario Impact Application
// =============================================================================

// applyScenarioImpacts applies all applicable scenario impacts for the current month.
// Populates mctx.EventAdjustedState with values that include scenario modifications.
// Also populates mctx.AppliedImpacts with tracking info about which impacts were applied.
// Called AFTER growth is applied but BEFORE building responses.
//
// ═══════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE: Cash account "cash-123" with +$100k/month delta impact
// ═══════════════════════════════════════════════════════════════════════════════
//
// INPUT DATA:
//
//	ScenarioImpacts.ImpactsByTarget = {
//	  "cash-123": [{
//	    EventID:    "event-abc",
//	    ImpactKind: "delta",
//	    Amount:     100000,        // $100k
//	    Cadence:    "monthly",
//	    StartDate:  "2025-12-01",
//	    EndDate:    nil,           // no end = indefinite
//	  }]
//	}
//	ItemStates["cash-123"] = {
//	  Row: {ItemType: "cash_asset", Frequency: "monthly"},
//	  Balance: $25,000
//	}
//
// ───────────────────────────────────────────────────────────────────────────────
// MONTH 1: December 2025 (anchor month)
// ───────────────────────────────────────────────────────────────────────────────
//
// STEP 1: Initialize EventAdjustedState as copy of State
//
//	mctx.State = {"cash-123": $25,000, "income-456": $120,000, ...}
//	mctx.EventAdjustedState = {"cash-123": $25,000, "income-456": $120,000, ...}
//
// STEP 2: Process item "cash-123"
//
//	impacts = [{EventID: "event-abc", ImpactKind: "delta", Amount: 100000}]
//	baseValue = $25,000
//	itemInfo = {ItemType: "cash_asset", Frequency: "monthly"}
//
// STEP 3: ApplyImpactsToItem()
//
//	Pass 1 (stop):    No stop impacts → continue
//	Pass 2 (override): No override impacts → continue
//	Pass 3 (delta):   Found delta, amount = $100,000
//	                  result.AdjustedValue = $25,000 + $100,000 = $125,000
//	                  result.AppliedImpacts = [{EventID: "event-abc", ImpactKind: "delta", ...}]
//
// STEP 4: Store results
//
//	mctx.EventAdjustedState["cash-123"] = $125,000
//	mctx.AppliedImpacts["cash-123"] = [{EventID: "event-abc", ...}]
//
// STEP 5: Persist delta? (isAnchorMonth = true → SKIP)
//
//	mctx.State["cash-123"] = $25,000 (unchanged)
//
// END OF MONTH 1:
//
//	State["cash-123"] = $25,000          ← persisted for next month
//	EventAdjustedState["cash-123"] = $125,000  ← shown in response
//
// ───────────────────────────────────────────────────────────────────────────────
// MONTH 2: January 2026
// ───────────────────────────────────────────────────────────────────────────────
//
// (Growth was already applied in processMonth before this function)
//
// STEP 1: Initialize EventAdjustedState as copy of State
//
//	mctx.State = {"cash-123": $25,051, ...}  // $25,000 + 2.5% annual growth
//	mctx.EventAdjustedState = {"cash-123": $25,051, ...}
//
// STEP 2-3: Process and apply impacts
//
//	baseValue = $25,051
//	result.AdjustedValue = $25,051 + $100,000 = $125,051
//
// STEP 4: Store results
//
//	mctx.EventAdjustedState["cash-123"] = $125,051
//
// STEP 5: Persist delta? (isAnchorMonth = false → YES)
//
//	mctx.State["cash-123"] = $125,051  ← KEY FIX: persisted!
//
// END OF MONTH 2:
//
//	State["cash-123"] = $125,051         ← carries forward
//	EventAdjustedState["cash-123"] = $125,051
//
// ───────────────────────────────────────────────────────────────────────────────
// MONTH 3: February 2026
// ───────────────────────────────────────────────────────────────────────────────
//
// STEP 1: After growth applied
//
//	mctx.State = {"cash-123": $125,309, ...}  // $125,051 + growth
//
// STEP 2-5: Process impacts
//
//	result.AdjustedValue = $125,309 + $100,000 = $225,309
//	mctx.State["cash-123"] = $225,309  ← persisted
//
// ───────────────────────────────────────────────────────────────────────────────
// SUMMARY: Month-over-month accumulation
// ───────────────────────────────────────────────────────────────────────────────
//
//	Month    | State (start) | + Growth | + Delta  | State (end)
//	---------|---------------|----------|----------|-------------
//	Dec 2025 | $25,000       | -        | (display)| $25,000
//	Jan 2026 | $25,000       | +$51     | +$100k   | $125,051
//	Feb 2026 | $125,051      | +$258    | +$100k   | $225,309
//	Mar 2026 | $225,309      | +$464    | +$100k   | $325,773
//	Apr 2026 | $325,773      | +$671    | +$100k   | $426,444
//
// ═══════════════════════════════════════════════════════════════════════════════
func applyScenarioImpacts(mctx *MonthlyContext, currentDate time.Time, isAnchorMonth bool) {
	// ─────────────────────────────────────────────────────────────────────────
	// Example: mctx.ScenarioImpacts = nil when no scenarios are enabled
	// Result: EventAdjustedState stays nil, response builders use base State
	// ─────────────────────────────────────────────────────────────────────────
	if mctx.ScenarioImpacts == nil {
		mctx.EventAdjustedState = nil
		mctx.AppliedImpacts = nil
		return
	}

	// ─────────────────────────────────────────────────────────────────────────
	// STEP 1: Initialize EventAdjustedState as copy of State
	//
	// Example:
	//   mctx.State = {"cash-123": $125,051, "income-456": $120,000}
	//   After this step:
	//   mctx.EventAdjustedState = {"cash-123": $125,051, "income-456": $120,000}
	// ─────────────────────────────────────────────────────────────────────────
	mctx.EventAdjustedState = make(map[string]*decimal.Decimal)
	mctx.AppliedImpacts = make(map[string][]scenario.AppliedImpactInfo)
	for id, balance := range mctx.State {
		if balance != nil {
			balanceCopy := *balance
			mctx.EventAdjustedState[id] = &balanceCopy
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// STEP 2-5: Process each item that has impacts
	//
	// Example iteration:
	//   itemID = "cash-123"
	//   impacts = [{EventID: "event-abc", ImpactKind: "delta", Amount: 100000}]
	// ─────────────────────────────────────────────────────────────────────────
	for itemID, impacts := range mctx.ScenarioImpacts.ImpactsByTarget {
		// Example: itemID = "cash-123"
		//          impacts = [{ImpactKind: "delta", Amount: 100000, Cadence: "monthly"}]

		itemState, exists := mctx.ItemStates[itemID]
		if !exists {
			continue // Item may be from excluded scenario or not in loaded data
		}

		// Example: baseValue = $125,051 (from State after growth)
		baseValue := mctx.State[itemID]
		if baseValue == nil {
			continue
		}

		// Example: itemInfo = {ItemType: "cash_asset", Frequency: "monthly"}
		itemInfo := scenario.ItemInfo{
			ItemType:  string(itemState.Row.ItemType),
			Frequency: itemState.Row.Frequency,
		}

		// ─────────────────────────────────────────────────────────────────────
		// STEP 3: Apply impacts using priority order (stop → override → delta)
		//
		// Example:
		//   Input:  baseValue = $125,051, impacts = [{delta, $100k}]
		//   Output: result.AdjustedValue = $225,051
		//           result.AppliedImpacts = [{EventID: "event-abc", ImpactKind: "delta", ...}]
		// ─────────────────────────────────────────────────────────────────────
		result := scenario.ApplyImpactsToItem(
			impacts,
			baseValue,
			currentDate,
			itemInfo,
			mctx.ScenarioImpacts.EventsByID,
		)

		// ─────────────────────────────────────────────────────────────────────
		// STEP 4: Store adjusted value for response building
		//
		// Example:
		//   mctx.EventAdjustedState["cash-123"] = $225,051
		//   mctx.AppliedImpacts["cash-123"] = [{EventID: "event-abc", ...}]
		// ─────────────────────────────────────────────────────────────────────
		mctx.EventAdjustedState[itemID] = result.AdjustedValue
		if len(result.AppliedImpacts) > 0 {
			mctx.AppliedImpacts[itemID] = result.AppliedImpacts
		}

		// ─────────────────────────────────────────────────────────────────────
		// STEP 5: Persist impacts to State for accumulation
		//
		// BALANCE SHEET ITEMS (asset, liability, cash, investment):
		//   - delta:    ✅ Accumulates (+$100k/month compounds over time)
		//   - override: ✅ Replaces balance (account becomes $150k)
		//   - start:    ✅ Item begins with new value (then grows)
		//   - stop:     ❌ No persistence (value is $0)
		//
		// FLOW ITEMS (income, expense):
		//   - delta:    ❌ Does NOT accumulate (each month = base + delta)
		//   - override: ✅ Replaces base value (salary becomes $150k, then grows)
		//   - start:    ✅ Item begins with new value (then grows)
		//   - stop:     ❌ No persistence (value is $0)
		//
		// Why? Balances carry forward; flows are recurring per-period amounts.
		// If you get a $1k/month raise, your monthly income is base + $1k,
		// NOT previous month's income + $1k.
		//
		// Example - Delta on cash account (isAnchorMonth = false):
		//   State["cash-123"] = $125,051
		//   Delta +$100k applied → AdjustedValue = $225,051
		//   Persist → State["cash-123"] = $225,051 (carries to next month)
		//
		// Example - Delta on income (isAnchorMonth = false):
		//   State["income-456"] = $10,000 (monthly salary)
		//   Delta +$1k applied → AdjustedValue = $11,000
		//   NO persist → State stays $10,000 (delta reapplied each month)
		//
		// Example - Override on income (isAnchorMonth = false):
		//   State["income-456"] = $10,000 (old monthly salary)
		//   Override to $12k → AdjustedValue = $12,000
		//   Persist → State["income-456"] = $12,000 (new base salary)
		// ─────────────────────────────────────────────────────────────────────
		if !isAnchorMonth && len(result.AppliedImpacts) > 0 {
			// Determine if this item type should persist delta impacts
			isFlowItem := itemState.Row.ItemType == FinIncome || itemState.Row.ItemType == FinExpense

			// Check which impact types were applied
			shouldPersist := false
			for _, appliedImpact := range result.AppliedImpacts {
				switch appliedImpact.ImpactKind {
				case scenario.ImpactKindStop:
					// Stop never persists
					continue
				case scenario.ImpactKindDelta:
					// Delta only persists for balance sheet items
					if !isFlowItem {
						shouldPersist = true
					}
				default:
					// Override and start always persist
					shouldPersist = true
				}
			}
			if shouldPersist {
				mctx.State[itemID] = result.AdjustedValue
			}
		}
	}
}

// filterExcludedAssets removes assets that are targets of excluded scenarios
func filterExcludedAssets(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// filterExcludedInvestments removes investments that are targets of excluded scenarios
func filterExcludedInvestments(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// filterExcludedCashAssets removes cash assets that are targets of excluded scenarios
func filterExcludedCashAssets(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// filterExcludedLiabilities removes liabilities that are targets of excluded scenarios
func filterExcludedLiabilities(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// filterExcludedIncomes removes incomes that are targets of excluded scenarios
func filterExcludedIncomes(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// filterExcludedExpenses removes expenses that are targets of excluded scenarios
func filterExcludedExpenses(rows []FinancialDataRow, excludedIDs map[string]struct{}) []FinancialDataRow {
	if len(excludedIDs) == 0 {
		return rows
	}
	filtered := make([]FinancialDataRow, 0, len(rows))
	for _, row := range rows {
		if _, excluded := excludedIDs[row.ID]; !excluded {
			filtered = append(filtered, row)
		}
	}
	return filtered
}

// =============================================================================
// Helper Functions (used by ComputeFinancialSnapshot)
// =============================================================================

// CPFContext holds CPF processor and balances for timeline calculations
type CPFContext struct {
	Processor *cpfProcessor.Processor
	Balances  *cpfProcessor.CPFBalances
}

// NewCPFContext creates a CPF context from an account, returns nil if no account
func NewCPFContext(cpfAccount *account.CPFAccount) *CPFContext {
	if cpfAccount == nil {
		return nil
	}
	proc, _ := cpfProcessor.NewProcessor(cpfAccount)
	balances := cpfProcessor.NewCPFBalances(cpfAccount)
	return &CPFContext{Processor: proc, Balances: balances}
}

// ResetYTDIfNewYear resets YTD tracking at year boundaries for AW ceiling calculation
func (c *CPFContext) ResetYTDIfNewYear(date time.Time, monthIdx int) {
	if c == nil || monthIdx == 0 {
		return
	}
	if date.Month() == 1 {
		c.Processor.ResetYtdAWCeiling(c.Balances)
	}
}

// ProcessIncomes calculates CPF contributions for all applicable incomes
// Returns total employee CPF deduction and map of income ID -> contribution result
// If applyToBalances is false, contributions are calculated but not added to accumulated balances (used for anchor month)
func (c *CPFContext) ProcessIncomes(
	incomes []FinancialDataRow,
	state map[string]*decimal.Decimal,
	date time.Time,
	applyToBalances bool,
) (*decimal.Decimal, map[string]*cpfProcessor.ContributionResult) {
	totalEmployeeCPF := decimal.Zero()
	contributions := make(map[string]*cpfProcessor.ContributionResult)

	if c == nil {
		return totalEmployeeCPF, contributions
	}

	for _, income := range incomes {
		if !isActiveInMonth(income, date) || income.CPFWageType == "" {
			continue
		}

		// Convert income to monthly amount for CPF calculation
		// CPF processor expects monthly wage, but income may be stored in different frequencies
		monthlyWage := common.ToMonthlyAmount(state[income.ID], income.Frequency)
		if monthlyWage == nil || monthlyWage.IsZero() {
			continue
		}

		var result *cpfProcessor.ContributionResult
		switch income.CPFWageType {
		case cpfProcessor.CPFWageTypeOW:
			result, _ = c.Processor.ProcessOrdinaryWage(monthlyWage, c.Balances, date)
		case cpfProcessor.CPFWageTypeAW:
			result, _ = c.Processor.ProcessAdditionalWage(monthlyWage, c.Balances, date)
		default:
			// Unknown wage type: skip CPF for this income to avoid over-crediting cash
			continue
		}

		if result != nil {
			contributions[income.ID] = result
			// Only add contributions to balances if not anchor month
			if applyToBalances {
				c.Processor.AddContributionToBalances(result, c.Balances)
			}
			totalEmployeeCPF = totalEmployeeCPF.Add(result.EmployeeContribution)
		}
	}

	return totalEmployeeCPF, contributions
}

// mapToCPFAccount converts repository CPFAccount to cpf/account.CPFAccount
func mapToCPFAccount(r *repo.CPFAccount) *account.CPFAccount {
	if r == nil {
		return nil
	}
	return &account.CPFAccount{
		ID:               r.ID,
		UserID:           r.UserID,
		OABalance:        r.OABalance,
		SABalance:        r.SABalance,
		MABalance:        r.MABalance,
		RABalance:        r.RABalance,
		OAUsedForHousing: r.OAUsedForHousing,
		HousingStartDate: r.HousingStartDate,
		DateOfBirth:      r.DateOfBirth,
		ResidencyStatus:  account.ResidencyStatus(r.ResidencyStatus),
		PRGrantDate:      r.PRGrantDate,
		CreatedAt:        r.CreatedAt,
		UpdatedAt:        r.UpdatedAt,
	}
}

// earliestStartDateFromRows returns the earliest start date across all financial rows.
func earliestStartDateFromRows(rows EffectiveRows) (time.Time, bool) {
	firstDate := func(items []FinancialDataRow) (time.Time, bool) {
		if len(items) == 0 || items[0].StartDate.IsZero() {
			return time.Time{}, false
		}
		return items[0].StartDate, true
	}

	sources := [][]FinancialDataRow{
		rows.NonCashAssets,
		rows.Investments,
		rows.CashAssets,
		rows.Liabilities,
		rows.Incomes,
		rows.Expenses,
	}

	candidates := make([]time.Time, 0, len(sources))
	for _, src := range sources {
		if d, ok := firstDate(src); ok {
			candidates = append(candidates, d)
		}
	}

	if len(candidates) == 0 {
		return time.Time{}, false
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Before(candidates[j])
	})
	return candidates[0], true
}

// normalizeToMonthStart returns the first day of the month in UTC for a given date.
func normalizeToMonthStart(date time.Time) time.Time {
	if date.IsZero() {
		return date
	}
	d := date.UTC()
	return time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, time.UTC)
}

// buildAnchorRange returns normalized start/end dates based on requested opts and earliest data.
func buildAnchorRange(opts TimelineOptions, rows EffectiveRows) (time.Time, time.Time) {
	start := normalizeToMonthStart(opts.StartDate)
	if earliest, ok := earliestStartDateFromRows(rows); ok {
		start = normalizeToMonthStart(earliest)
	}
	if start.IsZero() {
		start = normalizeToMonthStart(time.Now().UTC())
	}

	end := normalizeToMonthStart(opts.EndDate)
	if end.IsZero() || end.Before(start) {
		end = start
	}
	return start, end
}

// isActiveInMonth checks if a financial row is active during the given month.
// An item is active if it started on or before the last day of that month,
// and hasn't ended before the first day of that month.
//
// IMPORTANT: This function compares calendar dates (year/month/day) in the
// date's original timezone, NOT UTC timestamps. This ensures that a date like
// "2026-02-01 00:00:00 +0800" is correctly treated as February 1st, even though
// its UTC representation is "2026-01-31 16:00:00 UTC".
func isActiveInMonth(row FinancialDataRow, date time.Time) bool {
	// Extract year/month from the check date
	checkYear, checkMonth, _ := date.Date()

	// Extract year/month from the start date in its ORIGINAL timezone
	// This preserves the user's intended calendar date
	startYear, startMonth, _ := row.StartDate.Date()

	// Check if start date is after the check month
	// Item starts AFTER this month if: startYear > checkYear, or
	// (startYear == checkYear AND startMonth > checkMonth)
	if startYear > checkYear || (startYear == checkYear && startMonth > checkMonth) {
		return false
	}

	// If item has an end date, check if it ended before the check month
	if row.EndDate != nil {
		endYear, endMonth, _ := row.EndDate.Date()

		// Item ended BEFORE this month if: endYear < checkYear, or
		// (endYear == checkYear AND endMonth < checkMonth)
		if endYear < checkYear || (endYear == checkYear && endMonth < checkMonth) {
			return false
		}
	}

	return true
}

// hasStartedByMonth checks if an item has started on or before the given month.
// Unlike isActiveInMonth, this ignores end dates - useful for liabilities where
// the end date represents the loan term, not when the debt disappears.
//
// Uses calendar date comparison to avoid timezone issues.
func hasStartedByMonth(row FinancialDataRow, date time.Time) bool {
	checkYear, checkMonth, _ := date.Date()
	startYear, startMonth, _ := row.StartDate.Date()

	// Item has started if: startYear < checkYear, or
	// (startYear == checkYear AND startMonth <= checkMonth)
	if startYear < checkYear {
		return true
	}
	if startYear == checkYear && startMonth <= checkMonth {
		return true
	}
	return false
}

// initializeItemStates creates ItemStateMap with StartYear/StartMonth for all financial rows
func initializeItemStates(data EffectiveRows, baseYear int) ItemStateMap {
	states := make(ItemStateMap)

	allRows := [][]FinancialDataRow{
		data.NonCashAssets,
		data.Investments,
		data.CashAssets,
		data.Liabilities,
		data.Incomes,
		data.Expenses,
	}

	for _, rows := range allRows {
		for _, row := range rows {
			amount := row.Amount
			states[row.ID] = &ItemState{
				Row:        row,
				Balance:    &amount,
				StartYear:  row.StartDate.Year() - baseYear,
				StartMonth: int(row.StartDate.Month()),
			}
		}
	}

	return states
}

// extractBalanceMap extracts a simple ID->Balance map from ItemStateMap for growth calculations
func extractBalanceMap(itemStates ItemStateMap) map[string]*decimal.Decimal {
	state := make(map[string]*decimal.Decimal)
	for id, itemState := range itemStates {
		state[id] = itemState.Balance
	}
	return state
}

// syncStateToItemStates syncs the balance values from state map back to ItemStateMap
func syncStateToItemStates(state map[string]*decimal.Decimal, itemStates ItemStateMap) {
	for id, balance := range state {
		if itemState, exists := itemStates[id]; exists {
			itemState.Balance = balance
		}
	}
}

// GrowthContext bundles parameters needed for growth calculations in a month
type GrowthContext struct {
	Registry    *growth.Registry
	State       map[string]*decimal.Decimal // itemID -> running balance (mutated as growth is applied)
	Month       int                         // 1-indexed absolute month (1-420)
	MonthOfYear int                         // 1-12
	Date        time.Time                   // Current date for active check
}

// applyGrowth applies growth strategy to active rows
func applyGrowth(rows []FinancialDataRow, ctx *GrowthContext, strategyName string) {
	strategy, _ := ctx.Registry.Get(strategyName)
	for _, row := range rows {
		if !isActiveInMonth(row, ctx.Date) {
			continue
		}
		// Calculate item's age in months (how long since it started)
		itemAge := common.MonthsBetween(row.StartDate, ctx.Date)
		params := growth.Params{AnnualRatePct: &row.GrowthRate}
		ctx.State[row.ID] = strategy.Apply(ctx.State[row.ID], params, itemAge, ctx.MonthOfYear)
	}
}

// applyAllGrowth applies the appropriate growth strategies to all financial data types
// NOTE: Liabilities are handled separately by processLiabilityMonth
func applyAllGrowth(data EffectiveRows, ctx *GrowthContext) {
	// Income/Expenses use annual step growth (raises happen yearly)
	applyGrowth(data.Incomes, ctx, growth.StrategyAnnualStep)
	applyGrowth(data.Expenses, ctx, growth.StrategyAnnualStep)
	// Assets use monthly compound growth
	applyGrowth(data.NonCashAssets, ctx, growth.StrategyMonthlyCompound)
	applyGrowth(data.Investments, ctx, growth.StrategyMonthlyCompound)
	applyGrowth(data.CashAssets, ctx, growth.StrategyMonthlyCompound)
	// NOTE: Liabilities handled separately by processLiabilityMonth
}

// isLiabilityFullyRepaid checks if a liability has been fully repaid (balance <= 0)
func isLiabilityFullyRepaid(liabilityState *ItemState) bool {
	return liabilityState != nil && liabilityState.Balance.Cmp(decimal.Zero()) <= 0
}

// buildLinkedExpensesByLiability creates a map of liability ID -> linked expense row.
// Used for open-ended liabilities that are paid down by expense payments.
func buildLinkedExpensesByLiability(expenses []FinancialDataRow) map[string]FinancialDataRow {
	result := make(map[string]FinancialDataRow)
	for _, exp := range expenses {
		if exp.SourceLiabilityID != nil {
			result[*exp.SourceLiabilityID] = exp
		}
	}
	return result
}

// processLiabilityMonth processes all liabilities for the current month.
// Delegates ALL payment calculation logic to the repayment module:
//   - Service passes raw data (unix timestamps, expense amount + frequency)
//   - Repayment module calculates remaining months, converts to monthly amounts
//
// This function handles reamortization: if a payment override changes the balance,
// subsequent months will recalculate payments based on the new balance.
func processLiabilityMonth(
	liabilities []FinancialDataRow,
	linkedExpenses map[string]FinancialDataRow,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
	isAnchorMonth bool,
) {
	for _, liability := range liabilities {
		if !isActiveInMonth(liability, currentDate) {
			continue
		}

		// Skip mutations in anchor month (report starting balance only)
		if isAnchorMonth {
			continue
		}

		// Build params with raw data - repayment module handles all calculations
		params := repayment.LiabilityMonthParams{
			CurrentBalance:    state[liability.ID],
			InterestRateAPR:   &liability.InterestRate,
			RepaymentStrategy: liability.RepaymentStrategy,
			MinimumPayment:    &liability.MinimumPay,
			CurrentDate:       currentDate.Unix(),
		}

		// Pass end date as unix timestamp (nil if open-ended)
		if liability.EndDate != nil {
			endDateUnix := liability.EndDate.Unix()
			params.EndDate = &endDateUnix
		}

		// Pass linked expense raw amount and frequency (repayment module converts to monthly)
		if expense, hasLinked := linkedExpenses[liability.ID]; hasLinked && isActiveInMonth(expense, currentDate) {
			expenseAmount := state[expense.ID]
			if expenseAmount == nil {
				expenseAmount = &expense.Amount
			}
			params.LinkedExpenseAmount = expenseAmount
			params.LinkedExpenseFrequency = common.Frequency(expense.Frequency)
		}

		// Delegate to repayment module
		result, err := repayment.ProcessLiabilityMonth(params)
		if err != nil || result.MonthlyPayment.IsZero() {
			continue
		}

		// Update state
		state[liability.ID] = result.NewBalance

		// Update linked expense state with the calculated payment amount
		if expense, hasLinked := linkedExpenses[liability.ID]; hasLinked {
			state[expense.ID] = result.MonthlyPayment
		}
	}
}

// calcCashAllocation computes net savings and net cash flow for active rows.
// Returns:
//   - netSavings: income - employeeCPF - expenses
//   - netCashFlow: income - employeeCPF - expenses - investmentAllocations (always net of investments for display)
//   - netInvestments: total amount allocated to investments this month
func calcCashAllocation(
	data EffectiveRows,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
	employeeCPF *decimal.Decimal,
	incomeAllocations []repo.IncomeAllocation,
	applyAllocations bool,
) (netSavings *decimal.Decimal, netCashFlow *decimal.Decimal, netInvestments *decimal.Decimal) {
	income := decimal.Zero()
	expense := decimal.Zero()

	for _, row := range data.Incomes {
		if isActiveInMonth(row, currentDate) {
			monthlyAmt := common.ToMonthlyAmount(state[row.ID], row.Frequency)
			income = income.Add(monthlyAmt)
		}
	}

	for _, row := range data.Expenses {
		if isActiveInMonth(row, currentDate) {
			monthlyAmt := common.ToMonthlyAmount(state[row.ID], row.Frequency)
			expense = expense.Add(monthlyAmt)
		}
	}

	netSavings = income.Sub(employeeCPF).Sub(expense)

	// Apply investment allocations - adds allocation amounts to investment balances (only when applyAllocations is true)
	netInvestments = applyInvestmentAllocations(data.Incomes, incomeAllocations, state, currentDate, applyAllocations)

	// Always compute netCashFlow = netSavings - investments for display purposes
	// applyAllocations only controls whether investment balances are mutated, not the cash flow calculation
	netCashFlow = netSavings.Sub(netInvestments)

	return netSavings, netCashFlow, netInvestments
}

// isAllocationActiveInMonth checks if an income allocation is active during the given month.
// An allocation is active if it started on or before the last day of that month,
// and hasn't ended before the first day of that month.
func isAllocationActiveInMonth(alloc repo.IncomeAllocation, date time.Time) bool {
	// Get the last day of the month
	year, month, _ := date.Date()
	lastDayOfMonth := time.Date(year, month+1, 0, 23, 59, 59, 0, date.Location())

	// Allocation must start on or before the last day of this month
	if alloc.StartDate.After(lastDayOfMonth) {
		return false
	}
	// If allocation has an end date, it must not have ended before the first day of this month
	if alloc.EndDate != nil && alloc.EndDate.Before(date) {
		return false
	}
	return true
}

// applyInvestmentAllocations adds the monthly allocation amounts to investment balances.
// This function modifies the state map to increase investment balances based on income allocations.
// Returns the total amount allocated to investments this month.
func applyInvestmentAllocations(
	incomes []FinancialDataRow,
	allocations []repo.IncomeAllocation,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
	applyToBalances bool,
) *decimal.Decimal {
	total := decimal.Zero()

	// Build a map of income ParentID -> allocations targeting investments (filtered by date)
	// Allocations are linked to the original income ID, which for versioned incomes is the ParentID.
	// When an income is versioned, new versions have different IDs but same ParentID.
	incomeAllocMap := make(map[string][]repo.IncomeAllocation)
	for _, alloc := range allocations {
		if alloc.TargetInvestmentID != nil && isAllocationActiveInMonth(alloc, currentDate) {
			incomeAllocMap[alloc.IncomeID] = append(incomeAllocMap[alloc.IncomeID], alloc)
		}
	}

	for _, income := range incomes {
		if !isActiveInMonth(income, currentDate) {
			continue
		}

		// Look up allocations by income's ParentID since allocations are linked to the original income.
		// For non-versioned incomes, ParentID == ID. For versioned incomes, ParentID points to original.
		allocs, hasAllocs := incomeAllocMap[income.ParentID]
		if !hasAllocs {
			continue
		}

		// Get the monthly income amount
		monthlyIncome := common.ToMonthlyAmount(state[income.ID], income.Frequency)
		if monthlyIncome == nil || monthlyIncome.IsZero() {
			continue
		}

		for _, alloc := range allocs {
			var allocAmount *decimal.Decimal
			if alloc.AllocationType == "fixed" {
				allocAmount = &alloc.AllocationValue
			} else {
				// Percentage: (monthlyIncome * percentage) / 100
				hundred := decimal.NewFromInt64(100, 0)
				pct := alloc.AllocationValue.Div(hundred)
				allocAmount = monthlyIncome.Mul(pct)
			}

			// Add to the target investment balance
			if applyToBalances && alloc.TargetInvestmentID != nil {
				investmentID := *alloc.TargetInvestmentID
				if currentBalance, exists := state[investmentID]; exists && currentBalance != nil {
					state[investmentID] = currentBalance.Add(allocAmount)
				}
			}

			total = total.Add(allocAmount)
		}
	}

	return total
}

// convertAppliedImpacts converts scenario.AppliedImpactInfo to response AppliedImpact format
func convertAppliedImpacts(infos []scenario.AppliedImpactInfo) []AppliedImpact {
	if len(infos) == 0 {
		return nil
	}
	result := make([]AppliedImpact, 0, len(infos))
	for _, info := range infos {
		// AmountMonthly and AmountAnnual are already in dollars (like all financial amounts)
		monthlyAmt := decimal.NewFromInt64(info.AmountMonthly, 0)
		annualAmt := decimal.NewFromInt64(info.AmountAnnual, 0)

		result = append(result, AppliedImpact{
			EventID:       info.EventID,
			AmountAnnual:  *annualAmt.Round(0),
			AmountMonthly: *monthlyAmt.Round(0),
			ImpactKind:    info.ImpactKind,
			Notes:         info.Notes,
		})
	}
	return result
}

// buildNonCashAssetResponses builds responses for non-cash assets and returns total value
func buildNonCashAssetResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time) ([]NonCashAssetResponse, *decimal.Decimal) {
	responses := make([]NonCashAssetResponse, 0)
	total := decimal.Zero()

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}
		total = total.Add(state.Balance)
		balance := state.Balance.Round(0)
		// Use adjusted value if available, otherwise use base value
		adjBalance := balance
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjBalance = adjusted.Round(0)
		}
		resp := NonCashAssetResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Balance:         *balance,
			EventAdjBalance: *adjBalance,
			ItemType:        string(row.ItemType),
			StartDate:       row.StartDate.Format("2006-01-02"),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
		}
		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}
		responses = append(responses, resp)
	}
	return responses, total
}

// buildInvestmentResponses builds responses for investments and returns total value
func buildInvestmentResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time) ([]InvestmentResponse, *decimal.Decimal) {
	responses := make([]InvestmentResponse, 0)
	total := decimal.Zero()

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}
		total = total.Add(state.Balance)
		balance := state.Balance.Round(0)
		// Use adjusted value if available, otherwise use base value
		adjBalance := balance
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjBalance = adjusted.Round(0)
		}
		resp := InvestmentResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Balance:         *balance,
			EventAdjBalance: *adjBalance,
			GrowthRate:      row.GrowthRate,
			ItemType:        string(row.ItemType),
			StartDate:       row.StartDate.Format("2006-01-02"),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
		}
		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}
		responses = append(responses, resp)
	}
	return responses, total
}

// buildCashAssetResponses builds responses for cash assets and returns total value and accumulator ID
// cashAccumulator is added to the accumulator account's balance
func buildCashAssetResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time, cashAccumulator *decimal.Decimal) ([]CashAssetResponse, *decimal.Decimal, string) {
	responses := make([]CashAssetResponse, 0)
	total := decimal.Zero()
	var accumulatorID string

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}
		total = total.Add(state.Balance)
		if row.IsAccumulator {
			accumulatorID = row.ID
		}
		balance := state.Balance
		// Add accumulated cash to the accumulator account
		if row.IsAccumulator && cashAccumulator != nil {
			balance = balance.Add(cashAccumulator)
		}
		balanceRounded := balance.Round(0)
		// Use adjusted value if available, otherwise use base value
		adjBalance := balanceRounded
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjBalance = adjusted.Round(0)
			// For accumulator, also add the cash accumulator
			if row.IsAccumulator && cashAccumulator != nil {
				adjBalance = adjusted.Add(cashAccumulator).Round(0)
			}
		}
		resp := CashAssetResponse{
			ItemID:          row.ID,
			Name:            row.Name,
			Category:        row.Category,
			Balance:         *balanceRounded,
			EventAdjBalance: *adjBalance,
			ItemType:        string(row.ItemType),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
			IsAccumulator:   row.IsAccumulator,
		}
		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}
		responses = append(responses, resp)
	}
	return responses, total, accumulatorID
}

// buildLiabilityResponses builds responses for liabilities and returns total value
// Only includes liabilities with outstanding balance (fully repaid liabilities are hidden)
func buildLiabilityResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time) ([]LiabilityResponse, *decimal.Decimal) {
	responses := make([]LiabilityResponse, 0)
	total := decimal.Zero()

	for _, row := range rows {
		// For liabilities, only check if it has started (not end date).
		// A liability's end date is its loan term, but the debt persists if there's an outstanding balance.
		// Fully repaid liabilities are filtered out separately below.
		if !hasStartedByMonth(row, date) {
			continue
		}

		state := itemStates[row.ID]
		if state == nil {
			continue
		}

		// Hide fully repaid liabilities
		if isLiabilityFullyRepaid(state) {
			continue
		}
		total = total.Add(state.Balance)
		// Liabilities are point-in-time balances, not flows - no division needed
		balance := state.Balance.Round(0)
		// Use adjusted value if available, otherwise use base value
		adjBalance := balance
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjBalance = adjusted.Round(0)
		}
		resp := LiabilityResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Balance:         *balance,
			EventAdjBalance: *adjBalance,
			SourceAmount:    *row.Amount.Round(0),
			ItemType:        string(row.ItemType),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
		}
		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}
		responses = append(responses, resp)
	}
	return responses, total
}

// buildIncomeResponses builds responses for incomes with CPF breakdown
func buildIncomeResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time, cpfContributions map[string]*cpfProcessor.ContributionResult) []IncomeResponse {
	responses := make([]IncomeResponse, 0)

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}
		// Convert to monthly amount for display
		monthlyAmt := common.ToMonthlyAmount(state.Balance, row.Frequency)
		amount := monthlyAmt.Round(0)
		// Use adjusted value if available, otherwise use base value
		// Adjusted state is already in source frequency, so convert to monthly
		adjAmount := amount
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjMonthly := common.ToMonthlyAmount(adjusted, row.Frequency)
			adjAmount = adjMonthly.Round(0)
		}
		resp := IncomeResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Amount:          *amount,
			EventAdjAmount:  *adjAmount,
			SourceFrequency: string(row.Frequency),
			ItemType:        string(row.ItemType),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
			GrowthRate:      *row.GrowthRate.Round(0),
		}

		// Populate CPF breakdown if available
		if contribution, ok := cpfContributions[row.ID]; ok && contribution != nil {
			resp.EmployeeCPF = *contribution.EmployeeContribution.Round(0)
			resp.EmployerCPF = *contribution.EmployerContribution.Round(0)
			resp.TotalCPF = *contribution.TotalContribution.Round(0)
			resp.NetTakeHomePay = *contribution.NetTakeHomePay.Round(0)
			resp.AllocationOA = *contribution.AllocationOA.Round(0)
			resp.AllocationSA = *contribution.AllocationSA.Round(0)
			resp.AllocationMA = *contribution.AllocationMA.Round(0)
			resp.AllocationRA = *contribution.AllocationRA.Round(0)
		}

		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}

		responses = append(responses, resp)
	}
	return responses
}

// buildExpenseResponses builds responses for expenses
// Linked expenses (debt payments) are hidden once their liability is fully repaid
func buildExpenseResponses(rows []FinancialDataRow, itemStates ItemStateMap, eventAdjustedState map[string]*decimal.Decimal, appliedImpacts map[string][]scenario.AppliedImpactInfo, date time.Time) []ExpenseResponse {
	responses := make([]ExpenseResponse, 0)

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}

		// Hide linked expenses when their liability is fully repaid
		if row.SourceLiabilityID != nil && isLiabilityFullyRepaid(itemStates[*row.SourceLiabilityID]) {
			continue
		}

		// Convert to monthly amount for display
		monthlyAmt := common.ToMonthlyAmount(state.Balance, row.Frequency)
		amount := monthlyAmt.Round(0)
		// Use adjusted value if available, otherwise use base value
		// Adjusted state is already in source frequency, so convert to monthly
		adjAmount := amount
		if adjusted, ok := eventAdjustedState[row.ID]; ok && adjusted != nil {
			adjMonthly := common.ToMonthlyAmount(adjusted, row.Frequency)
			adjAmount = adjMonthly.Round(0)
		}

		resp := ExpenseResponse{
			ID:                row.ID,
			ParentID:          row.ParentID,
			Name:              row.Name,
			Category:          row.Category,
			Amount:            *amount,
			EventAdjAmount:    *adjAmount,
			SourceFrequency:   string(row.Frequency),
			ItemType:          string(row.ItemType),
			StartYear:         state.StartYear,
			StartMonth:        state.StartMonth,
			SourceLiabilityID: row.SourceLiabilityID,
		}
		// Add applied impacts if any
		if impacts, ok := appliedImpacts[row.ID]; ok {
			resp.EventImpacts = convertAppliedImpacts(impacts)
		}
		responses = append(responses, resp)
	}
	return responses
}

// buildCPFContributionResponses builds CPF contribution line items from active incomes
func buildCPFContributionResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time, cpfContributions map[string]*cpfProcessor.ContributionResult) []CPFContributionResponse {
	responses := make([]CPFContributionResponse, 0)

	for _, row := range rows {
		if !isActiveInMonth(row, date) {
			continue
		}
		state := itemStates[row.ID]
		if state == nil {
			continue
		}

		// Only create CPF contribution response if there's a contribution for this income
		contribution, ok := cpfContributions[row.ID]
		if !ok || contribution == nil {
			continue
		}

		// Skip if no contribution at all
		if contribution.TotalContribution.IsZero() {
			continue
		}

		responses = append(responses, CPFContributionResponse{
			ID:                   row.ID + "-cpf",
			ParentID:             row.ID,
			Name:                 "CPF Contribution - " + row.Name,
			Category:             row.Category,
			EmployeeContribution: *contribution.EmployeeContribution.Round(0),
			EmployerContribution: *contribution.EmployerContribution.Round(0),
			TotalContribution:    *contribution.TotalContribution.Round(0),
			SourceFrequency:      string(row.Frequency),
			ItemType:             "cpf_contribution",
			StartYear:            state.StartYear,
			StartMonth:           state.StartMonth,
			AllocationOA:         *contribution.AllocationOA.Round(0),
			AllocationSA:         *contribution.AllocationSA.Round(0),
			AllocationMA:         *contribution.AllocationMA.Round(0),
			AllocationRA:         *contribution.AllocationRA.Round(0),
		})
	}
	return responses
}

// buildCPFAssetResponses builds CPF asset responses from accumulated balances
// The RA (Retirement Account) is only included if the user is 55+ at the given date
// or if the RA balance is non-zero.
func buildCPFAssetResponses(cpfCtx *CPFContext, yearIndex int, month int, date time.Time) []CPFAssetResponse {
	if cpfCtx == nil || cpfCtx.Balances == nil {
		return []CPFAssetResponse{}
	}

	balances := cpfCtx.Balances
	responses := []CPFAssetResponse{
		{
			ID:              "cpf-oa",
			ParentID:        "cpf",
			Name:            "CPF Ordinary Account",
			Category:        "cpf",
			Balance:         *balances.AccumulatedOA.Round(0),
			EventAdjBalance: *balances.AccumulatedOA.Round(0),
			ItemType:        "cpf_account",
			StartDate:       "",
			StartYear:       yearIndex,
			StartMonth:      month,
		},
		{
			ID:              "cpf-sa",
			ParentID:        "cpf",
			Name:            "CPF Special Account",
			Category:        "cpf",
			Balance:         *balances.AccumulatedSA.Round(0),
			EventAdjBalance: *balances.AccumulatedSA.Round(0),
			ItemType:        "cpf_account",
			StartDate:       "",
			StartYear:       yearIndex,
			StartMonth:      month,
		},
		{
			ID:              "cpf-ma",
			ParentID:        "cpf",
			Name:            "CPF MediSave Account",
			Category:        "cpf",
			Balance:         *balances.AccumulatedMA.Round(0),
			EventAdjBalance: *balances.AccumulatedMA.Round(0),
			ItemType:        "cpf_account",
			StartDate:       "",
			StartYear:       yearIndex,
			StartMonth:      month,
		},
	}

	// Only include RA if user is 55+ at this date or has a non-zero RA balance
	raBalance := balances.AccumulatedRA.Round(0)
	showRA := !raBalance.IsZero()
	if !showRA && cpfCtx.Processor != nil {
		if acc := cpfCtx.Processor.GetAccount(); acc != nil {
			showRA = acc.AgeAtDate(date) >= 55
		}
	}

	if showRA {
		responses = append(responses, CPFAssetResponse{
			ID:              "cpf-ra",
			ParentID:        "cpf",
			Name:            "CPF Retirement Account",
			Category:        "cpf",
			Balance:         *raBalance,
			EventAdjBalance: *raBalance,
			ItemType:        "cpf_account",
			StartDate:       "",
			StartYear:       yearIndex,
			StartMonth:      month,
		})
	}

	return responses
}

// buildIncomeAllocationResponses builds responses for active income allocations
func buildIncomeAllocationResponses(allocations []repo.IncomeAllocation, date time.Time) []IncomeAllocationResponse {
	responses := make([]IncomeAllocationResponse, 0)
	for _, alloc := range allocations {
		if !isAllocationActiveInMonth(alloc, date) {
			continue
		}
		resp := IncomeAllocationResponse{
			ID:                  alloc.ID,
			IncomeID:            alloc.IncomeID,
			ParentID:            alloc.ParentID,
			StartDate:           alloc.StartDate.Format("2006-01-02T15:04:05Z07:00"),
			TargetCashAccountID: alloc.TargetCashAccountID,
			TargetInvestmentID:  alloc.TargetInvestmentID,
			AllocationType:      alloc.AllocationType,
			AllocationValue:     alloc.AllocationValue,
		}
		if alloc.EndDate != nil {
			endDateStr := alloc.EndDate.Format("2006-01-02T15:04:05Z07:00")
			resp.EndDate = &endDateStr
		}
		responses = append(responses, resp)
	}
	return responses
}

// buildMonthDetailResponse creates a detailed response for a single month
func buildMonthDetailResponse(
	allMonthsIndex int,
	date time.Time,
	baseYear int,
	data EffectiveRows,
	itemStates ItemStateMap,
	eventAdjustedState map[string]*decimal.Decimal, // nil if scenarios disabled, otherwise adjusted values
	appliedImpacts map[string][]scenario.AppliedImpactInfo, // tracks which impacts were applied to each item
	cashAccumulator *decimal.Decimal,
	netSavings *decimal.Decimal,
	netCashFlow *decimal.Decimal,
	netInvestments *decimal.Decimal,
	cpfContributions map[string]*cpfProcessor.ContributionResult,
	cpfCtx *CPFContext,
	incomeAllocations []repo.IncomeAllocation,
) MonthDetailResponse {
	yearIndex := date.Year() - baseYear
	month := int(date.Month())

	// Build all item responses
	nonCashAssets, nonCashTotal := buildNonCashAssetResponses(data.NonCashAssets, itemStates, eventAdjustedState, appliedImpacts, date)
	investments, investmentTotal := buildInvestmentResponses(data.Investments, itemStates, eventAdjustedState, appliedImpacts, date)
	cashAssets, cashTotal, accumulatorID := buildCashAssetResponses(data.CashAssets, itemStates, eventAdjustedState, appliedImpacts, date, cashAccumulator)
	liabilities, liabilityTotal := buildLiabilityResponses(data.Liabilities, itemStates, eventAdjustedState, appliedImpacts, date)
	incomes := buildIncomeResponses(data.Incomes, itemStates, eventAdjustedState, appliedImpacts, date, cpfContributions)
	expenses := buildExpenseResponses(data.Expenses, itemStates, eventAdjustedState, appliedImpacts, date)
	cpfContributionResponses := buildCPFContributionResponses(data.Incomes, itemStates, date, cpfContributions)
	incomeAllocationResponses := buildIncomeAllocationResponses(incomeAllocations, date)

	// Build CPF assets from accumulated balances
	cpfAssets := buildCPFAssetResponses(cpfCtx, yearIndex, month, date)
	cpfTotal := decimal.Zero()
	for _, asset := range cpfAssets {
		cpfTotal = cpfTotal.Add(&asset.Balance)
	}

	// Calculate totals
	totalAssets := decimal.Zero().Add(nonCashTotal).Add(investmentTotal).Add(cashTotal).Add(cashAccumulator).Add(cpfTotal)
	netWorth := totalAssets.Sub(liabilityTotal)

	return MonthDetailResponse{
		Year:                 baseYear + yearIndex,
		Month:                month,
		AllYearsIndex:        yearIndex,
		AllMonthsIndex:       allMonthsIndex,
		NonCashAssets:        nonCashAssets,
		Investments:          investments,
		CashAssets:           cashAssets,
		CPFAssets:            cpfAssets,
		Liabilities:          liabilities,
		Income:               incomes,
		CPFContributions:     cpfContributionResponses,
		Expenses:             expenses,
		IncomeAllocations:    incomeAllocationResponses,
		NetSavings:           *netSavings.Round(0),
		NetCash:              *netCashFlow.Round(0),
		NetInvestments:       *netInvestments.Round(0),
		NetWorth:             *netWorth.Round(0),
		AccumulatorAccountID: accumulatorID,
	}
}

// =============================================================================
// Monthly Processing
// =============================================================================

// MonthlyContext holds all state needed to process a single month.
//
// # State vs EventAdjustedState
//
// There are two state maps used during timeline calculation:
//
//   - State: The base financial state that PERSISTS across months. Contains original values
//     plus growth and income allocations. This is the "real" timeline without any scenario events.
//
//   - EventAdjustedState: A TEMPORARY copy of State, recreated fresh each month. Contains State
//     plus scenario event impacts (e.g., "what if salary increases by 20%"). Only exists when
//     scenarios are active (otherwise nil).
//
// Example with $300/month allocation to investment:
//
//	| Month | State (base)              | EventAdjustedState (with scenario)     |
//	|-------|---------------------------|----------------------------------------|
//	| Jan   | 35,000 + 300 = 35,300     | 35,300 + scenario impact               |
//	| Feb   | 35,300 + 300 = 35,600     | 35,600 + scenario impact               |
//	| Mar   | 35,600 + 300 = 35,900     | 35,900 + scenario impact               |
//
// In the API response:
//   - `balance` comes from State (via ItemStates)
//   - `adjBalance` comes from EventAdjustedState
//
// Income allocations must be applied to BOTH states so they persist across months.
type MonthlyContext struct {
	Data                      EffectiveRows
	ItemStates                ItemStateMap
	State                     map[string]*decimal.Decimal // Base state - persists across months
	Registry                  *growth.Registry
	CPFCtx                    *CPFContext
	BaseYear                  int
	CashAccumulator           *decimal.Decimal
	IncomeAllocations         []repo.IncomeAllocation
	LinkedExpensesByLiability map[string]FinancialDataRow
	// Scenario event support
	ScenarioImpacts    *scenario.ImpactContext               // Pre-indexed impacts (nil if scenarios disabled)
	EventAdjustedState map[string]*decimal.Decimal           // Temporary state with scenario impacts (recreated each month)
	AppliedImpacts     map[string][]scenario.AppliedImpactInfo // Tracks which impacts were applied to each item
}

// processMonth handles all calculations for a single month and returns the response
// isAnchorMonth indicates if this is the first month (anchor month) where investment allocations should not mutate balances
func processMonth(mctx *MonthlyContext, allMonthsIndex int, currentDate time.Time, isAnchorMonth bool) MonthDetailResponse {
	// Reset CPF YTD at year boundaries
	mctx.CPFCtx.ResetYTDIfNewYear(currentDate, allMonthsIndex)

	// Apply growth to all financial items (excluding liabilities)
	growthCtx := &GrowthContext{
		Registry:    mctx.Registry,
		State:       mctx.State,
		Month:       allMonthsIndex + 1,
		MonthOfYear: int(currentDate.Month()),
		Date:        currentDate,
	}
	applyAllGrowth(mctx.Data, growthCtx)

	// Process all liabilities using unified function (handles both fixed-term and open-ended)
	processLiabilityMonth(
		mctx.Data.Liabilities,
		mctx.LinkedExpensesByLiability,
		mctx.State,
		currentDate,
		isAnchorMonth,
	)

	// Apply scenario impacts AFTER growth and liability processing
	applyScenarioImpacts(mctx, currentDate, isAnchorMonth)

	// Determine which state to use for CPF and cash calculations
	// Use adjusted state if scenarios are active, otherwise use base state
	stateForCalcs := mctx.State
	if mctx.EventAdjustedState != nil {
		stateForCalcs = mctx.EventAdjustedState
	}

	// Process CPF contributions (using adjusted income values if scenarios are active)
	// For anchor month, calculate contributions but don't add to balances (show base values)
	applyContributions := !isAnchorMonth
	employeeCPF, cpfContributions := mctx.CPFCtx.ProcessIncomes(mctx.Data.Incomes, stateForCalcs, currentDate, applyContributions)

	// Calculate cash flow; investment allocations are computed every month but only mutate balances after the anchor month
	var netSavings, netCashFlow, netInvestments *decimal.Decimal
	applyAllocations := !isAnchorMonth
	netSavings, netCashFlow, netInvestments = calcCashAllocation(
		mctx.Data,
		stateForCalcs,
		currentDate,
		employeeCPF,
		mctx.IncomeAllocations,
		applyAllocations,
	)

	// If scenarios are active (EventAdjustedState != State), also apply allocations to base State
	// so they persist across months. EventAdjustedState already has this month's allocations.
	if applyAllocations && mctx.EventAdjustedState != nil {
		applyInvestmentAllocations(mctx.Data.Incomes, mctx.IncomeAllocations, mctx.State, currentDate, true)
	}

	// Accumulate cash flow (anchor month included; allocations only mutate balances after anchor)
	if applyAllocations {
		mctx.CashAccumulator = mctx.CashAccumulator.Add(netCashFlow)
	}

	// Sync state and build response
	syncStateToItemStates(mctx.State, mctx.ItemStates)
	return buildMonthDetailResponse(
		allMonthsIndex, currentDate, mctx.BaseYear, mctx.Data, mctx.ItemStates,
		mctx.EventAdjustedState, // Pass adjusted state for adjBalance/adjAmount
		mctx.AppliedImpacts,     // Pass applied impacts for EventImpacts field
		mctx.CashAccumulator, netSavings, netCashFlow, netInvestments, cpfContributions, mctx.CPFCtx,
		mctx.IncomeAllocations,
	)
}

// =============================================================================
// Public Service Methods
// =============================================================================

// ComputeFinancialSnapshot calculates monthly snapshots over the specified date range
func (s *Service) ComputeFinancialSnapshot(
	ctx context.Context,
	userID string,
	opts TimelineOptions,
) (TimelineV2Response, error) {
	sgData, err := s.loadFinancialData(ctx, userID, opts)
	if err != nil {
		return TimelineV2Response{}, err
	}
	return s.computeSnapshotFromData(sgData, opts), nil
}

// computeSnapshotFromData computes the timeline snapshot from pre-loaded financial data.
// This allows callers to reuse loaded data for multiple purposes (e.g., extracting scenario IDs).
func (s *Service) computeSnapshotFromData(sgData SGFinancialDataRows, opts TimelineOptions) TimelineV2Response {
	anchorStart, anchorEnd := buildAnchorRange(opts, sgData.Rows)
	linkedExpenses := buildLinkedExpensesByLiability(sgData.Rows.Expenses)

	startMonthIndex := (int(anchorStart.Month()) - 1)

	mctx := &MonthlyContext{
		Data:                      sgData.Rows,
		ItemStates:                initializeItemStates(sgData.Rows, anchorStart.Year()),
		Registry:                  growth.NewRegistry(),
		CPFCtx:                    NewCPFContext(sgData.CPFAccount),
		BaseYear:                  anchorStart.Year(),
		CashAccumulator:           decimal.Zero(),
		IncomeAllocations:         sgData.IncomeAllocations,
		LinkedExpensesByLiability: linkedExpenses,
		ScenarioImpacts:           sgData.ScenarioImpacts,
	}
	mctx.State = extractBalanceMap(mctx.ItemStates)

	totalMonths := common.MonthsBetween(anchorStart, anchorEnd)
	resultMonths := make([]MonthDetailResponse, 0, totalMonths)

	for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
		currentDate := anchorStart.AddDate(0, monthIdx, 0)
		allMonthsIndex := startMonthIndex + monthIdx
		isAnchorMonth := monthIdx == 0
		resultMonths = append(resultMonths, processMonth(mctx, allMonthsIndex, currentDate, isAnchorMonth))
	}

	return TimelineV2Response{Months: resultMonths}
}

// loadFinancialData loads all financial data for the given user and date range
func (s *Service) loadFinancialData(ctx context.Context, userID string, opts TimelineOptions) (SGFinancialDataRows, error) {
	endDateExclusive := opts.EndDate.AddDate(0, 1, 0)
	dateOpts := repo.DateRangeOptions{
		StartDate: &opts.StartDate,
		EndDate:   &endDateExclusive,
	}
	sgData, err := s.loadEffectiveRows(ctx, userID, dateOpts, repo.PaginationParams{}, opts.IncludeScenarios)
	if err != nil {
		return SGFinancialDataRows{}, fmt.Errorf("failed to load financial data: %w", err)
	}
	return sgData, nil
}

// GetTimeline generates a timeline chart response for the given user and resolution.
// It computes monthly snapshots and extracts net worth values for the chart.
func (s *Service) GetTimeline(
	ctx context.Context,
	userID string,
	resolution string,
) (TimelineAnnualChartResponse, error) {
	// Default planning horizon: 35 years (typical age 30-65)
	const defaultYearsToProject = 35

	// Calculate date range - start from January 1 of the current year
	// This ensures all financial items created this year are included
	now := time.Now()
	startDate := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(defaultYearsToProject, 0, 0)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeScenarios: true,
	}

	// Load financial data once - this gives us access to ScenarioImpacts.EventsByID
	sgData, err := s.loadFinancialData(ctx, userID, opts)
	if err != nil {
		return TimelineAnnualChartResponse{}, err
	}

	// Compute monthly snapshots using loaded data
	snapshot := s.computeSnapshotFromData(sgData, opts)

	scenarioIDs := extractScenarioIDsFromImpacts(sgData.ScenarioImpacts)

	if resolution == "yearly" {
		// Aggregate monthly data into yearly summaries (use December of each year)
		years := aggregateToYearly(snapshot.Months)
		return TimelineAnnualChartResponse{
			Resolution:  "yearly",
			Years:       years,
			Months:      nil,
			ScenarioIds: scenarioIDs,
		}, nil
	}

	// Monthly resolution: convert MonthDetailResponse to TimelineMonthlySummary
	months := make([]TimelineMonthlySummary, len(snapshot.Months))
	for i, m := range snapshot.Months {
		months[i] = TimelineMonthlySummary{
			Month:          m.Month,
			AllMonthsIndex: m.AllMonthsIndex,
			NetWorth:       m.NetWorth,
		}
	}

	return TimelineAnnualChartResponse{
		Resolution:  "monthly",
		Years:       nil,
		Months:      months,
		ScenarioIds: scenarioIDs,
	}, nil
}

// extractScenarioIDsFromImpacts extracts unique scenario event IDs from the impact context.
func extractScenarioIDsFromImpacts(impacts *scenario.ImpactContext) []string {
	if impacts == nil {
		return nil
	}
	ids := make([]string, 0, len(impacts.EventsByID))
	for eventID := range impacts.EventsByID {
		ids = append(ids, eventID)
	}
	return ids
}

// aggregateToYearly converts monthly snapshots to yearly summaries for the chart.
// Uses December values (or last available month) as representative for each year.
//
// This aggregation is correct for:
//   - NetWorth: a point-in-time balance best represented by year-end value
//   - Assets/Liabilities: point-in-time balances
//
// Note: For cashflow items (income/expenses), the frontend handles annual totals
// separately. If detailed item-level yearly aggregation is needed, income/expense
// amounts should be summed across all 12 months to account for compounding growth
// and mid-year scenario impacts.
func aggregateToYearly(months []MonthDetailResponse) []TimelineYearlySummary {
	if len(months) == 0 {
		return []TimelineYearlySummary{}
	}

	// Group by year, keeping the last month of each year (December or last available)
	yearMap := make(map[int]MonthDetailResponse)
	for _, m := range months {
		existing, ok := yearMap[m.Year]
		if !ok || m.Month > existing.Month {
			yearMap[m.Year] = m
		}
	}

	// Convert to sorted slice
	years := make([]TimelineYearlySummary, 0, len(yearMap))
	for year, m := range yearMap {
		years = append(years, TimelineYearlySummary{
			Year:          year,
			AllYearsIndex: m.AllYearsIndex,
			NetWorth:      m.NetWorth,
		})
	}

	// Sort by year
	sort.Slice(years, func(i, j int) bool {
		return years[i].Year < years[j].Year
	})

	// Reassign AllYearsIndex based on sorted position
	for i := range years {
		years[i].AllYearsIndex = i
	}

	return years
}

// extractScenarioIDs collects unique scenario event IDs from applied impacts.
func extractScenarioIDs(months []MonthDetailResponse) []string {
	seen := make(map[string]bool)
	var ids []string

	for _, m := range months {
		// Check all item types for impacts
		for _, item := range m.NonCashAssets {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
		for _, item := range m.Investments {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
		for _, item := range m.CashAssets {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
		for _, item := range m.Liabilities {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
		for _, item := range m.Income {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
		for _, item := range m.Expenses {
			for _, impact := range item.EventImpacts {
				if !seen[impact.EventID] {
					seen[impact.EventID] = true
					ids = append(ids, impact.EventID)
				}
			}
		}
	}

	return ids
}
