package repository

import (
	"context"
	"database/sql/driver"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestListIncomeAllocations_ReturnsAllocationsForIncome(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	createdAt := time.Now()
	cashAccountID := "cash-account-1"

	rows := sqlmock.NewRows([]string{
		"income_id", "allocation_id", "target_cash_account_id", "target_investment_id",
		"allocation_type", "allocation_value", "created_at",
	}).AddRow(
		incomeID, "alloc-1", cashAccountID, nil,
		"percentage", "50.0000", createdAt,
	).AddRow(
		incomeID, "alloc-2", nil, "investment-1",
		"fixed", "1000.0000", createdAt,
	)

	mock.ExpectQuery(`SELECT\s+fi\.id,\s+ia\.id`).
		WithArgs(incomeID, userID).
		WillReturnRows(rows)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Len(t, allocations, 2)

	// First allocation - percentage to cash account
	require.Equal(t, "alloc-1", allocations[0].ID)
	require.Equal(t, incomeID, allocations[0].IncomeID)
	require.NotNil(t, allocations[0].TargetCashAccountID)
	require.Equal(t, cashAccountID, *allocations[0].TargetCashAccountID)
	require.Nil(t, allocations[0].TargetInvestmentID)
	require.Equal(t, "percentage", allocations[0].AllocationType)

	// Second allocation - fixed to investment
	require.Equal(t, "alloc-2", allocations[1].ID)
	require.Nil(t, allocations[1].TargetCashAccountID)
	require.NotNil(t, allocations[1].TargetInvestmentID)
	require.Equal(t, "investment-1", *allocations[1].TargetInvestmentID)
	require.Equal(t, "fixed", allocations[1].AllocationType)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListIncomeAllocations_IncomeNotFound(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "non-existent-income"

	// Empty result set - no income found
	rows := sqlmock.NewRows([]string{
		"income_id", "allocation_id", "target_cash_account_id", "target_investment_id",
		"allocation_type", "allocation_value", "created_at",
	})

	mock.ExpectQuery(`SELECT\s+fi\.id,\s+ia\.id`).
		WithArgs(incomeID, userID).
		WillReturnRows(rows)

	_, err = store.ListIncomeAllocations(ctx, userID, incomeID)
	require.ErrorIs(t, err, ErrNotFound)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListIncomeAllocations_IncomeExistsButNoAllocations(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"

	// Income exists but no allocations (LEFT JOIN produces NULL allocation columns)
	rows := sqlmock.NewRows([]string{
		"income_id", "allocation_id", "target_cash_account_id", "target_investment_id",
		"allocation_type", "allocation_value", "created_at",
	}).AddRow(
		incomeID, nil, nil, nil, nil, nil, nil,
	)

	mock.ExpectQuery(`SELECT\s+fi\.id,\s+ia\.id`).
		WithArgs(incomeID, userID).
		WillReturnRows(rows)

	allocations, err := store.ListIncomeAllocations(ctx, userID, incomeID)
	require.NoError(t, err)
	require.Empty(t, allocations)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateIncomeAllocation_ToCashAccount(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	cashAccountID := "cash-account-1"
	createdAt := time.Now()

	// Verify income ownership
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(incomeID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	// Insert allocation
	allocationValue := decimal.MustFromString("50")
	rows := sqlmock.NewRows([]string{
		"id", "income_id", "target_cash_account_id", "target_investment_id",
		"allocation_type", "allocation_value", "created_at",
	}).AddRow(
		"alloc-new", incomeID, cashAccountID, nil,
		"percentage", allocationValue.String(), createdAt,
	)

	mock.ExpectQuery(`INSERT INTO income_allocations`).
		WithArgs(incomeID, &cashAccountID, nil, "percentage", *allocationValue).
		WillReturnRows(rows)

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

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateIncomeAllocation_ToInvestment(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-1"
	investmentID := "investment-1"
	createdAt := time.Now()

	// Verify income ownership
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(incomeID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	// Insert allocation
	allocationValue := decimal.MustFromString("1000")
	rows := sqlmock.NewRows([]string{
		"id", "income_id", "target_cash_account_id", "target_investment_id",
		"allocation_type", "allocation_value", "created_at",
	}).AddRow(
		"alloc-new", incomeID, nil, investmentID,
		"fixed", allocationValue.String(), createdAt,
	)

	mock.ExpectQuery(`INSERT INTO income_allocations`).
		WithArgs(incomeID, nil, &investmentID, "fixed", *allocationValue).
		WillReturnRows(rows)

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

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateIncomeAllocation_IncomeNotOwned(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	incomeID := "income-not-owned"
	cashAccountID := "cash-account-1"

	// Income ownership check fails
	mock.ExpectQuery(`SELECT EXISTS`).
		WithArgs(incomeID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	allocation := IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: &cashAccountID,
		AllocationType:      "percentage",
		AllocationValue:     *decimal.MustFromString("50"),
	}

	_, err = store.CreateIncomeAllocation(ctx, userID, allocation)
	require.ErrorIs(t, err, ErrNotFound)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteIncomeAllocation_Success(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "alloc-1"

	mock.ExpectExec(`DELETE FROM income_allocations`).
		WithArgs(userID, allocationID).
		WillReturnResult(driver.RowsAffected(1))

	err = store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.NoError(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteIncomeAllocation_NotFound(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()
	userID := "test-user"
	allocationID := "non-existent"

	mock.ExpectExec(`DELETE FROM income_allocations`).
		WithArgs(userID, allocationID).
		WillReturnResult(driver.RowsAffected(0))

	err = store.DeleteIncomeAllocation(ctx, userID, allocationID)
	require.ErrorIs(t, err, ErrNotFound)

	require.NoError(t, mock.ExpectationsWereMet())
}
