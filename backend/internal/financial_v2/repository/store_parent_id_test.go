package repository

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

// TestCreateInvestment_RootRecord_ParentIdEqualsId verifies that when creating
// a new root investment (no parentId provided), the returned parentId equals the id.
// This tests the COALESCE(parent_id, id) behavior in the RETURNING clause.
func TestCreateInvestment_RootRecord_ParentIdEqualsId(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	updatedAt := time.Now()

	// The INSERT passes NULL for parent_id (via nullIfEmpty(""))
	// The RETURNING clause returns COALESCE(parent_id, id) which equals the new id
	newID := "new-investment-uuid"
	mockPool.EnqueueRow(
		"INSERT INTO finance_investments",
		nil, // Don't check args - they're complex
		testutil.NewStubRow(t, []any{
			newID,                                // id
			newID,                                // parentId (COALESCE(null, id) = id)
			"Test Investment",                    // name
			"stocks",                             // category
			*decimal.MustFromString("10000"),     // currentValue
			*decimal.MustFromString("0.08"),      // growthRate
			startDate,                            // startDate
			nil,                                  // endDate
			"compound_monthly",                   // growthStrategy
			"",                                   // notes
			updatedAt,                            // updatedAt
		}, nil),
	)

	inv := Investment{
		Name:         "Test Investment",
		Category:     "stocks",
		CurrentValue: *decimal.MustFromString("10000"),
		GrowthRate:   *decimal.MustFromString("0.08"),
		StartDate:    startDate,
		// ParentID is empty - this is a new root record
	}

	created, err := store.CreateInvestment(ctx, userID, inv)
	require.NoError(t, err)

	// Key assertion: for root records, parentId should equal id
	require.Equal(t, newID, created.ID, "ID should be the new UUID")
	require.Equal(t, newID, created.ParentID, "ParentID should equal ID for root records")
}

// TestCreateInvestment_VersionRecord_ParentIdPreserved verifies that when creating
// a version record (with explicit parentId), the returned parentId is preserved.
func TestCreateInvestment_VersionRecord_ParentIdPreserved(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	startDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	updatedAt := time.Now()

	parentID := "root-investment-uuid"
	newVersionID := "version-investment-uuid"

	mockPool.EnqueueRow(
		"INSERT INTO finance_investments",
		nil,
		testutil.NewStubRow(t, []any{
			newVersionID,                         // id (new version)
			parentID,                             // parentId (preserved from input)
			"Test Investment Updated",            // name
			"stocks",                             // category
			*decimal.MustFromString("12000"),     // currentValue (increased)
			*decimal.MustFromString("0.10"),      // growthRate
			startDate,                            // startDate
			nil,                                  // endDate
			"compound_monthly",                   // growthStrategy
			"Updated version",                    // notes
			updatedAt,                            // updatedAt
		}, nil),
	)

	inv := Investment{
		ParentID:     parentID, // Explicit parent - this is a version record
		Name:         "Test Investment Updated",
		Category:     "stocks",
		CurrentValue: *decimal.MustFromString("12000"),
		GrowthRate:   *decimal.MustFromString("0.10"),
		StartDate:    startDate,
		Notes:        "Updated version",
	}

	created, err := store.CreateInvestment(ctx, userID, inv)
	require.NoError(t, err)

	// Key assertion: for version records, parentId should be preserved
	require.Equal(t, newVersionID, created.ID, "ID should be the new version UUID")
	require.Equal(t, parentID, created.ParentID, "ParentID should be preserved for version records")
	require.NotEqual(t, created.ID, created.ParentID, "ID and ParentID should differ for versions")
}

// TestCreateIncomeAllocation_RootRecord_ParentIdEqualsId verifies that income allocations
// also follow the same pattern: root records have parentId = id.
func TestCreateIncomeAllocation_RootRecord_ParentIdEqualsId(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	cashAccountID := "cash-account-1"
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // Default start date
	createdAt := time.Now()

	newAllocID := "new-alloc-uuid"

	// First call gets income name
	mockPool.EnqueueRow("SELECT name FROM finance_incomes", []any{incomeID, userID}, testutil.NewStubRow(t, []any{"Salary"}, nil))

	// INSERT into fund_flow_rules
	// Column order: id, source_income_id, parent_id, start_date, end_date,
	//               target_cash_account_id, target_investment_id, target_cpf_account_id,
	//               amount_type, amount_value, created_at
	mockPool.EnqueueRow(
		"INSERT INTO fund_flow_rules",
		nil,
		testutil.NewStubRow(t, []any{
			newAllocID,                    // id
			incomeID,                      // source_income_id
			newAllocID,                    // id (as parent_id)
			startDate,                     // start_date
			nil,                           // end_date
			cashAccountID,                 // target_cash_account_id
			nil,                           // target_investment_id
			nil,                           // target_cpf_account_id
			"percentage",                  // amount_type
			*decimal.MustFromString("50"), // amount_value
			createdAt,                     // created_at
		}, nil),
	)

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("50"),
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)

	// Key assertion: for allocations, parentId equals id
	require.Equal(t, newAllocID, created.ID, "ID should be the new UUID")
	require.Equal(t, newAllocID, created.ParentID, "ParentID should equal ID for allocations")
}
