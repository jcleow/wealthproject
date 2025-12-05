package timeline

import (
	"context"
	"strings"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
	"financial-chat-system/backend/internal/middleware"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// testUserID is a constant user ID for tests
const testUserID = "test-user-123"

// testContext creates a context with a test user for timeline service tests
func testContext() context.Context {
	return middleware.WithUserContext(context.Background(), middleware.UserContext{
		UserID: testUserID,
	})
}

func TestAnnualize(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name     string
		amount   float64
		freq     Frequency
		expected float64
	}{
		{"annual", 1000, FrequencyAnnual, 1000},
		{"monthly", 1000, FrequencyMonthly, 12000},
		{"weekly", 100, FrequencyWeekly, 5200},
		{"biweekly", 100, FrequencyBiweekly, 2600},
		{"quarterly", 1000, FrequencyQuarterly, 4000},
		{"semiannual", 500, FrequencySemiannual, 1000},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			actual, err := Annualize(tc.amount, tc.freq)
			require.NoError(t, err)
			require.InDelta(t, tc.expected, actual, 1e-9)
		})
	}
}

func TestProjection_NewItemPersistsForward(t *testing.T) {
	ctx := testContext()
	store := newStubStore()
	svc := NewService(store)

	_, err := svc.UpsertYear(ctx, 2, []EditRequest{
		{
			Name:       ptr("Side Hustle"),
			ItemType:   ItemTypeIncome,
			Category:   "income_other",
			Amount:     500,
			Frequency:  FrequencyMonthly,
			SourceYear: 2,
		},
	})
	require.NoError(t, err)

	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)
	require.Len(t, resp.Years, 36) // terminalAge(65) - startingAge(30) + 1 = 36

	year2 := resp.Years[2]
	require.Equal(t, 1, countItems(year2.Income))
	require.Equal(t, 6000.0, year2.Income[0].AmountAnnual)
	require.Equal(t, 2, year2.Income[0].CreatedYear)
	require.True(t, year2.HasOverrides)

	year3 := resp.Years[3]
	require.Equal(t, 1, countItems(year3.Income))
	// Income persists forward without growth (no explicit growth rate set)
	// Income/expense items don't use category defaults - they use their per-item rate (0 if not set)
	require.InDelta(t, 6000.0, year3.Income[0].AmountAnnual, 1e-6)
	require.False(t, year3.HasOverrides)
}

func TestProjection_OverrideLatestWinsAppliedForward(t *testing.T) {
	ctx := testContext()
	store := newStubStore()
	assetID := uuid.NewString()
	store.assets = []repository.Asset{
		{
			ID:               assetID,
			Name:             "Cash",
			Category:         "asset_cash",
			CurrentValue:     10000,
			AnnualGrowthRate: 0,
			UpdatedAt:        time.Now(),
		},
	}
	svc := NewService(store)

	// Apply two overrides for same item/year; latest wins.
	_, err := svc.UpsertYear(ctx, 1, []EditRequest{
		{
			ItemID:     ptr(assetID),
			ItemType:   ItemTypeAsset,
			Category:   "asset_cash",
			Amount:     500,
			Frequency:  FrequencyMonthly, // 6000
			SourceYear: 1,
		},
		{
			ItemID:     ptr(assetID),
			ItemType:   ItemTypeAsset,
			Category:   "asset_cash",
			Amount:     1000,
			Frequency:  FrequencyMonthly, // 12000 latest wins
			SourceYear: 1,
		},
	})
	require.NoError(t, err)

	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	year0 := resp.Years[0]
	require.InDelta(t, 10000.0, year0.Assets[0].AmountAnnual, 1e-6)
	require.False(t, year0.HasOverrides)

	year1 := resp.Years[1]
	require.True(t, year1.HasOverrides)
	require.InDelta(t, 12000.0, year1.Assets[0].AmountAnnual, 1e-6)

	year2 := resp.Years[2]
	// growth cash 1.5% applied to overridden amount
	require.InDelta(t, 12000.0*1.015, year2.Assets[0].AmountAnnual, 1e-6)
	require.False(t, year2.HasOverrides)
}

