package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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
	StartDate        time.Time              `json:"startDate"`
	EndDate          *time.Time             `json:"endDate,omitempty"`
	Notes            string                 `json:"notes"`
	GrowthStrategy   string                 `json:"growthStrategy"`
	GrowthMetadata   map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

// Investment shares the same shape as Asset but uses finance_investments table
type Investment = Asset

// Liability represents a persisted liability record.
type Liability struct {
	ID              string                 `json:"id"`
	ParentID        string                 `json:"parentId"`
	Name            string                 `json:"name"`
	Category        string                 `json:"category"`
	CurrentBalance  float64                `json:"currentBalance"`
	InterestRateAPR float64                `json:"interestRateApr"`
	MinimumPayment  float64                `json:"minimumPayment"`
	StartDate       time.Time              `json:"startDate"`
	EndDate         *time.Time             `json:"endDate,omitempty"`
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
	StartDate      time.Time              `json:"startDate"`
	EndDate        *time.Time             `json:"endDate,omitempty"`
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	CPFWageType    string                 `json:"cpfWageType"`
	UpdatedAt      time.Time              `json:"updatedAt"`
	// Source relationship (polymorphic: 'investment' or 'cash_account')
	SourceType *string `json:"sourceType,omitempty"`
	SourceID   *string `json:"sourceId,omitempty"`
}

// Expense represents a persisted expense record.
type Expense struct {
	ID             string                 `json:"id"`
	ParentID       string                 `json:"parentId"`
	Payee          string                 `json:"payee"`
	Amount         float64                `json:"amount"`
	Frequency      string                 `json:"frequency"`
	StartDate      time.Time              `json:"startDate"`
	EndDate        *time.Time             `json:"endDate,omitempty"`
	Category       string                 `json:"category"`
	GrowthRate     float64                `json:"growthRate"`
	Notes          string                 `json:"notes"`
	GrowthStrategy string                 `json:"growthStrategy"`
	GrowthMetadata map[string]interface{} `json:"growthMetadata,omitempty"`
	UpdatedAt      time.Time              `json:"updatedAt"`
	// Source relationship to liability (e.g., loan payment)
	SourceLiabilityID *string `json:"sourceLiabilityId,omitempty"`
}

// PaginationParams holds pagination parameters for list queries.
type PaginationParams struct {
	Limit  int
	Offset int
}

// PaginatedResult holds paginated list results with metadata.
type PaginatedResult[T any] struct {
	Data    []T  `json:"data"`
	Total   int  `json:"total"`
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	HasMore bool `json:"hasMore"`
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

// buildPaginationClause returns a SQL LIMIT/OFFSET clause and args for dynamic query building.
// Returns empty string if pagination is unlimited (Limit < 0).
func buildPaginationClause(p PaginationParams, argIdx int) (string, []interface{}, int) {
	if p.IsUnlimited() {
		// No LIMIT, but still apply OFFSET if specified
		if p.Offset > 0 {
			return fmt.Sprintf(" OFFSET $%d", argIdx), []interface{}{p.Offset}, argIdx + 1
		}
		return "", nil, argIdx
	}

	clause := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	return clause, []interface{}{p.Limit, p.Offset}, argIdx + 2
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
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_assets WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return PaginatedResult[Asset]{}, err
	}

	// Build dynamic query
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE user_id = $1
		ORDER BY parent_id, start_date`

	args := []interface{}{userID}
	paginationClause, paginationArgs, _ := buildPaginationClause(p, 2)
	query += paginationClause
	args = append(args, paginationArgs...)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PaginatedResult[Asset]{}, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		var endDate sql.NullTime
		if err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.StartDate, &endDate, &a.Notes, &a.UpdatedAt); err != nil {
			return PaginatedResult[Asset]{}, err
		}
		if endDate.Valid {
			a.EndDate = &endDate.Time
		}
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

// ListAllAssets returns all assets for a user with optional date range filtering.
// Pass empty DateRangeOptions{} to get all assets without filtering.
func (s *Store) ListAllAssets(ctx context.Context, userID string, opts DateRangeOptions) ([]Asset, error) {
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	// Add optional date range filtering
	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		var endDate sql.NullTime
		if err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.StartDate, &endDate, &a.Notes, &a.UpdatedAt); err != nil {
			return nil, err
		}
		if endDate.Valid {
			a.EndDate = &endDate.Time
		}

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
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE user_id = $1 AND id = $2`, userID, id)
	var a Asset
	var endDate sql.NullTime
	if err := row.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.StartDate, &endDate, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	if endDate.Valid {
		a.EndDate = &endDate.Time
	}

	return a, nil
}

