package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GetLiability retrieves a single liability by ID.
func (s *Store) GetLiability(ctx context.Context, userID, id string) (*Liability, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_balance,
		interest_rate_apr,
		minimum_payment,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		COALESCE(repayment_strategy, 'standard_amortization') as repayment_strategy,
		updated_at
	FROM finance_liabilities
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var l Liability
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&l.ID, &l.ParentID, &l.Name, &l.Category, &l.CurrentBalance,
		&l.InterestRateAPR, &l.MinimumPayment, &l.StartDate, &l.EndDate,
		&l.Notes, &l.GrowthStrategy, &l.RepaymentStrategy, &l.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get liability: %w", err)
	}

	return &l, nil
}

// UpdateLiability updates an existing liability record.
func (s *Store) UpdateLiability(ctx context.Context, userID string, li Liability) (*Liability, error) {
	query := `
	UPDATE finance_liabilities
	SET name = $3,
	    category = $4,
	    current_balance = $5,
	    interest_rate_apr = COALESCE($6, interest_rate_apr),
	    minimum_payment = COALESCE($7, minimum_payment),
	    start_date = COALESCE($8, start_date),
	    end_date = $9,
	    notes = NULLIF($10, ''),
	    growth_strategy = COALESCE(NULLIF($11, ''), growth_strategy),
	    repayment_strategy = COALESCE(NULLIF($12, ''), repayment_strategy, 'standard_amortization'),
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), COALESCE(repayment_strategy, 'standard_amortization'), updated_at`

	var startDate *time.Time
	if !li.StartDate.IsZero() {
		startDate = &li.StartDate
	}

	var interestRate *decimal.Decimal
	zero := decimal.Zero()
	if li.InterestRateAPR.Cmp(zero) != 0 {
		interestRate = &li.InterestRateAPR
	}

	var minPayment *decimal.Decimal
	if li.MinimumPayment.Cmp(zero) != 0 {
		minPayment = &li.MinimumPayment
	}

	args := []any{
		userID, li.ID, li.Name, li.Category, li.CurrentBalance,
		interestRate, minPayment, startDate, li.EndDate, li.Notes,
		li.GrowthStrategy, li.RepaymentStrategy,
	}

	logQuery(query, args)

	var updated Liability
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentBalance,
		&updated.InterestRateAPR, &updated.MinimumPayment, &updated.StartDate, &updated.EndDate,
		&updated.Notes, &updated.GrowthStrategy, &updated.RepaymentStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update liability: %w", err)
	}

	return &updated, nil
}

// DeleteLiability deletes a liability and all its descendant versions.
func (s *Store) DeleteLiability(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM finance_liabilities WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT l.id FROM finance_liabilities l
		INNER JOIN descendants d ON l.parent_id = d.id
		WHERE l.user_id = $1
	)
	DELETE FROM finance_liabilities WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete liability: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// StopLiability sets the end_date on a liability (soft delete).
// Children are NOT affected.
func (s *Store) StopLiability(ctx context.Context, userID, id string, endDate time.Time) (*Liability, error) {
	query := `
	UPDATE finance_liabilities
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), COALESCE(repayment_strategy, 'standard_amortization'), updated_at`

	logQuery(query, []any{userID, id, endDate})

	var updated Liability
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentBalance,
		&updated.InterestRateAPR, &updated.MinimumPayment, &updated.StartDate, &updated.EndDate,
		&updated.Notes, &updated.GrowthStrategy, &updated.RepaymentStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop liability: %w", err)
	}

	return &updated, nil
}

// FindLiabilityByParentAndStartDate finds a liability version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindLiabilityByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*Liability, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_balance,
		interest_rate_apr,
		minimum_payment,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		COALESCE(repayment_strategy, 'standard_amortization') as repayment_strategy,
		updated_at
	FROM finance_liabilities
	WHERE user_id = $1 AND parent_id = $2 AND DATE(start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var l Liability
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&l.ID, &l.ParentID, &l.Name, &l.Category, &l.CurrentBalance,
		&l.InterestRateAPR, &l.MinimumPayment, &l.StartDate, &l.EndDate,
		&l.Notes, &l.GrowthStrategy, &l.RepaymentStrategy, &l.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find liability by parent and start date: %w", err)
	}

	return &l, nil
}