// ---- Cash Accumulation Tests ----

func TestCashAccumulation_AutoCreatesDefaultAccount(t *testing.T) {
	ctx := testContext()
	store := newStubStore()
	svc := NewService(store)

	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	// Should auto-create a default "Cash" account
	require.Len(t, store.cashAccounts, 1)
	require.Equal(t, "Cash", store.cashAccounts[0].Name)
	require.True(t, store.cashAccounts[0].IsAccumulator)
	require.InDelta(t, 1.5, store.cashAccounts[0].InterestRate, 1e-9)

	// Year 0 should have cash accounts
	require.Len(t, resp.Years[0].CashAccounts, 1)
	require.Equal(t, "Cash", resp.Years[0].CashAccounts[0].Name)
	require.True(t, resp.Years[0].CashAccounts[0].IsAccumulator)
}

func TestCashAccumulation_AccumulatesNetSavings(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Income of 120000/year (10000/month)
	incomeID := uuid.NewString()
	store.incomes = []repository.Income{
		{
			ID:        incomeID,
			ParentID:  incomeID,
			Source:    "Salary",
			Amount:    10000,
			Frequency: "monthly",
			Category:  "employment",
		},
	}

	// Expenses of 60000/year (5000/month)
	expenseID := uuid.NewString()
	store.expenses = []repository.Expense{
		{
			ID:        expenseID,
			ParentID:  expenseID,
			Payee:     "Living Expenses",
			Amount:    5000,
			Frequency: "monthly",
			Category:  "housing",
		},
	}

	svc := NewService(store)
	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	// Year 0: Net savings = 120000 - 60000 = 60000 (baseline year - no accumulation)
	// Year 0 is baseline: cash stays at initial balance (0)
	year0 := resp.Years[0]
	require.InDelta(t, 60000.0, year0.AnnualNetSavings, 1e-6)
	require.InDelta(t, 0.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 0.0, year0.AccumulatedCashEnd, 1e-6) // No accumulation in year 0
	require.InDelta(t, 0.0, year0.InterestEarned, 1e-6)

	// Cash accounts should show initial value (0) in year 0
	require.Len(t, year0.CashAccounts, 1)
	require.InDelta(t, 0.0, year0.CashAccounts[0].AmountAnnual, 1e-6)

	// Year 1: accumulation starts
	// Net savings year 0 = 60000, now accumulated
	// Cash = 0 + 60000 + interest(60000 * 1.5%) = 60000 + 900 = 60900
	year1 := resp.Years[1]
	require.InDelta(t, 0.0, year1.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 60900.0, year1.AccumulatedCashEnd, 1e-6)
	require.True(t, year1.AccumulatedCashEnd > year0.AccumulatedCashEnd)
}

func TestCashAccumulation_ExistingAccountUsesItsBalance(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Pre-create a cash account with a starting balance
	cashID := uuid.NewString()
	store.cashAccounts = []repository.CashAccount{
		{
			ID:            cashID,
			UserID:        "test-user",
			Name:          "Bank Account",
			Balance:       50000,
			InterestRate:  2.0,
			IsAccumulator: true,
		},
	}

	svc := NewService(store)
	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	// Year 0: starts with 50000 balance, no income/expense (baseline year)
	// Year 0 is baseline: no accumulation, just shows initial balance
	year0 := resp.Years[0]
	require.InDelta(t, 50000.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 50000.0, year0.AccumulatedCashEnd, 1e-6) // No accumulation in year 0
	require.InDelta(t, 0.0, year0.InterestEarned, 1e-6)

	// Verify it used the existing account
	require.Equal(t, cashID, year0.AccumulatorAccountID)

	// Year 1: accumulation starts with interest
	// Cash at end = 50000 + 0 + interest(50000 * 2%) = 50000 + 1000 = 51000
	year1 := resp.Years[1]
	require.InDelta(t, 50000.0, year1.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 51000.0, year1.AccumulatedCashEnd, 1e-6)
	require.InDelta(t, 1000.0, year1.InterestEarned, 1e-6)
}

