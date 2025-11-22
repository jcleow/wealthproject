package timeline

import (
	"context"
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
	require.Len(t, resp.Years, 21)

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
	custom      []repository.CustomItem
	overrides   []repository.FinancialOverride
	growth      []repository.GrowthConfig
}

func newStubStore() *stubStore {
	return &stubStore{
		assets:      []repository.Asset{},
		liabilities: []repository.Liability{},
		incomes:     []repository.Income{},
		expenses:    []repository.Expense{},
		custom:      []repository.CustomItem{},
		overrides:   []repository.FinancialOverride{},
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

func (s *stubStore) GetAsset(ctx context.Context, id string) (repository.Asset, error) {
	for _, a := range s.assets {
		if a.ID == id {
			return a, nil
		}
	}
	return repository.Asset{}, repository.ErrNotFound
}

func (s *stubStore) GetLiability(ctx context.Context, id string) (repository.Liability, error) {
	for _, li := range s.liabilities {
		if li.ID == id {
			return li, nil
		}
	}
	return repository.Liability{}, repository.ErrNotFound
}

func (s *stubStore) GetIncome(ctx context.Context, id string) (repository.Income, error) {
	for _, it := range s.incomes {
		if it.ID == id {
			return it, nil
		}
	}
	return repository.Income{}, repository.ErrNotFound
}

func (s *stubStore) GetExpense(ctx context.Context, id string) (repository.Expense, error) {
	for _, it := range s.expenses {
		if it.ID == id {
			return it, nil
		}
	}
	return repository.Expense{}, repository.ErrNotFound
}

func (s *stubStore) ListCustomItems(ctx context.Context) ([]repository.CustomItem, error) {
	return append([]repository.CustomItem(nil), s.custom...), nil
}

func (s *stubStore) GetCustomItem(ctx context.Context, id string) (repository.CustomItem, error) {
	for _, c := range s.custom {
		if c.ID == id {
			return c, nil
		}
	}
	return repository.CustomItem{}, repository.ErrNotFound
}

func (s *stubStore) CreateCustomItem(ctx context.Context, item repository.CustomItem) (repository.CustomItem, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	item.UpdatedAt = time.Now()
	s.custom = append(s.custom, item)
	return item, nil
}

func (s *stubStore) ListOverrides(ctx context.Context) ([]repository.FinancialOverride, error) {
	return append([]repository.FinancialOverride(nil), s.overrides...), nil
}

func (s *stubStore) UpsertOverride(ctx context.Context, ov repository.FinancialOverride) (repository.FinancialOverride, error) {
	for i, existing := range s.overrides {
		if existing.Year == ov.Year && existing.ItemID == ov.ItemID {
			ov.ID = existing.ID
			ov.AppliedAt = time.Now()
			s.overrides[i] = ov
			return ov, nil
		}
	}
	if ov.ID == "" {
		ov.ID = uuid.NewString()
	}
	ov.AppliedAt = time.Now()
	s.overrides = append(s.overrides, ov)
	return ov, nil
}

func (s *stubStore) GetGrowthConfigs(ctx context.Context) ([]repository.GrowthConfig, error) {
	return append([]repository.GrowthConfig(nil), s.growth...), nil
}

func (s *stubStore) UpsertGrowthConfigs(ctx context.Context, cfgs []repository.GrowthConfig) error {
	s.growth = append([]repository.GrowthConfig(nil), cfgs...)
	return nil
}

func ptr[T any](v T) *T { return &v }

func countItems(items []TimelineItem) int {
	return len(items)
}
