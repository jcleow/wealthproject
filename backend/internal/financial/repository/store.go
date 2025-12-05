package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// Store provides persistence for financial entities.
type Store struct {
	db *sql.DB
}

// NewStore returns a new Store backed by Postgres.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// NullInt32ToIntPtr converts sql.NullInt32 to *int for JSON marshaling.
func NullInt32ToIntPtr(n sql.NullInt32) *int {
	if !n.Valid {
		return nil
	}
	val := int(n.Int32)
	return &val
}

// IntPtrToNullInt32 converts *int to sql.NullInt32 for database operations.
func IntPtrToNullInt32(i *int) sql.NullInt32 {
	if i == nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: int32(*i), Valid: true}
}

// Asset represents a persisted asset record.
type Asset struct {
	ID               string                 `json:"id"`
	ParentID         string                 `json:"parentId"`
	Name             string                 `json:"name"`
	Category         string                 `json:"category"`
	CurrentValue     float64                `json:"currentValue"`
	AnnualGrowthRate float64                `json:"annualGrowthRate"`
	Frequency        string                 `json:"frequency"`
	StartYear        int                    `json:"startYear"`
	StartMonth       *int                   `json:"startMonth,omitempty"`
	EndYear          *int                   `json:"endYear,omitempty"`
	EndMonth         *int                   `json:"endMonth,omitempty"`
	Notes            string                 `json:"notes"`
	GrowthStrategy   string                 `json:"growthStrategy"`
	GrowthMetadata   map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

// Liability represents a persisted liability record.
type Liability struct {
	ID              string                 `json:"id"`
	ParentID        string                 `json:"parentId"`
	Name            string                 `json:"name"`
	Category        string                 `json:"category"`
	CurrentBalance  float64                `json:"currentBalance"`
	InterestRateAPR float64                `json:"interestRateApr"`
	MinimumPayment  float64                `json:"minimumPayment"`
	Frequency       string                 `json:"frequency"`
	StartYear       int                    `json:"startYear"`
	StartMonth      *int                   `json:"startMonth,omitempty"`
	EndYear         *int                   `json:"endYear,omitempty"`
	EndMonth        *int                   `json:"endMonth,omitempty"`
	Notes           string                 `json:"notes"`
	GrowthStrategy  string                 `json:"growthStrategy"`
	GrowthMetadata  map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt       time.Time              `json:"updatedAt"`
}

// PropertyScenario represents a persisted property scenario record.
type PropertyScenario struct {
	ID            string
	PropertyType  string
	Headline      string
	Subheadline   string
	LastRefreshed string
	PropertyPrice float64
	DownPayment   float64
	LoanAmount    float64
	InterestRate  float64
	LoanTenure    int
	Notes         string
	Amortization  map[string]interface{}
	Snapshot      map[string]interface{}
	Timeline      map[string]interface{}
	Milestones    map[string]interface{}
	Insights      map[string]interface{}
	UpdatedAt     time.Time
}

// Income represents a persisted income record.
type Income struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Source         string                 `json:"source"`
	Amount         float64                `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      *time.Time             `json:"startDate"`
	StartYear      int                    `json:"startYear"`
	EndYear        sql.NullInt32          `json:"endYear"`
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// Expense represents a persisted expense record.
type Expense struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Payee          string                 `json:"payee"`
	Amount         float64                `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartYear      int                    `json:"startYear"`
	EndYear        sql.NullInt32          `json:"endYear"`
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
}

// PaginationParams holds pagination parameters for list queries.
type PaginationParams struct {
	Limit  int
	Offset int
}

// PaginatedResult holds paginated list results with metadata.
type PaginatedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Limit      int `json:"limit"`
	Offset     int `json:"offset"`
	HasMore    bool `json:"hasMore"`
}

// DefaultPagination returns default pagination params (20 items, no offset).
func DefaultPagination() PaginationParams {
	return PaginationParams{Limit: 20, Offset: 0}
}

// NormalizePagination ensures pagination params are within valid bounds.
// A Limit of -1 means "no limit" (return all results).
// A Limit of 0 defaults to 20.
func NormalizePagination(p PaginationParams) PaginationParams {
	if p.Limit == 0 {
		p.Limit = 20
	} else if p.Limit > 0 && p.Limit > 100 {
		p.Limit = 100
	}
	// -1 means no limit, leave it as-is
	if p.Offset < 0 {
		p.Offset = 0
	}
	return p
}

// IsUnlimited returns true if pagination should return all results.
func (p PaginationParams) IsUnlimited() bool {
	return p.Limit < 0
}

