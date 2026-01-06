//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Integration tests for income allocations using fund_flow_rules.
// Run with: go test -tags=integration ./internal/financial_v2/repository/...

func TestIntegration_CreateIncomeAllocation_ToCashAccount(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create prerequisite fixtures
	incomeID := testutil.CreateTestIncome(t, pool, userID, "Test Salary", 5000)
	cashAccountID := createTestCashAccount(t, pool, userID, "Savings Account")

	// Create allocation: 30% of income to cash account
	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("30"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err, "CreateIncomeAllocation should succeed")
	require.NotEmpty(t, created.ID, "Created allocation should have an ID")
	assert.Equal(t, incomeID, created.IncomeID, "IncomeID should match")
	assert.NotNil(t, created.TargetCashAccountID, "TargetCashAccountID should be set")
	assert.Equal(t, cashAccountID, *created.TargetCashAccountID, "TargetCashAccountID value should match")
	assert.Nil(t, created.TargetInvestmentID, "TargetInvestmentID should be nil")
	assert.Equal(t, "percentage", created.AllocationType, "AllocationType should match")
	assert.Equal(t, 0, created.AllocationValue.Cmp(decimal.MustFromString("30")), "AllocationValue should be 30")

	// Verify it's stored in fund_flow_rules table
	var ruleType string
	var ruleName string
	err = pool.QueryRow(ctx,
		`SELECT rule_type, name FROM fund_flow_rules WHERE id = $1`,
		created.ID,
	).Scan(&ruleType, &ruleName)
	require.NoError(t, err, "Should find rule in fund_flow_rules")
	assert.Equal(t, "allocation", ruleType, "Rule type should be 'allocation'")
	assert.Contains(t, ruleName, "Test Salary", "Rule name should contain income name")
}

func TestIntegration_CreateIncomeAllocation_ToInvestment(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 8000)
	investmentID := createTestInvestment(t, pool, userID, "Index Fund")

	// Create allocation: fixed $500 per month to investment
	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "fixed",
		AllocationValue:    *decimal.MustFromString("500"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	assert.NotNil(t, created.TargetInvestmentID, "TargetInvestmentID should be set")
	assert.Equal(t, investmentID, *created.TargetInvestmentID)
	assert.Nil(t, created.TargetCashAccountID, "TargetCashAccountID should be nil")
	assert.Equal(t, "fixed", created.AllocationType)
	assert.Equal(t, 0, created.AllocationValue.Cmp(decimal.MustFromString("500")))
}

func TestIntegration_CreateIncomeAllocation_IncomeNotOwned(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	cashAccountID := createTestCashAccount(t, pool, userID, "Savings")

	// Try to create allocation for non-existent income
	allocation := IncomeAllocation{
		IncomeID:            testutil.NonexistentUUID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("50"),
	}

	_, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound for non-existent income")
}

func TestIntegration_ListIncomeAllocations(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Main Income", 6000)
	cashAccountID := createTestCashAccount(t, pool, userID, "Emergency Fund")
	investmentID := createTestInvestment(t, pool, userID, "Growth Fund")

	// Create two allocations for the same income
	alloc1 := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("20"),
	}
	alloc2 := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "fixed",
		AllocationValue:    *decimal.MustFromString("1000"),
	}

	created1, err := store.CreateIncomeAllocation(ctx, userID, alloc1)
	require.NoError(t, err)
	created2, err := store.CreateIncomeAllocation(ctx, userID, alloc2)
	require.NoError(t, err)

	// List allocations
	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, allocations, 2, "Should return 2 allocations")

	// Verify both allocations are present
	ids := make(map[string]bool)
	for _, a := range allocations {
		ids[a.ID] = true
	}
	assert.True(t, ids[created1.ID], "First allocation should be in list")
	assert.True(t, ids[created2.ID], "Second allocation should be in list")
}

func TestIntegration_ListIncomeAllocations_IncomeNotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	_, err := store.ListIncomeAllocations(ctx, userID, testutil.NonexistentUUID)
	assert.ErrorIs(t, err, ErrNotFound, "Should return ErrNotFound for non-existent income")
}

func TestIntegration_ListIncomeAllocations_IncomeExistsButNoAllocations(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income With No Allocations", 3000)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	assert.Empty(t, allocations, "Should return empty slice for income with no allocations")
}