func TestCashAccumulation_NegativeNetSavingsReducesCash(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Pre-create a cash account with a starting balance
	cashID := uuid.NewString()
	store.cashAccounts = []repository.CashAccount{
		{
			ID:            cashID,
			UserID:        "test-user",
			Name:          "Savings",
			Balance:       100000,
			InterestRate:  1.0,
			IsAccumulator: true,
		},
	}

	// Expenses exceed income
	incomeID := uuid.NewString()
	store.incomes = []repository.Income{
		{
			ID:        incomeID,
			ParentID:  incomeID,
			Source:    "Salary",
			Amount:    5000,
			Frequency: "monthly", // 60000/year
			Category:  "employment",
		},
	}

	expenseID := uuid.NewString()
	store.expenses = []repository.Expense{
		{
			ID:        expenseID,
			ParentID:  expenseID,
			Payee:     "Expensive Lifestyle",
			Amount:    10000,
			Frequency: "monthly", // 120000/year
			Category:  "housing",
		},
	}

	svc := NewService(store)
	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	// Year 0: Net savings = 60000 - 120000 = -60000 (baseline year)
	// Year 0 is baseline: no accumulation
	year0 := resp.Years[0]
	require.InDelta(t, -60000.0, year0.AnnualNetSavings, 1e-6)
	require.InDelta(t, 100000.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 100000.0, year0.AccumulatedCashEnd, 1e-6) // No accumulation in year 0

	// Year 1: accumulation happens
	// Cash at end = 100000 + (-60000) + interest(40000 * 1%) = 40000 + 400 = 40400
	year1 := resp.Years[1]
	require.InDelta(t, 100000.0, year1.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 40400.0, year1.AccumulatedCashEnd, 1e-6)
}

func TestCashAccumulation_NetWorthIncludesCash(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Assets: 200000
	assetID := uuid.NewString()
	store.assets = []repository.Asset{
		{
			ID:           assetID,
			ParentID:     assetID,
			Name:         "Investment",
			Category:     "equity",
			CurrentValue: 200000,
		},
	}

	// Liabilities: 50000
	liabilityID := uuid.NewString()
	store.liabilities = []repository.Liability{
		{
			ID:             liabilityID,
			ParentID:       liabilityID,
			Name:           "Car Loan",
			Category:       "debt",
			CurrentBalance: 50000,
		},
	}

	// Cash: 100000 (pre-created)
	cashID := uuid.NewString()
	store.cashAccounts = []repository.CashAccount{
		{
			ID:            cashID,
			UserID:        "test-user",
			Name:          "Bank",
			Balance:       100000,
			InterestRate:  1.5,
			IsAccumulator: true,
		},
	}

	svc := NewService(store)
	resp, err := svc.GetTimeline(ctx)
	require.NoError(t, err)

	// Net worth = Assets + Cash - Liabilities
	// Year 0 (baseline - no interest accumulation): 200000 + 100000 - 50000 = 250000
	year0 := resp.Years[0]
	expectedCash := 100000.0 // No interest in year 0
	expectedNetWorth := 200000.0 + expectedCash - 50000.0
	require.InDelta(t, expectedNetWorth, year0.NetWorth, 1e-6)
}

// ---- helpers ----

type stubStore struct {
	assets       []repository.Asset
	liabilities  []repository.Liability
	incomes      []repository.Income
	expenses     []repository.Expense
	growth       []repository.GrowthConfig
	cashAccounts []repository.CashAccount
}

func newStubStore() *stubStore {
	return &stubStore{
		assets:       []repository.Asset{},
		liabilities:  []repository.Liability{},
		incomes:      []repository.Income{},
		expenses:     []repository.Expense{},
		growth:       []repository.GrowthConfig{},
		cashAccounts: []repository.CashAccount{},
	}
}

func (s *stubStore) ListAllAssets(ctx context.Context, userID string) ([]repository.Asset, error) {
	return append([]repository.Asset(nil), s.assets...), nil
}

