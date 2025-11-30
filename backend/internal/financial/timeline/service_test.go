package timeline

import (
	"context"
	"strings"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
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
	require.Len(t, resp.Years, 31)

	year2 := resp.Years[2]
	require.Equal(t, 1, countItems(year2.Income))
	require.Equal(t, 6000.0, year2.Income[0].AmountAnnual)
	require.Equal(t, 2, year2.Income[0].CreatedYear)
	require.True(t, year2.HasOverrides)

	year3 := resp.Years[3]
	require.Equal(t, 1, countItems(year3.Income))
	// income default growth 3% -> 6000 * 1.03 = 6180
	require.InDelta(t, 6180.0, year3.Income[0].AmountAnnual, 1e-6)
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

	// Should auto-create a default "Cash Savings" account
	require.Len(t, store.cashAccounts, 1)
	require.Equal(t, "Cash Savings", store.cashAccounts[0].Name)
	require.True(t, store.cashAccounts[0].IsAccumulator)
	require.InDelta(t, 1.5, store.cashAccounts[0].InterestRate, 1e-9)

	// Year 0 should have cash accounts
	require.Len(t, resp.Years[0].CashAccounts, 1)
	require.Equal(t, "Cash Savings", resp.Years[0].CashAccounts[0].Name)
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

	// Year 0: Net savings = 120000 - 60000 = 60000
	// Cash at end of year 0 = 0 + 60000 + interest(60000 * 1.5%) = 60000 + 900 = 60900
	year0 := resp.Years[0]
	require.InDelta(t, 60000.0, year0.AnnualNetSavings, 1e-6)
	require.InDelta(t, 0.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 60900.0, year0.AccumulatedCashEnd, 1e-6)
	require.InDelta(t, 900.0, year0.InterestEarned, 1e-6)

	// Cash accounts should show the accumulated value
	require.Len(t, year0.CashAccounts, 1)
	require.InDelta(t, 60900.0, year0.CashAccounts[0].AmountAnnual, 1e-6)

	// Year 1: starts with 60900, income/expense grow by default rates
	// Income grows by 3% -> 120000 * 1.03 = 123600
	// Expense grows by 2% -> 60000 * 1.02 = 61200
	// Net savings = 123600 - 61200 = 62400
	// Cash at end = 60900 + 62400 + interest((60900+62400)*1.5%)
	year1 := resp.Years[1]
	require.InDelta(t, 60900.0, year1.AccumulatedCashStart, 1e-6)
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

	// Year 0: starts with 50000 balance, no income/expense
	// Cash at end = 50000 + 0 + interest(50000 * 2%) = 50000 + 1000 = 51000
	year0 := resp.Years[0]
	require.InDelta(t, 50000.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 51000.0, year0.AccumulatedCashEnd, 1e-6)
	require.InDelta(t, 1000.0, year0.InterestEarned, 1e-6)

	// Verify it used the 2% rate from the existing account, not the default 1.5%
	require.Equal(t, cashID, year0.AccumulatorAccountID)
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

	// Year 0: Net savings = 60000 - 120000 = -60000
	// Cash at end = 100000 + (-60000) + interest(40000 * 1%) = 40000 + 400 = 40400
	year0 := resp.Years[0]
	require.InDelta(t, -60000.0, year0.AnnualNetSavings, 1e-6)
	require.InDelta(t, 100000.0, year0.AccumulatedCashStart, 1e-6)
	require.InDelta(t, 40400.0, year0.AccumulatedCashEnd, 1e-6)
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
	// Year 0 (before growth): 200000 + (100000 + interest) - 50000 = 200000 + 101500 - 50000 = 251500
	year0 := resp.Years[0]
	expectedCash := 100000.0 * 1.015 // 100000 + 1.5% interest
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

func (s *stubStore) ListAssets(ctx context.Context, userID string) ([]repository.Asset, error) {
	return append([]repository.Asset(nil), s.assets...), nil
}

func (s *stubStore) ListLiabilities(ctx context.Context, userID string) ([]repository.Liability, error) {
	return append([]repository.Liability(nil), s.liabilities...), nil
}

func (s *stubStore) ListIncomes(ctx context.Context, userID string) ([]repository.Income, error) {
	return append([]repository.Income(nil), s.incomes...), nil
}

func (s *stubStore) ListExpenses(ctx context.Context, userID string) ([]repository.Expense, error) {
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

func ptr[T any](v T) *T { return &v }

func countItems(items []TimelineItem) int {
	return len(items)
}
