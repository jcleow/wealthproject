package timeline_v2

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// mockStore implements the Store interface for testing
type mockStore struct {
	nonCashAssets []repo.NonCashAsset
	investments   []repo.Investment
	cashAssets    []repo.CashAsset
	liabilities   []repo.Liability
	incomes       []repo.Income
	expenses      []repo.Expense
}

func (m *mockStore) ListNonCashAssets(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.NonCashAsset], error) {
	return repo.PaginatedResult[repo.NonCashAsset]{Data: m.nonCashAssets, Count: len(m.nonCashAssets)}, nil
}

func (m *mockStore) ListInvestments(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.Investment], error) {
	return repo.PaginatedResult[repo.Investment]{Data: m.investments, Count: len(m.investments)}, nil
}

func (m *mockStore) ListCashAssets(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.CashAsset], error) {
	return repo.PaginatedResult[repo.CashAsset]{Data: m.cashAssets, Count: len(m.cashAssets)}, nil
}

func (m *mockStore) ListLiabilities(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.Liability], error) {
	return repo.PaginatedResult[repo.Liability]{Data: m.liabilities, Count: len(m.liabilities)}, nil
}

func (m *mockStore) ListIncomes(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.Income], error) {
	return repo.PaginatedResult[repo.Income]{Data: m.incomes, Count: len(m.incomes)}, nil
}

func (m *mockStore) ListExpenses(ctx context.Context, userID string, dateOpts repo.DateRangeOptions, paginationOpts repo.PaginationParams) (repo.PaginatedResult[repo.Expense], error) {
	return repo.PaginatedResult[repo.Expense]{Data: m.expenses, Count: len(m.expenses)}, nil
}

func (m *mockStore) GetCPFAccount(ctx context.Context, userID string) (*repo.CPFAccount, error) {
	return nil, nil
}

func (m *mockStore) ListAllIncomeAllocations(ctx context.Context, userID string) ([]repo.IncomeAllocation, error) {
	return nil, nil
}

func TestComputeFinancialSnapshot_SingleMonth_NoGrowth(t *testing.T) {
	// Test that month 1 has no growth (arrears)
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &mockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Investment Portfolio",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("7"),
				StartDate:        startDate,
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   startDate, // Single month
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 1 {
		t.Fatalf("expected 1 month, got %d", len(result.Months))
	}

	month := result.Months[0]
	if month.Year != 2025 || month.Month != 1 {
		t.Errorf("expected year 2025 month 1, got year %d month %d", month.Year, month.Month)
	}

	if len(month.NonCashAssets) != 1 {
		t.Fatalf("expected 1 non-cash asset, got %d", len(month.NonCashAssets))
	}

	// In month 1, no growth should be applied (arrears)
	balance := month.NonCashAssets[0].Balance
	expected := decimal.MustFromString("10000")
	if balance.Cmp(expected) != 0 {
		t.Errorf("expected balance %s in month 1 (no growth), got %s", expected.String(), balance.String())
	}
}

func TestComputeFinancialSnapshot_TwoMonths_GrowthStartsInMonth2(t *testing.T) {
	// Test that growth starts in month 2
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC)

	store := &mockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Investment Portfolio",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("7"),
				StartDate:        startDate,
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   endDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 2 {
		t.Fatalf("expected 2 months, got %d", len(result.Months))
	}

	// Month 1: no growth
	month1Balance := result.Months[0].NonCashAssets[0].Balance
	expected1 := decimal.MustFromString("10000")
	if month1Balance.Cmp(expected1) != 0 {
		t.Errorf("month 1: expected balance %s (no growth), got %s", expected1.String(), month1Balance.String())
	}

	// Month 2: first growth applied
	// 10000 * (1.07)^(1/12) ≈ 10056.54
	month2Balance := result.Months[1].NonCashAssets[0].Balance
	expectedMin := decimal.MustFromString("10055")
	expectedMax := decimal.MustFromString("10058")

	if month2Balance.Cmp(expectedMin) < 0 || month2Balance.Cmp(expectedMax) > 0 {
		t.Errorf("month 2: expected balance between %s and %s, got %s",
			expectedMin.String(), expectedMax.String(), month2Balance.String())
	}

	t.Logf("Month 1 balance: %s", month1Balance.String())
	t.Logf("Month 2 balance: %s", month2Balance.String())
}

func TestComputeFinancialSnapshot_13Months_FullYearGrowth(t *testing.T) {
	// Test that after 13 months, we have 12 periods of growth (full year)
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // 13 months total

	store := &mockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Investment Portfolio",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("7"),
				StartDate:        startDate,
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   endDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 13 {
		t.Fatalf("expected 13 months, got %d", len(result.Months))
	}

	// Month 13: should have 12 periods of growth = full 7% annual
	// 10000 * 1.07 = 10700
	month13Balance := result.Months[12].NonCashAssets[0].Balance
	expectedMin := decimal.MustFromString("10698")
	expectedMax := decimal.MustFromString("10702")

	if month13Balance.Cmp(expectedMin) < 0 || month13Balance.Cmp(expectedMax) > 0 {
		t.Errorf("month 13: expected balance between %s and %s (full year growth), got %s",
			expectedMin.String(), expectedMax.String(), month13Balance.String())
	}

	t.Logf("Month 13 balance: %s (expected ~10700)", month13Balance.String())
}

