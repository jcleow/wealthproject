package repository

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/testutil"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/require"
)

func TestListIncomeAllocations_ReturnsAllocationsForIncome(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	createdAt := time.Now()
	cashAccountID := "cash-account-1"
	investmentID := "investment-1"

	rows := testutil.NewStubRows(t, [][]any{
		{
			incomeID, "alloc-1", "parent-1",
			createdAt, nil,
			cashAccountID, nil,
			"percentage", *decimal.MustFromString("50.0000"), createdAt,
		},
		{
			incomeID, "alloc-2", "parent-2",
			createdAt, nil,
			nil, investmentID,
			"fixed", *decimal.MustFromString("1000.0000"), createdAt,
		},
	})
	mockPool.EnqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, allocations, 2)

	require.Equal(t, "alloc-1", allocations[0].ID)
	require.Equal(t, incomeID, allocations[0].IncomeID)
	require.NotNil(t, allocations[0].TargetCashAccountID)
	require.Equal(t, cashAccountID, *allocations[0].TargetCashAccountID)
	require.Nil(t, allocations[0].TargetInvestmentID)
	require.Equal(t, "percentage", allocations[0].AllocationType)

	require.Equal(t, "alloc-2", allocations[1].ID)
	require.Nil(t, allocations[1].TargetCashAccountID)
	require.NotNil(t, allocations[1].TargetInvestmentID)
	require.Equal(t, investmentID, *allocations[1].TargetInvestmentID)
	require.Equal(t, "fixed", allocations[1].AllocationType)
}

func TestListIncomeAllocations_IncomeNotFound(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "non-existent-income"

	rows := testutil.NewStubRows(t, [][]any{})
	mockPool.EnqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	_, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestListIncomeAllocations_IncomeExistsButNoAllocations(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	rows := testutil.NewStubRows(t, [][]any{
		{incomeID, nil, nil, nil, nil, nil, nil, nil, nil, nil},
	})
	mockPool.EnqueueQuery("income_allocations", []any{incomeID, userID}, rows, nil)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Empty(t, allocations)
}

func TestCreateIncomeAllocation_ToCashAccount(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	cashAccountID := "cash-account-1"
	createdAt := time.Now()
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // Default year used by implementation

	allocationValue := decimal.MustFromString("50")

	// Phase 2b: First query is to get income name for fund_flow_rules
	mockPool.EnqueueRow("SELECT name FROM finance_incomes", []any{incomeID, userID}, testutil.NewStubRow(t, []any{"Salary"}, nil))

	// Insert into income_allocations (legacy)
	mockPool.EnqueueRow(
		"INSERT INTO income_allocations",
		nil, // Skip arg matching for simplicity
		testutil.NewStubRow(t, []any{
			"alloc-new", incomeID, "alloc-new", startDate, nil, cashAccountID, nil, "percentage", *allocationValue, createdAt,
		}, nil))

	// Phase 2b: Insert into fund_flow_rules (new unified table)
	mockPool.EnqueueExec("INSERT INTO fund_flow_rules", nil, pgconn.NewCommandTag("INSERT 1"), nil)

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *allocationValue,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	require.Equal(t, "alloc-new", created.ID)
	require.Equal(t, incomeID, created.IncomeID)
	require.NotNil(t, created.TargetCashAccountID)
	require.Equal(t, cashAccountID, *created.TargetCashAccountID)
	require.Equal(t, "percentage", created.AllocationType)
}

func TestCreateIncomeAllocation_ToInvestment(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	investmentID := "investment-1"
	createdAt := time.Now()
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // Default year used by implementation

	allocationValue := decimal.MustFromString("1000")

	// Phase 2b: First query is to get income name for fund_flow_rules
	mockPool.EnqueueRow("SELECT name FROM finance_incomes", []any{incomeID, userID}, testutil.NewStubRow(t, []any{"Salary"}, nil))

	// Insert into income_allocations (legacy)
	mockPool.EnqueueRow(
		"INSERT INTO income_allocations",
		nil, // Skip arg matching for simplicity
		testutil.NewStubRow(t, []any{
			"alloc-new", incomeID, "alloc-new", startDate, nil, nil, investmentID, "fixed", *allocationValue, createdAt,
		}, nil))

	// Phase 2b: Insert into fund_flow_rules (new unified table)
	mockPool.EnqueueExec("INSERT INTO fund_flow_rules", nil, pgconn.NewCommandTag("INSERT 1"), nil)

	allocation := IncomeAllocation{
		IncomeID:           incomeID,
		TargetInvestmentID: &investmentID,
		AllocationType:     "fixed",
		AllocationValue:    *allocationValue,
	}

	created, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.NoError(t, err)
	require.Equal(t, "alloc-new", created.ID)
	require.Nil(t, created.TargetCashAccountID)
	require.NotNil(t, created.TargetInvestmentID)
	require.Equal(t, investmentID, *created.TargetInvestmentID)
	require.Equal(t, "fixed", created.AllocationType)
}

func TestCreateIncomeAllocation_IncomeNotOwned(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-not-owned"
	cashAccountID := "cash-account-1"

	// Phase 2b: First query to get income name returns no rows (income not found)
	mockPool.EnqueueRow("SELECT name FROM finance_incomes", []any{incomeID, userID}, testutil.NewStubRow(t, nil, pgx.ErrNoRows))

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("50"),
	}

	_, err := store.CreateIncomeAllocation(ctx, userID, allocation)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestDeleteIncomeAllocation_Success(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "alloc-1"

	// Phase 2b: Delete from income_allocations (legacy)
	mockPool.EnqueueExec("DELETE FROM income_allocations", []any{userID, allocationID}, pgconn.NewCommandTag("DELETE 1"), nil)

	// Phase 2b: Delete from fund_flow_rules (new unified table)
	mockPool.EnqueueExec("DELETE FROM fund_flow_rules", nil, pgconn.NewCommandTag("DELETE 1"), nil)

	err := store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.NoError(t, err)
}

func TestDeleteIncomeAllocation_NotFound(t *testing.T) {
	t.Parallel()

	mockPool := testutil.NewMockPool(t)
	store := NewStore(mockPool)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "non-existent"

	mockPool.EnqueueExec("DELETE FROM income_allocations", []any{userID, allocationID}, pgconn.NewCommandTag("DELETE 0"), nil)

	err := store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.ErrorIs(t, err, ErrNotFound)
}
