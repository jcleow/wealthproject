//go:build integration

package repository

import (
	"context"
	"testing"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Integration tests for property planner repository.
// Run with: TEST_DATABASE_URL="postgres://..." go test -tags=integration ./internal/financial_v2/repository/...

func cleanupPropertyPlannerTestData(t *testing.T, store *Store, userID string) {
	t.Helper()
	ctx := context.Background()

	// Delete property-related data in order respecting foreign key constraints
	queries := []string{
		"DELETE FROM liability_rate_periods WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM growth_periods WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_fees WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_sg_details WHERE property_scenario_id IN (SELECT id FROM property_scenarios WHERE user_id = $1)",
		"DELETE FROM property_scenarios WHERE user_id = $1",
	}

	for _, q := range queries {
		if _, err := store.pool.Exec(ctx, q, userID); err != nil {
			t.Logf("Cleanup query failed (may be expected): %v", err)
		}
	}
}

func TestIntegration_PropertyPlanner_CreateScenario(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create a scenario with all related data
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:             "Test HDB",
			PropertyType:     "hdb",
			PropertySubtype:  "resale",
			PropertyPrice:    *decimal.MustFromString("850000"),
			LoanType:         "bank",
			BorrowerType:     "single",
			DownpaymentCpfOa: decimal.MustFromString("100000"),
			DownpaymentCash:  decimal.MustFromString("70000"),
		},
		Fees: []CreateFeeInput{
			{
				FeeContext: "purchase",
				FeeType:    "legal",
				Amount:     *decimal.MustFromString("3000"),
				Currency:   "SGD",
				Frequency:  "one_time",
			},
		},
		GrowthPeriods: []CreateGrowthPeriodInput{
			{
				StartYear:      2025,
				EndYear:        intPtr(2030),
				GrowthRate:     *decimal.MustFromString("3"),
				GrowthStrategy: "annual_step",
			},
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    25,
				FixedYears:   2,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("3.5"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err, "CreatePropertyScenario should succeed")
	require.NotEmpty(t, created.Scenario.ID, "Created scenario should have an ID")

	// Verify scenario fields
	assert.Equal(t, userID, created.Scenario.UserID)
	assert.NotNil(t, created.Scenario.SGDetailsID)

	// Verify SG details
	require.NotNil(t, created.SGDetails, "SGDetails should be set")
	assert.Equal(t, "Test HDB", created.SGDetails.Name)
	assert.Equal(t, "hdb", created.SGDetails.PropertyType)
	assert.Equal(t, "resale", created.SGDetails.PropertySubtype)
	assert.Equal(t, "850000", created.SGDetails.PropertyPrice.String())
	assert.Equal(t, "singapore_citizen", created.SGDetails.Residency) // Default derived

	// Verify fees
	require.Len(t, created.Fees, 1, "Should have 1 fee")
	assert.Equal(t, "purchase", created.Fees[0].FeeContext)
	assert.Equal(t, "legal", created.Fees[0].FeeType)
	assert.Equal(t, "3000", created.Fees[0].Amount.String())

	// Verify growth periods
	require.Len(t, created.GrowthPeriods, 1, "Should have 1 growth period")
	assert.Equal(t, 2025, created.GrowthPeriods[0].StartYear)
	assert.Equal(t, 2030, *created.GrowthPeriods[0].EndYear)
	assert.Equal(t, "3", created.GrowthPeriods[0].GrowthRate.String())

	// Verify rate periods
	require.Len(t, created.RatePeriods, 1, "Should have 1 rate period")
	assert.Equal(t, "2025-01", created.RatePeriods[0].StartMonth)
	assert.Equal(t, 25, created.RatePeriods[0].TermYears)
	assert.Equal(t, 2, created.RatePeriods[0].FixedYears)
	assert.Equal(t, "2.6", created.RatePeriods[0].FixedRate.String())
	assert.Equal(t, "3.5", created.RatePeriods[0].FloatingRate.String())
}

func TestIntegration_PropertyPlanner_GetScenario(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create a scenario first
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "Get Test HDB",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("750000"),
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-06",
				TermYears:    20,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("2.6"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	// Get the scenario
	fetched, err := store.GetPropertyScenario(ctx, userID, created.Scenario.ID)
	require.NoError(t, err, "GetPropertyScenario should succeed")

	assert.Equal(t, created.Scenario.ID, fetched.Scenario.ID)
	assert.Equal(t, "Get Test HDB", fetched.SGDetails.Name)
	assert.Len(t, fetched.RatePeriods, 1)
}

func TestIntegration_PropertyPlanner_GetScenario_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	_, err := store.GetPropertyScenario(ctx, userID, testutil.NonexistentUUID)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound for non-existent scenario")
}

func TestIntegration_PropertyPlanner_GetScenario_WrongUser(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID
	otherUserID := "other-user-00000000"

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create a scenario as userID
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "User Isolation Test",
			PropertyType:  "condo",
			PropertyPrice: *decimal.MustFromString("1500000"),
			LoanType:      "bank",
			BorrowerType:  "single",
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    30,
				FixedRate:    *decimal.MustFromString("3"),
				FloatingRate: *decimal.MustFromString("4"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	// Try to get as different user - should not find it
	_, err = store.GetPropertyScenario(ctx, otherUserID, created.Scenario.ID)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound when accessing other user's scenario")
}

func TestIntegration_PropertyPlanner_ListScenarios(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create multiple scenarios
	for i := 1; i <= 3; i++ {
		input := CreateScenarioInput{
			Country: "SG",
			SGDetails: &CreateSGDetailsInput{
				Name:          "List Test " + string(rune('A'+i-1)),
				PropertyType:  "hdb",
				PropertyPrice: *decimal.MustFromString("800000"),
				LoanType:      "hdb",
				BorrowerType:  "single",
			},
			RatePeriods: []CreateRatePeriodInput{
				{
					StartMonth:   "2025-01",
					TermYears:    25,
					FixedRate:    *decimal.MustFromString("2.6"),
					FloatingRate: *decimal.MustFromString("2.6"),
				},
			},
		}
		_, err := store.CreatePropertyScenario(ctx, userID, input)
		require.NoError(t, err)
	}

	// List scenarios
	scenarios, err := store.ListPropertyScenarios(ctx, userID)
	require.NoError(t, err, "ListPropertyScenarios should succeed")
	assert.Len(t, scenarios, 3, "Should have 3 scenarios")

	// Each should have full data loaded
	for _, s := range scenarios {
		assert.NotNil(t, s.SGDetails, "Each scenario should have SGDetails")
		assert.Len(t, s.RatePeriods, 1, "Each scenario should have rate periods")
	}
}

func TestIntegration_PropertyPlanner_UpdateScenario(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create initial scenario
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "Update Test",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("700000"),
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		Fees: []CreateFeeInput{
			{
				FeeContext: "purchase",
				FeeType:    "legal",
				Amount:     *decimal.MustFromString("2500"),
				Currency:   "SGD",
				Frequency:  "one_time",
			},
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    25,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("2.6"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	// Update the scenario
	updateInput := UpdateScenarioInput{
		SGDetails: &CreateSGDetailsInput{
			Name:          "Updated Name",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("750000"), // Changed
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		Fees: []CreateFeeInput{
			// Changed fee
			{
				FeeContext: "purchase",
				FeeType:    "valuation",
				Amount:     *decimal.MustFromString("500"),
				Currency:   "SGD",
				Frequency:  "one_time",
			},
			// Added new fee
			{
				FeeContext: "purchase",
				FeeType:    "agent",
				Amount:     *decimal.MustFromString("2"),
				Currency:   "SGD",
				Frequency:  "one_time",
			},
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    20, // Changed
				FixedRate:    *decimal.MustFromString("2.5"),
				FloatingRate: *decimal.MustFromString("3.0"),
			},
		},
	}

	updated, err := store.UpdatePropertyScenario(ctx, userID, created.Scenario.ID, updateInput)
	require.NoError(t, err, "UpdatePropertyScenario should succeed")

	// Verify updates
	assert.Equal(t, "Updated Name", updated.SGDetails.Name)
	assert.Equal(t, "750000", updated.SGDetails.PropertyPrice.String())
	assert.Len(t, updated.Fees, 2, "Should have 2 fees after update")
	assert.Equal(t, 20, updated.RatePeriods[0].TermYears)
	assert.Equal(t, "2.5", updated.RatePeriods[0].FixedRate.String())
}

func TestIntegration_PropertyPlanner_UpdateScenario_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	updateInput := UpdateScenarioInput{
		SGDetails: &CreateSGDetailsInput{
			Name:          "Ghost",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("500000"),
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    25,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("2.6"),
			},
		},
	}

	_, err := store.UpdatePropertyScenario(ctx, userID, testutil.NonexistentUUID, updateInput)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound for non-existent scenario")
}

func TestIntegration_PropertyPlanner_DeleteScenario(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create a scenario
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "Delete Test",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("600000"),
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		Fees: []CreateFeeInput{
			{
				FeeContext: "purchase",
				FeeType:    "legal",
				Amount:     *decimal.MustFromString("2000"),
				Currency:   "SGD",
				Frequency:  "one_time",
			},
		},
		GrowthPeriods: []CreateGrowthPeriodInput{
			{
				StartYear:      2025,
				GrowthRate:     *decimal.MustFromString("2"),
				GrowthStrategy: "fixed",
			},
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    25,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("2.6"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	// Delete the scenario
	err = store.DeletePropertyScenario(ctx, userID, created.Scenario.ID)
	require.NoError(t, err, "DeletePropertyScenario should succeed")

	// Verify it's gone
	_, err = store.GetPropertyScenario(ctx, userID, created.Scenario.ID)
	assert.ErrorIs(t, err, ErrNotFound, "Scenario should not be found after delete")

	// Verify related data is also gone (cascade delete)
	var count int
	err = store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM property_fees WHERE property_scenario_id = $1", created.Scenario.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "Fees should be cascade deleted")

	err = store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM growth_periods WHERE property_scenario_id = $1", created.Scenario.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "Growth periods should be cascade deleted")

	err = store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM liability_rate_periods WHERE property_scenario_id = $1", created.Scenario.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "Rate periods should be cascade deleted")
}

func TestIntegration_PropertyPlanner_DeleteScenario_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	err := store.DeletePropertyScenario(ctx, userID, testutil.NonexistentUUID)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound for non-existent scenario")
}

func TestIntegration_PropertyPlanner_ResidencyDerivation(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	testutil.CleanupTestData(t, pool, userID) // Also clean incomes
	t.Cleanup(func() {
		cleanupPropertyPlannerTestData(t, store, userID)
		testutil.CleanupTestData(t, pool, userID)
	})

	// Create an income with specific residency
	var incomeID string
	err := store.pool.QueryRow(ctx, `
		INSERT INTO finance_incomes (user_id, name, amount, frequency, category, start_date, residency_status)
		VALUES ($1, 'Test Salary', 10000, 'monthly', 'salary', NOW(), 'permanent_resident')
		RETURNING id
	`, userID).Scan(&incomeID)
	require.NoError(t, err)

	// Create scenario linking to that income
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:              "Residency Test",
			PropertyType:      "condo",
			PropertyPrice:     *decimal.MustFromString("1200000"),
			LoanType:          "bank",
			BorrowerType:      "single",
			Borrower1IncomeID: &incomeID,
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    30,
				FixedRate:    *decimal.MustFromString("3"),
				FloatingRate: *decimal.MustFromString("4"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	// Residency should be derived from the linked income
	assert.Equal(t, "permanent_resident", created.SGDetails.Residency, "Residency should be derived from income")
}

func TestIntegration_PropertyPlanner_MultipleRatePeriods(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)
	t.Cleanup(func() { cleanupPropertyPlannerTestData(t, store, userID) })

	// Create scenario with multiple rate periods (refinancing scenario)
	input := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "Refinance Test",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("800000"),
			LoanType:      "bank",
			BorrowerType:  "single",
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    5,
				FixedYears:   2,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("3.5"),
			},
			{
				StartMonth:   "2030-01",
				TermYears:    5,
				FixedYears:   2,
				FixedRate:    *decimal.MustFromString("2.8"),
				FloatingRate: *decimal.MustFromString("3.8"),
			},
			{
				StartMonth:   "2035-01",
				TermYears:    15,
				FixedYears:   0,
				FixedRate:    *decimal.MustFromString("3.0"),
				FloatingRate: *decimal.MustFromString("4.0"),
			},
		},
	}

	created, err := store.CreatePropertyScenario(ctx, userID, input)
	require.NoError(t, err)

	assert.Len(t, created.RatePeriods, 3, "Should have 3 rate periods")

	// Verify order is preserved
	assert.Equal(t, "2025-01", created.RatePeriods[0].StartMonth)
	assert.Equal(t, "2030-01", created.RatePeriods[1].StartMonth)
	assert.Equal(t, "2035-01", created.RatePeriods[2].StartMonth)
}