func TestIntegration_GetIncomeAllocation(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 7000)
	investmentID := createTestInvestment(t, pool, userID, "Portfolio")

	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("25"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Fetch by ID
	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, fetched.ID)
	assert.Equal(t, incomeID, fetched.IncomeID)
	assert.Equal(t, investmentID, *fetched.TargetInvestmentID)
	assert.Equal(t, "percentage", fetched.AllocationType)
}

func TestIntegration_GetIncomeAllocation_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	_, err := store.GetIncomeAllocation(ctx, userID, testutil.NonexistentUUID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestIntegration_UpdateIncomeAllocation(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 5500)
	cashAccountID := createTestCashAccount(t, pool, userID, "Cash")
	investmentID := createTestInvestment(t, pool, userID, "Investment")

	// Create initial allocation to cash account
	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("15"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Update: change target to investment and update value
	created.TargetCashAccountID = nil
	created.TargetInvestmentID = &investmentID
	created.AllocationType = "fixed"
	created.AllocationValue = *decimal.MustFromString("800")

	updated, err := store.UpdateIncomeAllocation(ctx, userID, *created)
	require.NoError(t, err)
	assert.Equal(t, created.ID, updated.ID, "ID should remain the same")
	assert.Nil(t, updated.TargetCashAccountID, "Cash account should be nil after update")
	assert.NotNil(t, updated.TargetInvestmentID, "Investment should be set")
	assert.Equal(t, investmentID, *updated.TargetInvestmentID)
	assert.Equal(t, "fixed", updated.AllocationType)
	assert.Equal(t, 0, updated.AllocationValue.Cmp(decimal.MustFromString("800")))

	// Verify by fetching again
	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, investmentID, *fetched.TargetInvestmentID)
	assert.Equal(t, "fixed", fetched.AllocationType)
}

func TestIntegration_UpdateIncomeAllocation_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	allocation := IncomeAllocation{
		ID:             testutil.NonexistentUUID,
		AllocationType: "percentage",
		AllocationValue: *decimal.MustFromString("10"),
	}

	_, err := store.UpdateIncomeAllocation(ctx, userID, allocation)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestIntegration_DeleteIncomeAllocation(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 4000)
	cashAccountID := createTestCashAccount(t, pool, userID, "Cash")

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("10"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Delete
	err = store.DeleteIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)

	// Verify it's gone
	_, err = store.GetIncomeAllocation(ctx, userID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Verify in fund_flow_rules table
	var count int
	err = pool.QueryRow(ctx, `SELECT COUNT(*) FROM fund_flow_rules WHERE id = $1`, created.ID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "Rule should be deleted from fund_flow_rules")
}

