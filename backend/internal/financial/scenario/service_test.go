package scenario

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// mockStore implements ScenarioStore for testing
type mockStore struct {
	events []repository.ScenarioEvent
}

func (m *mockStore) ListScenarioEvents(ctx context.Context, userID string, filters repository.ScenarioFilters) ([]repository.ScenarioEvent, int, error) {
	return m.events, len(m.events), nil
}

func ptr(s string) *string { return &s }

func makeTime(year int, month time.Month) time.Time {
	return time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
}

func TestCalculateStopProration(t *testing.T) {
	tests := []struct {
		name         string
		stopMonth    time.Time
		calendarYear int
		want         float64
	}{
		{
			name:         "stop in December - 11 months active",
			stopMonth:    makeTime(2025, time.December),
			calendarYear: 2025,
			want:         11.0 / 12.0,
		},
		{
			name:         "stop in January - 0 months active",
			stopMonth:    makeTime(2025, time.January),
			calendarYear: 2025,
			want:         0.0,
		},
		{
			name:         "stop in July - 6 months active",
			stopMonth:    makeTime(2025, time.July),
			calendarYear: 2025,
			want:         6.0 / 12.0,
		},
		{
			name:         "stop in future year - full year active",
			stopMonth:    makeTime(2026, time.June),
			calendarYear: 2025,
			want:         1.0,
		},
		{
			name:         "stop in past year - no activity",
			stopMonth:    makeTime(2024, time.June),
			calendarYear: 2025,
			want:         0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateStopProration(tt.stopMonth, tt.calendarYear)
			if got != tt.want {
				t.Errorf("calculateStopProration() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateStartProration(t *testing.T) {
	tests := []struct {
		name         string
		startMonth   time.Time
		calendarYear int
		want         float64
	}{
		{
			name:         "start in January - full year",
			startMonth:   makeTime(2025, time.January),
			calendarYear: 2025,
			want:         12.0 / 12.0,
		},
		{
			name:         "start in April - 9 months",
			startMonth:   makeTime(2025, time.April),
			calendarYear: 2025,
			want:         9.0 / 12.0,
		},
		{
			name:         "start in December - 1 month",
			startMonth:   makeTime(2025, time.December),
			calendarYear: 2025,
			want:         1.0 / 12.0,
		},
		{
			name:         "start in past year - full year active",
			startMonth:   makeTime(2024, time.June),
			calendarYear: 2025,
			want:         1.0,
		},
		{
			name:         "start in future year - no activity",
			startMonth:   makeTime(2026, time.June),
			calendarYear: 2025,
			want:         0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateStartProration(tt.startMonth, tt.calendarYear)
			if got != tt.want {
				t.Errorf("calculateStartProration() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestApply_OverrideProration(t *testing.T) {
	// Scenario: Income of $100k becomes $0 in December
	// Year 1: Should be (11/12 * $100k) + (1/12 * $0) = $91,666.67
	// Year 2: Should be $0 (full year at new amount)

	incomeID := "income-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "income",
						TargetID:   ptr(incomeID),
						ImpactKind: "override",
						Amount:     0, // becomes $0
						Cadence:    "annual",
						StartDate: makeTime(2025, time.December),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	// Test Year 1 (2025) - should be prorated
	rows := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear1 := (100000.0 * 11.0 / 12.0) + (0.0 * 1.0 / 12.0) // $91,666.67
	if len(result) != 1 {
		t.Fatalf("Expected 1 row, got %d", len(result))
	}
	if diff := result[0].AmountAnnual - expectedYear1; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 1: got %.2f, want %.2f", result[0].AmountAnnual, expectedYear1)
	}

	// Test Year 2 (2026) - should be full year at new amount
	rows2 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result2, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     1,
		BaseYear: 2025,
		Rows:     rows2,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear2 := 0.0 // Full year at $0
	if result2[0].AmountAnnual != expectedYear2 {
		t.Errorf("Year 2: got %.2f, want %.2f", result2[0].AmountAnnual, expectedYear2)
	}
}

func TestApply_OverrideProration_IncomeReduction(t *testing.T) {
	// Scenario: Income of $100k becomes $24k in December (retirement with pension)
	// Year 1: Should be (11/12 * $100k) + (1/12 * $24k) = $91,666.67 + $2,000 = $93,666.67

	incomeID := "income-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "income",
						TargetID:   ptr(incomeID),
						ImpactKind: "override",
						Amount:     24000, // becomes $24k
						Cadence:    "annual",
						StartDate: makeTime(2025, time.December),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	rows := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expected := (100000.0 * 11.0 / 12.0) + (24000.0 * 1.0 / 12.0) // $93,666.67
	if diff := result[0].AmountAnnual - expected; diff > 0.01 || diff < -0.01 {
		t.Errorf("got %.2f, want %.2f", result[0].AmountAnnual, expected)
	}
}

func TestApply_StopProration(t *testing.T) {
	// Scenario: Income stops in December
	// Year 1: Should be 11/12 * $100k = $91,666.67
	// Year 2: Should be $0

	incomeID := "income-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "income",
						TargetID:   ptr(incomeID),
						ImpactKind: "stop",
						Amount:     0,
						Cadence:    "annual",
						StartDate: makeTime(2025, time.December),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	// Year 1
	rows := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear1 := 100000.0 * 11.0 / 12.0
	if diff := result[0].AmountAnnual - expectedYear1; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 1: got %.2f, want %.2f", result[0].AmountAnnual, expectedYear1)
	}

	// Year 2
	rows2 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result2, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     1,
		BaseYear: 2025,
		Rows:     rows2,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	if result2[0].AmountAnnual != 0.0 {
		t.Errorf("Year 2: got %.2f, want 0.00", result2[0].AmountAnnual)
	}
}

func TestApply_DeltaProration(t *testing.T) {
	// Scenario: Income increases by $1000/month starting in April
	// Year 1: Should add 9/12 * $12,000 = $9,000
	// Year 2: Should add full $12,000

	incomeID := "income-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "income",
						TargetID:   ptr(incomeID),
						ImpactKind: "delta",
						Amount:     1000, // +$1000/month
						Cadence:    "monthly",
						StartDate: makeTime(2025, time.April),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	// Year 1
	rows := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear1 := 100000.0 + (12000.0 * 9.0 / 12.0) // $109,000
	if diff := result[0].AmountAnnual - expectedYear1; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 1: got %.2f, want %.2f", result[0].AmountAnnual, expectedYear1)
	}

	// Year 2
	rows2 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result2, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     1,
		BaseYear: 2025,
		Rows:     rows2,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear2 := 100000.0 + 12000.0 // $112,000
	if diff := result2[0].AmountAnnual - expectedYear2; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 2: got %.2f, want %.2f", result2[0].AmountAnnual, expectedYear2)
	}
}

func TestApply_ExpenseProration(t *testing.T) {
	// Scenario: Rent of $24k/year becomes $0 in October (bought a house)
	// Year 1: Should be (9/12 * $24k) + (3/12 * $0) = $18,000

	expenseID := "expense-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "expense",
						TargetID:   ptr(expenseID),
						ImpactKind: "override",
						Amount:     0,
						Cadence:    "annual",
						StartDate: makeTime(2025, time.October),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	rows := []Row{{ID: expenseID, Type: "expense", AmountAnnual: 24000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expected := (24000.0 * 9.0 / 12.0) + (0.0 * 3.0 / 12.0) // $18,000
	if diff := result[0].AmountAnnual - expected; diff > 0.01 || diff < -0.01 {
		t.Errorf("got %.2f, want %.2f", result[0].AmountAnnual, expected)
	}
}

func TestApply_OverrideWithGrowthOnBaseValue(t *testing.T) {
	// Verifies that when base income grows (e.g., 3% annually), the override
	// still applies the fixed override amount, not a growing one.
	// Year 0: $100k base → override to $24k in December → prorated
	// Year 1: $103k base (with growth) → override to $24k full year
	// Year 2: $106.09k base → override to $24k full year
	// The $24k override stays fixed regardless of base growth.

	incomeID := "income-1"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "income",
						TargetID:   ptr(incomeID),
						ImpactKind: "override",
						Amount:     24000, // Fixed pension amount
						Cadence:    "annual",
						StartDate: makeTime(2025, time.December),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	// Year 0: Base $100k, override in December
	rows0 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 100000}}
	result0, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows0,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	expectedYear0 := (100000.0 * 11.0 / 12.0) + (24000.0 * 1.0 / 12.0)
	if diff := result0[0].AmountAnnual - expectedYear0; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 0: got %.2f, want %.2f", result0[0].AmountAnnual, expectedYear0)
	}

	// Year 1: Base $103k (with 3% growth), full year at override
	rows1 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 103000}}
	result1, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     1,
		BaseYear: 2025,
		Rows:     rows1,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	expectedYear1 := 24000.0 // Full year at fixed override
	if diff := result1[0].AmountAnnual - expectedYear1; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 1: got %.2f, want %.2f", result1[0].AmountAnnual, expectedYear1)
	}

	// Year 2: Base $106.09k, still $24k override
	rows2 := []Row{{ID: incomeID, Type: "income", AmountAnnual: 106090}}
	result2, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     2,
		BaseYear: 2025,
		Rows:     rows2,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	expectedYear2 := 24000.0 // Override stays fixed
	if diff := result2[0].AmountAnnual - expectedYear2; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 2: got %.2f, want %.2f", result2[0].AmountAnnual, expectedYear2)
	}
}

