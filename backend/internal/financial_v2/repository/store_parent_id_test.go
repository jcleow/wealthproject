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

// NOTE: TestCreateIncomeAllocation_RootRecord_ParentIdEqualsId has been removed
// as part of the income_allocations → fund_flow_rules migration.
// The allocation rules are now created via the fund_flow_rules API directly.