func TestIntegration_DeleteIncomeAllocation_NotFound(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	err := store.DeleteIncomeAllocation(ctx, userID, testutil.NonexistentUUID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestIntegration_SetIncomeAllocationEndDate(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 6000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("40"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	assert.Nil(t, created.EndDate, "EndDate should be nil initially")

	// Set end date
	endDate := time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC)
	updated, err := store.SetIncomeAllocationEndDate(ctx, userID, created.ID, endDate)
	require.NoError(t, err)
	require.NotNil(t, updated.EndDate, "EndDate should be set")
	assert.Equal(t, endDate.Year(), updated.EndDate.Year())
	assert.Equal(t, endDate.Month(), updated.EndDate.Month())

	// Verify by fetching
	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	require.NotNil(t, fetched.EndDate)
	assert.Equal(t, endDate.Year(), fetched.EndDate.Year())
}

func TestIntegration_ListAllIncomeAllocations(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create two incomes with allocations
	income1ID := testutil.CreateTestIncome(t, pool, userID, "Income 1", 5000)
	income2ID := testutil.CreateTestIncome(t, pool, userID, "Income 2", 3000)
	investmentID := createTestInvestment(t, pool, userID, "Shared Fund")

	alloc1 := IncomeAllocation{
		IncomeID:           income1ID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("20"),
	}
	alloc2 := IncomeAllocation{
		IncomeID:           income2ID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "fixed",
		AllocationValue:    *decimal.MustFromString("300"),
	}

	_, err := store.CreateIncomeAllocation(ctx, userID, alloc1)
	require.NoError(t, err)
	_, err = store.CreateIncomeAllocation(ctx, userID, alloc2)
	require.NoError(t, err)

	// List all allocations for user
	allAllocations, err := store.ListAllIncomeAllocations(ctx, userID)
	require.NoError(t, err)
	assert.Len(t, allAllocations, 2, "Should return allocations from both incomes")

	// Verify both income sources are represented
	incomeIDs := make(map[string]bool)
	for _, a := range allAllocations {
		incomeIDs[a.IncomeID] = true
	}
	assert.True(t, incomeIDs[income1ID])
	assert.True(t, incomeIDs[income2ID])
}

// =============================================================================
// COMPREHENSIVE VALUE TESTS - Percentages
// =============================================================================

func TestIntegration_AllocationPercentages_VariedValues(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 10000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	testCases := []struct {
		name       string
		percentage string
		expected   string
	}{
		{"0% allocation", "0", "0"},
		{"1% allocation", "1", "1"},
		{"10% allocation", "10", "10"},
		{"25% allocation", "25", "25"},
		{"33.33% allocation", "33.33", "33.33"},
		{"50% allocation", "50", "50"},
		{"75% allocation", "75", "75"},
		{"99.99% allocation", "99.99", "99.99"},
		{"100% allocation", "100", "100"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clean allocations between subtests
			_, _ = pool.Exec(ctx, "DELETE FROM fund_flow_rules WHERE user_id = $1 AND source_income_id = $2", userID, incomeID)

			allocation := IncomeAllocation{
				IncomeID:           incomeID,
				TargetInvestmentID: &investmentID,
				AllocationType:     "percentage",
				AllocationValue:    *decimal.MustFromString(tc.percentage),
			}

			created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
			require.NoError(t, err, "Should create allocation for %s", tc.name)

			// Verify stored value matches exactly
			fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
			require.NoError(t, err)
			expectedDec := decimal.MustFromString(tc.expected)
			assert.Equal(t, 0, fetched.AllocationValue.Cmp(expectedDec),
				"Stored value should be %s, got %s", tc.expected, fetched.AllocationValue.String())

			// Verify database stores correct amount_type
			var amountType string
			var amountValue string
			err = pool.QueryRow(ctx,
				`SELECT amount_type, amount_value::text FROM fund_flow_rules WHERE id = $1`,
				created.ID,
			).Scan(&amountType, &amountValue)
			require.NoError(t, err)
			assert.Equal(t, "percentage", amountType)
		})
	}
}

// =============================================================================
// COMPREHENSIVE VALUE TESTS - Fixed Amounts
// =============================================================================

func TestIntegration_AllocationFixedAmounts_VariedValues(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 50000)
	cashAccountID := createTestCashAccount(t, pool, userID, "Savings")

	testCases := []struct {
		name     string
		amount   string
		expected string
	}{
		{"Zero amount", "0", "0"},
		{"Small amount - $1", "1", "1"},
		{"Small amount - $50", "50", "50"},
		{"Medium amount - $500", "500", "500"},
		{"Common amount - $1000", "1000", "1000"},
		{"Large amount - $5000", "5000", "5000"},
		{"Large amount - $10000", "10000", "10000"},
		{"Decimal amount - $123.45", "123.45", "123.45"},
		{"Decimal amount - $999.99", "999.99", "999.99"},
		{"High precision - $100.1234", "100.1234", "100.1234"},
		{"Very large - $999999", "999999", "999999"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, _ = pool.Exec(ctx, "DELETE FROM fund_flow_rules WHERE user_id = $1 AND source_income_id = $2", userID, incomeID)

			allocation := IncomeAllocation{
				IncomeID:            incomeID,
				TargetCashAccountID: &cashAccountID,
				AllocationType:      "fixed",
				AllocationValue:     *decimal.MustFromString(tc.amount),
			}

			created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
			require.NoError(t, err, "Should create allocation for %s", tc.name)

			fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
			require.NoError(t, err)
			expectedDec := decimal.MustFromString(tc.expected)
			assert.Equal(t, 0, fetched.AllocationValue.Cmp(expectedDec),
				"Stored value should be %s, got %s", tc.expected, fetched.AllocationValue.String())
		})
	}
}

// =============================================================================
// MULTIPLE ALLOCATIONS - Same Income, Different Targets
// =============================================================================

