package config

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// Loader provides access to CPF configurations with caching
type Loader struct {
	db    *sql.DB
	cache map[int]*CPFConfiguration
	mu    sync.RWMutex
}

// NewLoader creates a new configuration loader
func NewLoader(db *sql.DB) *Loader {
	return &Loader{
		db:    db,
		cache: make(map[int]*CPFConfiguration),
	}
}

// GetByYear loads configuration for a specific year
func (l *Loader) GetByYear(ctx context.Context, year int) (*CPFConfiguration, error) {
	// Check cache first
	l.mu.RLock()
	if cfg, ok := l.cache[year]; ok {
		l.mu.RUnlock()
		return cfg, nil
	}
	l.mu.RUnlock()

	// Load from database
	cfg, err := l.loadFromDB(ctx, year)
	if err != nil {
		return nil, err
	}

	// Cache it
	l.mu.Lock()
	l.cache[year] = cfg
	l.mu.Unlock()

	return cfg, nil
}

// GetByDate loads configuration effective for a specific date
func (l *Loader) GetByDate(ctx context.Context, date time.Time) (*CPFConfiguration, error) {
	query := `
		SELECT id, year, effective_from, effective_to, config, created_at, updated_at
		FROM cpf_configurations
		WHERE effective_from <= $1
		  AND (effective_to IS NULL OR effective_to > $1)
		ORDER BY effective_from DESC
		LIMIT 1
	`

	var cfg CPFConfiguration
	var configJSON []byte

	err := l.db.QueryRowContext(ctx, query, date).Scan(
		&cfg.ID,
		&cfg.Year,
		&cfg.EffectiveFrom,
		&cfg.EffectiveTo,
		&configJSON,
		&cfg.CreatedAt,
		&cfg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no CPF configuration found for date %s", date.Format("2006-01-02"))
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load CPF configuration: %w", err)
	}

	if err := json.Unmarshal(configJSON, &cfg.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal CPF config: %w", err)
	}

	return &cfg, nil
}

// GetCurrentYear returns configuration for the current year
func (l *Loader) GetCurrentYear(ctx context.Context) (*CPFConfiguration, error) {
	return l.GetByYear(ctx, time.Now().Year())
}

// ListYears returns all available configuration years
func (l *Loader) ListYears(ctx context.Context) ([]int, error) {
	query := `SELECT year FROM cpf_configurations ORDER BY year DESC`

	rows, err := l.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list CPF configuration years: %w", err)
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			return nil, fmt.Errorf("failed to scan year: %w", err)
		}
		years = append(years, year)
	}

	return years, rows.Err()
}

// loadFromDB loads a configuration by year from the database
func (l *Loader) loadFromDB(ctx context.Context, year int) (*CPFConfiguration, error) {
	query := `
		SELECT id, year, effective_from, effective_to, config, created_at, updated_at
		FROM cpf_configurations
		WHERE year = $1
	`

	var cfg CPFConfiguration
	var configJSON []byte

	err := l.db.QueryRowContext(ctx, query, year).Scan(
		&cfg.ID,
		&cfg.Year,
		&cfg.EffectiveFrom,
		&cfg.EffectiveTo,
		&configJSON,
		&cfg.CreatedAt,
		&cfg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no CPF configuration found for year %d", year)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load CPF configuration: %w", err)
	}

	if err := json.Unmarshal(configJSON, &cfg.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal CPF config: %w", err)
	}

	return &cfg, nil
}

// Upsert inserts or updates a configuration for a given year
func (l *Loader) Upsert(ctx context.Context, cfg *CPFConfiguration) error {
	configJSON, err := json.Marshal(cfg.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal CPF config: %w", err)
	}

	query := `
		INSERT INTO cpf_configurations (year, effective_from, effective_to, config)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (year) DO UPDATE SET
			effective_from = EXCLUDED.effective_from,
			effective_to = EXCLUDED.effective_to,
			config = EXCLUDED.config,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	err = l.db.QueryRowContext(ctx, query,
		cfg.Year,
		cfg.EffectiveFrom,
		cfg.EffectiveTo,
		configJSON,
	).Scan(&cfg.ID, &cfg.CreatedAt, &cfg.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to upsert CPF configuration: %w", err)
	}

	// Invalidate cache for this year
	l.mu.Lock()
	delete(l.cache, cfg.Year)
	l.mu.Unlock()

	return nil
}

// ClearCache clears the configuration cache
func (l *Loader) ClearCache() {
	l.mu.Lock()
	l.cache = make(map[int]*CPFConfiguration)
	l.mu.Unlock()
}