// PropertyLink ties assets and liabilities to property scenarios.
type PropertyLink struct {
	ID                 string
	PropertyScenarioID string
	AssetID            string
	LiabilityID        string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// GetAssetByNameAndCategory returns an asset by name/category if it exists for a user.
func (s *Store) GetAssetByNameAndCategory(ctx context.Context, userID, name, category string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at
		FROM finance_assets
		WHERE user_id=$1 AND LOWER(name)=LOWER($2) AND category=$3
		LIMIT 1`, userID, name, category)
	var a Asset
	if err := row.Scan(&a.ID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return a, nil
}

// GetLiabilityByNameAndCategory returns a liability by name/category if it exists for a user.
func (s *Store) GetLiabilityByNameAndCategory(ctx context.Context, userID, name, category string) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at
		FROM finance_liabilities
		WHERE user_id=$1 AND LOWER(name)=LOWER($2) AND category=$3
		LIMIT 1`, userID, name, category)
	var li Liability
	if err := row.Scan(&li.ID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Notes, &li.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	return li, nil
}

// ----- Asset operations -----

func (s *Store) ListAssets(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Asset], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_assets WHERE user_id = $1`, userID).Scan(&total)
	if err != nil {
		return PaginatedResult[Asset]{}, err
	}

	// Build query - omit LIMIT when limit is -1 (unlimited)
	var rows *sql.Rows
	if p.IsUnlimited() {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       name,
			       category,
			       current_value,
			       annual_growth_rate,
			       COALESCE(frequency, 'annual') as frequency,
			       COALESCE(start_year, 0) as start_year,
			       start_month,
			       end_year,
			       end_month,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_assets
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			OFFSET $2`, userID, p.Offset)
	} else {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       name,
			       category,
			       current_value,
			       annual_growth_rate,
			       COALESCE(frequency, 'annual') as frequency,
			       COALESCE(start_year, 0) as start_year,
			       start_month,
			       end_year,
			       end_month,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_assets
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			LIMIT $2 OFFSET $3`, userID, p.Limit, p.Offset)
	}
	if err != nil {
		return PaginatedResult[Asset]{}, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		var startMonth, endYear, endMonth sql.NullInt32
		if err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Frequency, &a.StartYear, &startMonth, &endYear, &endMonth, &a.Notes, &a.UpdatedAt); err != nil {
			return PaginatedResult[Asset]{}, err
		}
		a.StartMonth = NullInt32ToIntPtr(startMonth)
		a.EndYear = NullInt32ToIntPtr(endYear)
		a.EndMonth = NullInt32ToIntPtr(endMonth)
		assets = append(assets, a)
	}
	if assets == nil {
		assets = []Asset{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[Asset]{}, err
	}

	return PaginatedResult[Asset]{
		Data:    assets,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(assets) < total,
	}, nil
}

// ListAllAssets returns all assets for a user (no pagination, for internal use like timeline).
func (s *Store) ListAllAssets(ctx context.Context, userID string) ([]Asset, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       start_month,
		       end_year,
		       end_month,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE user_id = $1
		ORDER BY parent_id, start_year`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		var startMonth, endYear, endMonth sql.NullInt32
		if err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Frequency, &a.StartYear, &startMonth, &endYear, &endMonth, &a.Notes, &a.UpdatedAt); err != nil {
			return nil, err
		}
		a.StartMonth = NullInt32ToIntPtr(startMonth)
		a.EndYear = NullInt32ToIntPtr(endYear)
		a.EndMonth = NullInt32ToIntPtr(endMonth)
		assets = append(assets, a)
	}
	if assets == nil {
		assets = []Asset{}
	}
	return assets, rows.Err()
}

func (s *Store) GetAsset(ctx context.Context, userID, id string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       start_month,
		       end_year,
		       end_month,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE user_id = $1 AND id = $2`, userID, id)
	var a Asset
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Frequency, &a.StartYear, &startMonth, &endYear, &endMonth, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	a.StartMonth = NullInt32ToIntPtr(startMonth)
	a.EndYear = NullInt32ToIntPtr(endYear)
	a.EndMonth = NullInt32ToIntPtr(endMonth)
	return a, nil
}

func (s *Store) CreateAsset(ctx context.Context, userID string, a Asset) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_assets (user_id, parent_id, name, category, current_value, annual_growth_rate, frequency, start_year, start_month, end_year, end_month, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, COALESCE($7,'annual'), COALESCE($8,0), $9, $10, $11, NULLIF($12, ''))
		ON CONFLICT (parent_id, start_year) DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_value=EXCLUDED.current_value,
		    annual_growth_rate=EXCLUDED.annual_growth_rate,
		    frequency=EXCLUDED.frequency,
		    start_month=EXCLUDED.start_month,
		    end_year=EXCLUDED.end_year,
		    end_month=EXCLUDED.end_month,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, COALESCE(frequency,'annual'), COALESCE(start_year,0), start_month, end_year, end_month, COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(a.ParentID), a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, a.Frequency, a.StartYear, IntPtrToNullInt32(a.StartMonth), IntPtrToNullInt32(a.EndYear), IntPtrToNullInt32(a.EndMonth), a.Notes)
	var created Asset
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue, &created.AnnualGrowthRate, &created.Frequency, &created.StartYear, &startMonth, &endYear, &endMonth, &created.Notes, &created.UpdatedAt); err != nil {
		return Asset{}, err
	}
	created.StartMonth = NullInt32ToIntPtr(startMonth)
	created.EndYear = NullInt32ToIntPtr(endYear)
	created.EndMonth = NullInt32ToIntPtr(endMonth)
	return created, nil
}

func (s *Store) UpdateAsset(ctx context.Context, userID string, a Asset) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET name=$3,
		    category=$4,
		    current_value=$5,
		    annual_growth_rate=$6,
		    frequency=COALESCE($7, frequency),
		    start_year=COALESCE($8, start_year),
		    start_month=$9,
		    end_year=$10,
		    end_month=$11,
		    notes=NULLIF($12, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, COALESCE(frequency,'annual'), COALESCE(start_year,0), start_month, end_year, end_month, COALESCE(notes, ''), updated_at`,
		userID, a.ID, a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, nullIfEmpty(a.Frequency), nullableInt32(a.StartYear), IntPtrToNullInt32(a.StartMonth), IntPtrToNullInt32(a.EndYear), IntPtrToNullInt32(a.EndMonth), a.Notes)
	var updated Asset
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.Frequency, &updated.StartYear, &startMonth, &endYear, &endMonth, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	updated.StartMonth = NullInt32ToIntPtr(startMonth)
	updated.EndYear = NullInt32ToIntPtr(endYear)
	updated.EndMonth = NullInt32ToIntPtr(endMonth)
	return updated, nil
}

