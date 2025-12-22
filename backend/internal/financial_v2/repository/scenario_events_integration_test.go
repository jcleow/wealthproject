//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func decAmount(v int64) *decimal.Decimal {
	return decimal.NewFromInt64(v, 0)
}

// Integration tests for scenario events with real database.
// Run with: go test -tags=integration ./internal/financial_v2/repository/...

func TestIntegration_CreateAndUpdateScenarioEvent_WithImpacts(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	// Cleanup before and after test
	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create test financial items to target
	expenseID := testutil.CreateTestExpense(t, pool, userID, "Test Rent", 2000)
	incomeID := testutil.CreateTestIncome(t, pool, userID, "Test Salary", 5000)

	// Create a scenario event with impacts
	occursOn := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	displayColor := "#10b981"

	event := ScenarioEvent{
		UserID:       userID,
		Name:         "Career Change",
		Description:  "New job starting",
		OccursOn:     occursOn,
		DisplayIcon:  "briefcase",
		DisplayColor: &displayColor,
		Tags:         []string{"career", "income"},
		IsIncluded:   true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:      "delta",
				Amount:          decAmount(1000),
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				TargetIncomeID:  &incomeID,
			},
		},
	}

	// Create the event
	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err, "CreateScenarioEventV2 should succeed")
	require.NotEmpty(t, created.ID, "Created event should have an ID")
	assert.Equal(t, "Career Change", created.Name)
	assert.Len(t, created.Impacts, 1, "Should have 1 impact")
	assert.Equal(t, 0, created.Impacts[0].Amount.Cmp(decAmount(1000)))

	// Now update the event with modified impacts
	created.Name = "Updated Career Change"
	created.Impacts = []ScenarioImpact{
		{
			ImpactKind:      "delta",
			Amount:          decAmount(1500), // Changed amount
			Cadence:         common.FrequencyMonthly,
			StartDate:       startDate,
			TargetIncomeID:  &incomeID,
		},
		{
			ImpactKind:      "override",
			Amount:          decAmount(2500), // New impact on expense
			Cadence:         common.FrequencyMonthly,
			StartDate:       startDate,
			TargetExpenseID: &expenseID,
		},
	}

	updated, err := store.UpdateScenarioEventV2(ctx, created)
	require.NoError(t, err, "UpdateScenarioEventV2 should succeed")
	assert.Equal(t, "Updated Career Change", updated.Name)
	assert.Len(t, updated.Impacts, 2, "Should have 2 impacts after update")

	// Verify by fetching from database
	fetched, err := store.GetScenarioEventV2(ctx, userID, created.ID)
	require.NoError(t, err, "GetScenarioEventV2 should succeed")
	assert.Equal(t, "Updated Career Change", fetched.Name)
	assert.Len(t, fetched.Impacts, 2, "Fetched event should have 2 impacts")

	// Verify impact amounts were persisted
	var foundIncome, foundExpense bool
	for _, imp := range fetched.Impacts {
		if imp.TargetIncomeID != nil && *imp.TargetIncomeID == incomeID {
			foundIncome = true
			assert.Equal(t, 0, imp.Amount.Cmp(decAmount(1500)), "Income impact amount should be 1500")
			assert.Equal(t, "delta", imp.ImpactKind)
		}
		if imp.TargetExpenseID != nil && *imp.TargetExpenseID == expenseID {
			foundExpense = true
			assert.Equal(t, 0, imp.Amount.Cmp(decAmount(2500)), "Expense impact amount should be 2500")
			assert.Equal(t, "override", imp.ImpactKind)
		}
	}
	assert.True(t, foundIncome, "Should find income impact")
	assert.True(t, foundExpense, "Should find expense impact")
}

func TestIntegration_UpdateScenarioEvent_RemovesImpacts(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	expenseID1 := testutil.CreateTestExpense(t, pool, userID, "Expense 1", 1000)
	expenseID2 := testutil.CreateTestExpense(t, pool, userID, "Expense 2", 2000)

	occursOn := time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC)

	// Create event with 2 impacts
	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Multiple Impacts Event",
		OccursOn:    occursOn,
		DisplayIcon: "list",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:      "delta",
				Amount:          decAmount(100),
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				TargetExpenseID: &expenseID1,
			},
			{
				ImpactKind:      "delta",
				Amount:          decAmount(200),
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				TargetExpenseID: &expenseID2,
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)
	require.Len(t, created.Impacts, 2)

	// Update to remove one impact
	created.Impacts = []ScenarioImpact{
		{
			ImpactKind:      "delta",
			Amount:          decAmount(150), // Changed
			Cadence:         common.FrequencyMonthly,
			StartDate:       startDate,
			TargetExpenseID: &expenseID1,
		},
		// expenseID2 impact removed
	}

	updated, err := store.UpdateScenarioEventV2(ctx, created)
	require.NoError(t, err)
	assert.Len(t, updated.Impacts, 1, "Should have only 1 impact after update")

	// Verify removal persisted
	fetched, err := store.GetScenarioEventV2(ctx, userID, created.ID)
	require.NoError(t, err)
	assert.Len(t, fetched.Impacts, 1, "Fetched event should have 1 impact")
	assert.Equal(t, 0, fetched.Impacts[0].Amount.Cmp(decAmount(150)))
}