func TestApply_StartProration(t *testing.T) {
	// Scenario: New expense starts in April at $1000/month
	// Year 1: Should be 9/12 * $12,000 = $9,000
	// Year 2: Should be full $12,000

	expenseID := "expense-new"
	store := &mockStore{
		events: []repository.ScenarioEvent{
			{
				ID:         "event-1",
				UserID:     "user-1",
				IsIncluded: true,
				UpdatedAt:  time.Now(),
				Impacts: []repository.ScenarioImpact{
					{
						ID:         "impact-1",
						EventID:    "event-1",
						TargetType: "expense",
						TargetID:   ptr(expenseID),
						ImpactKind: "start",
						Amount:     1000,
						Cadence:    "monthly",
						StartDate: makeTime(2025, time.April),
					},
				},
			},
		},
	}

	svc := NewService(store)
	ctx := context.Background()

	// Year 1 - item exists with full annual amount, start prorates it
	rows := []Row{{ID: expenseID, Type: "expense", AmountAnnual: 12000}}
	result, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     0,
		BaseYear: 2025,
		Rows:     rows,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear1 := 12000.0 * 9.0 / 12.0 // $9,000
	if diff := result[0].AmountAnnual - expectedYear1; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 1: got %.2f, want %.2f", result[0].AmountAnnual, expectedYear1)
	}

	// Year 2 - full year
	rows2 := []Row{{ID: expenseID, Type: "expense", AmountAnnual: 12000}}
	result2, err := svc.Apply(ctx, ApplyRequest{
		UserID:   "user-1",
		Year:     1,
		BaseYear: 2025,
		Rows:     rows2,
	})
	if err != nil {
		t.Fatalf("Apply() error = %v", err)
	}

	expectedYear2 := 12000.0 // Full year
	if diff := result2[0].AmountAnnual - expectedYear2; diff > 0.01 || diff < -0.01 {
		t.Errorf("Year 2: got %.2f, want %.2f", result2[0].AmountAnnual, expectedYear2)
	}
}