func (s *Store) DeleteAsset(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_assets WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

func nullableInt32(val int) sql.NullInt32 {
	return sql.NullInt32{Int32: int32(val), Valid: true}
}

func nullableFromNullInt32(val sql.NullInt32) sql.NullInt32 {
	if val.Valid {
		return val
	}
	return sql.NullInt32{Valid: false}
}

func nullIfEmpty(val string) *string {
	if strings.TrimSpace(val) == "" {
		return nil
	}
	out := strings.TrimSpace(val)
	return &out
}

// ConvertAssetToProperty updates an asset category to property (idempotent).
func (s *Store) ConvertAssetToProperty(ctx context.Context, userID, id string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET category='property',
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`, userID, id)
	var updated Asset
	if err := row.Scan(&updated.ID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return updated, nil
}

// ----- Liability operations -----

func (s *Store) ListLiabilities(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Liability], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_liabilities WHERE user_id = $1`, userID).Scan(&total)
	if err != nil {
		return PaginatedResult[Liability]{}, err
	}

	// Build query - omit LIMIT when limit is -1 (unlimited)
	var rows *sql.Rows
	if p.IsUnlimited() {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       name,
			       category,
			       current_balance,
			       interest_rate_apr,
			       minimum_payment,
			       COALESCE(frequency, 'annual') as frequency,
			       COALESCE(start_year, 0) as start_year,
			       start_month,
			       end_year,
			       end_month,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_liabilities
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			OFFSET $2`, userID, p.Offset)
	} else {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       name,
			       category,
			       current_balance,
			       interest_rate_apr,
			       minimum_payment,
			       COALESCE(frequency, 'annual') as frequency,
			       COALESCE(start_year, 0) as start_year,
			       start_month,
			       end_year,
			       end_month,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_liabilities
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			LIMIT $2 OFFSET $3`, userID, p.Limit, p.Offset)
	}
	if err != nil {
		return PaginatedResult[Liability]{}, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		var startMonth, endYear, endMonth sql.NullInt32
		if err := rows.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Frequency, &li.StartYear, &startMonth, &endYear, &endMonth, &li.Notes, &li.UpdatedAt); err != nil {
			return PaginatedResult[Liability]{}, err
		}
		li.StartMonth = NullInt32ToIntPtr(startMonth)
		li.EndYear = NullInt32ToIntPtr(endYear)
		li.EndMonth = NullInt32ToIntPtr(endMonth)
		items = append(items, li)
	}
	if items == nil {
		items = []Liability{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[Liability]{}, err
	}

	return PaginatedResult[Liability]{
		Data:    items,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(items) < total,
	}, nil
}

// ListAllLiabilities returns all liabilities for a user (no pagination, for internal use like timeline).
func (s *Store) ListAllLiabilities(ctx context.Context, userID string) ([]Liability, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_balance,
		       interest_rate_apr,
		       minimum_payment,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       start_month,
		       end_year,
		       end_month,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_liabilities
		WHERE user_id = $1
		ORDER BY parent_id, start_year`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		var startMonth, endYear, endMonth sql.NullInt32
		if err := rows.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Frequency, &li.StartYear, &startMonth, &endYear, &endMonth, &li.Notes, &li.UpdatedAt); err != nil {
			return nil, err
		}
		li.StartMonth = NullInt32ToIntPtr(startMonth)
		li.EndYear = NullInt32ToIntPtr(endYear)
		li.EndMonth = NullInt32ToIntPtr(endMonth)
		items = append(items, li)
	}
	if items == nil {
		items = []Liability{}
	}
	return items, rows.Err()
}

func (s *Store) GetLiability(ctx context.Context, userID, id string) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_balance,
		       interest_rate_apr,
		       minimum_payment,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       start_month,
		       end_year,
		       end_month,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_liabilities
		WHERE user_id = $1 AND id = $2`, userID, id)
	var li Liability
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Frequency, &li.StartYear, &startMonth, &endYear, &endMonth, &li.Notes, &li.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	li.StartMonth = NullInt32ToIntPtr(startMonth)
	li.EndYear = NullInt32ToIntPtr(endYear)
	li.EndMonth = NullInt32ToIntPtr(endMonth)
	return li, nil
}

