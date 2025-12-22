package timeline_v2

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
)

/*
=============================================================================
START IMPACT ITEMS TEST SUITE
=============================================================================

These tests document the expected behavior of "start" impacts, which create
financial items that only exist within scenarios.

IMPLEMENTATION:
- Start impacts create REAL rows in finance_* tables (incomes, expenses, etc.)
- The impact's target_*_id points to the newly created row
- All metadata (name, category, amount, frequency, growth_rate) exists in finance_* tables

FILTERING BEHAVIOR:
- GetExcludedScenarioTargetIDs returns IDs of items from excluded events
- When includeScenarios=false, ALL scenario-created items should be excluded
- When an event is disabled (is_included=false), its start-impact-created items excluded

=============================================================================
*/

// startImpactTestStore extends mockStore with scenario event support
type startImpactTestStore struct {
	nonCashAssets   []repo.NonCashAsset
	investments     []repo.Investment
	cashAssets      []repo.CashAsset
	liabilities     []repo.Liability
	incomes         []repo.Income
	expenses        []repo.Expense
	incomeAllocs    []repo.IncomeAllocation
	scenarioEvents  []repo.ScenarioEvent
	excludedTargets repo.ExcludedTargets
}

func (m *startImpactTestStore) ListNonCashAssets(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.NonCashAsset], error) {
	return repo.PaginatedResult[repo.NonCashAsset]{Data: m.nonCashAssets, Count: len(m.nonCashAssets)}, nil
}

func (m *startImpactTestStore) ListInvestments(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Investment], error) {
	return repo.PaginatedResult[repo.Investment]{Data: m.investments, Count: len(m.investments)}, nil
}

func (m *startImpactTestStore) ListCashAssets(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.CashAsset], error) {
	return repo.PaginatedResult[repo.CashAsset]{Data: m.cashAssets, Count: len(m.cashAssets)}, nil
}

func (m *startImpactTestStore) ListLiabilities(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Liability], error) {
	return repo.PaginatedResult[repo.Liability]{Data: m.liabilities, Count: len(m.liabilities)}, nil
}

func (m *startImpactTestStore) ListIncomes(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Income], error) {
	return repo.PaginatedResult[repo.Income]{Data: m.incomes, Count: len(m.incomes)}, nil
}

func (m *startImpactTestStore) ListExpenses(ctx context.Context, q repo.ListQuery) (repo.PaginatedResult[repo.Expense], error) {
	return repo.PaginatedResult[repo.Expense]{Data: m.expenses, Count: len(m.expenses)}, nil
}

func (m *startImpactTestStore) GetCPFAccount(ctx context.Context, userID string) (*repo.CPFAccount, error) {
	return nil, nil
}

func (m *startImpactTestStore) ListAllIncomeAllocations(ctx context.Context, userID string) ([]repo.IncomeAllocation, error) {
	return m.incomeAllocs, nil
}

func (m *startImpactTestStore) GetExcludedScenarioTargetIDs(ctx context.Context, userID string) (repo.ExcludedTargets, error) {
	return m.excludedTargets, nil
}

func (m *startImpactTestStore) ListIncludedScenarioEvents(ctx context.Context, userID string) ([]repo.ScenarioEvent, error) {
	return m.scenarioEvents, nil
}

// =============================================================================
// Helper Functions
// =============================================================================

func ptrString(s string) *string {
	return &s
}