func (s *Store) CreateAsset(ctx context.Context, userID string, a Asset) (Asset, error) {
	startDate := a.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}
	endDate := a.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_assets (user_id, parent_id, name, category, current_value, annual_growth_rate, start_date, end_date, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, NULLIF($9, ''))
		ON CONFLICT ON CONSTRAINT finance_assets_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_value=EXCLUDED.current_value,
		    annual_growth_rate=EXCLUDED.annual_growth_rate,
		    end_date=EXCLUDED.end_date,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(a.ParentID), a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, startDate, endDate, a.Notes)

	var created Asset
	var endDateVal sql.NullTime
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue, &created.AnnualGrowthRate, &created.StartDate, &endDateVal, &created.Notes, &created.UpdatedAt); err != nil {
		return Asset{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}

	return created, nil
}

func (s *Store) UpdateAsset(ctx context.Context, userID string, a Asset) (Asset, error) {
	startDate := a.StartDate
	endDate := a.EndDate

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET name=$3,
		    category=$4,
		    current_value=$5,
		    annual_growth_rate=$6,
		    start_date=COALESCE($7, start_date),
		    end_date=$8,
		    notes=NULLIF($9, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, a.ID, a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, startDate, endDate, a.Notes)

	var updated Asset
	var endDateVal sql.NullTime
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.StartDate, &endDateVal, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	if endDateVal.Valid {
		updated.EndDate = &endDateVal.Time
	}

	return updated, nil
}

func (s *Store) DeleteAsset(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	// Example: deleting 1st override deletes 1st, 2nd, 3rd... but not the original
	result, err := s.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM finance_assets WHERE user_id=$1 AND id=$2
			UNION ALL
			SELECT a.id FROM finance_assets a
			INNER JOIN descendants d ON a.parent_id = d.id
			WHERE a.user_id=$1
		)
		DELETE FROM finance_assets WHERE id IN (SELECT id FROM descendants)
	`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ----- Investment operations -----

func (s *Store) ListInvestments(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Investment], error) {
	p := NormalizePagination(pagination)

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_investments WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return PaginatedResult[Investment]{}, err
	}

	// Build dynamic query
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_investments
		WHERE user_id = $1
		ORDER BY parent_id, start_date`

	args := []interface{}{userID}
	paginationClause, paginationArgs, _ := buildPaginationClause(p, 2)
	query += paginationClause
	args = append(args, paginationArgs...)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PaginatedResult[Investment]{}, err
	}
	defer rows.Close()

	var investments []Investment
	for rows.Next() {
		var inv Investment
		var endDate sql.NullTime
		if err := rows.Scan(&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue, &inv.AnnualGrowthRate, &inv.StartDate, &endDate, &inv.Notes, &inv.UpdatedAt); err != nil {
			return PaginatedResult[Investment]{}, err
		}
		if endDate.Valid {
			inv.EndDate = &endDate.Time
		}
		investments = append(investments, inv)
	}
	if investments == nil {
		investments = []Investment{}
	}
	if err := rows.Err(); err != nil {
		return PaginatedResult[Investment]{}, err
	}

	return PaginatedResult[Investment]{
		Data:    investments,
		Total:   total,
		Limit:   p.Limit,
		Offset:  p.Offset,
		HasMore: !p.IsUnlimited() && p.Offset+len(investments) < total,
	}, nil
}