func (s *Store) CreateLiability(ctx context.Context, userID string, li Liability) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (user_id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, frequency, start_year, start_month, end_year, end_month, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, COALESCE($8,'annual'), COALESCE($9,0), $10, $11, $12, NULLIF($13, ''))
		ON CONFLICT (parent_id, start_year) DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_balance=EXCLUDED.current_balance,
		    interest_rate_apr=EXCLUDED.interest_rate_apr,
		    minimum_payment=EXCLUDED.minimum_payment,
		    frequency=EXCLUDED.frequency,
		    start_month=EXCLUDED.start_month,
		    end_year=EXCLUDED.end_year,
		    end_month=EXCLUDED.end_month,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(frequency,'annual'), COALESCE(start_year,0), start_month, end_year, end_month, COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(li.ParentID), li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, li.Frequency, li.StartYear, IntPtrToNullInt32(li.StartMonth), IntPtrToNullInt32(li.EndYear), IntPtrToNullInt32(li.EndMonth), li.Notes)
	var created Liability
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.Frequency, &created.StartYear, &startMonth, &endYear, &endMonth, &created.Notes, &created.UpdatedAt); err != nil {
		return Liability{}, err
	}
	created.StartMonth = NullInt32ToIntPtr(startMonth)
	created.EndYear = NullInt32ToIntPtr(endYear)
	created.EndMonth = NullInt32ToIntPtr(endMonth)
	return created, nil
}

func (s *Store) UpdateLiability(ctx context.Context, userID string, li Liability) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET name=$3,
		    category=$4,
		    current_balance=$5,
		    interest_rate_apr=$6,
		    minimum_payment=$7,
		    frequency=COALESCE($8, frequency),
		    start_year=COALESCE($9, start_year),
		    start_month=$10,
		    end_year=$11,
		    end_month=$12,
		    notes=NULLIF($13, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(frequency,'annual'), COALESCE(start_year,0), start_month, end_year, end_month, COALESCE(notes, ''), updated_at`,
		userID, li.ID, li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, nullIfEmpty(li.Frequency), nullableInt32(li.StartYear), IntPtrToNullInt32(li.StartMonth), IntPtrToNullInt32(li.EndYear), IntPtrToNullInt32(li.EndMonth), li.Notes)
	var updated Liability
	var startMonth, endYear, endMonth sql.NullInt32
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentBalance, &updated.InterestRateAPR, &updated.MinimumPayment, &updated.Frequency, &updated.StartYear, &startMonth, &endYear, &endMonth, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	updated.StartMonth = NullInt32ToIntPtr(startMonth)
	updated.EndYear = NullInt32ToIntPtr(endYear)
	updated.EndMonth = NullInt32ToIntPtr(endMonth)
	return updated, nil
}

func (s *Store) DeleteLiability(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_liabilities WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ConvertLiabilityToProperty updates a liability category to property (idempotent).
func (s *Store) ConvertLiabilityToProperty(ctx context.Context, userID, id string) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET category='property',
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`, userID, id)
	var updated Liability
	if err := row.Scan(&updated.ID, &updated.Name, &updated.Category, &updated.CurrentBalance, &updated.InterestRateAPR, &updated.MinimumPayment, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	return updated, nil
}

// ----- Property Scenario operations -----

func (s *Store) ListPropertyScenarios(ctx context.Context, userID string) ([]PropertyScenario, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at
		FROM property_scenarios
		WHERE user_id = $1
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PropertyScenario
	for rows.Next() {
		var ps PropertyScenario
		var amortBytes, snapBytes, timelineBytes, milestoneBytes, insightsBytes []byte
		if err := rows.Scan(&ps.ID, &ps.PropertyType, &ps.Headline, &ps.Subheadline, &ps.LastRefreshed, &ps.PropertyPrice, &ps.DownPayment, &ps.LoanAmount, &ps.InterestRate, &ps.LoanTenure, &ps.Notes, &amortBytes, &snapBytes, &timelineBytes, &milestoneBytes, &insightsBytes, &ps.UpdatedAt); err != nil {
			return nil, err
		}
		ps.Amortization = decodeJSONMap(amortBytes)
		ps.Snapshot = decodeJSONMap(snapBytes)
		ps.Timeline = decodeJSONMap(timelineBytes)
		ps.Milestones = decodeJSONMap(milestoneBytes)
		ps.Insights = decodeJSONMap(insightsBytes)
		items = append(items, ps)
	}
	if items == nil {
		items = []PropertyScenario{}
	}
	return items, rows.Err()
}