func TestComputeFinancialSnapshot_NetCashFlow(t *testing.T) {
	// Test net cash flow calculation (income - expenses)
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &mockStore{
		incomes: []repo.Income{
			{
				ID:         "income-1",
				ParentID:   "income-1",
				Source:     "Salary",
				Amount:     *decimal.MustFromString("5000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         "expense-1",
				ParentID:   "expense-1",
				Payee:      "Rent",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   startDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Net savings = income - expenses = 5000 - 2000 = 3000
	netSavings := result.Months[0].NetSavings
	expected := decimal.MustFromString("3000")

	if netSavings.Cmp(expected) != 0 {
		t.Errorf("expected net savings %s, got %s", expected.String(), netSavings.String())
	}

	// Net cash should accumulate
	netCash := result.Months[0].NetCash
	if netCash.Cmp(expected) != 0 {
		t.Errorf("expected net cash %s, got %s", expected.String(), netCash.String())
	}
}

func TestComputeFinancialSnapshot_NetWorth(t *testing.T) {
	// Test net worth = assets - liabilities
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &mockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Investment",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("50000"),
				AnnualGrowthRate: *decimal.MustFromString("0"),
				StartDate:        startDate,
			},
		},
		cashAssets: []repo.CashAsset{
			{
				ID:           "cash-1",
				Name:         "Savings",
				Balance:      *decimal.MustFromString("10000"),
				InterestRate: *decimal.MustFromString("0"),
				StartDate:    startDate,
			},
		},
		liabilities: []repo.Liability{
			{
				ID:              "liability-1",
				ParentID:        "liability-1",
				Name:            "Loan",
				Category:        "Debt",
				CurrentBalance:  *decimal.MustFromString("20000"),
				InterestRateAPR: *decimal.MustFromString("0"),
				StartDate:       startDate,
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   startDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Net worth = (50000 + 10000) - 20000 = 40000
	netWorth := result.Months[0].NetWorth
	expected := decimal.MustFromString("40000")

	if netWorth.Cmp(expected) != 0 {
		t.Errorf("expected net worth %s, got %s", expected.String(), netWorth.String())
	}
}

func TestComputeFinancialSnapshot_GrowthOverTime(t *testing.T) {
	// Test that assets grow over multiple months
	queryStart := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	queryEnd := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC) // 3 months

	store := &mockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Investment",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("7"),
				StartDate:        queryStart,
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: queryStart,
		EndDate:   queryEnd,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(result.Months))
	}

	// Month 1: no growth (arrears)
	if len(result.Months[0].NonCashAssets) != 1 {
		t.Fatalf("month 1: expected 1 asset, got %d", len(result.Months[0].NonCashAssets))
	}
	month1Balance := result.Months[0].NonCashAssets[0].Balance
	expected := decimal.MustFromString("10000")
	if month1Balance.Cmp(expected) != 0 {
		t.Errorf("month 1: expected balance %s (no growth), got %s", expected.String(), month1Balance.String())
	}

	// Month 2: first growth
	month2Balance := result.Months[1].NonCashAssets[0].Balance
	if month2Balance.Cmp(&month1Balance) <= 0 {
		t.Errorf("month 2: expected growth from month 1, got %s", month2Balance.String())
	}

	// Month 3: more growth
	month3Balance := result.Months[2].NonCashAssets[0].Balance
	if month3Balance.Cmp(&month2Balance) <= 0 {
		t.Errorf("month 3: expected more growth than month 2, got %s", month3Balance.String())
	}

	t.Logf("Month 1: balance %s", month1Balance.String())
	t.Logf("Month 2: balance %s", month2Balance.String())
	t.Logf("Month 3: balance %s", month3Balance.String())
}

func TestComputeFinancialSnapshot_CashAccumulator(t *testing.T) {
	// Test that net cash accumulates over multiple months
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC) // 3 months

	store := &mockStore{
		incomes: []repo.Income{
			{
				ID:         "income-1",
				ParentID:   "income-1",
				Source:     "Salary",
				Amount:     *decimal.MustFromString("5000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         "expense-1",
				ParentID:   "expense-1",
				Payee:      "Rent",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   endDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Net cash flow per month = 5000 - 2000 = 3000 (constant each month)
	// NetCash is the monthly cash flow, not accumulated
	month1Cash := result.Months[0].NetCash
	month2Cash := result.Months[1].NetCash
	month3Cash := result.Months[2].NetCash

	// Each month should have the same net cash flow (monthly, not accumulated)
	expectedMonthly := decimal.MustFromString("3000")

	if month1Cash.Cmp(expectedMonthly) != 0 {
		t.Errorf("month 1: expected net cash %s, got %s", expectedMonthly.String(), month1Cash.String())
	}
	if month2Cash.Cmp(expectedMonthly) != 0 {
		t.Errorf("month 2: expected net cash %s, got %s", expectedMonthly.String(), month2Cash.String())
	}
	if month3Cash.Cmp(expectedMonthly) != 0 {
		t.Errorf("month 3: expected net cash %s, got %s", expectedMonthly.String(), month3Cash.String())
	}

	t.Logf("Month 1 net cash: %s", month1Cash.String())
	t.Logf("Month 2 net cash: %s", month2Cash.String())
	t.Logf("Month 3 net cash: %s", month3Cash.String())
}
