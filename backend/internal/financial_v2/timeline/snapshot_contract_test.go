package timeline_v2

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// fullMockStore implements the Store interface with all methods for comprehensive testing
type fullMockStore struct {
	nonCashAssets     []repo.NonCashAsset
	investments       []repo.Investment
	cashAssets        []repo.CashAsset
	liabilities       []repo.Liability
	incomes           []repo.Income
	expenses          []repo.Expense
	cpfAccount        *repo.CPFAccount
	incomeAllocations []repo.IncomeAllocation
}

func (m *fullMockStore) ListNonCashAssets(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.NonCashAsset], error) {
	return repo.PaginatedResult[repo.NonCashAsset]{Data: m.nonCashAssets, Count: len(m.nonCashAssets)}, nil
}

func (m *fullMockStore) ListInvestments(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Investment], error) {
	return repo.PaginatedResult[repo.Investment]{Data: m.investments, Count: len(m.investments)}, nil
}

func (m *fullMockStore) ListCashAssets(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.CashAsset], error) {
	return repo.PaginatedResult[repo.CashAsset]{Data: m.cashAssets, Count: len(m.cashAssets)}, nil
}

func (m *fullMockStore) ListLiabilities(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Liability], error) {
	return repo.PaginatedResult[repo.Liability]{Data: m.liabilities, Count: len(m.liabilities)}, nil
}

func (m *fullMockStore) ListIncomes(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Income], error) {
	return repo.PaginatedResult[repo.Income]{Data: m.incomes, Count: len(m.incomes)}, nil
}

func (m *fullMockStore) ListExpenses(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Expense], error) {
	return repo.PaginatedResult[repo.Expense]{Data: m.expenses, Count: len(m.expenses)}, nil
}

func (m *fullMockStore) GetCPFAccount(ctx context.Context, userID string) (*repo.CPFAccount, error) {
	return m.cpfAccount, nil
}

func (m *fullMockStore) ListCPFAccounts(ctx context.Context, userID string, dateOpts repo.DateRangeOptions) ([]repo.CPFAccount, error) {
	if m.cpfAccount != nil {
		return []repo.CPFAccount{*m.cpfAccount}, nil
	}
	return nil, nil
}

func (m *fullMockStore) ListAllIncomeAllocations(ctx context.Context, userID string) ([]repo.IncomeAllocation, error) {
	return m.incomeAllocations, nil
}

func (m *fullMockStore) GetExcludedScenarioTargetIDs(ctx context.Context, userID string) (repo.ExcludedTargets, error) {
	return repo.ExcludedTargets{}, nil
}

func (m *fullMockStore) GetExcludedPersonIDs(ctx context.Context, userID string) (map[string]struct{}, error) {
	return nil, nil
}

func (m *fullMockStore) ListIncludedScenarioEvents(ctx context.Context, userID string) ([]repo.ScenarioEvent, error) {
	return nil, nil
}

func (m *fullMockStore) ListIncludedPropertyScenarios(ctx context.Context, userID string) ([]repo.PropertyScenarioFull, error) {
	return nil, nil
}

func (m *fullMockStore) ListFundFlowRules(ctx context.Context, q repo.ListFundFlowRulesQuery) ([]repo.FundFlowRule, error) {
	return nil, nil
}