func (s *Store) GetPropertyScenario(ctx context.Context, userID, id string) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at
		FROM property_scenarios
		WHERE user_id = $1 AND id = $2`, userID, id)
	var ps PropertyScenario
	var amortBytes, snapBytes, timelineBytes, milestoneBytes, insightsBytes []byte
	if err := row.Scan(&ps.ID, &ps.PropertyType, &ps.Headline, &ps.Subheadline, &ps.LastRefreshed, &ps.PropertyPrice, &ps.DownPayment, &ps.LoanAmount, &ps.InterestRate, &ps.LoanTenure, &ps.Notes, &amortBytes, &snapBytes, &timelineBytes, &milestoneBytes, &insightsBytes, &ps.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PropertyScenario{}, ErrNotFound
		}
		return PropertyScenario{}, err
	}
	ps.Amortization = decodeJSONMap(amortBytes)
	ps.Snapshot = decodeJSONMap(snapBytes)
	ps.Timeline = decodeJSONMap(timelineBytes)
	ps.Milestones = decodeJSONMap(milestoneBytes)
	ps.Insights = decodeJSONMap(insightsBytes)
	return ps, nil
}

func (s *Store) CreatePropertyScenario(ctx context.Context, userID string, ps PropertyScenario) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO property_scenarios (user_id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, notes, amortization, snapshot, timeline, milestones, insights)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''), COALESCE($12::jsonb, '{}'::jsonb), COALESCE($13::jsonb, '{}'::jsonb), COALESCE($14::jsonb, '{}'::jsonb), COALESCE($15::jsonb, '{}'::jsonb), COALESCE($16::jsonb, '{}'::jsonb))
		RETURNING id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at`,
		userID, ps.PropertyType, ps.Headline, ps.Subheadline, ps.LastRefreshed, ps.PropertyPrice, ps.DownPayment, ps.LoanAmount, ps.InterestRate, ps.LoanTenure, ps.Notes, encodeJSON(ps.Amortization), encodeJSON(ps.Snapshot), encodeJSON(ps.Timeline), encodeJSON(ps.Milestones), encodeJSON(ps.Insights))
	var created PropertyScenario
	var amortBytes, snapBytes, timelineBytes, milestoneBytes, insightsBytes []byte
	if err := row.Scan(&created.ID, &created.PropertyType, &created.Headline, &created.Subheadline, &created.LastRefreshed, &created.PropertyPrice, &created.DownPayment, &created.LoanAmount, &created.InterestRate, &created.LoanTenure, &created.Notes, &amortBytes, &snapBytes, &timelineBytes, &milestoneBytes, &insightsBytes, &created.UpdatedAt); err != nil {
		return PropertyScenario{}, err
	}
	created.Amortization = decodeJSONMap(amortBytes)
	created.Snapshot = decodeJSONMap(snapBytes)
	created.Timeline = decodeJSONMap(timelineBytes)
	created.Milestones = decodeJSONMap(milestoneBytes)
	created.Insights = decodeJSONMap(insightsBytes)
	return created, nil
}

func (s *Store) UpdatePropertyScenario(ctx context.Context, userID string, ps PropertyScenario) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE property_scenarios
		SET property_type=$3,
		    headline=$4,
		    subheadline=$5,
		    last_refreshed=$6,
		    property_price=$7,
		    down_payment=$8,
		    loan_amount=$9,
		    interest_rate=$10,
		    loan_tenure=$11,
		    notes=NULLIF($12, ''),
		    amortization=COALESCE($13::jsonb, '{}'::jsonb),
		    snapshot=COALESCE($14::jsonb, '{}'::jsonb),
		    timeline=COALESCE($15::jsonb, '{}'::jsonb),
		    milestones=COALESCE($16::jsonb, '{}'::jsonb),
		    insights=COALESCE($17::jsonb, '{}'::jsonb),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at`,
		userID, ps.ID, ps.PropertyType, ps.Headline, ps.Subheadline, ps.LastRefreshed, ps.PropertyPrice, ps.DownPayment, ps.LoanAmount, ps.InterestRate, ps.LoanTenure, ps.Notes, encodeJSON(ps.Amortization), encodeJSON(ps.Snapshot), encodeJSON(ps.Timeline), encodeJSON(ps.Milestones), encodeJSON(ps.Insights))
	var updated PropertyScenario
	var amortBytes, snapBytes, timelineBytes, milestoneBytes, insightsBytes []byte
	if err := row.Scan(&updated.ID, &updated.PropertyType, &updated.Headline, &updated.Subheadline, &updated.LastRefreshed, &updated.PropertyPrice, &updated.DownPayment, &updated.LoanAmount, &updated.InterestRate, &updated.LoanTenure, &updated.Notes, &amortBytes, &snapBytes, &timelineBytes, &milestoneBytes, &insightsBytes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PropertyScenario{}, ErrNotFound
		}
		return PropertyScenario{}, err
	}
	updated.Amortization = decodeJSONMap(amortBytes)
	updated.Snapshot = decodeJSONMap(snapBytes)
	updated.Timeline = decodeJSONMap(timelineBytes)
	updated.Milestones = decodeJSONMap(milestoneBytes)
	updated.Insights = decodeJSONMap(insightsBytes)
	return updated, nil
}

func (s *Store) DeletePropertyScenario(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM property_scenarios WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ----- Income operations -----

func (s *Store) ListIncomes(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Income], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_incomes WHERE user_id = $1`, userID).Scan(&total)
	if err != nil {
		return PaginatedResult[Income]{}, err
	}

	// Build query - omit LIMIT when limit is -1 (unlimited)
	var rows *sql.Rows
	if p.IsUnlimited() {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       source,
			       amount,
			       frequency,
			       start_year,
			       end_year,
			       start_date,
			       category,
			       COALESCE(growth_rate, 3.0) as growth_rate,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_incomes
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			OFFSET $2`, userID, p.Offset)
	} else {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       source,
			       amount,
			       frequency,
			       start_year,
			       end_year,
			       start_date,
			       category,
			       COALESCE(growth_rate, 3.0) as growth_rate,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_incomes
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			LIMIT $2 OFFSET $3`, userID, p.Limit, p.Offset)
	}
	if err != nil {
		return PaginatedResult[Income]{}, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.StartDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
			return PaginatedResult[Income]{}, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Income{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[Income]{}, err
	}

	return PaginatedResult[Income]{
		Data:    items,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(items) < total,
	}, nil
}