func (s *Store) ListAllInvestments(ctx context.Context, userID string, opts DateRangeOptions) ([]Investment, error) {
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_investments
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var investments []Investment
	for rows.Next() {
		var inv Investment
		var endDate sql.NullTime
		if err := rows.Scan(&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue, &inv.AnnualGrowthRate, &inv.StartDate, &endDate, &inv.Notes, &inv.UpdatedAt); err != nil {
			return nil, err
		}
		if endDate.Valid {
			inv.EndDate = &endDate.Time
		}

		investments = append(investments, inv)
	}
	if investments == nil {
		investments = []Investment{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return investments, nil
}

func (s *Store) GetInvestment(ctx context.Context, userID, id string) (Investment, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_investments
		WHERE user_id = $1 AND id = $2`, userID, id)
	var inv Investment
	var endDate sql.NullTime
	if err := row.Scan(&inv.ID, &inv.ParentID, &inv.Name, &inv.Category, &inv.CurrentValue, &inv.AnnualGrowthRate, &inv.StartDate, &endDate, &inv.Notes, &inv.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Investment{}, ErrNotFound
		}
		return Investment{}, err
	}
	if endDate.Valid {
		inv.EndDate = &endDate.Time
	}

	return inv, nil
}

func (s *Store) CreateInvestment(ctx context.Context, userID string, inv Investment) (Investment, error) {
	startDate := inv.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}
	endDate := inv.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_investments (user_id, parent_id, name, category, current_value, annual_growth_rate, start_date, end_date, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, NULLIF($9, ''))
		ON CONFLICT ON CONSTRAINT finance_investments_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_value=EXCLUDED.current_value,
		    annual_growth_rate=EXCLUDED.annual_growth_rate,
		    end_date=EXCLUDED.end_date,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(inv.ParentID), inv.Name, inv.Category, inv.CurrentValue, inv.AnnualGrowthRate, startDate, endDate, inv.Notes)

	var created Investment
	var endDateVal sql.NullTime
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue, &created.AnnualGrowthRate, &created.StartDate, &endDateVal, &created.Notes, &created.UpdatedAt); err != nil {
		return Investment{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}

	return created, nil
}

func (s *Store) UpdateInvestment(ctx context.Context, userID string, inv Investment) (Investment, error) {
	startDate := inv.StartDate
	endDate := inv.EndDate

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_investments
		SET name=$3,
		    category=$4,
		    current_value=$5,
		    annual_growth_rate=$6,
		    start_date=COALESCE($7, start_date),
		    end_date=$8,
		    notes=NULLIF($9, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, inv.ID, inv.Name, inv.Category, inv.CurrentValue, inv.AnnualGrowthRate, startDate, endDate, inv.Notes)

	var updated Investment
	var endDateVal sql.NullTime
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.StartDate, &endDateVal, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Investment{}, ErrNotFound
		}
		return Investment{}, err
	}
	if endDateVal.Valid {
		updated.EndDate = &endDateVal.Time
	}

	return updated, nil
}

func (s *Store) DeleteInvestment(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM finance_investments WHERE user_id=$1 AND id=$2
			UNION ALL
			SELECT i.id FROM finance_investments i
			INNER JOIN descendants d ON i.parent_id = d.id
			WHERE i.user_id=$1
		)
		DELETE FROM finance_investments WHERE id IN (SELECT id FROM descendants)
	`, userID, id)
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
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_liabilities WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return PaginatedResult[Liability]{}, err
	}

	// Build dynamic query
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
		       updated_at
		FROM finance_liabilities
		WHERE user_id = $1
		ORDER BY parent_id, start_date`

	args := []interface{}{userID}
	paginationClause, paginationArgs, _ := buildPaginationClause(p, 2)
	query += paginationClause
	args = append(args, paginationArgs...)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PaginatedResult[Liability]{}, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		var endDate sql.NullTime
		if err := rows.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.StartDate, &endDate, &li.Notes, &li.UpdatedAt); err != nil {
			return PaginatedResult[Liability]{}, err
		}
		if endDate.Valid {
			li.EndDate = &endDate.Time
		}
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

// ListAllLiabilities returns all liabilities for a user with optional date range filtering.
// Pass empty DateRangeOptions{} to get all liabilities without filtering.
func (s *Store) ListAllLiabilities(ctx context.Context, userID string, opts DateRangeOptions) ([]Liability, error) {
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
		       updated_at
		FROM finance_liabilities
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	// Add optional date range filtering
	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		var endDate sql.NullTime
		if err := rows.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.StartDate, &endDate, &li.Notes, &li.UpdatedAt); err != nil {
			return nil, err
		}
		if endDate.Valid {
			li.EndDate = &endDate.Time
		}

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
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_liabilities
		WHERE user_id = $1 AND id = $2`, userID, id)
	var li Liability
	var endDate sql.NullTime
	if err := row.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.StartDate, &endDate, &li.Notes, &li.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	if endDate.Valid {
		li.EndDate = &endDate.Time
	}

	return li, nil
}