func TestIntegration_MultipleAllocations_SameIncomeDifferentTargets(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Monthly Salary", 8000)
	investment1ID := createTestInvestment(t, pool, userID, "Index Fund")
	investment2ID := createTestInvestment(t, pool, userID, "Bond Fund")
	cashID := createTestCashAccount(t, pool, userID, "Emergency Fund")

	// Create 3 allocations from same income to different targets
	allocations := []IncomeAllocation{
		{
			IncomeID:           incomeID,
			TargetInvestmentID: &investment1ID,
			AllocationType:     "percentage",
			AllocationValue:    *decimal.MustFromString("30"), // 30% to Index Fund
		},
		{
			IncomeID:           incomeID,
			TargetInvestmentID: &investment2ID,
			AllocationType:     "percentage",
			AllocationValue:    *decimal.MustFromString("20"), // 20% to Bond Fund
		},
		{
			IncomeID:            incomeID,
			TargetCashAccountID: &cashID,
			AllocationType:      "fixed",
			AllocationValue:     *decimal.MustFromString("1000"), // $1000 to Emergency
		},
	}

	for i, alloc := range allocations {
		_, err := store.CreateIncomeAllocation(ctx, userID, alloc)
		require.NoError(t, err, "Should create allocation %d", i+1)
	}

	// Verify all 3 are listed
	listed, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, listed, 3, "Should have 3 allocations")

	// Verify targets are distinct
	targetIDs := make(map[string]bool)
	for _, a := range listed {
		if a.TargetInvestmentID != nil {
			targetIDs[*a.TargetInvestmentID] = true
		}
		if a.TargetCashAccountID != nil {
			targetIDs[*a.TargetCashAccountID] = true
		}
	}
	assert.Len(t, targetIDs, 3, "Should have 3 distinct targets")

	// Verify sum of percentages
	var totalPercentage float64
	for _, a := range listed {
		if a.AllocationType == "percentage" {
			pct, _ := a.AllocationValue.Float64()
			totalPercentage += pct
		}
	}
	assert.Equal(t, 50.0, totalPercentage, "Total percentage should be 50")
}

// =============================================================================
// MULTIPLE ALLOCATIONS - Multiple Incomes, Same Target
// =============================================================================

func TestIntegration_MultipleIncomes_SameTarget(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	// Create multiple incomes
	salary1ID := testutil.CreateTestIncome(t, pool, userID, "Primary Job", 6000)
	salary2ID := testutil.CreateTestIncome(t, pool, userID, "Side Gig", 2000)
	bonusID := testutil.CreateTestIncome(t, pool, userID, "Annual Bonus", 12000)

	// All go to same investment target
	sharedInvestmentID := createTestInvestment(t, pool, userID, "Retirement Fund")

	// Each income allocates different percentage
	allocations := []struct {
		incomeID   string
		percentage string
	}{
		{salary1ID, "15"},
		{salary2ID, "25"},
		{bonusID, "50"},
	}

	for _, a := range allocations {
		_, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
			IncomeID:           a.incomeID,
			TargetInvestmentID: &sharedInvestmentID,
			AllocationType:     "percentage",
			AllocationValue:    *decimal.MustFromString(a.percentage),
		})
		require.NoError(t, err)
	}

	// List all allocations
	all, err := store.ListAllIncomeAllocations(ctx, userID)
	require.NoError(t, err)
	require.Len(t, all, 3, "Should have 3 allocations total")

	// Verify each income has exactly one allocation
	for _, a := range allocations {
		incomeAllocations, err := store.ListIncomeAllocations(ctx, userID, a.incomeID)
		require.NoError(t, err)
		assert.Len(t, incomeAllocations, 1, "Each income should have 1 allocation")
		assert.Equal(t, sharedInvestmentID, *incomeAllocations[0].TargetInvestmentID)
	}
}

// =============================================================================
// DATE FILTERING - Start and End Dates
// =============================================================================

func TestIntegration_AllocationDates_StartDateOnly(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 5000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	// Create allocation with specific start date
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("20"),
		StartDate:          startDate,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Verify start date was stored (note: API may default to 2026-01-01 if not provided)
	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	assert.False(t, fetched.StartDate.IsZero(), "Start date should be set")
	assert.Nil(t, fetched.EndDate, "End date should be nil")
}