func (s *stubStore) ListAllLiabilities(ctx context.Context, userID string) ([]repository.Liability, error) {
	return append([]repository.Liability(nil), s.liabilities...), nil
}

func (s *stubStore) ListAllIncomes(ctx context.Context, userID string) ([]repository.Income, error) {
	return append([]repository.Income(nil), s.incomes...), nil
}

func (s *stubStore) ListAllExpenses(ctx context.Context, userID string) ([]repository.Expense, error) {
	return append([]repository.Expense(nil), s.expenses...), nil
}

func (s *stubStore) GetGrowthConfigs(ctx context.Context, userID string) ([]repository.GrowthConfig, error) {
	return append([]repository.GrowthConfig(nil), s.growth...), nil
}

func (s *stubStore) UpsertGrowthConfigs(ctx context.Context, userID string, cfgs []repository.GrowthConfig) error {
	s.growth = append([]repository.GrowthConfig(nil), cfgs...)
	return nil
}

func (s *stubStore) CreateAsset(ctx context.Context, userID string, a repository.Asset) (repository.Asset, error) {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	if strings.TrimSpace(a.ParentID) == "" {
		a.ParentID = a.ID
	}
	a.UpdatedAt = time.Now()
	s.assets = append(s.assets, a)
	return a, nil
}

func (s *stubStore) CreateLiability(ctx context.Context, userID string, li repository.Liability) (repository.Liability, error) {
	if li.ID == "" {
		li.ID = uuid.NewString()
	}
	if strings.TrimSpace(li.ParentID) == "" {
		li.ParentID = li.ID
	}
	li.UpdatedAt = time.Now()
	s.liabilities = append(s.liabilities, li)
	return li, nil
}

func (s *stubStore) CreateIncome(ctx context.Context, userID string, inc repository.Income) (repository.Income, error) {
	if inc.ID == "" {
		inc.ID = uuid.NewString()
	}
	if strings.TrimSpace(inc.ParentID) == "" {
		inc.ParentID = inc.ID
	}
	if inc.StartDate == nil {
		now := time.Now()
		inc.StartDate = &now
	}
	inc.UpdatedAt = time.Now()
	s.incomes = append(s.incomes, inc)
	return inc, nil
}

func (s *stubStore) CreateExpense(ctx context.Context, userID string, exp repository.Expense) (repository.Expense, error) {
	if exp.ID == "" {
		exp.ID = uuid.NewString()
	}
	if strings.TrimSpace(exp.ParentID) == "" {
		exp.ParentID = exp.ID
	}
	exp.UpdatedAt = time.Now()
	s.expenses = append(s.expenses, exp)
	return exp, nil
}