func (s *Store) CreateLiability(ctx context.Context, userID string, li Liability) (Liability, error) {
	startDate := li.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}
	endDate := li.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (user_id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, notes)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''))
		ON CONFLICT ON CONSTRAINT finance_liabilities_parent_start_date_key DO UPDATE
		SET name=EXCLUDED.name,
		    category=EXCLUDED.category,
		    current_balance=EXCLUDED.current_balance,
		    interest_rate_apr=EXCLUDED.interest_rate_apr,
		    minimum_payment=EXCLUDED.minimum_payment,
		    end_date=EXCLUDED.end_date,
		    notes=EXCLUDED.notes,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, nullIfEmpty(li.ParentID), li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, startDate, endDate, li.Notes)

	var created Liability
	var endDateVal sql.NullTime
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.StartDate, &endDateVal, &created.Notes, &created.UpdatedAt); err != nil {
		return Liability{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}

	return created, nil
}

func (s *Store) UpdateLiability(ctx context.Context, userID string, li Liability) (Liability, error) {
	startDate := li.StartDate
	endDate := li.EndDate

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET name=$3,
		    category=$4,
		    current_balance=$5,
		    interest_rate_apr=$6,
		    minimum_payment=$7,
		    start_date=COALESCE($8, start_date),
		    end_date=$9,
		    notes=NULLIF($10, ''),
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, start_date, end_date, COALESCE(notes, ''), updated_at`,
		userID, li.ID, li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, startDate, endDate, li.Notes)

	var updated Liability
	var endDateVal sql.NullTime
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentBalance, &updated.InterestRateAPR, &updated.MinimumPayment, &updated.StartDate, &endDateVal, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	if endDateVal.Valid {
		updated.EndDate = &endDateVal.Time
	}

	return updated, nil
}

func (s *Store) DeleteLiability(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	result, err := s.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM finance_liabilities WHERE user_id=$1 AND id=$2
			UNION ALL
			SELECT l.id FROM finance_liabilities l
			INNER JOIN descendants d ON l.parent_id = d.id
			WHERE l.user_id=$1
		)
		DELETE FROM finance_liabilities WHERE id IN (SELECT id FROM descendants)
	`, userID, id)
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
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_incomes WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return PaginatedResult[Income]{}, err
	}

	// Build dynamic query
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       source,
		       amount,
		       frequency,
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 3.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at,
		       source_type,
		       source_id
		FROM finance_incomes
		WHERE user_id = $1
		ORDER BY parent_id, start_date`

	args := []interface{}{userID}
	paginationClause, paginationArgs, _ := buildPaginationClause(p, 2)
	query += paginationClause
	args = append(args, paginationArgs...)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PaginatedResult[Income]{}, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		var endDate sql.NullTime
		var sourceType, sourceID sql.NullString
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt, &sourceType, &sourceID); err != nil {
			return PaginatedResult[Income]{}, err
		}
		if endDate.Valid {
			it.EndDate = &endDate.Time
		}
		if sourceType.Valid {
			it.SourceType = &sourceType.String
		}
		if sourceID.Valid {
			it.SourceID = &sourceID.String
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

// ListAllIncomes returns all incomes for a user with optional date range filtering.
// Pass empty DateRangeOptions{} to get all incomes without filtering.
func (s *Store) ListAllIncomes(ctx context.Context, userID string, opts DateRangeOptions) ([]Income, error) {
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       source,
		       amount,
		       frequency,
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 3.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       COALESCE(cpf_wage_type, '') as cpf_wage_type,
		       updated_at,
		       source_type,
		       source_id
		FROM finance_incomes
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	// Add optional date range filtering
	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		var endDate sql.NullTime
		var sourceType, sourceID sql.NullString
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.CPFWageType, &it.UpdatedAt, &sourceType, &sourceID); err != nil {
			return nil, err
		}
		if endDate.Valid {
			it.EndDate = &endDate.Time
		}
		if sourceType.Valid {
			it.SourceType = &sourceType.String
		}
		if sourceID.Valid {
			it.SourceID = &sourceID.String
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
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 3.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       COALESCE(cpf_wage_type, '') as cpf_wage_type,
		       updated_at,
		       source_type,
		       source_id
		FROM finance_incomes
		WHERE user_id = $1 AND id = $2`, userID, id)
	var it Income
	var endDate sql.NullTime
	var sourceType, sourceID sql.NullString
	if err := row.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.CPFWageType, &it.UpdatedAt, &sourceType, &sourceID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	if endDate.Valid {
		it.EndDate = &endDate.Time
	}
	if sourceType.Valid {
		it.SourceType = &sourceType.String
	}
	if sourceID.Valid {
		it.SourceID = &sourceID.String
	}

	return it, nil
}

