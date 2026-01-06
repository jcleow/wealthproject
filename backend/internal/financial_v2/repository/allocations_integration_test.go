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