func TestIntegration_AllocationDates_StartAndEndDate(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Contract Work", 3000)
	cashID := createTestCashAccount(t, pool, userID, "Project Fund")

	// Create allocation that ends in the future
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC)
	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashID,
		AllocationType:      "fixed",
		AllocationValue:     *decimal.MustFromString("500"),
		StartDate:           startDate,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Set end date
	updated, err := store.SetIncomeAllocationEndDate(ctx, userID, created.ID, endDate)
	require.NoError(t, err)

	// Verify both dates
	require.NotNil(t, updated.EndDate)
	assert.Equal(t, 2027, updated.EndDate.Year())
	assert.Equal(t, time.December, updated.EndDate.Month())
	assert.Equal(t, 31, updated.EndDate.Day())
}

// =============================================================================
// UPDATE SCENARIOS - Various Modifications
// =============================================================================

func TestIntegration_UpdateAllocation_ChangePercentage(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 10000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	// Start with 10%
	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("10"),
	})
	require.NoError(t, err)

	// Update to 35%
	created.AllocationValue = *decimal.MustFromString("35")
	updated, err := store.UpdateIncomeAllocation(ctx, userID, *created)
	require.NoError(t, err)
	assert.Equal(t, 0, updated.AllocationValue.Cmp(decimal.MustFromString("35")))

	// Update to 0%
	updated.AllocationValue = *decimal.MustFromString("0")
	final, err := store.UpdateIncomeAllocation(ctx, userID, *updated)
	require.NoError(t, err)
	assert.Equal(t, 0, final.AllocationValue.Cmp(decimal.MustFromString("0")))
}

func TestIntegration_UpdateAllocation_ChangeTarget(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 5000)
	investment1ID := createTestInvestment(t, pool, userID, "Fund A")
	investment2ID := createTestInvestment(t, pool, userID, "Fund B")
	cashID := createTestCashAccount(t, pool, userID, "Cash")

	// Start targeting investment 1
	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investment1ID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("20"),
	})
	require.NoError(t, err)
	assert.Equal(t, investment1ID, *created.TargetInvestmentID)

	// Change to investment 2
	created.TargetInvestmentID = &investment2ID
	updated1, err := store.UpdateIncomeAllocation(ctx, userID, *created)
	require.NoError(t, err)
	assert.Equal(t, investment2ID, *updated1.TargetInvestmentID)

	// Change to cash account
	updated1.TargetInvestmentID = nil
	updated1.TargetCashAccountID = &cashID
	updated2, err := store.UpdateIncomeAllocation(ctx, userID, *updated1)
	require.NoError(t, err)
	assert.Nil(t, updated2.TargetInvestmentID)
	assert.NotNil(t, updated2.TargetCashAccountID)
	assert.Equal(t, cashID, *updated2.TargetCashAccountID)
}

func TestIntegration_UpdateAllocation_ChangeTypeAndValue(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 8000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	// Start with percentage
	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("25"),
	})
	require.NoError(t, err)
	assert.Equal(t, "percentage", created.AllocationType)

	// Change to fixed
	created.AllocationType = "fixed"
	created.AllocationValue = *decimal.MustFromString("2000")
	updated, err := store.UpdateIncomeAllocation(ctx, userID, *created)
	require.NoError(t, err)
	assert.Equal(t, "fixed", updated.AllocationType)
	assert.Equal(t, 0, updated.AllocationValue.Cmp(decimal.MustFromString("2000")))

	// Verify in database
	var amountType string
	err = pool.QueryRow(ctx, `SELECT amount_type FROM fund_flow_rules WHERE id = $1`, created.ID).Scan(&amountType)
	require.NoError(t, err)
	assert.Equal(t, "fixed", amountType)
}

// =============================================================================
// EDGE CASES
// =============================================================================

func TestIntegration_AllocationEdgeCases_VerySmallPercentage(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 100000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	// Create 0.01% allocation
	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("0.01"),
	})
	require.NoError(t, err)

	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, 0, fetched.AllocationValue.Cmp(decimal.MustFromString("0.01")))
}

func TestIntegration_AllocationEdgeCases_VeryLargeFixedAmount(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "High Income", 500000)
	cashID := createTestCashAccount(t, pool, userID, "Savings")

	// Create very large fixed allocation
	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashID,
		AllocationType:      "fixed",
		AllocationValue:     *decimal.MustFromString("99999999.9999"),
	})
	require.NoError(t, err)

	fetched, err := store.GetIncomeAllocation(ctx, userID, created.ID)
	require.NoError(t, err)
	expected := decimal.MustFromString("99999999.9999")
	assert.Equal(t, 0, fetched.AllocationValue.Cmp(expected),
		"Should store large amounts: got %s", fetched.AllocationValue.String())
}

