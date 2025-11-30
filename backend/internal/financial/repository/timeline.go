package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// GrowthConfig stores bounded annual growth assumptions.
type GrowthConfig struct {
	Category      string
	AnnualRatePct float64
	LowerBoundPct float64
	UpperBoundPct float64
	UpdatedAt     time.Time
}

// FinancialOverride stores per-year overrides for an item.
type FinancialOverride struct {
	ID        string
	Year      int
	ItemID    string
	ItemType  string
	Category  string
	Name      string
	Amount    float64
	Frequency string
	AppliedAt time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

// CustomItem stores new items created via timeline edits.
type CustomItem struct {
	ID          string
	Name        string
	ItemType    string
	Category    string
	Amount      float64
	Frequency   string
	CreatedYear int
	UpdatedAt   time.Time
}

// GetGrowthConfigs returns all growth configs.
// userID is included for interface compatibility; growth configs are currently global.
func (s *Store) GetGrowthConfigs(ctx context.Context, userID string) ([]GrowthConfig, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT category, annual_rate_pct, lower_bound_pct, upper_bound_pct, updated_at
		FROM growth_configs
		ORDER BY category ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cfgs []GrowthConfig
	for rows.Next() {
		var cfg GrowthConfig
		if err := rows.Scan(&cfg.Category, &cfg.AnnualRatePct, &cfg.LowerBoundPct, &cfg.UpperBoundPct, &cfg.UpdatedAt); err != nil {
			return nil, err
		}
		cfgs = append(cfgs, cfg)
	}
	if cfgs == nil {
		cfgs = []GrowthConfig{}
	}
	return cfgs, rows.Err()
}

// UpsertGrowthConfigs inserts or updates growth configs by category.
// userID is included for interface compatibility; growth configs are currently global.
func (s *Store) UpsertGrowthConfigs(ctx context.Context, userID string, cfgs []GrowthConfig) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO growth_configs (category, annual_rate_pct, lower_bound_pct, upper_bound_pct, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (category) DO UPDATE
		SET annual_rate_pct=EXCLUDED.annual_rate_pct,
		    lower_bound_pct=EXCLUDED.lower_bound_pct,
		    upper_bound_pct=EXCLUDED.upper_bound_pct,
		    updated_at=NOW()`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, cfg := range cfgs {
		if _, err := stmt.ExecContext(ctx, cfg.Category, cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ListOverrides returns all overrides.
func (s *Store) ListOverrides(ctx context.Context) ([]FinancialOverride, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, year, item_id, item_type, category, name, amount, frequency, applied_at, created_at, updated_at
		FROM financial_overrides
		ORDER BY year ASC, applied_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []FinancialOverride
	for rows.Next() {
		var ov FinancialOverride
		if err := rows.Scan(&ov.ID, &ov.Year, &ov.ItemID, &ov.ItemType, &ov.Category, &ov.Name, &ov.Amount, &ov.Frequency, &ov.AppliedAt, &ov.CreatedAt, &ov.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, ov)
	}
	if out == nil {
		out = []FinancialOverride{}
	}
	return out, rows.Err()
}

// UpsertOverride inserts or updates the override for a given year/item.
func (s *Store) UpsertOverride(ctx context.Context, ov FinancialOverride) (FinancialOverride, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO financial_overrides (year, item_id, item_type, category, name, amount, frequency, applied_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (year, item_id) DO UPDATE
		SET amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    category=EXCLUDED.category,
		    name=EXCLUDED.name,
		    applied_at=NOW(),
		    updated_at=NOW()
		RETURNING id, year, item_id, item_type, category, name, amount, frequency, applied_at, created_at, updated_at`,
		ov.Year, ov.ItemID, ov.ItemType, ov.Category, ov.Name, ov.Amount, ov.Frequency)
	var updated FinancialOverride
	if err := row.Scan(&updated.ID, &updated.Year, &updated.ItemID, &updated.ItemType, &updated.Category, &updated.Name, &updated.Amount, &updated.Frequency, &updated.AppliedAt, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		return FinancialOverride{}, err
	}
	return updated, nil
}

// ListCustomItems returns all custom items.
func (s *Store) ListCustomItems(ctx context.Context) ([]CustomItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, item_type, category, amount, frequency, created_year, updated_at
		FROM financial_items
		ORDER BY created_year ASC, updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CustomItem
	for rows.Next() {
		var it CustomItem
		if err := rows.Scan(&it.ID, &it.Name, &it.ItemType, &it.Category, &it.Amount, &it.Frequency, &it.CreatedYear, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []CustomItem{}
	}
	return items, rows.Err()
}

// GetCustomItem returns a custom item by ID.
func (s *Store) GetCustomItem(ctx context.Context, id string) (CustomItem, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, item_type, category, amount, frequency, created_year, updated_at
		FROM financial_items
		WHERE id=$1`, id)
	var it CustomItem
	if err := row.Scan(&it.ID, &it.Name, &it.ItemType, &it.Category, &it.Amount, &it.Frequency, &it.CreatedYear, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CustomItem{}, ErrNotFound
		}
		return CustomItem{}, err
	}
	return it, nil
}

// CreateCustomItem inserts a new custom item.
func (s *Store) CreateCustomItem(ctx context.Context, item CustomItem) (CustomItem, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO financial_items (name, item_type, category, amount, frequency, created_year)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, item_type, category, amount, frequency, created_year, updated_at`,
		item.Name, item.ItemType, item.Category, item.Amount, item.Frequency, item.CreatedYear)
	var created CustomItem
	if err := row.Scan(&created.ID, &created.Name, &created.ItemType, &created.Category, &created.Amount, &created.Frequency, &created.CreatedYear, &created.UpdatedAt); err != nil {
		return CustomItem{}, err
	}
	return created, nil
}