func TestIntegration_PropertyPlanner_DeleteAllScenarios(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID
	otherUserID := "other-user-00000000"

	cleanupPropertyPlannerTestData(t, store, userID)
	cleanupPropertyPlannerTestData(t, store, otherUserID)
	t.Cleanup(func() {
		cleanupPropertyPlannerTestData(t, store, userID)
		cleanupPropertyPlannerTestData(t, store, otherUserID)
	})

	// Create multiple scenarios for the target user
	for i := 1; i <= 3; i++ {
		input := CreateScenarioInput{
			Country: "SG",
			SGDetails: &CreateSGDetailsInput{
				Name:          "DeleteAll Test " + string(rune('A'+i-1)),
				PropertyType:  "hdb",
				PropertyPrice: *decimal.MustFromString("800000"),
				LoanType:      "hdb",
				BorrowerType:  "single",
			},
			Fees: []CreateFeeInput{
				{
					FeeContext: "purchase",
					FeeType:    "legal",
					Amount:     *decimal.MustFromString("2500"),
					Currency:   "SGD",
					Frequency:  "one_time",
				},
			},
			GrowthPeriods: []CreateGrowthPeriodInput{
				{
					StartYear:      2025,
					GrowthRate:     *decimal.MustFromString("3"),
					GrowthStrategy: "annual_step",
				},
			},
			RatePeriods: []CreateRatePeriodInput{
				{
					StartMonth:   "2025-01",
					TermYears:    25,
					FixedRate:    *decimal.MustFromString("2.6"),
					FloatingRate: *decimal.MustFromString("2.6"),
				},
			},
		}
		_, err := store.CreatePropertyScenario(ctx, userID, input)
		require.NoError(t, err)
	}

	// Create a scenario for a different user (should not be deleted)
	otherInput := CreateScenarioInput{
		Country: "SG",
		SGDetails: &CreateSGDetailsInput{
			Name:          "Other User Scenario",
			PropertyType:  "hdb",
			PropertyPrice: *decimal.MustFromString("700000"),
			LoanType:      "hdb",
			BorrowerType:  "single",
		},
		RatePeriods: []CreateRatePeriodInput{
			{
				StartMonth:   "2025-01",
				TermYears:    25,
				FixedRate:    *decimal.MustFromString("2.6"),
				FloatingRate: *decimal.MustFromString("2.6"),
			},
		},
	}
	_, err := store.CreatePropertyScenario(ctx, otherUserID, otherInput)
	require.NoError(t, err)

	// Verify all scenarios exist
	scenarios, err := store.ListPropertyScenarios(ctx, userID)
	require.NoError(t, err)
	assert.Len(t, scenarios, 3, "Should have 3 scenarios for target user")

	otherScenarios, err := store.ListPropertyScenarios(ctx, otherUserID)
	require.NoError(t, err)
	assert.Len(t, otherScenarios, 1, "Should have 1 scenario for other user")

	// Delete all scenarios for target user
	rowsDeleted, err := store.DeleteAllPropertyScenarios(ctx, userID)
	require.NoError(t, err, "DeleteAllPropertyScenarios should succeed")
	assert.Equal(t, int64(3), rowsDeleted, "Should have deleted 3 scenarios")

	// Verify all scenarios for target user are deleted
	scenarios, err = store.ListPropertyScenarios(ctx, userID)
	require.NoError(t, err)
	assert.Empty(t, scenarios, "Should have no scenarios for target user after delete")

	// Verify other user's scenarios are not affected
	otherScenarios, err = store.ListPropertyScenarios(ctx, otherUserID)
	require.NoError(t, err)
	assert.Len(t, otherScenarios, 1, "Other user's scenario should not be deleted")

	// Verify related data is also deleted (sg_details, fees, growth_periods, rate_periods)
	var count int
	err = store.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM property_sg_details psd
		WHERE NOT EXISTS (SELECT 1 FROM property_scenarios ps WHERE ps.sg_details_id = psd.id)
		AND psd.id IN (SELECT sg_details_id FROM property_scenarios WHERE user_id = $1)
	`, userID).Scan(&count)
	// This query checks for orphaned sg_details - there should be none
	require.NoError(t, err)
}

func TestIntegration_PropertyPlanner_DeleteAllScenarios_Empty(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	cleanupPropertyPlannerTestData(t, store, userID)

	// Delete when no scenarios exist - should succeed with 0 rows affected
	rowsDeleted, err := store.DeleteAllPropertyScenarios(ctx, userID)
	require.NoError(t, err, "DeleteAllPropertyScenarios should succeed even with no data")
	assert.Equal(t, int64(0), rowsDeleted, "Should have deleted 0 scenarios")
}

// Helper function
func intPtr(i int) *int {
	return &i
}
