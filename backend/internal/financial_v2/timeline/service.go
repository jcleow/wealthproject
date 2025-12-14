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
	repo "financial-chat-system/backend/internal/financial_v2/repository"

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
	IsAccumulator bool            // For cash accounts - identifies the accumulator account
	// CPF-related fields (for incomes)
	CPFWageType cpfProcessor.CPFWageType // CPFWageTypeOW (Ordinary Wages) or CPFWageTypeAW (Additional Wages)
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
// Transform Functions (used by loadEffectiveRows)
// =============================================================================

// transformNonCashAssets converts repository.NonCashAsset to FinancialDataRow
func transformNonCashAssets(assets []repo.NonCashAsset) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(assets))
	for _, a := range assets {
		rows = append(rows, FinancialDataRow{
			ID:         a.ID,
			ParentID:   a.ParentID, // Already coalesced in SQL
			Name:       a.Name,
			Category:   a.Category,
			Amount:     a.CurrentValue,
			StartDate:  a.StartDate,
			EndDate:    a.EndDate,
			ItemType:   FinNonCashAsset,
			GrowthRate: a.AnnualGrowthRate,
		})
	}
	return rows
}

// transformInvestments converts repository.Investment to FinancialDataRow
func transformInvestments(investments []repo.Investment) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(investments))
	for _, inv := range investments {
		rows = append(rows, FinancialDataRow{
			ID:         inv.ID,
			ParentID:   inv.ParentID,
			Name:       inv.Name,
			Category:   inv.Category,
			Amount:     inv.CurrentValue,
			StartDate:  inv.StartDate,
			EndDate:    inv.EndDate,
			ItemType:   FinInvestment,
			GrowthRate: inv.AnnualGrowthRate,
		})
	}
	return rows
}

// transformCashAssets converts repository.CashAsset to FinancialDataRow
func transformCashAssets(assets []repo.CashAsset) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(assets))
	for _, a := range assets {
		rows = append(rows, FinancialDataRow{
			ID:            a.ID,
			ParentID:      a.ID, // Cash accounts use ID as ParentID
			Name:          a.Name,
			Category:      a.AccountType,
			Amount:        a.Balance,
			StartDate:     a.StartDate,
			EndDate:       a.EndDate,
			ItemType:      FinCashAsset,
			GrowthRate:    a.InterestRate,
			IsAccumulator: a.IsAccumulator,
		})
	}
	return rows
}

// transformLiabilities converts repository.Liability to FinancialDataRow
func transformLiabilities(liabilities []repo.Liability) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(liabilities))
	for _, l := range liabilities {
		rows = append(rows, FinancialDataRow{
			ID:         l.ID,
			ParentID:   l.ParentID,
			Name:       l.Name,
			Category:   l.Category,
			Amount:     l.CurrentBalance,
			StartDate:  l.StartDate,
			EndDate:    l.EndDate,
			ItemType:   FinLiabilities,
			GrowthRate: l.InterestRateAPR,
		})
	}
	return rows
}

// transformIncomes converts repository.Income to FinancialDataRow
func transformIncomes(incomes []repo.Income) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(incomes))
	for _, i := range incomes {
		rows = append(rows, FinancialDataRow{
			ID:          i.ID,
			ParentID:    i.ParentID,
			Name:        i.Source, // Income uses "Source" as name
			Category:    i.Category,
			Amount:      i.Amount,
			Frequency:   Frequency(i.Frequency), // Keep actual frequency
			StartDate:   i.StartDate,
			EndDate:     i.EndDate,
			ItemType:    FinIncome,
			GrowthRate:  i.GrowthRate,
			CPFWageType: cpfProcessor.CPFWageType(i.CPFWageType),
		})
	}
	return rows
}

// transformExpenses converts repository.Expense to FinancialDataRow
func transformExpenses(expenses []repo.Expense) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(expenses))
	for _, e := range expenses {
		rows = append(rows, FinancialDataRow{
			ID:         e.ID,
			ParentID:   e.ParentID,
			Name:       e.Payee, // Expense uses "Payee" as name
			Category:   e.Category,
			Amount:     e.Amount,
			Frequency:  Frequency(e.Frequency), // Keep actual frequency
			StartDate:  e.StartDate,
			EndDate:    e.EndDate,
			ItemType:   FinExpense,
			GrowthRate: e.GrowthRate,
		})
	}
	return rows
}

// =============================================================================
// Data Loading (used by ComputeFinancialSnapshot)
// =============================================================================