// ListAllIncomes returns all incomes for a user (no pagination, for internal use like timeline).
func (s *Store) ListAllIncomes(ctx context.Context, userID string) ([]Income, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       source,
		       amount,
		       frequency,
		       start_year,
		       end_year,
		       start_date,
		       category,
		       COALESCE(growth_rate, 3.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_incomes
		WHERE user_id = $1
		ORDER BY parent_id, start_year`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.StartDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Income{}
	}
	return items, rows.Err()
}

func (s *Store) GetIncome(ctx context.Context, userID, id string) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       source,
		       amount,
		       frequency,
		       start_year,
		       end_year,
		       start_date,
		       category,
		       COALESCE(growth_rate, 3.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_incomes
		WHERE user_id = $1 AND id = $2`, userID, id)
	var it Income
	if err := row.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.StartDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	return it, nil
}

func (s *Store) CreateIncome(ctx context.Context, userID string, it Income) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (user_id, parent_id, source, amount, frequency, start_year, end_year, start_date, category, growth_rate, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, COALESCE($6,0), $7, COALESCE($8, NOW()), $9, COALESCE($10, 3.0), NULLIF($11, ''))
		ON CONFLICT (parent_id, start_year) DO UPDATE
		SET source=EXCLUDED.source,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_year=EXCLUDED.end_year,
		    start_date=EXCLUDED.start_date,
		    category=EXCLUDED.category,
		    growth_rate=EXCLUDED.growth_rate,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), source, amount, frequency, start_year, end_year, start_date, category, COALESCE(growth_rate, 3.0), COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(it.ParentID), it.Source, it.Amount, it.Frequency, it.StartYear, nullableFromNullInt32(it.EndYear), it.StartDate, it.Category, it.GrowthRate, it.Notes)
	var created Income
	if err := row.Scan(&created.ID, &created.ParentID, &created.Source, &created.Amount, &created.Frequency, &created.StartYear, &created.EndYear, &created.StartDate, &created.Category, &created.GrowthRate, &created.Notes, &created.UpdatedAt); err != nil {
		return Income{}, err
	}
	return created, nil
}

func (s *Store) UpdateIncome(ctx context.Context, userID string, it Income) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_incomes
		SET source=$3,
		    amount=$4,
		    frequency=$5,
		    start_year=COALESCE($6, start_year),
		    end_year=$7,
		    start_date=COALESCE($8, start_date, NOW()),
		    category=$9,
		    growth_rate=COALESCE($10, growth_rate, 3.0),
		    notes=NULLIF($11, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), source, amount, frequency, COALESCE(start_year,0), end_year, start_date, category, COALESCE(growth_rate, 3.0), COALESCE(notes, ''), updated_at`,
		userID, it.ID, it.Source, it.Amount, it.Frequency, nullableInt32(it.StartYear), nullableFromNullInt32(it.EndYear), it.StartDate, it.Category, it.GrowthRate, it.Notes)
	var updated Income
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Source, &updated.Amount, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.StartDate, &updated.Category, &updated.GrowthRate, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	return updated, nil
}

func (s *Store) DeleteIncome(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_incomes WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ----- Expense operations -----

func (s *Store) ListExpenses(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Expense], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_expenses WHERE user_id = $1`, userID).Scan(&total)
	if err != nil {
		return PaginatedResult[Expense]{}, err
	}

	// Build query - omit LIMIT when limit is -1 (unlimited)
	var rows *sql.Rows
	if p.IsUnlimited() {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       payee,
			       amount,
			       frequency,
			       COALESCE(start_year, 0) as start_year,
			       end_year,
			       category,
			       COALESCE(growth_rate, 2.0) as growth_rate,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_expenses
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			OFFSET $2`, userID, p.Offset)
	} else {
		rows, err = s.db.QueryContext(ctx, `
			SELECT id,
			       COALESCE(parent_id, id) as parent_id,
			       payee,
			       amount,
			       frequency,
			       COALESCE(start_year, 0) as start_year,
			       end_year,
			       category,
			       COALESCE(growth_rate, 2.0) as growth_rate,
			       COALESCE(notes, '') as notes,
			       updated_at
			FROM finance_expenses
			WHERE user_id = $1
			ORDER BY parent_id, start_year
			LIMIT $2 OFFSET $3`, userID, p.Limit, p.Offset)
	}
	if err != nil {
		return PaginatedResult[Expense]{}, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
			return PaginatedResult[Expense]{}, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Expense{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[Expense]{}, err
	}

	return PaginatedResult[Expense]{
		Data:    items,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(items) < total,
	}, nil
}

// ListAllExpenses returns all expenses for a user (no pagination, for internal use like timeline).
func (s *Store) ListAllExpenses(ctx context.Context, userID string) ([]Expense, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       category,
		       COALESCE(growth_rate, 2.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_expenses
		WHERE user_id = $1
		ORDER BY parent_id, start_year`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Expense{}
	}
	return items, rows.Err()
}

