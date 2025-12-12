package timeline_v2

import (
	"context"
	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
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

func (s *Service) computeFinancialSnapshot(ctx context.Context, userID string) {

}
