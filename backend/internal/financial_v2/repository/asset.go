package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GetNonCashAsset retrieves a single asset by ID.
func (s *Store) GetNonCashAsset(ctx context.Context, userID, id string) (*NonCashAsset, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		growth_rate,
		start_date,
		end_date,
		terminal_value,
		lease_start_year,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at
	FROM finance_assets
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var a NonCashAsset
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue,
		&a.AnnualGrowthRate, &a.StartDate, &a.EndDate, &a.TerminalValue,
		&a.LeaseStartYear, &a.Notes, &a.GrowthStrategy, &a.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get asset: %w", err)
	}

	return &a, nil
}

// CreateNonCashAsset creates a new asset record.
// Uses upsert to handle conflicts on (parent_id, start_date).
func (s *Store) CreateNonCashAsset(ctx context.Context, userID string, asset NonCashAsset) (NonCashAsset, error) {
	startDate := asset.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default growth strategy if not provided
	growthStrategy := asset.GrowthStrategy
	if growthStrategy == "" {
		growthStrategy = "annual_step"
	}

	query := `
		INSERT INTO finance_assets (user_id, parent_id, name, category, current_value, growth_rate, start_date, end_date, terminal_value, lease_start_year, notes, growth_strategy)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''), $12)
		ON CONFLICT ON CONSTRAINT finance_assets_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_value=EXCLUDED.current_value,
		    growth_rate=EXCLUDED.growth_rate,
		    end_date=EXCLUDED.end_date,
		    terminal_value=EXCLUDED.terminal_value,
		    lease_start_year=EXCLUDED.lease_start_year,
		    notes=EXCLUDED.notes,
		    growth_strategy=EXCLUDED.growth_strategy,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id, id), name, category, current_value, growth_rate, start_date, end_date, terminal_value, lease_start_year, COALESCE(notes, ''), COALESCE(growth_strategy, ''), updated_at`

	args := []any{
		userID, nullIfEmpty(asset.ParentID), asset.Name, asset.Category, asset.CurrentValue,
		asset.AnnualGrowthRate, startDate, asset.EndDate, asset.TerminalValue, asset.LeaseStartYear,
		asset.Notes, growthStrategy,
	}

	logQuery(query, args)
	row := s.pool.QueryRow(ctx, query, args...)

	var created NonCashAsset
	if err := row.Scan(
		&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue,
		&created.AnnualGrowthRate, &created.StartDate, &created.EndDate, &created.TerminalValue,
		&created.LeaseStartYear, &created.Notes, &created.GrowthStrategy, &created.UpdatedAt,
	); err != nil {
		return NonCashAsset{}, fmt.Errorf("failed to create asset: %w", err)
	}

	return created, nil
}

// UpdateNonCashAsset updates an existing asset record.
func (s *Store) UpdateNonCashAsset(ctx context.Context, userID string, asset NonCashAsset) (*NonCashAsset, error) {
	query := `
	UPDATE finance_assets
	SET name = $3,
	    category = $4,
	    current_value = $5,
	    growth_rate = COALESCE($6, growth_rate),
	    start_date = COALESCE($7, start_date),
	    end_date = $8,
	    terminal_value = $9,
	    lease_start_year = $10,
	    notes = NULLIF($11, ''),
	    growth_strategy = COALESCE(NULLIF($12, ''), growth_strategy, 'annual_step'),
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_value, growth_rate, start_date, end_date, terminal_value, lease_start_year, COALESCE(notes, ''), COALESCE(growth_strategy, ''), updated_at`

	var startDate *time.Time
	if !asset.StartDate.IsZero() {
		startDate = &asset.StartDate
	}

	var growthRate *decimal.Decimal
	zero := decimal.Zero()
	if asset.AnnualGrowthRate.Cmp(zero) != 0 {
		growthRate = &asset.AnnualGrowthRate
	}

	args := []any{
		userID, asset.ID, asset.Name, asset.Category, asset.CurrentValue,
		growthRate, startDate, asset.EndDate, asset.TerminalValue, asset.LeaseStartYear,
		asset.Notes, asset.GrowthStrategy,
	}

	logQuery(query, args)

	var updated NonCashAsset
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue,
		&updated.AnnualGrowthRate, &updated.StartDate, &updated.EndDate, &updated.TerminalValue,
		&updated.LeaseStartYear, &updated.Notes, &updated.GrowthStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update asset: %w", err)
	}

	return &updated, nil
}

// DeleteNonCashAsset deletes an asset and all its descendant versions.
func (s *Store) DeleteNonCashAsset(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM finance_assets WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT a.id FROM finance_assets a
		INNER JOIN descendants d ON a.parent_id = d.id
		WHERE a.user_id = $1
	)
	DELETE FROM finance_assets WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete asset: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// StopNonCashAsset sets the end_date on an asset (soft delete).
// Children are NOT affected.
func (s *Store) StopNonCashAsset(ctx context.Context, userID, id string, endDate time.Time) (*NonCashAsset, error) {
	query := `
	UPDATE finance_assets
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, COALESCE(parent_id, id), name, category, current_value, growth_rate, start_date, end_date, terminal_value, lease_start_year, COALESCE(notes, ''), COALESCE(growth_strategy, ''), updated_at`

	logQuery(query, []any{userID, id, endDate})

	var updated NonCashAsset
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue,
		&updated.AnnualGrowthRate, &updated.StartDate, &updated.EndDate, &updated.TerminalValue,
		&updated.LeaseStartYear, &updated.Notes, &updated.GrowthStrategy, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop asset: %w", err)
	}

	return &updated, nil
}

// FindNonCashAssetByParentAndStartDate finds an asset version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindNonCashAssetByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*NonCashAsset, error) {
	query := `
	SELECT id,
		COALESCE(parent_id, id) as parent_id,
		name,
		category,
		current_value,
		growth_rate,
		start_date,
		end_date,
		terminal_value,
		lease_start_year,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		updated_at
	FROM finance_assets
	WHERE user_id = $1 AND parent_id = $2 AND DATE(start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var a NonCashAsset
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue,
		&a.AnnualGrowthRate, &a.StartDate, &a.EndDate, &a.TerminalValue,
		&a.LeaseStartYear, &a.Notes, &a.GrowthStrategy, &a.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find asset by parent and start date: %w", err)
	}

	return &a, nil
}