func (s *Service) loadEffectiveRows(
	ctx context.Context,
	userID string,
	dateOpts repo.DateRangeOptions,
	paginationOpts repo.PaginationParams,
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
	)

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		nonCashAssets, err = s.store.ListNonCashAssets(gctx, userID, dateOpts, paginationOpts)
		return err
	})

	g.Go(func() error {
		var err error
		investments, err = s.store.ListInvestments(gctx, userID, dateOpts, paginationOpts)
		return err
	})

	g.Go(func() error {
		var err error
		cashAssets, err = s.store.ListCashAssets(gctx, userID, dateOpts, paginationOpts)
		return err
	})

	g.Go(func() error {
		var err error
		liabilities, err = s.store.ListLiabilities(gctx, userID, dateOpts, paginationOpts)
		return err
	})

	g.Go(func() error {
		var err error
		incomes, err = s.store.ListIncomes(gctx, userID, dateOpts, paginationOpts)
		return err
	})

	g.Go(func() error {
		var err error
		expenses, err = s.store.ListExpenses(gctx, userID, dateOpts, paginationOpts)
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

	if err := g.Wait(); err != nil {
		return SGFinancialDataRows{}, err
	}

	// Transform repository types to FinancialDataRow
	return SGFinancialDataRows{
		Rows: EffectiveRows{
			NonCashAssets: transformNonCashAssets(nonCashAssets.Data),
			Investments:   transformInvestments(investments.Data),
			CashAssets:    transformCashAssets(cashAssets.Data),
			Liabilities:   transformLiabilities(liabilities.Data),
			Incomes:       transformIncomes(incomes.Data),
			Expenses:      transformExpenses(expenses.Data),
		},
		CPFAccount:        mapToCPFAccount(cpfAccount),
		IncomeAllocations: incomeAllocations,
	}, nil
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
func (c *CPFContext) ProcessIncomes(
	incomes []FinancialDataRow,
	state map[string]*decimal.Decimal,
	date time.Time,
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
			c.Processor.AddContributionToBalances(result, c.Balances)
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
		start = normalizeToMonthStart(time.Now())
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
func isActiveInMonth(row FinancialDataRow, date time.Time) bool {
	// Get the last day of the month
	year, month, _ := date.Date()
	lastDayOfMonth := time.Date(year, month+1, 0, 23, 59, 59, 0, date.Location())

	// Item must start on or before the last day of this month
	if row.StartDate.After(lastDayOfMonth) {
		return false
	}
	// If item has an end date, it must not have ended before the first day of this month
	if row.EndDate != nil && row.EndDate.Before(date) {
		return false
	}
	return true
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
func applyAllGrowth(data EffectiveRows, ctx *GrowthContext) {
	// Income/Expenses use annual step growth (raises happen yearly)
	applyGrowth(data.Incomes, ctx, growth.StrategyAnnualStep)
	applyGrowth(data.Expenses, ctx, growth.StrategyAnnualStep)
	// Assets/Liabilities use monthly compound growth
	applyGrowth(data.NonCashAssets, ctx, growth.StrategyMonthlyCompound)
	applyGrowth(data.Investments, ctx, growth.StrategyMonthlyCompound)
	applyGrowth(data.CashAssets, ctx, growth.StrategyMonthlyCompound)
	applyGrowth(data.Liabilities, ctx, growth.StrategyMonthlyCompound)
}

// calculateNetCashFlow computes net savings and net cash flow for active rows.
// Returns:
//   - netSavings: income - expenses (independent of CPF)
//   - netCashFlow: income - expenses - employeeCPF - investmentAllocations (actual cash impact)
//   - netInvestments: total amount allocated to investments this month
func calculateNetCashFlow(
	data EffectiveRows,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
	employeeCPF *decimal.Decimal,
	incomeAllocations []repo.IncomeAllocation,
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

	netSavings = income.Sub(expense)

	// Apply investment allocations - adds allocation amounts to investment balances
	netInvestments = applyInvestmentAllocations(data.Incomes, incomeAllocations, state, currentDate)

	// Deduct both CPF and investment allocations from net cash flow
	netCashFlow = netSavings.Sub(employeeCPF).Sub(netInvestments)

	return netSavings, netCashFlow, netInvestments
}

// applyInvestmentAllocations adds the monthly allocation amounts to investment balances.
// This function modifies the state map to increase investment balances based on income allocations.
// Returns the total amount allocated to investments this month.
func applyInvestmentAllocations(
	incomes []FinancialDataRow,
	allocations []repo.IncomeAllocation,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
) *decimal.Decimal {
	total := decimal.Zero()

	// Build a map of income ID -> allocations targeting investments
	incomeAllocMap := make(map[string][]repo.IncomeAllocation)
	for _, alloc := range allocations {
		if alloc.TargetInvestmentID != nil {
			incomeAllocMap[alloc.IncomeID] = append(incomeAllocMap[alloc.IncomeID], alloc)
		}
	}

	for _, income := range incomes {
		if !isActiveInMonth(income, currentDate) {
			continue
		}

		allocs, hasAllocs := incomeAllocMap[income.ID]
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
			if alloc.TargetInvestmentID != nil {
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

// buildNonCashAssetResponses builds responses for non-cash assets and returns total value
func buildNonCashAssetResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time) ([]NonCashAssetResponse, *decimal.Decimal) {
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
		responses = append(responses, NonCashAssetResponse{
			ID:         row.ID,
			ParentID:   row.ParentID,
			Name:       row.Name,
			Category:   row.Category,
			Balance:    *balance,
			AdjBalance: *balance,
			ItemType:   string(row.ItemType),
			StartDate:  row.StartDate.Format("2006-01-02"),
			StartYear:  state.StartYear,
			StartMonth: state.StartMonth,
		})
	}
	return responses, total
}

// buildInvestmentResponses builds responses for investments and returns total value
func buildInvestmentResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time) ([]InvestmentResponse, *decimal.Decimal) {
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
		responses = append(responses, InvestmentResponse{
			ID:         row.ID,
			ParentID:   row.ParentID,
			Name:       row.Name,
			Category:   row.Category,
			Balance:    *balance,
			AdjBalance: *balance,
			ItemType:   string(row.ItemType),
			StartDate:  row.StartDate.Format("2006-01-02"),
			StartYear:  state.StartYear,
			StartMonth: state.StartMonth,
		})
	}
	return responses, total
}

// buildCashAssetResponses builds responses for cash assets and returns total value and accumulator ID
// cashAccumulator is added to the accumulator account's balance
func buildCashAssetResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time, cashAccumulator *decimal.Decimal) ([]CashAssetResponse, *decimal.Decimal, string) {
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
		responses = append(responses, CashAssetResponse{
			ItemID:        row.ID,
			Name:          row.Name,
			Category:      row.Category,
			Balance:       *balanceRounded,
			AdjBalance:    *balanceRounded,
			ItemType:      string(row.ItemType),
			StartYear:     state.StartYear,
			StartMonth:    state.StartMonth,
			IsAccumulator: row.IsAccumulator,
		})
	}
	return responses, total, accumulatorID
}

// buildLiabilityResponses builds responses for liabilities and returns total value
func buildLiabilityResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time) ([]LiabilityResponse, *decimal.Decimal) {
	responses := make([]LiabilityResponse, 0)
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
		// Liabilities are point-in-time balances, not flows - no division needed
		balance := state.Balance.Round(0)
		responses = append(responses, LiabilityResponse{
			ID:           row.ID,
			ParentID:     row.ParentID,
			Name:         row.Name,
			Category:     row.Category,
			Balance:      *balance,
			AdjBalance:   *balance,
			SourceAmount: *row.Amount.Round(0),
			ItemType:     string(row.ItemType),
			StartYear:    state.StartYear,
			StartMonth:   state.StartMonth,
		})
	}
	return responses, total
}

