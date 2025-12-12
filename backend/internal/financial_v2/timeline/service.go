package timeline_v2

import (
	"context"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"fmt"
	"time"

	"golang.org/x/sync/errgroup"
)

type Service struct {
	store Store
}

// NewService creates a new timeline service
func NewService(store Store) *Service {
	return &Service{store: store}
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

type FinancialDataRow struct {
	ID         string
	ParentID   string
	Name       string
	Category   string
	Amount     decimal.Decimal
	Frequency  Frequency
	StartDate  time.Time
	EndDate    *time.Time
	ItemType   FinancialDataType
	GrowthRate decimal.Decimal // Per-item growth rate (percentage)
}

// EffectiveRows holds all financial data organized by type
type EffectiveRows struct {
	NonCashAssets []FinancialDataRow
	CashAssets    []FinancialDataRow
	Liabilities   []FinancialDataRow
	Incomes       []FinancialDataRow
	Expenses      []FinancialDataRow
}

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
			Frequency:  FrequencyAnnual, // Assets don't have frequency
			StartDate:  a.StartDate,
			EndDate:    a.EndDate,
			ItemType:   FinNonCashAsset,
			GrowthRate: a.AnnualGrowthRate,
		})
	}
	return rows
}

// transformCashAssets converts repository.CashAsset to FinancialDataRow
func transformCashAssets(assets []repo.CashAsset) []FinancialDataRow {
	rows := make([]FinancialDataRow, 0, len(assets))
	for _, a := range assets {
		rows = append(rows, FinancialDataRow{
			ID:         a.ID,
			ParentID:   a.ID, // Cash accounts use ID as ParentID
			Name:       a.Name,
			Category:   a.AccountType,
			Amount:     a.Balance,
			Frequency:  FrequencyAnnual,
			StartDate:  a.StartDate,
			EndDate:    a.EndDate,
			ItemType:   FinCashAsset,
			GrowthRate: a.InterestRate,
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
			Frequency:  FrequencyAnnual,
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
			ID:         i.ID,
			ParentID:   i.ParentID,
			Name:       i.Source, // Income uses "Source" as name
			Category:   i.Category,
			Amount:     i.Amount,
			Frequency:  Frequency(i.Frequency), // Keep actual frequency
			StartDate:  i.StartDate,
			EndDate:    i.EndDate,
			ItemType:   FinIncome,
			GrowthRate: i.GrowthRate,
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

func (s *Service) loadEffectiveRows(
	ctx context.Context,
	userID string,
	dateOpts repo.DateRangeOptions,
	paginationOpts repo.PaginationParams,
) (EffectiveRows, error) {
	var (
		nonCashAssets repo.PaginatedResult[repo.NonCashAsset]
		cashAssets    repo.PaginatedResult[repo.CashAsset]
		liabilities   repo.PaginatedResult[repo.Liability]
		incomes       repo.PaginatedResult[repo.Income]
		expenses      repo.PaginatedResult[repo.Expense]
	)

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		nonCashAssets, err = s.store.ListNonCashAssets(gctx, userID, dateOpts, paginationOpts)
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

	if err := g.Wait(); err != nil {
		return EffectiveRows{}, err
	}

	// Transform repository types to FinancialDataRow
	return EffectiveRows{
		NonCashAssets: transformNonCashAssets(nonCashAssets.Data),
		CashAssets:    transformCashAssets(cashAssets.Data),
		Liabilities:   transformLiabilities(liabilities.Data),
		Incomes:       transformIncomes(incomes.Data),
		Expenses:      transformExpenses(expenses.Data),
	}, nil
}

// ComputeFinancialSnapshot calculates monthly snapshots over 420 months (35 years)
func (s *Service) ComputeFinancialSnapshot(
	ctx context.Context,
	userID string,
) ([]MonthlySnapshot, error) {
	// Use empty options to fetch all data
	dateOpts := repo.DateRangeOptions{}
	paginationOpts := repo.PaginationParams{}

	financialData, err := s.loadEffectiveRows(ctx, userID, dateOpts, paginationOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to load financial data: %w", err)
	}

	baseYear := time.Now().Year()
	totalMonths := 420 // 35 years

	registry := growth.NewRegistry()

	// Initialize state for each row
	state := initializeState(financialData)
	cashAccumulator := decimal.Zero()
	snapshots := make([]MonthlySnapshot, 0, totalMonths)

	// Process each month
	for month := 1; month <= totalMonths; month++ {
		monthOfYear := ((month - 1) % 12) + 1
		currentDate := time.Date(baseYear, time.January, 1, 0, 0, 0, 0, time.UTC).AddDate(0, month-1, 0)

		/*
		* review: I think we should make registry a singleton, it repeats too much
		* Also we should implement constants for the different growth types
		 */

		// Apply growth to incomes and expenses
		applyGrowth(financialData.Incomes, state, registry, "annual_step", month, monthOfYear, currentDate)
		applyGrowth(financialData.Expenses, state, registry, "annual_step", month, monthOfYear, currentDate)

		// Calculate net cash flow and update accumulator
		netCashFlow := calculateNetCashFlow(financialData, state, currentDate)
		cashAccumulator, _ = cashAccumulator.Add(netCashFlow)

		// Apply growth to assets and liabilities
		applyGrowth(financialData.NonCashAssets, state, registry, "monthly_compound", month, monthOfYear, currentDate)
		applyGrowth(financialData.CashAssets, state, registry, "monthly_compound", month, monthOfYear, currentDate)
		applyGrowth(financialData.Liabilities, state, registry, "monthly_compound", month, monthOfYear, currentDate)

		// Calculate snapshot
		snapshot := calculateSnapshot(month, currentDate, financialData, state, cashAccumulator)
		snapshots = append(snapshots, snapshot)
	}

	return snapshots, nil
}

// initializeState creates initial state map for all financial rows
func initializeState(data EffectiveRows) map[string]*decimal.Decimal {
	state := make(map[string]*decimal.Decimal)

	allRows := [][]FinancialDataRow{
		data.NonCashAssets,
		data.CashAssets,
		data.Liabilities,
		data.Incomes,
		data.Expenses,
	}

	for _, rows := range allRows {
		for _, row := range rows {
			amount := row.Amount
			state[row.ID] = &amount
		}
	}

	return state
}

// applyGrowth applies growth strategy to active rows
func applyGrowth(
	rows []FinancialDataRow,
	state map[string]*decimal.Decimal,
	registry *growth.Registry,
	strategyName string,
	month, monthOfYear int,
	currentDate time.Time,
) {
	strategy, _ := registry.Get(strategyName)
	for _, row := range rows {
		if !isActiveInMonth(row, currentDate) {
			continue
		}
		params := growth.Params{AnnualRatePct: &row.GrowthRate}
		state[row.ID] = strategy.Apply(state[row.ID], params, month, monthOfYear)
	}
}

// calculateNetCashFlow computes income minus expenses for active rows
func calculateNetCashFlow(
	data EffectiveRows,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
) *decimal.Decimal {
	income := decimal.Zero()
	expense := decimal.Zero()

	for _, row := range data.Incomes {
		if isActiveInMonth(row, currentDate) {
			income, _ = income.Add(state[row.ID])
		}
	}

	for _, row := range data.Expenses {
		if isActiveInMonth(row, currentDate) {
			expense, _ = expense.Add(state[row.ID])
		}
	}

	netFlow, _ := income.Sub(expense)
	return netFlow
}

// calculateSnapshot creates a snapshot for the current month
func calculateSnapshot(
	month int,
	date time.Time,
	data EffectiveRows,
	state map[string]*decimal.Decimal,
	cashAccumulator *decimal.Decimal,
) MonthlySnapshot {
	totalAssets := decimal.Zero()
	totalLiabilities := decimal.Zero()

	for _, row := range data.NonCashAssets {
		if isActiveInMonth(row, date) {
			totalAssets, _ = totalAssets.Add(state[row.ID])
		}
	}

	for _, row := range data.CashAssets {
		if isActiveInMonth(row, date) {
			totalAssets, _ = totalAssets.Add(state[row.ID])
		}
	}

	totalAssets, _ = totalAssets.Add(cashAccumulator)

	for _, row := range data.Liabilities {
		if isActiveInMonth(row, date) {
			totalLiabilities, _ = totalLiabilities.Add(state[row.ID])
		}
	}

	netWorth, _ := totalAssets.Sub(totalLiabilities)

	return MonthlySnapshot{
		Month:            month,
		Date:             date,
		NetWorth:         netWorth,
		TotalAssets:      totalAssets,
		TotalLiabilities: totalLiabilities,
		CashBalance:      cashAccumulator,
	}
}

// isActiveInMonth checks if a financial row is active on the given date
func isActiveInMonth(row FinancialDataRow, date time.Time) bool {
	if date.Before(row.StartDate) {
		return false
	}
	if row.EndDate != nil && date.After(*row.EndDate) {
		return false
	}
	return true
}

// MonthlySnapshot represents financial state at a point in time
type MonthlySnapshot struct {
	Month            int
	Date             time.Time
	NetWorth         *decimal.Decimal
	TotalAssets      *decimal.Decimal
	TotalLiabilities *decimal.Decimal
	CashBalance      *decimal.Decimal
}