func makeStartDate(year, month, day int) time.Time {
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

func decAmount(v int64) *decimal.Decimal {
	return decimal.NewFromInt64(v, 0)
}

// =============================================================================
// START IMPACT TESTS - Creating Synthetic Items
// =============================================================================

func TestComputeSnapshot_StartImpact_CreatesSyntheticIncome(t *testing.T) {
	/*
		SCENARIO: User models "What if I start a rental property?"

		SETUP:
		- John has an existing salary of $10,000/month
		- He creates a scenario event "Buy rental property" with:
		  - Start impact: Creates new income "Rental Income" at $2,000/month in finance_incomes
		  - The start impact's target_income_id points to the new row
		  - Same start date as query

		EXPECTED BEHAVIOR:
		When computing the timeline:
		1. Both salary AND rental income should appear
		2. Total monthly income should be $12,000 ($10,000 + $2,000)
	*/
	startDate := makeStartDate(2025, 1, 1)

	// The rental income is a REAL row in finance_incomes, created by the start impact
	rentalIncomeID := "income-rental-123"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         "income-salary",
				ParentID:   "income-salary",
				Name:       "Salary",
				Amount:     *decimal.MustFromString("10000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate, // Same start as query
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-1",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200000), // cents
						StartDate:      startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	// Query for single month
	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 1 {
		t.Fatalf("expected 1 month, got %d", len(result.Months))
	}

	month := result.Months[0]

	// Should have 2 incomes: salary + rental
	if len(month.Income) != 2 {
		t.Fatalf("expected 2 incomes, got %d", len(month.Income))
	}

	// Find the rental income
	var foundRental bool
	for _, inc := range month.Income {
		if inc.ID == rentalIncomeID {
			foundRental = true
			expected := decimal.MustFromString("2000")
			if inc.Amount.Cmp(expected) != 0 {
				t.Errorf("expected rental income $2000, got %s", inc.Amount.String())
			}
		}
	}
	if !foundRental {
		t.Error("rental income not found in response")
	}

	// Total income should be $12,000 (netSavings with no expenses = total income)
	expectedNetSavings := decimal.MustFromString("12000")
	if month.NetSavings.Cmp(expectedNetSavings) != 0 {
		t.Errorf("expected net savings $12,000, got %s", month.NetSavings.String())
	}
}

func TestComputeSnapshot_StartImpact_SyntheticItemRespectsDates(t *testing.T) {
	/*
		SCENARIO: Synthetic item only appears within its date range

		This test verifies that items with start/end dates are properly filtered.
		Note: The mockStore doesn't filter by dates, so this test uses a multi-month
		query and checks that items are properly active/inactive per month.

		EXPECTED: When querying July to December 2025:
		- Item starts July 2025 at $5,000
		- With 0% growth, all 6 months should show $5,000
	*/
	consultingStartDate := makeStartDate(2025, 7, 1)

	consultingIncomeID := "income-consulting"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         consultingIncomeID,
				ParentID:   consultingIncomeID,
				Name:       "Consulting Gig",
				Amount:     *decimal.MustFromString("5000"),
				Frequency:  "monthly",
				StartDate:  consultingStartDate,
				Category:   "Freelance",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-consulting",
				UserID:     "user-1",
				Name:       "Take consulting gig",
				OccursOn:   consultingStartDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-1",
						EventID:        "event-consulting",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(consultingIncomeID),
						Amount:         decAmount(500000), // cents
						StartDate:      consultingStartDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	// Query July through December (6 months)
	opts := TimelineOptions{
		StartDate:        consultingStartDate,
		EndDate:          makeStartDate(2025, 12, 1),
		IncludeScenarios: true,
	}
	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("query error: %v", err)
	}

	// Should have 6 months
	if len(result.Months) != 6 {
		t.Fatalf("expected 6 months, got %d", len(result.Months))
	}

	// Each month should have the consulting income
	for i, month := range result.Months {
		if len(month.Income) != 1 {
			t.Errorf("month %d: expected 1 income, got %d", i+1, len(month.Income))
			continue
		}
		expected := decimal.MustFromString("5000")
		if month.Income[0].Amount.Cmp(expected) != 0 {
			t.Errorf("month %d: expected $5000, got %s", i+1, month.Income[0].Amount.String())
		}
	}
}

func TestComputeSnapshot_StartImpact_SyntheticItemGrows(t *testing.T) {
	/*
		SCENARIO: Synthetic income with growth rate

		Rental income starts at $2,000/month with 7% annual growth.
		Month 1: $2,000/month (base)
		Month 13: ~$2,140/month (7% annual growth)
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentalIncomeID := "income-rental"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("7"), // 7% annual growth
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-1",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200000), // cents
						StartDate:      startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	// Query 13 months to see full year of growth
	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          makeStartDate(2026, 1, 1), // 13 months
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 13 {
		t.Fatalf("expected 13 months, got %d", len(result.Months))
	}

	// Month 1: no growth (arrears)
	month1Income := result.Months[0].Income[0].Amount
	expected1 := decimal.MustFromString("2000")
	if month1Income.Cmp(expected1) != 0 {
		t.Errorf("month 1: expected $2000, got %s", month1Income.String())
	}

	// Month 13: ~7% growth = ~$2140
	month13Income := result.Months[12].Income[0].Amount
	expectedMin := decimal.MustFromString("2138")
	expectedMax := decimal.MustFromString("2142")

	if month13Income.Cmp(expectedMin) < 0 || month13Income.Cmp(expectedMax) > 0 {
		t.Errorf("month 13: expected ~$2140 (7%% growth), got %s", month13Income.String())
	}

	t.Logf("Month 1 income: %s", month1Income.String())
	t.Logf("Month 13 income: %s", month13Income.String())
}

func TestComputeSnapshot_StartImpact_ExcludedEvent_NoSyntheticItem(t *testing.T) {
	/*
		SCENARIO: Excluded event = item excluded via GetExcludedScenarioTargetIDs

		When an event is disabled (is_included=false), its target IDs should be
		returned by GetExcludedScenarioTargetIDs and filtered out.
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentalIncomeID := "income-rental-excluded"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{}, // Empty - excluded event not returned by ListIncludedScenarioEvents
		excludedTargets: repo.ExcludedTargets{
			IncomeIDs: map[string]struct{}{rentalIncomeID: {}}, // This item is from an excluded event
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Rental income should NOT appear (it's excluded)
	if len(result.Months[0].Income) != 0 {
		t.Errorf("expected 0 incomes (excluded), got %d", len(result.Months[0].Income))
	}
}

// =============================================================================
// CROSS-TARGETING TESTS - Other impacts targeting synthetic items
// =============================================================================

func TestComputeSnapshot_StartImpact_TargetedByDelta(t *testing.T) {
	/*
		SCENARIO: Delta impact targeting an item created by start impact

		Event A: "Buy rental property" - creates income $2,000/month
		Event B: "Rent increase" - delta +$200/month targeting the same income

		The rental income should show $2,200/month (base + delta).
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentIncreaseDate := makeStartDate(2025, 6, 1)
	rentalIncomeID := "income-rental"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-start",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200000), // $2,000 in cents
						StartDate:      startDate,
					},
				},
			},
			{
				ID:         "event-rent-increase",
				UserID:     "user-1",
				Name:       "Rent increase",
				OccursOn:   rentIncreaseDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-delta",
						EventID:        "event-rent-increase",
						ImpactKind:     scenario.ImpactKindDelta,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200), // +$200 (Amount is in dollars)
						Cadence:        common.FrequencyMonthly,
						StartDate:      rentIncreaseDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	// Query for July 2025 (after rent increase)
	opts := TimelineOptions{
		StartDate:        makeStartDate(2025, 7, 1),
		EndDate:          makeStartDate(2025, 7, 1),
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Find July 2025 in the result months
	var julyMonth *MonthDetailResponse
	for i := range result.Months {
		if result.Months[i].Year == 2025 && result.Months[i].Month == 7 {
			julyMonth = &result.Months[i]
			break
		}
	}
	if julyMonth == nil {
		t.Fatalf("July 2025 not found in result")
	}
	if len(julyMonth.Income) != 1 {
		t.Fatalf("expected 1 income in July, got %d", len(julyMonth.Income))
	}

	income := julyMonth.Income[0]

	// EventAdjAmount should be $2,200 (base $2,000 + delta $200)
	expected := decimal.MustFromString("2200")
	if income.EventAdjAmount.Cmp(expected) != 0 {
		t.Errorf("expected eventAdjAmount $2200, got %s", income.EventAdjAmount.String())
	}

	// Should have 1 applied impact (the delta)
	if len(income.EventImpacts) != 1 {
		t.Errorf("expected 1 applied impact, got %d", len(income.EventImpacts))
	}
}

func TestComputeSnapshot_StartImpact_TargetedByStop(t *testing.T) {
	/*
		SCENARIO: Stop impact ending an item created by start impact

		Event A: "Start side business" - creates income $3,000/month (Jan 2025)
		Event B: "Close business" - stop impact (June 2025)

		- May 2025: Income = $3,000
		- July 2025: Income = $0 (stopped)
	*/
	startDate := makeStartDate(2025, 1, 1)
	stopDate := makeStartDate(2025, 6, 1)
	businessIncomeID := "income-business"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         businessIncomeID,
				ParentID:   businessIncomeID,
				Name:       "Side Business",
				Amount:     *decimal.MustFromString("3000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Business",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-start-business",
				UserID:     "user-1",
				Name:       "Start side business",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-start",
						EventID:        "event-start-business",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(businessIncomeID),
						Amount:         decAmount(300000), // $3,000 in cents
						StartDate:      startDate,
					},
				},
			},
			{
				ID:         "event-close-business",
				UserID:     "user-1",
				Name:       "Close business",
				OccursOn:   stopDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-stop",
						EventID:        "event-close-business",
						ImpactKind:     scenario.ImpactKindStop,
						TargetIncomeID: ptrString(businessIncomeID),
						StartDate:      stopDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	// Test 1: May 2025 - before stop, should have $3,000 income
	mayOpts := TimelineOptions{
		StartDate:        makeStartDate(2025, 5, 1),
		EndDate:          makeStartDate(2025, 5, 1),
		IncludeScenarios: true,
	}
	mayResult, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", mayOpts)
	if err != nil {
		t.Fatalf("May query error: %v", err)
	}
	// Find May 2025 in result
	var mayMonth *MonthDetailResponse
	for i := range mayResult.Months {
		if mayResult.Months[i].Year == 2025 && mayResult.Months[i].Month == 5 {
			mayMonth = &mayResult.Months[i]
			break
		}
	}
	if mayMonth == nil {
		t.Fatalf("May 2025 not found in result")
	}
	if len(mayMonth.Income) != 1 {
		t.Fatalf("May: expected 1 income, got %d", len(mayMonth.Income))
	}
	mayIncome := mayMonth.Income[0].EventAdjAmount
	expectedMay := decimal.MustFromString("3000")
	if mayIncome.Cmp(expectedMay) != 0 {
		t.Errorf("May: expected $3000, got %s", mayIncome.String())
	}

	// Test 2: July 2025 - after stop, should have $0 income
	julyOpts := TimelineOptions{
		StartDate:        makeStartDate(2025, 7, 1),
		EndDate:          makeStartDate(2025, 7, 1),
		IncludeScenarios: true,
	}
	julyResult, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", julyOpts)
	if err != nil {
		t.Fatalf("July query error: %v", err)
	}
	// Find July 2025 in result
	var julyMonth *MonthDetailResponse
	for i := range julyResult.Months {
		if julyResult.Months[i].Year == 2025 && julyResult.Months[i].Month == 7 {
			julyMonth = &julyResult.Months[i]
			break
		}
	}
	if julyMonth == nil {
		t.Fatalf("July 2025 not found in result")
	}
	if len(julyMonth.Income) != 1 {
		t.Fatalf("July: expected 1 income, got %d", len(julyMonth.Income))
	}
	julyIncome := julyMonth.Income[0].EventAdjAmount
	expectedJuly := decimal.MustFromString("0")
	if julyIncome.Cmp(expectedJuly) != 0 {
		t.Errorf("July: expected $0 (stopped), got %s", julyIncome.String())
	}
}