func TestIntegration_UpdateScenarioEvent_StartImpact_UpdatesFinancialItem(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create an expense that we'll update via start impact
	expenseID := testutil.CreateTestExpense(t, pool, userID, "Rent", 1500)

	occursOn := time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC)

	// Create event with start impact
	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Rent Increase",
		OccursOn:    occursOn,
		DisplayIcon: "home",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:      "start",
				Amount:          decAmount(2000), // New rent amount
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				TargetExpenseID: &expenseID,
				Category:        "housing",
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)

	// Verify the expense was updated
	var expenseAmount int64
	var expenseCategory string
	err = pool.QueryRow(ctx, "SELECT amount, category FROM finance_expenses WHERE id = $1", expenseID).Scan(&expenseAmount, &expenseCategory)
	require.NoError(t, err)
	assert.Equal(t, int64(2000), expenseAmount, "Expense amount should be updated to 2000")
	assert.Equal(t, "housing", expenseCategory, "Expense category should be updated")

	// Now update the impact with a different amount
	created.Impacts[0].Amount = decAmount(2500)
	created.Impacts[0].Category = "rent"

	_, err = store.UpdateScenarioEventV2(ctx, created)
	require.NoError(t, err)

	// Verify the expense was updated again
	err = pool.QueryRow(ctx, "SELECT amount, category FROM finance_expenses WHERE id = $1", expenseID).Scan(&expenseAmount, &expenseCategory)
	require.NoError(t, err)
	assert.Equal(t, int64(2500), expenseAmount, "Expense amount should be updated to 2500")
	assert.Equal(t, "rent", expenseCategory, "Expense category should be updated to rent")
}

func TestIntegration_UpdateScenarioEvent_LiabilityStartImpact_WithInterestAndMinPayment(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create a liability
	liabilityID := testutil.CreateTestLiability(t, pool, userID, "Credit Card", 5000)

	occursOn := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	interestRate := 18.5
	minPayment := int64(200)

	// Create event with liability start impact
	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Credit Card Adjustment",
		OccursOn:    occursOn,
		DisplayIcon: "credit-card",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:        "start",
				Amount:            decAmount(7500), // New balance
				Cadence:           common.FrequencyMonthly,
				StartDate:         startDate,
				TargetLiabilityID: &liabilityID,
				Category:          "credit_card",
				InterestRate:      &interestRate,
				MinimumPayment:    &minPayment,
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)

	// Verify the liability was updated
	var balance int64
	var apr, minPay float64
	err = pool.QueryRow(ctx, `
		SELECT current_balance, interest_rate_apr, minimum_payment
		FROM finance_liabilities WHERE id = $1
	`, liabilityID).Scan(&balance, &apr, &minPay)
	require.NoError(t, err)
	assert.Equal(t, int64(7500), balance, "Liability balance should be 7500")
	assert.Equal(t, 18.5, apr, "Interest rate should be 18.5")
	assert.Equal(t, float64(200), minPay, "Min payment should be 200")

	// Update with new values
	newInterestRate := 15.0
	newMinPayment := int64(250)
	created.Impacts[0].Amount = decAmount(6000)
	created.Impacts[0].InterestRate = &newInterestRate
	created.Impacts[0].MinimumPayment = &newMinPayment

	_, err = store.UpdateScenarioEventV2(ctx, created)
	require.NoError(t, err)

	// Verify update persisted
	err = pool.QueryRow(ctx, `
		SELECT current_balance, interest_rate_apr, minimum_payment
		FROM finance_liabilities WHERE id = $1
	`, liabilityID).Scan(&balance, &apr, &minPay)
	require.NoError(t, err)
	assert.Equal(t, int64(6000), balance, "Liability balance should be updated to 6000")
	assert.Equal(t, 15.0, apr, "Interest rate should be updated to 15.0")
	assert.Equal(t, float64(250), minPay, "Min payment should be updated to 250")
}

func TestIntegration_DeleteScenarioEvent_CascadesImpacts(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	expenseID := testutil.CreateTestExpense(t, pool, userID, "Delete Test Expense", 500)

	occursOn := time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC)

	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Event To Delete",
		OccursOn:    occursOn,
		DisplayIcon: "trash",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:      "delta",
				Amount:          decAmount(100),
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				TargetExpenseID: &expenseID,
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)

	// Delete the event
	err = store.DeleteScenarioEventV2(ctx, userID, created.ID)
	require.NoError(t, err)

	// Verify event is gone
	_, err = store.GetScenarioEventV2(ctx, userID, created.ID)
	assert.ErrorIs(t, err, ErrScenarioNotFound, "Event should not be found after delete")
}