func (s *Store) CreateIncome(ctx context.Context, userID string, it Income) (Income, error) {
	startDate := it.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}
	endDate := it.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (user_id, parent_id, source, amount, frequency, start_date, end_date, category, growth_rate, growth_strategy, notes, cpf_wage_type, source_type, source_id)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, COALESCE($9, 3.0), COALESCE(NULLIF($10, ''), 'annual_step'), NULLIF($11, ''), NULLIF($12, ''), $13, $14)
		ON CONFLICT ON CONSTRAINT finance_incomes_parent_start_date_key DO UPDATE
		SET source=EXCLUDED.source,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_date=EXCLUDED.end_date,
		    category=EXCLUDED.category,
		    growth_rate=EXCLUDED.growth_rate,
		    growth_strategy=EXCLUDED.growth_strategy,
		    notes=EXCLUDED.notes,
		    cpf_wage_type=EXCLUDED.cpf_wage_type,
		    source_type=EXCLUDED.source_type,
		    source_id=EXCLUDED.source_id,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), source, amount, frequency, start_date, end_date, category, COALESCE(growth_rate, 3.0), growth_strategy, COALESCE(notes, ''), COALESCE(cpf_wage_type, ''), updated_at, source_type, source_id`,
		userID, nullIfEmpty(it.ParentID), it.Source, it.Amount, it.Frequency, startDate, endDate, it.Category, it.GrowthRate, it.GrowthStrategy, it.Notes, it.CPFWageType, it.SourceType, it.SourceID)

	var created Income
	var endDateVal sql.NullTime
	var sourceType, sourceID sql.NullString
	if err := row.Scan(
		&created.ID,
		&created.ParentID,
		&created.Source,
		&created.Amount,
		&created.Frequency,
		&created.StartDate,
		&endDateVal,
		&created.Category,
		&created.GrowthRate,
		&created.GrowthStrategy,
		&created.Notes,
		&created.CPFWageType,
		&created.UpdatedAt,
		&sourceType,
		&sourceID,
	); err != nil {
		return Income{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}
	if sourceType.Valid {
		created.SourceType = &sourceType.String
	}
	if sourceID.Valid {
		created.SourceID = &sourceID.String
	}

	return created, nil
}

func (s *Store) UpdateIncome(ctx context.Context, userID string, it Income) (Income, error) {
	startDate := it.StartDate
	endDate := it.EndDate

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_incomes
		SET source=$3,
		    amount=$4,
		    frequency=$5,
		    start_date=COALESCE($6, start_date),
		    end_date=$7,
		    category=$8,
		    growth_rate=COALESCE($9, growth_rate, 3.0),
		    growth_strategy=COALESCE(NULLIF($10, ''), growth_strategy, 'annual_step'),
		    notes=NULLIF($11, ''),
		    cpf_wage_type=NULLIF($12, ''),
		    source_type=$13,
		    source_id=$14,
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), source, amount, frequency, start_date, end_date, category, COALESCE(growth_rate, 3.0), growth_strategy, COALESCE(notes, ''), COALESCE(cpf_wage_type, ''), updated_at, source_type, source_id`,
		userID, it.ID, it.Source, it.Amount, it.Frequency, startDate, endDate, it.Category, it.GrowthRate, it.GrowthStrategy, it.Notes, it.CPFWageType, it.SourceType, it.SourceID)

	var updated Income
	var endDateVal sql.NullTime
	var sourceType, sourceID sql.NullString
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Source, &updated.Amount, &updated.Frequency, &updated.StartDate, &endDateVal, &updated.Category, &updated.GrowthRate, &updated.GrowthStrategy, &updated.Notes, &updated.CPFWageType, &updated.UpdatedAt, &sourceType, &sourceID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	if endDateVal.Valid {
		updated.EndDate = &endDateVal.Time
	}
	if sourceType.Valid {
		updated.SourceType = &sourceType.String
	}
	if sourceID.Valid {
		updated.SourceID = &sourceID.String
	}

	return updated, nil
}