// buildIncomeResponses builds responses for incomes with CPF breakdown
func buildIncomeResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time, cpfContributions map[string]*cpfProcessor.ContributionResult) []IncomeResponse {
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
		resp := IncomeResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Amount:          *amount,
			AdjAmount:       *amount,
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

		responses = append(responses, resp)
	}
	return responses
}

// buildExpenseResponses builds responses for expenses
func buildExpenseResponses(rows []FinancialDataRow, itemStates ItemStateMap, date time.Time) []ExpenseResponse {
	responses := make([]ExpenseResponse, 0)

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
		responses = append(responses, ExpenseResponse{
			ID:              row.ID,
			ParentID:        row.ParentID,
			Name:            row.Name,
			Category:        row.Category,
			Amount:          *amount,
			AdjAmount:       *amount,
			SourceFrequency: string(row.Frequency),
			ItemType:        string(row.ItemType),
			StartYear:       state.StartYear,
			StartMonth:      state.StartMonth,
		})
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
func buildCPFAssetResponses(cpfCtx *CPFContext, yearIndex int, month int) []CPFAssetResponse {
	if cpfCtx == nil || cpfCtx.Balances == nil {
		return []CPFAssetResponse{}
	}

	balances := cpfCtx.Balances
	return []CPFAssetResponse{
		{
			ID:         "cpf-oa",
			ParentID:   "cpf",
			Name:       "CPF Ordinary Account",
			Category:   "cpf",
			Balance:    *balances.AccumulatedOA.Round(0),
			AdjBalance: *balances.AccumulatedOA.Round(0),
			ItemType:   "cpf_account",
			StartDate:  "",
			StartYear:  yearIndex,
			StartMonth: month,
		},
		{
			ID:         "cpf-sa",
			ParentID:   "cpf",
			Name:       "CPF Special Account",
			Category:   "cpf",
			Balance:    *balances.AccumulatedSA.Round(0),
			AdjBalance: *balances.AccumulatedSA.Round(0),
			ItemType:   "cpf_account",
			StartDate:  "",
			StartYear:  yearIndex,
			StartMonth: month,
		},
		{
			ID:         "cpf-ma",
			ParentID:   "cpf",
			Name:       "CPF MediSave Account",
			Category:   "cpf",
			Balance:    *balances.AccumulatedMA.Round(0),
			AdjBalance: *balances.AccumulatedMA.Round(0),
			ItemType:   "cpf_account",
			StartDate:  "",
			StartYear:  yearIndex,
			StartMonth: month,
		},
		{
			ID:         "cpf-ra",
			ParentID:   "cpf",
			Name:       "CPF Retirement Account",
			Category:   "cpf",
			Balance:    *balances.AccumulatedRA.Round(0),
			AdjBalance: *balances.AccumulatedRA.Round(0),
			ItemType:   "cpf_account",
			StartDate:  "",
			StartYear:  yearIndex,
			StartMonth: month,
		},
	}
}

// buildMonthDetailResponse creates a detailed response for a single month
func buildMonthDetailResponse(
	calendarMonthIdx int,
	date time.Time,
	baseYear int,
	data EffectiveRows,
	itemStates ItemStateMap,
	cashAccumulator *decimal.Decimal,
	netSavings *decimal.Decimal,
	netCashFlow *decimal.Decimal,
	netInvestments *decimal.Decimal,
	cpfContributions map[string]*cpfProcessor.ContributionResult,
	cpfCtx *CPFContext,
) MonthDetailResponse {
	yearIndex := date.Year() - baseYear
	month := int(date.Month())

	// Build all item responses
	nonCashAssets, nonCashTotal := buildNonCashAssetResponses(data.NonCashAssets, itemStates, date)
	investments, investmentTotal := buildInvestmentResponses(data.Investments, itemStates, date)
	cashAssets, cashTotal, accumulatorID := buildCashAssetResponses(data.CashAssets, itemStates, date, cashAccumulator)
	liabilities, liabilityTotal := buildLiabilityResponses(data.Liabilities, itemStates, date)
	incomes := buildIncomeResponses(data.Incomes, itemStates, date, cpfContributions)
	expenses := buildExpenseResponses(data.Expenses, itemStates, date)
	cpfContributionResponses := buildCPFContributionResponses(data.Incomes, itemStates, date, cpfContributions)

	// Build CPF assets from accumulated balances
	cpfAssets := buildCPFAssetResponses(cpfCtx, yearIndex, month)
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
		AllMonthsIndex:       calendarMonthIdx,
		NonCashAssets:        nonCashAssets,
		Investments:          investments,
		CashAssets:           cashAssets,
		CPFAssets:            cpfAssets,
		Liabilities:          liabilities,
		Income:               incomes,
		CPFContributions:     cpfContributionResponses,
		Expenses:             expenses,
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

// MonthlyContext holds all state needed to process a single month
type MonthlyContext struct {
	Data              EffectiveRows
	ItemStates        ItemStateMap
	State             map[string]*decimal.Decimal
	Registry          *growth.Registry
	CPFCtx            *CPFContext
	BaseYear          int
	CashAccumulator   *decimal.Decimal
	IncomeAllocations []repo.IncomeAllocation
}

// processMonth handles all calculations for a single month and returns the response
// isAnchorMonth indicates if this is the first month (anchor month) where we show starting balances
// without applying cash flow accumulation or investment allocation side effects
func processMonth(mctx *MonthlyContext, calendarMonthIdx int, currentDate time.Time, isAnchorMonth bool) MonthDetailResponse {
	// Reset CPF YTD at year boundaries
	mctx.CPFCtx.ResetYTDIfNewYear(currentDate, calendarMonthIdx)

	// Apply growth to all financial items
	growthCtx := &GrowthContext{
		Registry:    mctx.Registry,
		State:       mctx.State,
		Month:       calendarMonthIdx + 1,
		MonthOfYear: int(currentDate.Month()),
		Date:        currentDate,
	}
	applyAllGrowth(mctx.Data, growthCtx)

	// Process CPF contributions
	employeeCPF, cpfContributions := mctx.CPFCtx.ProcessIncomes(mctx.Data.Incomes, mctx.State, currentDate)

	// Calculate cash flow
	// In anchor month, pass empty allocations to prevent adding to investment balances
	var netSavings, netCashFlow, netInvestments *decimal.Decimal
	if isAnchorMonth {
		// Don't apply investment allocations in anchor month
		netSavings, netCashFlow, netInvestments = calculateNetCashFlow(mctx.Data, mctx.State, currentDate, employeeCPF, nil)
	} else {
		netSavings, netCashFlow, netInvestments = calculateNetCashFlow(mctx.Data, mctx.State, currentDate, employeeCPF, mctx.IncomeAllocations)
	}

	// Accumulate cash flow (skip in anchor month - starting balances only)
	if !isAnchorMonth {
		mctx.CashAccumulator = mctx.CashAccumulator.Add(netCashFlow)
	}

	// Sync state and build response
	syncStateToItemStates(mctx.State, mctx.ItemStates)
	return buildMonthDetailResponse(
		calendarMonthIdx, currentDate, mctx.BaseYear, mctx.Data, mctx.ItemStates,
		mctx.CashAccumulator, netSavings, netCashFlow, netInvestments, cpfContributions, mctx.CPFCtx,
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

	anchorStart, anchorEnd := buildAnchorRange(opts, sgData.Rows)

	startMonthIndex := (int(anchorStart.Month()) - 1)

	mctx := &MonthlyContext{
		Data:              sgData.Rows,
		ItemStates:        initializeItemStates(sgData.Rows, anchorStart.Year()),
		Registry:          growth.NewRegistry(),
		CPFCtx:            NewCPFContext(sgData.CPFAccount),
		BaseYear:          anchorStart.Year(),
		CashAccumulator:   decimal.Zero(),
		IncomeAllocations: sgData.IncomeAllocations,
	}
	mctx.State = extractBalanceMap(mctx.ItemStates)

	totalMonths := common.MonthsBetween(anchorStart, anchorEnd)
	resultMonths := make([]MonthDetailResponse, 0, totalMonths)

	for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
		currentDate := anchorStart.AddDate(0, monthIdx, 0)
		calendarMonthIdx := startMonthIndex + monthIdx
		isAnchorMonth := monthIdx == 0
		resultMonths = append(resultMonths, processMonth(mctx, calendarMonthIdx, currentDate, isAnchorMonth))
	}

	return TimelineV2Response{Months: resultMonths}, nil
}

// loadFinancialData loads all financial data for the given user and date range
func (s *Service) loadFinancialData(ctx context.Context, userID string, opts TimelineOptions) (SGFinancialDataRows, error) {
	endDateExclusive := opts.EndDate.AddDate(0, 1, 0)
	dateOpts := repo.DateRangeOptions{
		StartDate: &opts.StartDate,
		EndDate:   &endDateExclusive,
	}
	sgData, err := s.loadEffectiveRows(ctx, userID, dateOpts, repo.PaginationParams{})
	if err != nil {
		return SGFinancialDataRows{}, fmt.Errorf("failed to load financial data: %w", err)
	}
	return sgData, nil
}

// GetTimeline generates a timeline chart response for the given user and resolution
func (s *Service) GetTimeline(
	ctx context.Context,
	userID string,
	resolution string,
) (TimelineAnnualChartResponse, error) {
	// TODO: Implement timeline calculation logic
	// This is a stub - you need to implement:
	// 1. Call loadEffectiveRows to get all financial data
	// 2. Determine time range (start to end)
	// 3. Calculate net worth for each year/month
	// 4. Return TimelineAnnualChartResponse

	return TimelineAnnualChartResponse{
		Resolution:  resolution,
		Years:       []TimelineYearlySummary{},
		Months:      []TimelineMonthlySummary{},
		ScenarioIds: []string{},
	}, nil
}