func TestIntegration_DeltaImpact_PersistsEndDateAndGrowthRate(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 10000)

	occursOn := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	growthRate := 100.0 // 100% percentage delta

	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Salary Promotion",
		OccursOn:    occursOn,
		DisplayIcon: "trending-up",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:     "delta",
				Amount:         decAmount(0), // 0 amount for percentage delta
				Cadence:        common.FrequencyMonthly,
				StartDate:      startDate,
				EndDate:        &endDate,
				TargetIncomeID: &incomeID,
				GrowthRate:     &growthRate,
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)
	require.Len(t, created.Impacts, 1, "Should have 1 impact")

	// Verify endDate and growthRate were persisted
	impact := created.Impacts[0]
	require.NotNil(t, impact.EndDate, "EndDate should be set")
	assert.Equal(t, endDate.Year(), impact.EndDate.Year(), "EndDate year should match")
	assert.Equal(t, endDate.Month(), impact.EndDate.Month(), "EndDate month should match")
	require.NotNil(t, impact.GrowthRate, "GrowthRate should be set")
	assert.Equal(t, growthRate, *impact.GrowthRate, "GrowthRate should be 100%")

	// Also verify by fetching directly from database
	var dbEndDate *time.Time
	var dbGrowthRate float64
	err = pool.QueryRow(ctx, `
		SELECT end_date, growth_rate
		FROM finance_incomes
		WHERE scenario_event_id = $1 AND parent_id IS NOT NULL
	`, created.ID).Scan(&dbEndDate, &dbGrowthRate)
	require.NoError(t, err, "Should find income impact row in database")
	require.NotNil(t, dbEndDate, "EndDate should be persisted in DB")
	assert.Equal(t, endDate.Year(), dbEndDate.Year(), "DB EndDate year should match")
	assert.Equal(t, growthRate, dbGrowthRate, "DB GrowthRate should match")

	// Update the event with new endDate
	newEndDate := time.Date(2027, 6, 30, 0, 0, 0, 0, time.UTC)
	newGrowthRate := 50.0
	created.Impacts[0].EndDate = &newEndDate
	created.Impacts[0].GrowthRate = &newGrowthRate

	updated, err := store.UpdateScenarioEventV2(ctx, created)
	require.NoError(t, err)
	require.Len(t, updated.Impacts, 1)

	// Verify updated values
	updatedImpact := updated.Impacts[0]
	require.NotNil(t, updatedImpact.EndDate, "Updated EndDate should be set")
	assert.Equal(t, newEndDate.Year(), updatedImpact.EndDate.Year(), "Updated EndDate year should match")
	assert.Equal(t, newEndDate.Month(), updatedImpact.EndDate.Month(), "Updated EndDate month should match")
	require.NotNil(t, updatedImpact.GrowthRate, "Updated GrowthRate should be set")
	assert.Equal(t, newGrowthRate, *updatedImpact.GrowthRate, "Updated GrowthRate should be 50%")
}

func TestIntegration_OverrideImpact_PersistsEndDate(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	expenseID := testutil.CreateTestExpense(t, pool, userID, "Rent", 2000)

	occursOn := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)

	event := ScenarioEvent{
		UserID:      userID,
		Name:        "Temporary Rent Reduction",
		OccursOn:    occursOn,
		DisplayIcon: "home",
		IsIncluded:  true,
		Impacts: []ScenarioImpact{
			{
				ImpactKind:      "override",
				Amount:          decAmount(1500), // Override to lower amount
				Cadence:         common.FrequencyMonthly,
				StartDate:       startDate,
				EndDate:         &endDate,
				TargetExpenseID: &expenseID,
			},
		},
	}

	created, err := store.CreateScenarioEventV2(ctx, event)
	require.NoError(t, err)
	require.Len(t, created.Impacts, 1)

	// Verify endDate was persisted
	impact := created.Impacts[0]
	require.NotNil(t, impact.EndDate, "EndDate should be set for override impact")
	assert.Equal(t, endDate.Year(), impact.EndDate.Year())
	assert.Equal(t, endDate.Month(), impact.EndDate.Month())

	// Verify in database
	var dbEndDate *time.Time
	err = pool.QueryRow(ctx, `
		SELECT end_date
		FROM finance_expenses
		WHERE scenario_event_id = $1 AND parent_id IS NOT NULL
	`, created.ID).Scan(&dbEndDate)
	require.NoError(t, err, "Should find expense impact row in database")
	require.NotNil(t, dbEndDate, "EndDate should be persisted in DB for override impact")
	assert.Equal(t, endDate.Year(), dbEndDate.Year())
}