func (s *Store) DeleteIncome(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	result, err := s.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM finance_incomes WHERE user_id=$1 AND id=$2
			UNION ALL
			SELECT i.id FROM finance_incomes i
			INNER JOIN descendants d ON i.parent_id = d.id
			WHERE i.user_id=$1
		)
		DELETE FROM finance_incomes WHERE id IN (SELECT id FROM descendants)
	`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteIncomesBySource deletes all incomes linked to a source (used for cascade delete)
// sourceType should be 'investment' or 'cash_account'
func (s *Store) DeleteIncomesBySource(ctx context.Context, userID, sourceType, sourceID string) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM finance_incomes
		WHERE user_id = $1 AND source_type = $2 AND source_id = $3
	`, userID, sourceType, sourceID)
	return err
}

// ----- Expense operations -----

func (s *Store) ListExpenses(ctx context.Context, userID string, pagination PaginationParams) (PaginatedResult[Expense], error) {
	p := NormalizePagination(pagination)

	// Get total count
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_expenses WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return PaginatedResult[Expense]{}, err
	}

	// Build dynamic query
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 2.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at,
		       source_liability_id
		FROM finance_expenses
		WHERE user_id = $1
		ORDER BY parent_id, start_date`

	args := []interface{}{userID}
	paginationClause, paginationArgs, _ := buildPaginationClause(p, 2)
	query += paginationClause
	args = append(args, paginationArgs...)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PaginatedResult[Expense]{}, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		var endDate sql.NullTime
		var sourceLiabilityID sql.NullString
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt, &sourceLiabilityID); err != nil {
			return PaginatedResult[Expense]{}, err
		}
		if endDate.Valid {
			it.EndDate = &endDate.Time
		}
		if sourceLiabilityID.Valid {
			it.SourceLiabilityID = &sourceLiabilityID.String
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

// ListAllExpenses returns all expenses for a user with optional date range filtering.
// Pass empty DateRangeOptions{} to get all expenses without filtering.
func (s *Store) ListAllExpenses(ctx context.Context, userID string, opts DateRangeOptions) ([]Expense, error) {
	query := `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 2.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at,
		       source_liability_id
		FROM finance_expenses
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	// Add optional date range filtering
	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY parent_id, start_date`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		var endDate sql.NullTime
		var sourceLiabilityID sql.NullString
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt, &sourceLiabilityID); err != nil {
			return nil, err
		}
		if endDate.Valid {
			it.EndDate = &endDate.Time
		}
		if sourceLiabilityID.Valid {
			it.SourceLiabilityID = &sourceLiabilityID.String
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
		       start_date,
		       end_date,
		       category,
		       COALESCE(growth_rate, 2.0) as growth_rate,
		       COALESCE(notes, '') as notes,
		       updated_at,
		       source_liability_id
		FROM finance_expenses
		WHERE user_id = $1 AND id = $2`, userID, id)
	var it Expense
	var endDate sql.NullTime
	var sourceLiabilityID sql.NullString
	if err := row.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartDate, &endDate, &it.Category, &it.GrowthRate, &it.Notes, &it.UpdatedAt, &sourceLiabilityID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	if endDate.Valid {
		it.EndDate = &endDate.Time
	}
	if sourceLiabilityID.Valid {
		it.SourceLiabilityID = &sourceLiabilityID.String
	}

	return it, nil
}