// =============================================================================
// INTEGRATION TESTS - Synthetic items in monthly processing
// =============================================================================

func TestComputeSnapshot_SyntheticIncome_ContributesToNetCash(t *testing.T) {
	/*
		SCENARIO: Synthetic income affects net cash flow

		- Real expense: $1,000/month
		- Synthetic income: $3,000/month via start impact
		- NetSavings should be $2,000 ($3,000 - $1,000)
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentalIncomeID := "income-rental"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("3000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         "expense-maintenance",
				ParentID:   "expense-maintenance",
				Name:       "Property Maintenance",
				Amount:     *decimal.MustFromString("1000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-start",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(300000), // $3,000 in cents
						StartDate:      startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// NetSavings = income - expenses = $3,000 - $1,000 = $2,000
	expectedNetSavings := decimal.MustFromString("2000")
	if result.Months[0].NetSavings.Cmp(expectedNetSavings) != 0 {
		t.Errorf("expected net savings $2000, got %s", result.Months[0].NetSavings.String())
	}
}

func TestComputeSnapshot_SyntheticAsset_ContributesToNetWorth(t *testing.T) {
	/*
		SCENARIO: Synthetic asset affects net worth

		- Real cash: $100,000
		- Synthetic asset: $50,000 via start impact (e.g., new car)
		- NetWorth should be $150,000
	*/
	startDate := makeStartDate(2025, 1, 1)
	carAssetID := "asset-car"

	store := &startImpactTestStore{
		cashAssets: []repo.CashAsset{
			{
				ID:           "cash-1",
				Name:         "Savings",
				Balance:      *decimal.MustFromString("100000"),
				InterestRate: *decimal.MustFromString("0"),
				StartDate:    startDate,
			},
		},
		nonCashAssets: []repo.NonCashAsset{
			{
				ID:               carAssetID,
				ParentID:         carAssetID,
				Name:             "New Car",
				Category:         "Vehicle",
				CurrentValue:     *decimal.MustFromString("50000"),
				AnnualGrowthRate: *decimal.MustFromString("0"),
				StartDate:        startDate,
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-buy-car",
				UserID:     "user-1",
				Name:       "Buy new car",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:            "impact-start",
						EventID:       "event-buy-car",
						ImpactKind:    scenario.ImpactKindStart,
						TargetAssetID: ptrString(carAssetID),
						Amount:        decAmount(5000000), // $50,000 in cents
						StartDate:     startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// NetWorth = cash + assets = $100,000 + $50,000 = $150,000
	expectedNetWorth := decimal.MustFromString("150000")
	if result.Months[0].NetWorth.Cmp(expectedNetWorth) != 0 {
		t.Errorf("expected net worth $150,000, got %s", result.Months[0].NetWorth.String())
	}
}

func TestComputeSnapshot_SyntheticExpense_AffectsNetSavings(t *testing.T) {
	/*
		SCENARIO: Synthetic expense affects net savings

		- Real income: $10,000/month
		- Synthetic expense: $2,000/month via start impact (e.g., childcare)
		- NetSavings should be $8,000
	*/
	startDate := makeStartDate(2025, 1, 1)
	childcareExpenseID := "expense-childcare"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         "income-salary",
				ParentID:   "income-salary",
				Name:       "Salary",
				Amount:     *decimal.MustFromString("10000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         childcareExpenseID,
				ParentID:   childcareExpenseID,
				Name:       "Childcare",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Family",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-childcare",
				UserID:     "user-1",
				Name:       "Have a baby",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:              "impact-start",
						EventID:         "event-childcare",
						ImpactKind:      scenario.ImpactKindStart,
						TargetExpenseID: ptrString(childcareExpenseID),
						Amount:          decAmount(200000), // $2,000 in cents
						StartDate:       startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// NetSavings = income - expenses = $10,000 - $2,000 = $8,000
	expectedNetSavings := decimal.MustFromString("8000")
	if result.Months[0].NetSavings.Cmp(expectedNetSavings) != 0 {
		t.Errorf("expected net savings $8000, got %s", result.Months[0].NetSavings.String())
	}
}

func TestComputeSnapshot_IncludeScenariosFalse_ExcludesScenarioItems(t *testing.T) {
	/*
		SCENARIO: IncludeScenarios=false should filter out scenario-created items

		When user toggles "Show scenarios" OFF, items from start impacts should
		be excluded. This is the "baseline" view.
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentalIncomeID := "income-rental-scenario"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         "income-salary",
				ParentID:   "income-salary",
				Name:       "Salary",
				Amount:     *decimal.MustFromString("10000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income (Scenario)",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-start",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200000),
						StartDate:      startDate,
					},
				},
			},
		},
		// When IncludeScenarios=false, scenario-created items should be excluded
		excludedTargets: repo.ExcludedTargets{
			IncomeIDs: map[string]struct{}{rentalIncomeID: {}},
		},
	}

	service := NewService(store)

	// Test with IncludeScenarios=false
	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: false, // Key: scenarios OFF
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should only have real salary, not scenario rental income
	if len(result.Months[0].Income) != 1 {
		t.Errorf("expected 1 income (salary only), got %d", len(result.Months[0].Income))
	}

	if len(result.Months[0].Income) > 0 && result.Months[0].Income[0].ID != "income-salary" {
		t.Errorf("expected only salary income, got %s", result.Months[0].Income[0].ID)
	}
}

// =============================================================================
// MULTIPLE START IMPACTS TEST
// =============================================================================

func TestComputeSnapshot_MultipleStartImpacts_SameEvent(t *testing.T) {
	/*
		SCENARIO: One event creates multiple items

		"Buy rental property" event with TWO start impacts:
		1. Income: "Rental Income" +$2,000/month
		2. Expense: "Property Maintenance" +$300/month
	*/
	startDate := makeStartDate(2025, 1, 1)
	rentalIncomeID := "income-rental"
	maintenanceExpenseID := "expense-maintenance"

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         rentalIncomeID,
				ParentID:   rentalIncomeID,
				Name:       "Rental Income",
				Amount:     *decimal.MustFromString("2000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Real Estate",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		expenses: []repo.Expense{
			{
				ID:         maintenanceExpenseID,
				ParentID:   maintenanceExpenseID,
				Name:       "Property Maintenance",
				Amount:     *decimal.MustFromString("300"),
				Frequency:  "monthly",
				StartDate:  startDate,
				Category:   "Housing",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-rental",
				UserID:     "user-1",
				Name:       "Buy rental property",
				OccursOn:   startDate,
				IsIncluded: true,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-income",
						EventID:        "event-rental",
						ImpactKind:     scenario.ImpactKindStart,
						TargetIncomeID: ptrString(rentalIncomeID),
						Amount:         decAmount(200000), // $2,000 in cents
						StartDate:      startDate,
					},
					{
						ID:              "impact-expense",
						EventID:         "event-rental",
						ImpactKind:      scenario.ImpactKindStart,
						TargetExpenseID: ptrString(maintenanceExpenseID),
						Amount:          decAmount(30000), // $300 in cents
						StartDate:       startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          startDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have both income and expense
	if len(result.Months[0].Income) != 1 {
		t.Errorf("expected 1 income, got %d", len(result.Months[0].Income))
	}
	if len(result.Months[0].Expenses) != 1 {
		t.Errorf("expected 1 expense, got %d", len(result.Months[0].Expenses))
	}

	// Net savings = $2,000 - $300 = $1,700
	expectedNetSavings := decimal.MustFromString("1700")
	if result.Months[0].NetSavings.Cmp(expectedNetSavings) != 0 {
		t.Errorf("expected net savings $1700, got %s", result.Months[0].NetSavings.String())
	}
}

// =============================================================================
// OVERRIDE IMPACT TESTS - Versioned Items
// =============================================================================

func TestComputeSnapshot_OverrideImpact_AppliesToVersionedItems(t *testing.T) {
	/*
		SCENARIO: User has a versioned income and creates an override impact

		SETUP:
		- Income v1: $5,000/month from Jan 1 - Jan 31 (ID: "income-v1", ParentID: "income-v1")
		- Income v2: $6,000/month from Feb 1 onwards (ID: "income-v2", ParentID: "income-v1")
		- Override impact: targets income-v1, overrides to $8,000/month starting Jan 1

		EXPECTED BEHAVIOR:
		When computing the timeline with scenarios enabled:
		1. January: income-v1 is active → EventAdjAmount should be $8,000
		2. February: income-v2 is active → EventAdjAmount should ALSO be $8,000
		   (because impact targets ParentID="income-v1" which income-v2 shares)

		This test verifies that override impacts properly apply to all versions
		of an item, not just the original.
	*/
	startDate := makeStartDate(2025, 1, 1)
	endDate := makeStartDate(2025, 3, 1)
	incomeV1EndDate := time.Date(2025, 1, 31, 23, 59, 59, 0, time.UTC)

	store := &startImpactTestStore{
		incomes: []repo.Income{
			{
				ID:         "income-v1",
				ParentID:   "income-v1", // Original income is its own parent
				Name:       "Salary",
				Amount:     *decimal.MustFromString("5000"),
				Frequency:  "monthly",
				StartDate:  startDate,
				EndDate:    &incomeV1EndDate, // Ended at end of January
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
			{
				ID:         "income-v2",
				ParentID:   "income-v1", // Points to original income
				Name:       "Salary",
				Amount:     *decimal.MustFromString("6000"), // Increased in Feb
				Frequency:  "monthly",
				StartDate:  time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC),
				EndDate:    nil, // Still ongoing
				Category:   "Employment",
				GrowthRate: *decimal.MustFromString("0"),
			},
		},
		scenarioEvents: []repo.ScenarioEvent{
			{
				ID:         "event-raise",
				UserID:     "user-1",
				Name:       "Big Raise",
				OccursOn:   startDate,
				IsIncluded: true,
				UpdatedAt:  startDate,
				Impacts: []repo.ScenarioImpact{
					{
						ID:             "impact-override",
						EventID:        "event-raise",
						ImpactKind:     scenario.ImpactKindOverride,
						Amount:         decAmount(8000), // Override to $8,000
						Cadence:        common.FrequencyMonthly,
						TargetIncomeID: ptrString("income-v1"), // Targets the original/parent
						StartDate:      startDate,
					},
				},
			},
		},
	}

	service := NewService(store)

	opts := TimelineOptions{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeScenarios: true,
	}

	result, err := service.ComputeFinancialSnapshot(context.Background(), "user-1", opts)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(result.Months))
	}

	// All months should have the override applied ($8,000/month)
	expectedOverrideAmount := decimal.MustFromString("8000")

	for i, month := range result.Months {
		if len(month.Income) != 1 {
			t.Fatalf("month %d: expected 1 income, got %d", i+1, len(month.Income))
		}

		income := month.Income[0]
		t.Logf("Month %d: Income ID=%s, ParentID=%s, Amount=%s, EventAdjAmount=%s",
			i+1, income.ID, income.ParentID, income.Amount.String(), income.EventAdjAmount.String())

		// The EventAdjAmount should be $8,000 in all months (override applied)
		if income.EventAdjAmount.Cmp(expectedOverrideAmount) != 0 {
			t.Errorf("month %d: expected EventAdjAmount $8,000, got %s",
				i+1, income.EventAdjAmount.String())
		}
	}
}
