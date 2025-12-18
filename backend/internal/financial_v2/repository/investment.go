package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GetInvestment retrieves a single investment by ID.
func (s *Store) GetInvestment(ctx context.Context, userID, id string) (*Investment, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		growth_rate,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at
	FROM finance_investments
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var inv Investment
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue,
		&inv.GrowthRate, &inv.StartDate, &inv.EndDate, &inv.Notes,
		&inv.GrowthStrategy, &inv.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get investment: %w", err)
	}

	return &inv, nil
}

// UpdateInvestment updates an existing investment record.
func (s *Store) UpdateInvestment(ctx context.Context, userID string, inv Investment) (*Investment, error) {
	query := `
	UPDATE finance_investments
	SET name = $3,
	    category = $4,
	    current_value = $5,
	    growth_rate = COALESCE($6, growth_rate),
	    start_date = COALESCE($7, start_date),
	    end_date = $8,
	    notes = NULLIF($9, ''),
	    growth_strategy = COALESCE(NULLIF($10, ''), growth_strategy),
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_value, growth_rate, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), updated_at`

	var startDate *time.Time
	if !inv.StartDate.IsZero() {
		startDate = &inv.StartDate
	}

	var growthRate *decimal.Decimal
	zero := decimal.Zero()
	if inv.GrowthRate.Cmp(zero) != 0 {
		growthRate = &inv.GrowthRate
	}

	args := []any{
		userID, inv.ID, inv.Name, inv.Category, inv.CurrentValue,
		growthRate, startDate, inv.EndDate, inv.Notes, inv.GrowthStrategy,
	}

	logQuery(query, args)

	var updated Investment
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue,
		&updated.GrowthRate, &updated.StartDate, &updated.EndDate, &updated.Notes,
		&updated.GrowthStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update investment: %w", err)
	}

	return &updated, nil
}

// DeleteInvestment deletes an investment and all its descendant versions.
func (s *Store) DeleteInvestment(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM finance_investments WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT i.id FROM finance_investments i
		INNER JOIN descendants d ON i.parent_id = d.id
		WHERE i.user_id = $1
	)
	DELETE FROM finance_investments WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete investment: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// StopInvestment sets the end_date on an investment (soft delete).
// Children are NOT affected.
func (s *Store) StopInvestment(ctx context.Context, userID, id string, endDate time.Time) (*Investment, error) {
	query := `
	UPDATE finance_investments
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_value, growth_rate, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), updated_at`

	logQuery(query, []any{userID, id, endDate})

	var updated Investment
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue,
		&updated.GrowthRate, &updated.StartDate, &updated.EndDate, &updated.Notes,
		&updated.GrowthStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop investment: %w", err)
	}

	return &updated, nil
}

// StopAllocationsByInvestment sets end_date on all income allocations targeting an investment.
// Used for cascade stop when stopping an investment.
func (s *Store) StopAllocationsByInvestment(ctx context.Context, userID, investmentID string, endDate time.Time) error {
	query := `
	UPDATE income_allocations ia
	SET end_date = $3
	FROM finance_incomes fi
	WHERE ia.target_investment_id = $2
	  AND ia.income_id = fi.id
	  AND fi.user_id = $1
	  AND (ia.end_date IS NULL OR ia.end_date > $3)`

	logQuery(query, []any{userID, investmentID, endDate})

	_, err := s.pool.Exec(ctx, query, userID, investmentID, endDate)
	if err != nil {
		return fmt.Errorf("failed to stop allocations by investment: %w", err)
	}

	return nil
}

// FindInvestmentByParentAndStartDate finds an investment version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindInvestmentByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*Investment, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		growth_rate,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at
	FROM finance_investments
	WHERE user_id = $1 AND parent_id = $2 AND DATE(start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var inv Investment
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue,
		&inv.GrowthRate, &inv.StartDate, &inv.EndDate, &inv.Notes,
		&inv.GrowthStrategy, &inv.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find investment by parent and start date: %w", err)
	}

	return &inv, nil
}

// CreateInvestment creates a new investment record.
// Uses upsert to handle conflicts on (parent_id, start_date).
func (s *Store) CreateInvestment(ctx context.Context, userID string, inv Investment) (Investment, error) {
	startDate := inv.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default growth strategy if not provided
	growthStrategy := inv.GrowthStrategy
	if growthStrategy == "" {
		growthStrategy = "compound_monthly"
	}

	query := `
		INSERT INTO finance_investments (user_id, parent_id, name, category, current_value, growth_rate, start_date, end_date, growth_strategy, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''))
		ON CONFLICT ON CONSTRAINT finance_investments_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_value=EXCLUDED.current_value,
		    growth_rate=EXCLUDED.growth_rate,
		    end_date=EXCLUDED.end_date,
		    growth_strategy=EXCLUDED.growth_strategy,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, growth_rate, start_date, end_date, COALESCE(growth_strategy, ''), COALESCE(notes, ''), updated_at`

	args := []any{
		userID, nullIfEmpty(inv.ParentID), inv.Name, inv.Category, inv.CurrentValue,
		inv.GrowthRate, startDate, inv.EndDate, growthStrategy, inv.Notes,
	}

	logQuery(query, args)
	row := s.pool.QueryRow(ctx, query, args...)

	var created Investment
	if err := row.Scan(
		&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue,
		&created.GrowthRate, &created.StartDate, &created.EndDate,
		&created.GrowthStrategy, &created.Notes, &created.UpdatedAt,
	); err != nil {
		return Investment{}, fmt.Errorf("failed to create investment: %w", err)
	}

	return created, nil
}
