package timeline

import (
	"context"
	"strings"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

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
	ctx := context.Background()
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
	ctx := context.Background()
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

// ---- helpers ----

type stubStore struct {
	assets      []repository.Asset
	liabilities []repository.Liability
	incomes     []repository.Income
	expenses    []repository.Expense
	growth      []repository.GrowthConfig
}

func newStubStore() *stubStore {
	return &stubStore{
		assets:      []repository.Asset{},
		liabilities: []repository.Liability{},
		incomes:     []repository.Income{},
		expenses:    []repository.Expense{},
		growth:      []repository.GrowthConfig{},
	}
}

func (s *stubStore) ListAssets(ctx context.Context) ([]repository.Asset, error) {
	return append([]repository.Asset(nil), s.assets...), nil
}

func (s *stubStore) ListLiabilities(ctx context.Context) ([]repository.Liability, error) {
	return append([]repository.Liability(nil), s.liabilities...), nil
}

func (s *stubStore) ListIncomes(ctx context.Context) ([]repository.Income, error) {
	return append([]repository.Income(nil), s.incomes...), nil
}

func (s *stubStore) ListExpenses(ctx context.Context) ([]repository.Expense, error) {
	return append([]repository.Expense(nil), s.expenses...), nil
}

func (s *stubStore) GetGrowthConfigs(ctx context.Context) ([]repository.GrowthConfig, error) {
	return append([]repository.GrowthConfig(nil), s.growth...), nil
}

func (s *stubStore) UpsertGrowthConfigs(ctx context.Context, cfgs []repository.GrowthConfig) error {
	s.growth = append([]repository.GrowthConfig(nil), cfgs...)
	return nil
}

func (s *stubStore) CreateAsset(ctx context.Context, a repository.Asset) (repository.Asset, error) {
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

func (s *stubStore) CreateLiability(ctx context.Context, li repository.Liability) (repository.Liability, error) {
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

func (s *stubStore) CreateIncome(ctx context.Context, inc repository.Income) (repository.Income, error) {
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

func (s *stubStore) CreateExpense(ctx context.Context, exp repository.Expense) (repository.Expense, error) {
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

func ptr[T any](v T) *T { return &v }

func countItems(items []TimelineItem) int {
	return len(items)
}