func (s *Store) GetExpense(ctx context.Context, userID, id string) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       category,
		       COALESCE(growth_rate, 2.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_expenses
		WHERE user_id = $1 AND id = $2`, userID, id)
	var it Expense
	if err := row.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	return it, nil
}

func (s *Store) CreateExpense(ctx context.Context, userID string, it Expense) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (user_id, parent_id, payee, amount, frequency, start_year, end_year, category, growth_rate, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, COALESCE($6,0), $7, $8, COALESCE($9, 2.0), NULLIF($10, ''))
		ON CONFLICT (parent_id, start_year) DO UPDATE
		SET payee=EXCLUDED.payee,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_year=EXCLUDED.end_year,
		    category=EXCLUDED.category,
		    growth_rate=EXCLUDED.growth_rate,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, start_year, end_year, category, COALESCE(growth_rate, 2.0), COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(it.ParentID), it.Payee, it.Amount, it.Frequency, it.StartYear, nullableFromNullInt32(it.EndYear), it.Category, it.GrowthRate, it.Notes)
	var created Expense
	if err := row.Scan(&created.ID, &created.ParentID, &created.Payee, &created.Amount, &created.Frequency, &created.StartYear, &created.EndYear, &created.Category, &created.GrowthRate, &created.Notes, &created.UpdatedAt); err != nil {
		return Expense{}, err
	}
	return created, nil
}

func (s *Store) UpdateExpense(ctx context.Context, userID string, it Expense) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_expenses
		SET payee=$3,
		    amount=$4,
		    frequency=$5,
		    start_year=COALESCE($6, start_year),
		    end_year=$7,
		    category=$8,
		    growth_rate=COALESCE($9, growth_rate, 2.0),
		    notes=NULLIF($10, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, COALESCE(start_year,0), end_year, category, COALESCE(growth_rate, 2.0), COALESCE(notes, ''), updated_at`,
		userID, it.ID, it.Payee, it.Amount, it.Frequency, nullableInt32(it.StartYear), nullableFromNullInt32(it.EndYear), it.Category, it.GrowthRate, it.Notes)
	var updated Expense
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Payee, &updated.Amount, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.Category, &updated.GrowthRate, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	return updated, nil
}

func (s *Store) DeleteExpense(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_expenses WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ----- Helpers -----

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("not found")

func decodeJSONMap(b []byte) map[string]interface{} {
	if len(b) == 0 {
		return map[string]interface{}{}
	}
	var m map[string]interface{}
	_ = json.Unmarshal(b, &m)
	if m == nil {
		m = map[string]interface{}{}
	}
	return m
}

func encodeJSON(m map[string]interface{}) []byte {
	if m == nil {
		return []byte("{}")
	}
	out, err := json.Marshal(m)
	if err != nil {
		return []byte("{}")
	}
	return out
}

// ----- PropertyLink operations -----

// CreateOrReplacePropertyLink creates a link, enforcing one loan per asset per scenario (overwrite).
// Verifies that the scenario, asset, and liability all belong to the user.
func (s *Store) CreateOrReplacePropertyLink(ctx context.Context, userID string, link PropertyLink) (PropertyLink, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO property_links (property_scenario_id, asset_id, liability_id)
		SELECT $2, $3, $4
		WHERE EXISTS (SELECT 1 FROM property_scenarios WHERE id = $2 AND user_id = $1)
		  AND EXISTS (SELECT 1 FROM finance_assets WHERE id = $3 AND user_id = $1)
		  AND EXISTS (SELECT 1 FROM finance_liabilities WHERE id = $4 AND user_id = $1)
		ON CONFLICT (property_scenario_id, asset_id) DO UPDATE
		SET liability_id = EXCLUDED.liability_id,
		    updated_at = NOW()
		RETURNING id, property_scenario_id, asset_id, liability_id, created_at, updated_at`,
		userID, link.PropertyScenarioID, link.AssetID, link.LiabilityID)
	var created PropertyLink
	if err := row.Scan(&created.ID, &created.PropertyScenarioID, &created.AssetID, &created.LiabilityID, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return PropertyLink{}, err
	}
	return created, nil
}

// UpdatePropertyLink updates asset/liability for a link by ID.
// Verifies that the linked entities belong to the user.
func (s *Store) UpdatePropertyLink(ctx context.Context, userID string, link PropertyLink) (PropertyLink, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE property_links pl
		SET property_scenario_id = $3,
		    asset_id = $4,
		    liability_id = $5,
		    updated_at = NOW()
		WHERE pl.id = $2
		  AND EXISTS (SELECT 1 FROM property_scenarios WHERE id = $3 AND user_id = $1)
		  AND EXISTS (SELECT 1 FROM finance_assets WHERE id = $4 AND user_id = $1)
		  AND EXISTS (SELECT 1 FROM finance_liabilities WHERE id = $5 AND user_id = $1)
		RETURNING pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at`,
		userID, link.ID, link.PropertyScenarioID, link.AssetID, link.LiabilityID)
	var updated PropertyLink
	if err := row.Scan(&updated.ID, &updated.PropertyScenarioID, &updated.AssetID, &updated.LiabilityID, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PropertyLink{}, ErrNotFound
		}
		return PropertyLink{}, err
	}
	return updated, nil
}