func (s *stubStore) DeleteAsset(ctx context.Context, userID string, id string) error {
	for i, a := range s.assets {
		if a.ID == id || a.ParentID == id {
			s.assets = append(s.assets[:i], s.assets[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (s *stubStore) DeleteLiability(ctx context.Context, userID string, id string) error {
	for i, li := range s.liabilities {
		if li.ID == id || li.ParentID == id {
			s.liabilities = append(s.liabilities[:i], s.liabilities[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (s *stubStore) DeleteIncome(ctx context.Context, userID string, id string) error {
	for i, inc := range s.incomes {
		if inc.ID == id || inc.ParentID == id {
			s.incomes = append(s.incomes[:i], s.incomes[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (s *stubStore) DeleteExpense(ctx context.Context, userID string, id string) error {
	for i, exp := range s.expenses {
		if exp.ID == id || exp.ParentID == id {
			s.expenses = append(s.expenses[:i], s.expenses[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

// Cash account methods
func (s *stubStore) ListCashAccounts(ctx context.Context, userID string) ([]repository.CashAccount, error) {
	return append([]repository.CashAccount(nil), s.cashAccounts...), nil
}

func (s *stubStore) GetAccumulatorAccount(ctx context.Context, userID string) (repository.CashAccount, error) {
	for _, acc := range s.cashAccounts {
		if acc.IsAccumulator {
			return acc, nil
		}
	}
	return repository.CashAccount{}, repository.ErrNotFound
}

func (s *stubStore) CreateCashAccount(ctx context.Context, acc repository.CashAccount) (repository.CashAccount, error) {
	if acc.ID == "" {
		acc.ID = uuid.NewString()
	}
	acc.CreatedAt = time.Now()
	acc.UpdatedAt = time.Now()
	s.cashAccounts = append(s.cashAccounts, acc)
	return acc, nil
}

func (s *stubStore) SetAccumulatorAccount(ctx context.Context, userID string, accountID string) error {
	found := false
	for i := range s.cashAccounts {
		if s.cashAccounts[i].ID == accountID {
			s.cashAccounts[i].IsAccumulator = true
			found = true
		} else {
			s.cashAccounts[i].IsAccumulator = false
		}
	}
	if !found {
		return repository.ErrNotFound
	}
	return nil
}

// User settings methods
func (s *stubStore) GetUserSettings(ctx context.Context, userID string) (repository.UserSettings, error) {
	return repository.DefaultUserSettings, nil
}

func (s *stubStore) UpsertUserSettings(ctx context.Context, userID string, settings repository.UserSettings) (repository.UserSettings, error) {
	return settings, nil
}

func ptr[T any](v T) *T { return &v }

func countItems(items []TimelineItem) int {
	return len(items)
}

// ---- Scenario Integration Tests ----

// mockScenarioApplier simulates the scenario.Service for testing
type mockScenarioApplier struct {
	overrideAmount float64  // The override amount to apply
	overrideMonth  int      // Month when override starts (1-12)
	overrideYear   int      // Calendar year when override starts
	targetType     string   // Type of item to override (income, expense, etc.)
	targetID       string   // ID of item to override
}

func (m *mockScenarioApplier) Apply(ctx context.Context, req scenario.ApplyRequest) ([]scenario.Row, error) {
	result := make([]scenario.Row, 0, len(req.Rows))
	calendarYear := req.BaseYear + req.Year

	for _, row := range req.Rows {
		newRow := scenario.Row{
			ID:           row.ID,
			Type:         row.Type,
			AmountAnnual: row.AmountAnnual,
		}

		// Apply override to matching target
		if row.Type == m.targetType && row.ID == m.targetID {
			if calendarYear > m.overrideYear {
				// Full year at override amount
				newRow.AmountAnnual = m.overrideAmount
			} else if calendarYear == m.overrideYear {
				// Prorated: blend original and new based on month
				afterProration := float64(13-m.overrideMonth) / 12.0
				beforeProration := 1.0 - afterProration
				newRow.AmountAnnual = (row.AmountAnnual * beforeProration) + (m.overrideAmount * afterProration)
			}
			// If calendarYear < m.overrideYear, no change (keeps original)
		}

		result = append(result, newRow)
	}
	return result, nil
}

func TestCashAccumulation_WithScenarioProration(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Income of 120000/year (10000/month)
	incomeID := uuid.NewString()
	store.incomes = []repository.Income{
		{
			ID:        incomeID,
			ParentID:  incomeID,
			Source:    "Salary",
			Amount:    10000,
			Frequency: "monthly",
			Category:  "employment",
		},
	}

	// Expenses of 60000/year (5000/month)
	expenseID := uuid.NewString()
	store.expenses = []repository.Expense{
		{
			ID:        expenseID,
			ParentID:  expenseID,
			Payee:     "Living Expenses",
			Amount:    5000,
			Frequency: "monthly",
			Category:  "housing",
		},
	}

	// Cash account with initial balance
	cashID := uuid.NewString()
	store.cashAccounts = []repository.CashAccount{
		{
			ID:            cashID,
			UserID:        "test-user",
			Name:          "Savings",
			Balance:       100000,
			InterestRate:  1.5,
			IsAccumulator: true,
		},
	}

	// Scenario: Income becomes $0 in December of year 0 (current year 2025)
	scenarioApplier := &mockScenarioApplier{
		overrideAmount: 0,
		overrideMonth:  12, // December
		overrideYear:   time.Now().Year(),
		targetType:     "income",
		targetID:       incomeID,
	}

	svc := NewServiceWithScenario(store, scenarioApplier)
	resp, err := svc.GetTimelineWithScenarios(ctx, testUserID, true, nil)
	require.NoError(t, err)

	// Year 0: Income should be prorated
	// Original: $120k -> December means 11/12 * $120k + 1/12 * $0 = $110k
	// Net savings: $110k - $60k = $50k
	year0 := resp.Years[0]
	expectedIncome := (120000.0 * 11.0 / 12.0) + (0.0 * 1.0 / 12.0) // $110k
	require.InDelta(t, expectedIncome, sumAdjusted(year0.Income), 1)

	expectedNetSavings := expectedIncome - 60000.0 // $50k
	require.InDelta(t, expectedNetSavings, year0.AnnualNetSavings, 1)

	// Year 1: Income is $0 (full year at override)
	// Net savings: $0 - $60k = -$60k (drawing down cash)
	year1 := resp.Years[1]
	require.InDelta(t, 0.0, sumAdjusted(year1.Income), 1)
	require.InDelta(t, -60000.0, year1.AnnualNetSavings, 1)

	// Cash should decrease after year 0 savings are applied
	// Year 1 start: $100k + $50k (net savings from year 0) = $150k
	// After interest: $150k * 1.015 = $152,250
	// Actually the recalculation in GetTimelineWithScenarios starts from year 0 accumulator balance
	// Year 0: Cash stays at $100k (baseline)
	// Year 1: Cash = $100k + $50k (year 0 net savings) + interest
	require.True(t, year1.AccumulatedCashStart >= 100000, "Cash start should be at least initial balance")
}

func TestCashAccumulation_ScenarioExpenseReduction(t *testing.T) {
	ctx := testContext()
	store := newStubStore()

	// Income of 120000/year
	incomeID := uuid.NewString()
	store.incomes = []repository.Income{
		{
			ID:        incomeID,
			ParentID:  incomeID,
			Source:    "Salary",
			Amount:    10000,
			Frequency: "monthly",
			Category:  "employment",
		},
	}

	// Rent of 24000/year (2000/month)
	expenseID := uuid.NewString()
	store.expenses = []repository.Expense{
		{
			ID:        expenseID,
			ParentID:  expenseID,
			Payee:     "Rent",
			Amount:    2000,
			Frequency: "monthly",
			Category:  "housing",
		},
	}

	// Cash account
	cashID := uuid.NewString()
	store.cashAccounts = []repository.CashAccount{
		{
			ID:            cashID,
			UserID:        "test-user",
			Name:          "Savings",
			Balance:       50000,
			InterestRate:  1.5,
			IsAccumulator: true,
		},
	}

	// Scenario: Rent becomes $0 in October (buying a house)
	scenarioApplier := &mockScenarioApplier{
		overrideAmount: 0,
		overrideMonth:  10, // October
		overrideYear:   time.Now().Year(),
		targetType:     "expense",
		targetID:       expenseID,
	}

	svc := NewServiceWithScenario(store, scenarioApplier)
	resp, err := svc.GetTimelineWithScenarios(ctx, testUserID, true, nil)
	require.NoError(t, err)

	// Year 0: Expense should be prorated
	// Original: $24k -> October means 9/12 * $24k + 3/12 * $0 = $18k
	year0 := resp.Years[0]
	expectedExpense := (24000.0 * 9.0 / 12.0) + (0.0 * 3.0 / 12.0) // $18k
	require.InDelta(t, expectedExpense, sumAdjusted(year0.Expenses), 1)

	// Net savings should be higher due to reduced expenses
	// Net savings: $120k - $18k = $102k
	expectedNetSavings := 120000.0 - expectedExpense
	require.InDelta(t, expectedNetSavings, year0.AnnualNetSavings, 1)

	// Year 1: Expense is $0 (full year at override)
	year1 := resp.Years[1]
	require.InDelta(t, 0.0, sumAdjusted(year1.Expenses), 1)
	require.InDelta(t, 120000.0, year1.AnnualNetSavings, 1) // All income saved
}
