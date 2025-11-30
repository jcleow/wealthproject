package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// UserSettings stores user preferences like starting age.
type UserSettings struct {
	ID                string    `json:"id,omitempty"`
	UserID            string    `json:"userId,omitempty"`
	StartingAge       int       `json:"startingAge"`
	TerminalAge       int       `json:"terminalAge"`
	YearDisplayFormat string    `json:"yearDisplayFormat"`
	UpdatedAt         time.Time `json:"updatedAt,omitempty"`
}

// DefaultUserSettings are the system defaults.
var DefaultUserSettings = UserSettings{
	StartingAge:       30,
	TerminalAge:       65,
	YearDisplayFormat: "year_number",
}

// GrowthConfig stores bounded annual growth assumptions.
type GrowthConfig struct {
	ID            string    `json:"id,omitempty"`
	Category      string    `json:"category"`
	AnnualRatePct float64   `json:"annualRatePct"`
	LowerBoundPct float64   `json:"lowerBoundPct"`
	UpperBoundPct float64   `json:"upperBoundPct"`
	UpdatedAt     time.Time `json:"updatedAt,omitempty"`
}

// DefaultGrowthConfigs are the system defaults used when user hasn't customized.
var DefaultGrowthConfigs = []GrowthConfig{
	{Category: "asset_cash", AnnualRatePct: 1.5, LowerBoundPct: -50, UpperBoundPct: 50},
	{Category: "asset_equity", AnnualRatePct: 6.0, LowerBoundPct: -50, UpperBoundPct: 50},
	{Category: "asset_property", AnnualRatePct: 3.0, LowerBoundPct: -50, UpperBoundPct: 50},
	{Category: "liability_debt", AnnualRatePct: -3.0, LowerBoundPct: -50, UpperBoundPct: 50},
	{Category: "income", AnnualRatePct: 3.0, LowerBoundPct: -50, UpperBoundPct: 50},
	{Category: "expense", AnnualRatePct: 2.0, LowerBoundPct: -50, UpperBoundPct: 50},
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

// GetGrowthConfigs returns user's growth configs, merged with system defaults.
// If user has customized a category, their value is used; otherwise the default is used.
func (s *Store) GetGrowthConfigs(ctx context.Context, userID string) ([]GrowthConfig, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, category, annual_rate_pct, lower_bound_pct, upper_bound_pct, updated_at
		FROM growth_configs
		WHERE user_id = $1
		ORDER BY category`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	userConfigs := make(map[string]GrowthConfig)
	for rows.Next() {
		var cfg GrowthConfig
		if err := rows.Scan(&cfg.ID, &cfg.Category, &cfg.AnnualRatePct, &cfg.LowerBoundPct, &cfg.UpperBoundPct, &cfg.UpdatedAt); err != nil {
			return nil, err
		}
		userConfigs[cfg.Category] = cfg
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Merge with defaults - user configs override defaults
	result := make([]GrowthConfig, 0, len(DefaultGrowthConfigs))
	for _, def := range DefaultGrowthConfigs {
		if userCfg, ok := userConfigs[def.Category]; ok {
			result = append(result, userCfg)
		} else {
			result = append(result, def)
		}
	}
	return result, nil
}

// UpsertGrowthConfigs inserts or updates growth configs for a user.
func (s *Store) UpsertGrowthConfigs(ctx context.Context, userID string, cfgs []GrowthConfig) error {
	for _, cfg := range cfgs {
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO growth_configs (user_id, category, annual_rate_pct, lower_bound_pct, upper_bound_pct)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (user_id, category) DO UPDATE
			SET annual_rate_pct = EXCLUDED.annual_rate_pct,
			    lower_bound_pct = EXCLUDED.lower_bound_pct,
			    upper_bound_pct = EXCLUDED.upper_bound_pct,
			    updated_at = NOW()`,
			userID, cfg.Category, cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct)
		if err != nil {
			return err
		}
	}
	return nil
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

// GetUserSettings returns user settings, or defaults if not set.
func (s *Store) GetUserSettings(ctx context.Context, userID string) (UserSettings, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, starting_age, terminal_age, year_display_format, updated_at
		FROM user_settings
		WHERE user_id = $1`, userID)
	var settings UserSettings
	if err := row.Scan(&settings.ID, &settings.UserID, &settings.StartingAge, &settings.TerminalAge, &settings.YearDisplayFormat, &settings.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return DefaultUserSettings, nil
		}
		return UserSettings{}, err
	}
	return settings, nil
}

// UpsertUserSettings inserts or updates user settings.
func (s *Store) UpsertUserSettings(ctx context.Context, userID string, settings UserSettings) (UserSettings, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO user_settings (user_id, starting_age, terminal_age, year_display_format)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET starting_age = EXCLUDED.starting_age,
		    terminal_age = EXCLUDED.terminal_age,
		    year_display_format = EXCLUDED.year_display_format,
		    updated_at = NOW()
		RETURNING id, user_id, starting_age, terminal_age, year_display_format, updated_at`,
		userID, settings.StartingAge, settings.TerminalAge, settings.YearDisplayFormat)
	var updated UserSettings
	if err := row.Scan(&updated.ID, &updated.UserID, &updated.StartingAge, &updated.TerminalAge, &updated.YearDisplayFormat, &updated.UpdatedAt); err != nil {
		return UserSettings{}, err
	}
	return updated, nil
}