// ListPropertyLinksByScenario lists links for a scenario (verifies user owns the scenario).
func (s *Store) ListPropertyLinksByScenario(ctx context.Context, userID, scenarioID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at
		FROM property_links pl
		INNER JOIN property_scenarios ps ON ps.id = pl.property_scenario_id AND ps.user_id = $1
		WHERE pl.property_scenario_id = $2
		ORDER BY pl.updated_at DESC`, userID, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []PropertyLink
	for rows.Next() {
		var l PropertyLink
		if err := rows.Scan(&l.ID, &l.PropertyScenarioID, &l.AssetID, &l.LiabilityID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	if links == nil {
		links = []PropertyLink{}
	}
	return links, rows.Err()
}

// ListPropertyLinksByAsset lists links for an asset (verifies user owns the asset).
func (s *Store) ListPropertyLinksByAsset(ctx context.Context, userID, assetID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at
		FROM property_links pl
		INNER JOIN finance_assets fa ON fa.id = pl.asset_id AND fa.user_id = $1
		WHERE pl.asset_id = $2
		ORDER BY pl.updated_at DESC`, userID, assetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []PropertyLink
	for rows.Next() {
		var l PropertyLink
		if err := rows.Scan(&l.ID, &l.PropertyScenarioID, &l.AssetID, &l.LiabilityID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	if links == nil {
		links = []PropertyLink{}
	}
	return links, rows.Err()
}

// ListPropertyLinksByLiability lists links for a liability (verifies user owns the liability).
func (s *Store) ListPropertyLinksByLiability(ctx context.Context, userID, liabilityID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at
		FROM property_links pl
		INNER JOIN finance_liabilities fl ON fl.id = pl.liability_id AND fl.user_id = $1
		WHERE pl.liability_id = $2
		ORDER BY pl.updated_at DESC`, userID, liabilityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []PropertyLink
	for rows.Next() {
		var l PropertyLink
		if err := rows.Scan(&l.ID, &l.PropertyScenarioID, &l.AssetID, &l.LiabilityID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	if links == nil {
		links = []PropertyLink{}
	}
	return links, rows.Err()
}

// ListAllPropertyLinks lists all property links for a user with pagination.
// Use Limit=-1 to return all results without pagination.
func (s *Store) ListAllPropertyLinks(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[PropertyLink], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM property_links pl
		INNER JOIN property_scenarios ps ON ps.id = pl.property_scenario_id AND ps.user_id = $1`, userID).Scan(&total)
	if err != nil {
		return PaginatedResult[PropertyLink]{}, err
	}

	var rows *sql.Rows
	if p.IsUnlimited() {
		// No limit - return all results
		rows, err = s.db.QueryContext(ctx, `
			SELECT pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at
			FROM property_links pl
			INNER JOIN property_scenarios ps ON ps.id = pl.property_scenario_id AND ps.user_id = $1
			ORDER BY pl.updated_at DESC`, userID)
	} else {
		rows, err = s.db.QueryContext(ctx, `
			SELECT pl.id, pl.property_scenario_id, pl.asset_id, pl.liability_id, pl.created_at, pl.updated_at
			FROM property_links pl
			INNER JOIN property_scenarios ps ON ps.id = pl.property_scenario_id AND ps.user_id = $1
			ORDER BY pl.updated_at DESC
			LIMIT $2 OFFSET $3`, userID, p.Limit, p.Offset)
	}
	if err != nil {
		return PaginatedResult[PropertyLink]{}, err
	}
	defer rows.Close()

	var links []PropertyLink
	for rows.Next() {
		var l PropertyLink
		if err := rows.Scan(&l.ID, &l.PropertyScenarioID, &l.AssetID, &l.LiabilityID, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return PaginatedResult[PropertyLink]{}, err
		}
		links = append(links, l)
	}
	if links == nil {
		links = []PropertyLink{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[PropertyLink]{}, err
	}

	return PaginatedResult[PropertyLink]{
		Data:    links,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(links) < total,
	}, nil
}