func (s *Store) CreateExpense(ctx context.Context, userID string, it Expense) (Expense, error) {
	startDate := it.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}
	endDate := it.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (user_id, parent_id, payee, amount, frequency, start_date, end_date, category, growth_rate, growth_strategy, notes, source_liability_id)
		VALUES ($1, COALESCE($2, gen_random_uuid()), $3, $4, $5, $6, $7, $8, COALESCE($9, 2.0), COALESCE(NULLIF($10, ''), 'annual_step'), NULLIF($11, ''), $12)
		ON CONFLICT ON CONSTRAINT finance_expenses_parent_start_date_key DO UPDATE
		SET payee=EXCLUDED.payee,
		    amount=EXCLUDED.amount,
		    frequency=EXCLUDED.frequency,
		    end_date=EXCLUDED.end_date,
		    category=EXCLUDED.category,
		    growth_rate=EXCLUDED.growth_rate,
		    growth_strategy=EXCLUDED.growth_strategy,
		    notes=EXCLUDED.notes,
		    source_liability_id=EXCLUDED.source_liability_id,
		    updated_at=NOW()
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, start_date, end_date, category, COALESCE(growth_rate, 2.0), growth_strategy, COALESCE(notes, ''), updated_at, source_liability_id`,
		userID, nullIfEmpty(it.ParentID), it.Payee, it.Amount, it.Frequency, startDate, endDate, it.Category, it.GrowthRate, it.GrowthStrategy, it.Notes, it.SourceLiabilityID)

	var created Expense
	var endDateVal sql.NullTime
	var sourceLiabilityID sql.NullString
	if err := row.Scan(&created.ID, &created.ParentID, &created.Payee, &created.Amount, &created.Frequency, &created.StartDate, &endDateVal, &created.Category, &created.GrowthRate, &created.GrowthStrategy, &created.Notes, &created.UpdatedAt, &sourceLiabilityID); err != nil {
		return Expense{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}
	if sourceLiabilityID.Valid {
		created.SourceLiabilityID = &sourceLiabilityID.String
	}

	return created, nil
}

func (s *Store) UpdateExpense(ctx context.Context, userID string, it Expense) (Expense, error) {
	startDate := it.StartDate
	endDate := it.EndDate

	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_expenses
		SET payee=$3,
		    amount=$4,
		    frequency=$5,
		    start_date=COALESCE($6, start_date),
		    end_date=$7,
		    category=$8,
		    growth_rate=COALESCE($9, growth_rate, 2.0),
		    growth_strategy=COALESCE(NULLIF($10, ''), growth_strategy, 'annual_step'),
		    notes=NULLIF($11, ''),
		    source_liability_id=$12,
		    updated_at=NOW()
		WHERE user_id=$1 AND id=$2
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, start_date, end_date, category, COALESCE(growth_rate, 2.0), growth_strategy, COALESCE(notes, ''), updated_at, source_liability_id`,
		userID, it.ID, it.Payee, it.Amount, it.Frequency, startDate, endDate, it.Category, it.GrowthRate, it.GrowthStrategy, it.Notes, it.SourceLiabilityID)

	var updated Expense
	var endDateVal sql.NullTime
	var sourceLiabilityID sql.NullString
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Payee, &updated.Amount, &updated.Frequency, &updated.StartDate, &endDateVal, &updated.Category, &updated.GrowthRate, &updated.GrowthStrategy, &updated.Notes, &updated.UpdatedAt, &sourceLiabilityID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	if endDateVal.Valid {
		updated.EndDate = &endDateVal.Time
	}
	if sourceLiabilityID.Valid {
		updated.SourceLiabilityID = &sourceLiabilityID.String
	}

	return updated, nil
}

func (s *Store) DeleteExpense(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any override chains)
	result, err := s.db.ExecContext(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM finance_expenses WHERE user_id=$1 AND id=$2
			UNION ALL
			SELECT e.id FROM finance_expenses e
			INNER JOIN descendants d ON e.parent_id = d.id
			WHERE e.user_id=$1
		)
		DELETE FROM finance_expenses WHERE id IN (SELECT id FROM descendants)
	`, userID, id)
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
