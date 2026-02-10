package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GroupedExpenses returns expenses split into regular expenses and debt repayments.
type GroupedExpenses struct {
	RegularExpenses []Expense `json:"regularExpenses"`
	DebtRepayments  []Expense `json:"debtRepayments"`
	Count           int       `json:"count"`
	Limit           *int      `json:"limit"`
	Offset          *int      `json:"offset"`
}

// ListExpensesGrouped returns expenses split into regular expenses and debt repayments.
func (s *Store) ListExpensesGrouped(
	ctx context.Context,
	userID string,
	pagination PaginationParams,
) (GroupedExpenses, error) {
	result, err := s.ListExpenses(ctx, ListQuery{
		UserID:     userID,
		DateRange:  DateRangeOptions{},
		Pagination: pagination,
	})
	if err != nil {
		return GroupedExpenses{}, err
	}

	var regularExpenses, debtRepayments []Expense
	for _, exp := range result.Data {
		if exp.SourceLiabilityID != nil {
			debtRepayments = append(debtRepayments, exp)
		} else {
			regularExpenses = append(regularExpenses, exp)
		}
	}

	// Ensure empty slices instead of nil for JSON marshaling
	if regularExpenses == nil {
		regularExpenses = []Expense{}
	}
	if debtRepayments == nil {
		debtRepayments = []Expense{}
	}

	return GroupedExpenses{
		RegularExpenses: regularExpenses,
		DebtRepayments:  debtRepayments,
		Count:           result.Count,
		Limit:           result.Limit,
		Offset:          result.Offset,
	}, nil
}

// GetExpense retrieves a single expense by ID.
func (s *Store) GetExpense(ctx context.Context, userID, id string) (*Expense, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		amount,
		frequency,
		start_date,
		end_date,
		category,
		growth_rate,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		source_liability_id
	FROM finance_expenses
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var e Expense
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&e.ID, &e.ParentID, &e.Name, &e.Amount, &e.Frequency,
		&e.StartDate, &e.EndDate, &e.Category, &e.GrowthRate,
		&e.Notes, &e.GrowthStrategy, &e.UpdatedAt, &e.SourceLiabilityID,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get expense: %w", err)
	}

	return &e, nil
}

// UpdateExpense updates an existing expense record.
func (s *Store) UpdateExpense(ctx context.Context, userID string, exp Expense) (*Expense, error) {
	query := `
	UPDATE finance_expenses
	SET name = $3,
	    amount = $4,
	    frequency = $5,
	    start_date = COALESCE($6, start_date),
	    end_date = $7,
	    category = $8,
	    growth_rate = COALESCE($9, growth_rate),
	    growth_strategy = COALESCE(NULLIF($10, ''), growth_strategy, 'annual_step'),
	    notes = NULLIF($11, ''),
	    source_liability_id = $12,
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, amount, frequency, start_date, end_date, category, growth_rate, COALESCE(growth_strategy, '') as growth_strategy, COALESCE(notes, ''), updated_at, source_liability_id`

	var startDate *time.Time
	if !exp.StartDate.IsZero() {
		startDate = &exp.StartDate
	}

	var growthRate *decimal.Decimal
	zero := decimal.Zero()
	if exp.GrowthRate.Cmp(zero) != 0 {
		growthRate = &exp.GrowthRate
	}

	args := []any{
		userID, exp.ID, exp.Name, exp.Amount, exp.Frequency,
		startDate, exp.EndDate, exp.Category, growthRate,
		exp.GrowthStrategy, exp.Notes, exp.SourceLiabilityID,
	}

	logQuery(query, args)

	var updated Expense
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Amount, &updated.Frequency,
		&updated.StartDate, &updated.EndDate, &updated.Category, &updated.GrowthRate,
		&updated.GrowthStrategy, &updated.Notes, &updated.UpdatedAt, &updated.SourceLiabilityID,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update expense: %w", err)
	}

	return &updated, nil
}

// DeleteExpense deletes an expense and all its descendant versions.
func (s *Store) DeleteExpense(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM finance_expenses WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT e.id FROM finance_expenses e
		INNER JOIN descendants d ON e.parent_id = d.id
		WHERE e.user_id = $1
	)
	DELETE FROM finance_expenses WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete expense: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// FindExpenseByParentAndStartDate finds an expense version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindExpenseByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*Expense, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		amount,
		frequency,
		start_date,
		end_date,
		category,
		growth_rate,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at,
		source_liability_id
	FROM finance_expenses
	WHERE user_id = $1 AND parent_id = $2 AND DATE(start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var e Expense
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&e.ID, &e.ParentID, &e.Name, &e.Amount, &e.Frequency,
		&e.StartDate, &e.EndDate, &e.Category, &e.GrowthRate,
		&e.Notes, &e.GrowthStrategy, &e.UpdatedAt, &e.SourceLiabilityID,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find expense by parent and start date: %w", err)
	}

	return &e, nil
}

// DeleteAllExpenses deletes all expenses for a user (bulk delete).
func (s *Store) DeleteAllExpenses(ctx context.Context, userID string) (int64, error) {
	return s.deleteAllByUser(ctx, "finance_expenses", userID)
}

// StopExpense sets the end_date on an expense (soft delete).
// Children are NOT affected.
func (s *Store) StopExpense(ctx context.Context, userID, id string, endDate time.Time) (*Expense, error) {
	query := `
	UPDATE finance_expenses
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, amount, frequency, start_date, end_date, category, growth_rate, COALESCE(growth_strategy, '') as growth_strategy, COALESCE(notes, ''), updated_at, source_liability_id`

	logQuery(query, []any{userID, id, endDate})

	var updated Expense
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Amount, &updated.Frequency,
		&updated.StartDate, &updated.EndDate, &updated.Category, &updated.GrowthRate,
		&updated.GrowthStrategy, &updated.Notes, &updated.UpdatedAt, &updated.SourceLiabilityID,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop expense: %w", err)
	}

	return &updated, nil
}
