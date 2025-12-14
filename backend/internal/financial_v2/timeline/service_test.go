package timeline_v2

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

func strPtr(value string) *string {
	return &value
}

// mockStore implements the Store interface for testing
type mockStore struct {
	nonCashAssets []repo.NonCashAsset
	investments   []repo.Investment
	cashAssets    []repo.CashAsset
	liabilities   []repo.Liability
	incomes       []repo.Income
	expenses      []repo.Expense
	incomeAllocs  []repo.IncomeAllocation
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
	return m.incomeAllocs, nil
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

func TestComputeFinancialSnapshot_AnchorMonthAllocationsReportedOnly(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &mockStore{
		investments: []repo.Investment{
			{
				ID:               "inv-1",
				ParentID:         "inv-1",
				Name:             "ETF",
				Category:         "Equities",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("0"),
				StartDate:        startDate,
			},
		},
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
		incomeAllocs: []repo.IncomeAllocation{
			{
				ID:                 "alloc-1",
				IncomeID:           "income-1",
				TargetInvestmentID: strPtr("inv-1"),
				AllocationType:     "percentage",
				AllocationValue:    *decimal.MustFromString("10"), // 10% of income
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   startDate, // Anchor month only
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 1 {
		t.Fatalf("expected 1 month, got %d", len(result.Months))
	}

	month := result.Months[0]
	expectedAlloc := decimal.MustFromString("500") // 10% of 5000 income
	if month.NetInvestments.Cmp(expectedAlloc) != 0 {
		t.Fatalf("expected net investments %s, got %s", expectedAlloc.String(), month.NetInvestments.String())
	}

	// Investment balance should not be incremented in anchor month
	if len(month.Investments) != 1 {
		t.Fatalf("expected 1 investment, got %d", len(month.Investments))
	}
	if month.Investments[0].Balance.Cmp(decimal.MustFromString("10000")) != 0 {
		t.Fatalf("anchor month should not apply allocations to balances; expected 10000, got %s", month.Investments[0].Balance.String())
	}

	// Net cash should always be net of investments, even on anchor month
	// NetCash = NetSavings - NetInvestments = 5000 - 500 = 4500
	expectedNetCash := decimal.MustFromString("4500")
	if month.NetCash.Cmp(expectedNetCash) != 0 {
		t.Fatalf("expected net cash %s (net of investments), got %s", expectedNetCash.String(), month.NetCash.String())
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

func TestComputeFinancialSnapshot_NetCashAlwaysNetOfInvestments(t *testing.T) {
	// Test that NetCash is always net of investments, regardless of whether it's anchor month
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC) // 3 months

	store := &mockStore{
		investments: []repo.Investment{
			{
				ID:               "inv-1",
				ParentID:         "inv-1",
				Name:             "ETF",
				Category:         "Equities",
				CurrentValue:     *decimal.MustFromString("10000"),
				AnnualGrowthRate: *decimal.MustFromString("0"),
				StartDate:        startDate,
			},
		},
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
				Amount:     *decimal.MustFromString("1000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		incomeAllocs: []repo.IncomeAllocation{
			{
				ID:                 "alloc-1",
				IncomeID:           "income-1",
				TargetInvestmentID: strPtr("inv-1"),
				AllocationType:     "fixed",
				AllocationValue:    *decimal.MustFromString("500"), // Fixed $500/month
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

	if len(result.Months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(result.Months))
	}

	// NetSavings = Income - Expenses = 5000 - 1000 = 4000
	// NetInvestments = 500 (fixed allocation)
	// NetCash = NetSavings - NetInvestments = 4000 - 500 = 3500
	expectedNetSavings := decimal.MustFromString("4000")
	expectedNetInvestments := decimal.MustFromString("500")
	expectedNetCash := decimal.MustFromString("3500")

	for i, month := range result.Months {
		if month.NetSavings.Cmp(expectedNetSavings) != 0 {
			t.Errorf("month %d: expected net savings %s, got %s", i+1, expectedNetSavings.String(), month.NetSavings.String())
		}
		if month.NetInvestments.Cmp(expectedNetInvestments) != 0 {
			t.Errorf("month %d: expected net investments %s, got %s", i+1, expectedNetInvestments.String(), month.NetInvestments.String())
		}
		if month.NetCash.Cmp(expectedNetCash) != 0 {
			t.Errorf("month %d: expected net cash %s (net of investments), got %s", i+1, expectedNetCash.String(), month.NetCash.String())
		}
	}

	// Investment balance should only increase after the anchor month
	// Month 1 (anchor): 10000 (no allocation applied to balance)
	// Month 2: 10000 + 500 = 10500
	// Month 3: 10500 + 500 = 11000
	expectedBalances := []string{"10000", "10500", "11000"}
	for i, month := range result.Months {
		if len(month.Investments) != 1 {
			t.Fatalf("month %d: expected 1 investment, got %d", i+1, len(month.Investments))
		}
		expected := decimal.MustFromString(expectedBalances[i])
		if month.Investments[0].Balance.Cmp(expected) != 0 {
			t.Errorf("month %d: expected investment balance %s, got %s", i+1, expected.String(), month.Investments[0].Balance.String())
		}
	}

	t.Logf("Month 1: NetSavings=%s, NetInvestments=%s, NetCash=%s, InvestmentBalance=%s",
		result.Months[0].NetSavings.String(), result.Months[0].NetInvestments.String(),
		result.Months[0].NetCash.String(), result.Months[0].Investments[0].Balance.String())
	t.Logf("Month 2: NetSavings=%s, NetInvestments=%s, NetCash=%s, InvestmentBalance=%s",
		result.Months[1].NetSavings.String(), result.Months[1].NetInvestments.String(),
		result.Months[1].NetCash.String(), result.Months[1].Investments[0].Balance.String())
	t.Logf("Month 3: NetSavings=%s, NetInvestments=%s, NetCash=%s, InvestmentBalance=%s",
		result.Months[2].NetSavings.String(), result.Months[2].NetInvestments.String(),
		result.Months[2].NetCash.String(), result.Months[2].Investments[0].Balance.String())
}

func TestComputeFinancialSnapshot_OpenEndedLiabilityWithLinkedExpense(t *testing.T) {
	// Test that open-ended liabilities (no end date) with linked expenses
	// have their balance decrease month-over-month based on expense payments
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC) // 3 months

	liabilityID := "liability-1"

	store := &mockStore{
		liabilities: []repo.Liability{
			{
				ID:              liabilityID,
				ParentID:        liabilityID,
				Name:            "Credit Card",
				Category:        "Debt",
				CurrentBalance:  *decimal.MustFromString("10000"), // $10,000 balance
				InterestRateAPR: *decimal.MustFromString("18"),    // 18% APR
				MinimumPayment:  *decimal.MustFromString("200"),
				StartDate:       startDate,
				EndDate:         nil, // Open-ended (no end date)
			},
		},
		expenses: []repo.Expense{
			{
				ID:                "expense-1",
				ParentID:          "expense-1",
				Payee:             "Credit Card Payment",
				Amount:            *decimal.MustFromString("500"), // $500/month payment
				Frequency:         "monthly",
				StartDate:         startDate,
				Category:          "Debt Payment",
				GrowthRate:        *decimal.MustFromString("0"),
				SourceLiabilityID: &liabilityID, // Linked to liability
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

	if len(result.Months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(result.Months))
	}

	// Verify liability balance decreases each month
	// Month 1: Balance = 10000 (anchor month, no change)
	// Month 2: Interest = 10000 * (18/100/12) = 150, Principal = 500 - 150 = 350, Balance = 10000 - 350 = 9650
	// Month 3: Interest = 9650 * 0.015 = 144.75, Principal = 500 - 144.75 = 355.25, Balance = 9650 - 355.25 = 9294.75

	for i, month := range result.Months {
		if len(month.Liabilities) != 1 {
			t.Fatalf("month %d: expected 1 liability, got %d", i+1, len(month.Liabilities))
		}
		t.Logf("Month %d: Liability Balance = %s", i+1, month.Liabilities[0].Balance.String())
	}

	// Verify balance decreases month-over-month
	month1Balance := result.Months[0].Liabilities[0].Balance
	month2Balance := result.Months[1].Liabilities[0].Balance
	month3Balance := result.Months[2].Liabilities[0].Balance

	// Month 1 should be the starting balance (10000)
	expectedMonth1 := decimal.MustFromString("10000")
	if month1Balance.Cmp(expectedMonth1) != 0 {
		t.Errorf("month 1: expected balance %s, got %s", expectedMonth1.String(), month1Balance.String())
	}

	// Month 2 should be less than month 1
	if month2Balance.Cmp(&month1Balance) >= 0 {
		t.Errorf("month 2 balance (%s) should be less than month 1 balance (%s)",
			month2Balance.String(), month1Balance.String())
	}

	// Month 3 should be less than month 2
	if month3Balance.Cmp(&month2Balance) >= 0 {
		t.Errorf("month 3 balance (%s) should be less than month 2 balance (%s)",
			month3Balance.String(), month2Balance.String())
	}

	// Verify approximate values
	// Month 2: ~9650
	expectedMonth2Min := decimal.MustFromString("9640")
	expectedMonth2Max := decimal.MustFromString("9660")
	if month2Balance.Cmp(expectedMonth2Min) < 0 || month2Balance.Cmp(expectedMonth2Max) > 0 {
		t.Errorf("month 2: expected balance between %s and %s, got %s",
			expectedMonth2Min.String(), expectedMonth2Max.String(), month2Balance.String())
	}
}

// TestComputeFinancialSnapshot_LiabilityGrowsWhenPaymentLessThanInterest verifies that
// when the linked expense payment is less than the monthly interest, the liability
// balance grows (unpaid interest accumulates).
func TestComputeFinancialSnapshot_LiabilityGrowsWhenPaymentLessThanInterest(t *testing.T) {
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2024, 3, 31, 0, 0, 0, 0, time.UTC)
	liabilityID := "liability-cc"

	store := &mockStore{
		liabilities: []repo.Liability{
			{
				ID:              liabilityID,
				ParentID:        liabilityID,
				Name:            "High Interest Debt",
				Category:        "Debt",
				CurrentBalance:  *decimal.MustFromString("10000"), // $10,000 balance
				InterestRateAPR: *decimal.MustFromString("36"),    // 36% APR = 3% monthly
				MinimumPayment:  *decimal.MustFromString("100"),
				StartDate:       startDate,
				EndDate:         nil, // Open-ended
			},
		},
		expenses: []repo.Expense{
			{
				ID:                "expense-1",
				ParentID:          "expense-1",
				Payee:             "Minimum Payment",
				Amount:            *decimal.MustFromString("100"), // $100/month - less than interest!
				Frequency:         "monthly",
				StartDate:         startDate,
				Category:          "Debt Payment",
				GrowthRate:        *decimal.MustFromString("0"),
				SourceLiabilityID: &liabilityID,
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

	if len(result.Months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(result.Months))
	}

	// Verify liability balance GROWS each month because payment ($100) < interest ($300)
	// Month 1: Balance = 10000 (anchor month)
	// Month 2: Interest = 10000 * (36/100/12) = 300, Principal = 100 - 300 = -200, Balance = 10000 - (-200) = 10200
	// Month 3: Interest = 10200 * 0.03 = 306, Principal = 100 - 306 = -206, Balance = 10200 - (-206) = 10406

	for i, month := range result.Months {
		if len(month.Liabilities) != 1 {
			t.Fatalf("month %d: expected 1 liability, got %d", i+1, len(month.Liabilities))
		}
		t.Logf("Month %d: Liability Balance = %s", i+1, month.Liabilities[0].Balance.String())
	}

	month1Balance := result.Months[0].Liabilities[0].Balance
	month2Balance := result.Months[1].Liabilities[0].Balance
	month3Balance := result.Months[2].Liabilities[0].Balance

	// Month 1 should be starting balance
	expectedMonth1 := decimal.MustFromString("10000")
	if month1Balance.Cmp(expectedMonth1) != 0 {
		t.Errorf("month 1: expected balance %s, got %s", expectedMonth1.String(), month1Balance.String())
	}

	// Month 2 should be GREATER than month 1 (balance grows due to unpaid interest)
	if month2Balance.Cmp(&month1Balance) <= 0 {
		t.Errorf("month 2 balance (%s) should be greater than month 1 balance (%s) when payment < interest",
			month2Balance.String(), month1Balance.String())
	}

	// Month 3 should be GREATER than month 2
	if month3Balance.Cmp(&month2Balance) <= 0 {
		t.Errorf("month 3 balance (%s) should be greater than month 2 balance (%s)",
			month3Balance.String(), month2Balance.String())
	}

	// Verify approximate value for month 2: ~10200
	expectedMonth2Min := decimal.MustFromString("10190")
	expectedMonth2Max := decimal.MustFromString("10210")
	if month2Balance.Cmp(expectedMonth2Min) < 0 || month2Balance.Cmp(expectedMonth2Max) > 0 {
		t.Errorf("month 2: expected balance between %s and %s, got %s",
			expectedMonth2Min.String(), expectedMonth2Max.String(), month2Balance.String())
	}
}

// TestComputeFinancialSnapshot_FixedTermLiabilityPastEndDate verifies that
// when a fixed-term liability passes its end date with an outstanding balance,
// the balance carries over unchanged (doesn't become zero).
func TestComputeFinancialSnapshot_FixedTermLiabilityPastEndDate(t *testing.T) {
	// Loan term ends in Jan 2024 (month 1, the anchor month)
	// In months 2+, the loan is past its end date but balance should carry over unchanged
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	loanEndDate := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC) // Loan term ends mid-Jan (anchor month)
	timelineEndDate := time.Date(2024, 4, 30, 0, 0, 0, 0, time.UTC)
	liabilityID := "liability-past-term"

	store := &mockStore{
		liabilities: []repo.Liability{
			{
				ID:              liabilityID,
				ParentID:        liabilityID,
				Name:            "Past Term Loan",
				Category:        "Loan",
				CurrentBalance:  *decimal.MustFromString("5000"), // $5,000 still owed
				InterestRateAPR: *decimal.MustFromString("12"),   // 12% APR
				MinimumPayment:  *decimal.MustFromString("500"),
				StartDate:       startDate,
				EndDate:         &loanEndDate, // Loan term ends in anchor month
			},
		},
	}

	service := NewService(store)
	opts := TimelineOptions{
		StartDate: startDate,
		EndDate:   timelineEndDate,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 4 {
		t.Fatalf("expected 4 months, got %d", len(result.Months))
	}

	// All months should have the liability with the same balance (carries over unchanged)
	// Month 1: anchor month, no mutations, balance = 5000
	// Month 2+: past end date, balance carries over unchanged (no payments processed, but debt doesn't disappear)
	expectedBalance := decimal.MustFromString("5000")

	for i, month := range result.Months {
		if len(month.Liabilities) != 1 {
			t.Fatalf("month %d: expected 1 liability, got %d", i+1, len(month.Liabilities))
		}
		balance := month.Liabilities[0].Balance
		t.Logf("Month %d: Liability Balance = %s", i+1, balance.String())

		// Balance should NOT be zero - user still owes money
		if balance.IsZero() {
			t.Errorf("month %d: balance should not be zero - outstanding debt should carry over", i+1)
		}

		// Balance should remain unchanged at $5000 (no payments processed past end date)
		if balance.Cmp(expectedBalance) != 0 {
			t.Errorf("month %d: expected balance %s, got %s (balance should carry over unchanged past end date)",
				i+1, expectedBalance.String(), balance.String())
		}
	}
}