// TestSnapshotContract_AllItemTypesReturned verifies that all financial item types
// are correctly included in the snapshot response when present in the store.
// This is a critical contract test to prevent regressions when modifying the service/store layer.
func TestSnapshotContract_AllItemTypesReturned(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "nca-1",
				ParentID:         "nca-1",
				Name:             "Property",
				Category:         "Real Estate",
				CurrentValue:     *decimal.MustFromString("500000"),
				AnnualGrowthRate: *decimal.MustFromString("3"),
				StartDate:        startDate,
			},
			{
				ID:               "nca-2",
				ParentID:         "nca-2",
				Name:             "Car",
				Category:         "Vehicle",
				CurrentValue:     *decimal.MustFromString("50000"),
				AnnualGrowthRate: *decimal.MustFromString("-10"), // Depreciation
				StartDate:        startDate,
			},
		},
		investments: []repo.Investment{
			{
				ID:           "inv-1",
				ParentID:     "inv-1",
				Name:         "Stock Portfolio",
				Category:     "Equities",
				CurrentValue: *decimal.MustFromString("100000"),
				GrowthRate:   *decimal.MustFromString("7"),
				StartDate:    startDate,
			},
			{
				ID:           "inv-2",
				ParentID:     "inv-2",
				Name:         "Bond Portfolio",
				Category:     "Fixed Income",
				CurrentValue: *decimal.MustFromString("50000"),
				GrowthRate:   *decimal.MustFromString("4"),
				StartDate:    startDate,
			},
		},
		cashAssets: []repo.CashAsset{
			{
				ID:            "cash-1",
				Name:          "Savings Account",
				Balance:       *decimal.MustFromString("25000"),
				InterestRate:  *decimal.MustFromString("2.5"),
				AccountType:   "savings",
				IsAccumulator: true,
				StartDate:     startDate,
			},
			{
				ID:           "cash-2",
				Name:         "Checking Account",
				Balance:      *decimal.MustFromString("5000"),
				InterestRate: *decimal.MustFromString("0"),
				AccountType:  "checking",
				StartDate:    startDate,
			},
		},
		liabilities: []repo.Liability{
			{
				ID:              "liability-1",
				ParentID:        "liability-1",
				Name:            "Mortgage",
				Category:        "Home Loan",
				CurrentBalance:  *decimal.MustFromString("350000"),
				InterestRateAPR: *decimal.MustFromString("3.5"),
				MinimumPayment:  *decimal.MustFromString("1500"),
				StartDate:       startDate,
			},
			{
				ID:              "liability-2",
				ParentID:        "liability-2",
				Name:            "Car Loan",
				Category:        "Auto Loan",
				CurrentBalance:  *decimal.MustFromString("30000"),
				InterestRateAPR: *decimal.MustFromString("5"),
				MinimumPayment:  *decimal.MustFromString("500"),
				StartDate:       startDate,
			},
		},
		incomes: []repo.Income{
			{
				ID:         "income-1",
				ParentID:   "income-1",
				Name:       "Salary",
				Amount:     *decimal.MustFromString("8000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("3"),
			},
			{
				ID:         "income-2",
				ParentID:   "income-2",
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Passive",
				GrowthRate: *decimal.MustFromString("2"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         "expense-1",
				ParentID:   "expense-1",
				Name:       "Mortgage Payment",
				Amount:     *decimal.MustFromString("1500"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
			{
				ID:         "expense-2",
				ParentID:   "expense-2",
				Name:       "Groceries",
				Amount:     *decimal.MustFromString("600"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Food",
				GrowthRate: *decimal.MustFromString("3"),
			},
			{
				ID:         "expense-3",
				ParentID:   "expense-3",
				Name:       "Utilities",
				Amount:     *decimal.MustFromString("200"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Bills",
				GrowthRate: *decimal.MustFromString("2"),
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

	// Verify all item types are returned with correct counts
	t.Run("NonCashAssets", func(t *testing.T) {
		if len(month.NonCashAssets) != 2 {
			t.Errorf("expected 2 non-cash assets, got %d", len(month.NonCashAssets))
		}
		// Verify each asset has required fields populated
		for i, asset := range month.NonCashAssets {
			if asset.ID == "" {
				t.Errorf("non-cash asset[%d]: ID is empty", i)
			}
			if asset.Name == "" {
				t.Errorf("non-cash asset[%d]: Name is empty", i)
			}
			if asset.Category == "" {
				t.Errorf("non-cash asset[%d]: Category is empty", i)
			}
			if asset.ItemType != "nonCashAsset" {
				t.Errorf("non-cash asset[%d]: expected ItemType 'nonCashAsset', got '%s'", i, asset.ItemType)
			}
		}
	})

	t.Run("Investments", func(t *testing.T) {
		if len(month.Investments) != 2 {
			t.Errorf("expected 2 investments, got %d", len(month.Investments))
		}
		for i, inv := range month.Investments {
			if inv.ID == "" {
				t.Errorf("investment[%d]: ID is empty", i)
			}
			if inv.Name == "" {
				t.Errorf("investment[%d]: Name is empty", i)
			}
			if inv.ItemType != "investment" {
				t.Errorf("investment[%d]: expected ItemType 'investment', got '%s'", i, inv.ItemType)
			}
		}
	})

	t.Run("CashAssets", func(t *testing.T) {
		if len(month.CashAssets) != 2 {
			t.Errorf("expected 2 cash assets, got %d", len(month.CashAssets))
		}
		hasAccumulator := false
		for i, cash := range month.CashAssets {
			if cash.ItemID == "" {
				t.Errorf("cash asset[%d]: ItemID is empty", i)
			}
			if cash.Name == "" {
				t.Errorf("cash asset[%d]: Name is empty", i)
			}
			if cash.ItemType != "cashAsset" {
				t.Errorf("cash asset[%d]: expected ItemType 'cashAsset', got '%s'", i, cash.ItemType)
			}
			if cash.IsAccumulator {
				hasAccumulator = true
			}
		}
		if !hasAccumulator {
			t.Error("expected at least one cash asset to be the accumulator")
		}
	})

	t.Run("Liabilities", func(t *testing.T) {
		if len(month.Liabilities) != 2 {
			t.Errorf("expected 2 liabilities, got %d", len(month.Liabilities))
		}
		for i, li := range month.Liabilities {
			if li.ID == "" {
				t.Errorf("liability[%d]: ID is empty", i)
			}
			if li.Name == "" {
				t.Errorf("liability[%d]: Name is empty", i)
			}
			if li.Category == "" {
				t.Errorf("liability[%d]: Category is empty", i)
			}
			if li.ItemType != "liabilities" {
				t.Errorf("liability[%d]: expected ItemType 'liabilities', got '%s'", i, li.ItemType)
			}
			if li.Balance.IsZero() {
				t.Errorf("liability[%d]: Balance should not be zero", i)
			}
		}
	})

	t.Run("Incomes", func(t *testing.T) {
		if len(month.Income) != 2 {
			t.Errorf("expected 2 incomes, got %d", len(month.Income))
		}
		for i, inc := range month.Income {
			if inc.ID == "" {
				t.Errorf("income[%d]: ID is empty", i)
			}
			if inc.Name == "" {
				t.Errorf("income[%d]: Name is empty", i)
			}
			if inc.Category == "" {
				t.Errorf("income[%d]: Category is empty", i)
			}
			if inc.ItemType != "income" {
				t.Errorf("income[%d]: expected ItemType 'income', got '%s'", i, inc.ItemType)
			}
			if inc.SourceFrequency == "" {
				t.Errorf("income[%d]: SourceFrequency is empty", i)
			}
		}
	})

	t.Run("Expenses", func(t *testing.T) {
		if len(month.Expenses) != 3 {
			t.Errorf("expected 3 expenses, got %d", len(month.Expenses))
		}
		for i, exp := range month.Expenses {
			if exp.ID == "" {
				t.Errorf("expense[%d]: ID is empty", i)
			}
			if exp.Name == "" {
				t.Errorf("expense[%d]: Name is empty", i)
			}
			if exp.Category == "" {
				t.Errorf("expense[%d]: Category is empty", i)
			}
			if exp.ItemType != "expense" {
				t.Errorf("expense[%d]: expected ItemType 'expense', got '%s'", i, exp.ItemType)
			}
			if exp.SourceFrequency == "" {
				t.Errorf("expense[%d]: SourceFrequency is empty", i)
			}
		}
	})

	t.Run("Aggregates", func(t *testing.T) {
		// Net savings should be: income - expenses
		// Total income: 8000 + 2000 = 10000
		// Total expenses: 1500 + 600 + 200 = 2300
		// Net savings: 10000 - 2300 = 7700
		expectedNetSavings := decimal.MustFromString("7700")
		if month.NetSavings.Cmp(expectedNetSavings) != 0 {
			t.Errorf("expected net savings %s, got %s", expectedNetSavings.String(), month.NetSavings.String())
		}

		// Net worth for anchor month does NOT add net cash to balances
		// Total assets: 500000 + 50000 + 100000 + 50000 + 25000 + 5000 = 730000
		// Total liabilities: 350000 + 30000 = 380000
		// Net worth: 730000 - 380000 = 350000
		expectedNetWorth := decimal.MustFromString("350000")
		if month.NetWorth.Cmp(expectedNetWorth) != 0 {
			t.Errorf("expected net worth %s, got %s", expectedNetWorth.String(), month.NetWorth.String())
		}
	})
}

// TestSnapshotContract_EmptyStore verifies that the snapshot returns empty arrays
// (not nil) when the store has no data.
func TestSnapshotContract_EmptyStore(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		// All slices are nil/empty
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

	if len(result.Months) != 1 {
		t.Fatalf("expected 1 month even with empty data, got %d", len(result.Months))
	}

	month := result.Months[0]

	// All arrays should be empty but not cause nil pointer issues
	if month.NonCashAssets == nil {
		t.Error("NonCashAssets should not be nil")
	}
	if month.Investments == nil {
		t.Error("Investments should not be nil")
	}
	if month.CashAssets == nil {
		t.Error("CashAssets should not be nil")
	}
	if month.Liabilities == nil {
		t.Error("Liabilities should not be nil")
	}
	if month.Income == nil {
		t.Error("Income should not be nil")
	}
	if month.Expenses == nil {
		t.Error("Expenses should not be nil")
	}
	if month.CPFAssets == nil {
		t.Error("CPFAssets should not be nil")
	}
	if month.CPFContributions == nil {
		t.Error("CPFContributions should not be nil")
	}

	// Aggregates should be zero
	zero := decimal.Zero()
	if month.NetWorth.Cmp(zero) != 0 {
		t.Errorf("expected net worth 0, got %s", month.NetWorth.String())
	}
	if month.NetSavings.Cmp(zero) != 0 {
		t.Errorf("expected net savings 0, got %s", month.NetSavings.String())
	}
	if month.NetCash.Cmp(zero) != 0 {
		t.Errorf("expected net cash 0, got %s", month.NetCash.String())
	}
}

// TestSnapshotContract_LiabilitiesIncluded specifically tests that liabilities
// are correctly included in the response. This is a regression test for the bug
// where liabilities were not being returned.
func TestSnapshotContract_LiabilitiesIncluded(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		liabilities: []repo.Liability{
			{
				ID:              "study-loan",
				ParentID:        "study-loan",
				Name:            "Study Loan (NUS)",
				Category:        "Loan",
				CurrentBalance:  *decimal.MustFromString("8000"),
				InterestRateAPR: *decimal.MustFromString("4.5"),
				MinimumPayment:  *decimal.MustFromString("250"),
				StartDate:       startDate,
			},
			{
				ID:              "credit-card",
				ParentID:        "credit-card",
				Name:            "Credit Card",
				Category:        "Credit Card",
				CurrentBalance:  *decimal.MustFromString("800"),
				InterestRateAPR: *decimal.MustFromString("26"),
				MinimumPayment:  *decimal.MustFromString("50"),
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

	month := result.Months[0]

	// CRITICAL: Liabilities MUST be returned
	if len(month.Liabilities) != 2 {
		t.Fatalf("CRITICAL: expected 2 liabilities, got %d - liabilities are not being returned!", len(month.Liabilities))
	}

	// Verify liability data is correctly populated
	foundStudyLoan := false
	foundCreditCard := false

	for _, li := range month.Liabilities {
		switch li.ID {
		case "study-loan":
			foundStudyLoan = true
			if li.Name != "Study Loan (NUS)" {
				t.Errorf("study loan: expected name 'Study Loan (NUS)', got '%s'", li.Name)
			}
			if li.Category != "Loan" {
				t.Errorf("study loan: expected category 'Loan', got '%s'", li.Category)
			}
			expectedBalance := decimal.MustFromString("8000")
			if li.Balance.Cmp(expectedBalance) != 0 {
				t.Errorf("study loan: expected balance %s, got %s", expectedBalance.String(), li.Balance.String())
			}
		case "credit-card":
			foundCreditCard = true
			if li.Name != "Credit Card" {
				t.Errorf("credit card: expected name 'Credit Card', got '%s'", li.Name)
			}
			expectedBalance := decimal.MustFromString("800")
			if li.Balance.Cmp(expectedBalance) != 0 {
				t.Errorf("credit card: expected balance %s, got %s", expectedBalance.String(), li.Balance.String())
			}
		}
	}

	if !foundStudyLoan {
		t.Error("CRITICAL: Study Loan not found in liabilities response")
	}
	if !foundCreditCard {
		t.Error("CRITICAL: Credit Card not found in liabilities response")
	}

	// Verify net worth calculation includes liabilities
	// Net worth should be negative (only liabilities, no assets)
	expectedNetWorth := decimal.MustFromString("-8800") // -8000 - 800
	if month.NetWorth.Cmp(expectedNetWorth) != 0 {
		t.Errorf("expected net worth %s, got %s", expectedNetWorth.String(), month.NetWorth.String())
	}
}

// TestSnapshotContract_InvestmentsIncluded tests that investments are correctly returned
func TestSnapshotContract_InvestmentsIncluded(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		investments: []repo.Investment{
			{
				ID:               "syfe",
				ParentID:         "syfe",
				Name:             "Syfe Core Growth Portfolio",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("35000"),
				GrowthRate:       *decimal.MustFromString("6"),
				StartDate:        startDate,
			},
			{
				ID:               "ssb",
				ParentID:         "ssb",
				Name:             "Singapore Savings Bonds",
				Category:         "Investment",
				CurrentValue:     *decimal.MustFromString("20000"),
				GrowthRate:       *decimal.MustFromString("3"),
				StartDate:        startDate,
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

	month := result.Months[0]

	if len(month.Investments) != 2 {
		t.Fatalf("expected 2 investments, got %d", len(month.Investments))
	}

	// Verify investments are included in net worth
	expectedNetWorth := decimal.MustFromString("55000") // 35000 + 20000
	if month.NetWorth.Cmp(expectedNetWorth) != 0 {
		t.Errorf("expected net worth %s, got %s", expectedNetWorth.String(), month.NetWorth.String())
	}
}

// TestSnapshotContract_MonthMetadata verifies that month metadata fields are correctly populated
func TestSnapshotContract_MonthMetadata(t *testing.T) {
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC) // 3 months

	store := &fullMockStore{
		incomes: []repo.Income{
			{
				ID:        "income-1",
				ParentID:  "income-1",
				Name:      "Salary",
				Amount:    *decimal.MustFromString("5000"),
				Frequency: "monthly",
				StartDate: startDate,
				Category:  "Employment",
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

	// Verify month metadata
	// allMonthsIndex is absolute: January=0, February=1, ..., June=5, July=6, August=7
	expectedMonths := []struct {
		year           int
		month          int
		allYearsIndex  int
		allMonthsIndex int
	}{
		{2025, 6, 0, 5},
		{2025, 7, 0, 6},
		{2025, 8, 0, 7},
	}

	for i, expected := range expectedMonths {
		month := result.Months[i]
		if month.Year != expected.year {
			t.Errorf("month[%d]: expected year %d, got %d", i, expected.year, month.Year)
		}
		if month.Month != expected.month {
			t.Errorf("month[%d]: expected month %d, got %d", i, expected.month, month.Month)
		}
		if month.AllYearsIndex != expected.allYearsIndex {
			t.Errorf("month[%d]: expected allYearsIndex %d, got %d", i, expected.allYearsIndex, month.AllYearsIndex)
		}
		if month.AllMonthsIndex != expected.allMonthsIndex {
			t.Errorf("month[%d]: expected allMonthsIndex %d, got %d", i, expected.allMonthsIndex, month.AllMonthsIndex)
		}
	}
}

// TestSnapshotContract_ItemsHaveStartYearAndMonth verifies that each item includes
// startYear and startMonth fields for timeline rendering
func TestSnapshotContract_ItemsHaveStartYearAndMonth(t *testing.T) {
	startDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Property",
				Category:         "Real Estate",
				CurrentValue:     *decimal.MustFromString("100000"),
				AnnualGrowthRate: *decimal.MustFromString("3"),
				StartDate:        startDate,
			},
		},
		liabilities: []repo.Liability{
			{
				ID:              "liability-1",
				ParentID:        "liability-1",
				Name:            "Mortgage",
				Category:        "Home Loan",
				CurrentBalance:  *decimal.MustFromString("80000"),
				InterestRateAPR: *decimal.MustFromString("3.5"),
				MinimumPayment:  *decimal.MustFromString("500"),
				StartDate:       startDate,
			},
		},
		incomes: []repo.Income{
			{
				ID:        "income-1",
				ParentID:  "income-1",
				Name:      "Salary",
				Amount:    *decimal.MustFromString("5000"),
				Frequency: "monthly",
				StartDate: startDate,
				Category:  "Employment",
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

	month := result.Months[0]

	// Non-cash assets should have startYear=0 (relative to base year) and startMonth=3
	if len(month.NonCashAssets) > 0 {
		asset := month.NonCashAssets[0]
		if asset.StartMonth != 3 {
			t.Errorf("asset: expected StartMonth 3, got %d", asset.StartMonth)
		}
	}

	// Liabilities
	if len(month.Liabilities) > 0 {
		li := month.Liabilities[0]
		if li.StartMonth != 3 {
			t.Errorf("liability: expected StartMonth 3, got %d", li.StartMonth)
		}
	}

	// Incomes
	if len(month.Income) > 0 {
		inc := month.Income[0]
		if inc.StartMonth != 3 {
			t.Errorf("income: expected StartMonth 3, got %d", inc.StartMonth)
		}
	}
}

// TestSnapshotContract_AccumulatorAccountIDSet verifies that the accumulator account ID
// is correctly set in the response
func TestSnapshotContract_AccumulatorAccountIDSet(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	store := &fullMockStore{
		cashAssets: []repo.CashAsset{
			{
				ID:            "savings-main",
				Name:          "Main Savings",
				Balance:       *decimal.MustFromString("10000"),
				InterestRate:  *decimal.MustFromString("2"),
				IsAccumulator: true,
				StartDate:     startDate,
			},
			{
				ID:            "checking",
				Name:          "Checking",
				Balance:       *decimal.MustFromString("5000"),
				InterestRate:  *decimal.MustFromString("0"),
				IsAccumulator: false,
				StartDate:     startDate,
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

	month := result.Months[0]

	if month.AccumulatorAccountID != "savings-main" {
		t.Errorf("expected AccumulatorAccountID 'savings-main', got '%s'", month.AccumulatorAccountID)
	}
}

// TestSnapshotContract_LinkedExpensesIncludeSourceLiabilityID verifies that expenses
// linked to liabilities include the SourceLiabilityID field in the response.
// This is a critical contract test - the frontend needs this field to properly
// display debt repayment relationships.
func TestSnapshotContract_LinkedExpensesIncludeSourceLiabilityID(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	liabilityID := "credit-card-debt"

	store := &fullMockStore{
		liabilities: []repo.Liability{
			{
				ID:              liabilityID,
				ParentID:        liabilityID,
				Name:            "Credit Card",
				Category:        "Credit Card Debt",
				CurrentBalance:  *decimal.MustFromString("5000"),
				InterestRateAPR: *decimal.MustFromString("18"),
				MinimumPayment:  *decimal.MustFromString("100"),
				StartDate:       startDate,
			},
		},
		expenses: []repo.Expense{
			{
				ID:                "cc-payment",
				ParentID:          "cc-payment",
				Name:              "Credit Card",
				Amount:            *decimal.MustFromString("300"),
				Frequency:         "monthly",
				StartDate:         startDate,
				Category:          "Debt Payment",
				GrowthRate:        *decimal.MustFromString("0"),
				SourceLiabilityID: &liabilityID, // Linked to liability
			},
			{
				ID:        "groceries",
				ParentID:  "groceries",
				Name:      "Groceries",
				Amount:    *decimal.MustFromString("500"),
				Frequency: "monthly",
				StartDate: startDate,
				Category:  "Food",
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

	month := result.Months[0]

	if len(month.Expenses) != 2 {
		t.Fatalf("expected 2 expenses, got %d", len(month.Expenses))
	}

	// Find the linked expense
	var linkedExpense, regularExpense *ExpenseResponse
	for i := range month.Expenses {
		exp := &month.Expenses[i]
		if exp.ID == "cc-payment" {
			linkedExpense = exp
		} else if exp.ID == "groceries" {
			regularExpense = exp
		}
	}

	// CRITICAL: Linked expense must have SourceLiabilityID
	if linkedExpense == nil {
		t.Fatal("CRITICAL: linked expense 'cc-payment' not found in response")
	}
	if linkedExpense.SourceLiabilityID == nil {
		t.Error("CRITICAL: linked expense must have SourceLiabilityID field populated")
	} else if *linkedExpense.SourceLiabilityID != liabilityID {
		t.Errorf("linked expense: expected SourceLiabilityID '%s', got '%s'",
			liabilityID, *linkedExpense.SourceLiabilityID)
	}

	// Linked expense name should match the original payee name
	if linkedExpense.Name != "Credit Card" {
		t.Errorf("linked expense: expected name 'Credit Card', got '%s'", linkedExpense.Name)
	}

	// Regular expense should NOT have SourceLiabilityID
	if regularExpense == nil {
		t.Fatal("regular expense 'groceries' not found in response")
	}
	if regularExpense.SourceLiabilityID != nil {
		t.Error("regular expense should not have SourceLiabilityID set")
	}
	if regularExpense.Name != "Groceries" {
		t.Errorf("regular expense: expected name 'Groceries', got '%s'", regularExpense.Name)
	}
}

// TestSnapshotContract_MultipleMonths_AllItemsConsistent verifies that items
// appear consistently across multiple months when they're active
func TestSnapshotContract_MultipleMonths_AllItemsConsistent(t *testing.T) {
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC) // 3 months

	store := &fullMockStore{
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               "asset-1",
				ParentID:         "asset-1",
				Name:             "Property",
				Category:         "Real Estate",
				CurrentValue:     *decimal.MustFromString("100000"),
				AnnualGrowthRate: *decimal.MustFromString("0"),
				StartDate:        startDate,
			},
		},
		liabilities: []repo.Liability{
			{
				ID:              "liability-1",
				ParentID:        "liability-1",
				Name:            "Mortgage",
				Category:        "Home Loan",
				CurrentBalance:  *decimal.MustFromString("80000"),
				InterestRateAPR: *decimal.MustFromString("0"),
				MinimumPayment:  *decimal.MustFromString("500"),
				StartDate:       startDate,
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

	// Verify all 3 months have the same items
	for i, month := range result.Months {
		if len(month.NonCashAssets) != 1 {
			t.Errorf("month[%d]: expected 1 non-cash asset, got %d", i, len(month.NonCashAssets))
		}
		if len(month.Liabilities) != 1 {
			t.Errorf("month[%d]: expected 1 liability, got %d", i, len(month.Liabilities))
		}
	}
}