func TestIntegration_DeleteAllocation_VerifyNoOrphans(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Income", 5000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	// Create 5 allocations
	var allocationIDs []string
	for i := 0; i < 5; i++ {
		created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
			IncomeID:           incomeID,
			TargetInvestmentID: &investmentID,
			AllocationType:     "percentage",
			AllocationValue:    *decimal.MustFromString("10"),
		})
		require.NoError(t, err)
		allocationIDs = append(allocationIDs, created.ID)
	}

	// Verify 5 exist
	all, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, all, 5)

	// Delete them one by one
	for i, id := range allocationIDs {
		err := store.DeleteIncomeAllocation(ctx, userID, id)
		require.NoError(t, err, "Should delete allocation %d", i+1)

		// Verify count decreases
		remaining, err := store.ListIncomeAllocations(ctx, userID, incomeID)
		require.NoError(t, err)
		assert.Len(t, remaining, 4-i, "Should have %d remaining", 4-i)
	}

	// Verify none remain
	final, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	assert.Empty(t, final, "Should have no allocations left")

	// Verify nothing in fund_flow_rules for this income
	var count int
	err = pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM fund_flow_rules WHERE source_income_id = $1`,
		incomeID,
	).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 0, count, "No orphan records in fund_flow_rules")
}

// =============================================================================
// DATA INTEGRITY - Verify Raw Database State
// =============================================================================

func TestIntegration_VerifyDatabaseState_RuleType(t *testing.T) {
	pool := testutil.GetTestPool(t)
	store := NewStore(pool)
	ctx := context.Background()
	userID := testutil.TestUserID

	testutil.CleanupTestData(t, pool, userID)
	t.Cleanup(func() { testutil.CleanupTestData(t, pool, userID) })

	incomeID := testutil.CreateTestIncome(t, pool, userID, "Salary", 5000)
	investmentID := createTestInvestment(t, pool, userID, "Fund")

	created, err := store.CreateIncomeAllocation(ctx, userID, IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "percentage",
		AllocationValue:    *decimal.MustFromString("25"),
	})
	require.NoError(t, err)

	// Verify all expected columns in fund_flow_rules
	var (
		ruleType           string
		amountType         string
		sourceIncomeID     string
		targetInvestmentID string
		targetCashID       *string
		priority           int
	)
	err = pool.QueryRow(ctx, `
		SELECT rule_type, amount_type, source_income_id, target_investment_id, target_cash_account_id, priority
		FROM fund_flow_rules WHERE id = $1
	`, created.ID).Scan(&ruleType, &amountType, &sourceIncomeID, &targetInvestmentID, &targetCashID, &priority)
	require.NoError(t, err)

	assert.Equal(t, "allocation", ruleType, "rule_type should be 'allocation'")
	assert.Equal(t, "percentage", amountType, "amount_type should be 'percentage'")
	assert.Equal(t, incomeID, sourceIncomeID, "source_income_id should match")
	assert.Equal(t, investmentID, targetInvestmentID, "target_investment_id should match")
	assert.Nil(t, targetCashID, "target_cash_account_id should be nil")
	assert.Equal(t, 0, priority, "default priority should be 0")
}

// Helper functions to create test fixtures

func createTestCashAccount(t *testing.T, pool PgxPool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_cash_accounts (user_id, name, balance, interest_rate, bank_name, account_type, is_accumulator, start_date)
		VALUES ($1, $2, 10000, 2.0, 'Test Bank', 'savings', false, '2025-01-01')
		RETURNING id
	`, userID, name).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test cash account: %v", err)
	}
	return id
}

func createTestInvestment(t *testing.T, pool PgxPool, userID, name string) string {
	t.Helper()
	ctx := context.Background()

	var id string
	err := pool.QueryRow(ctx, `
		INSERT INTO finance_investments (user_id, name, category, current_value, growth_rate, start_date, growth_strategy)
		VALUES ($1, $2, 'stocks', 50000, 7.0, '2025-01-01', 'compound_monthly')
		RETURNING id
	`, userID, name).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test investment: %v", err)
	}
	return id
}
