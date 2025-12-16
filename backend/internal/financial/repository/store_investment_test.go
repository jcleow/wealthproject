package repository

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestUpdateInvestment_UsesGrowthRateColumn(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := &Store{db: db}
	ctx := context.Background()

	now := time.Now().UTC()
	userID := "user-1"
	investment := Investment{
		ID:               "inv-1",
		ParentID:         "parent-1",
		Name:             "ETF",
		Category:         "equity",
		CurrentValue:     10000,
		AnnualGrowthRate: 6.5,
		StartDate:        now,
		Notes:            "baseline",
	}

	// The update query should reference growth_rate and return the persisted value.
	rows := sqlmock.NewRows([]string{
		"id", "parent_id", "name", "category", "current_value", "growth_rate", "start_date", "end_date", "notes", "updated_at",
	}).AddRow(
		investment.ID,
		investment.ParentID,
		investment.Name,
		investment.Category,
		investment.CurrentValue,
		investment.AnnualGrowthRate,
		investment.StartDate,
		nil,
		investment.Notes,
		now,
	)

	mock.ExpectQuery(`UPDATE\s+finance_investments`).
		WithArgs(
			userID,
			investment.ID,
			investment.Name,
			investment.Category,
			investment.CurrentValue,
			investment.AnnualGrowthRate,
			investment.StartDate,
			investment.EndDate,
			investment.Notes,
		).
		WillReturnRows(rows)

	updated, err := store.UpdateInvestment(ctx, userID, investment)
	require.NoError(t, err)
	require.Equal(t, investment.ID, updated.ID)
	require.Equal(t, investment.ParentID, updated.ParentID)
	require.Equal(t, investment.AnnualGrowthRate, updated.AnnualGrowthRate)
	require.Equal(t, investment.Notes, updated.Notes)

	require.NoError(t, mock.ExpectationsWereMet())
}
