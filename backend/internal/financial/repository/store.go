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

// Asset represents a persisted asset record.
type Asset struct {
	ID               string
	ParentID         string
	Name             string
	Category         string
	CurrentValue     float64
	AnnualGrowthRate float64
	Frequency        string
	StartYear        int
	EndYear          sql.NullInt32
	Notes            string
	UpdatedAt        time.Time
}

// Liability represents a persisted liability record.
type Liability struct {
	ID              string
	ParentID        string
	Name            string
	Category        string
	CurrentBalance  float64
	InterestRateAPR float64
	MinimumPayment  float64
	Frequency       string
	StartYear       int
	EndYear         sql.NullInt32
	Notes           string
	UpdatedAt       time.Time
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
	ID        string
	ParentID  string
	Source    string
	Amount    float64
	Frequency string
	StartDate *time.Time
	StartYear int
	EndYear   sql.NullInt32
	Category  string
	Notes     string
	UpdatedAt time.Time
}

// Expense represents a persisted expense record.
type Expense struct {
	ID        string
	ParentID  string
	Payee     string
	Amount    float64
	Frequency string
	StartYear int
	EndYear   sql.NullInt32
	Category  string
	Notes     string
	UpdatedAt time.Time
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

// GetAssetByNameAndCategory returns an asset by name/category if it exists.
func (s *Store) GetAssetByNameAndCategory(ctx context.Context, name, category string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at
		FROM finance_assets
		WHERE LOWER(name)=LOWER($1) AND category=$2
		LIMIT 1`, name, category)
	var a Asset
	if err := row.Scan(&a.ID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return a, nil
}

// GetLiabilityByNameAndCategory returns a liability by name/category if it exists.
func (s *Store) GetLiabilityByNameAndCategory(ctx context.Context, name, category string) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at
		FROM finance_liabilities
		WHERE LOWER(name)=LOWER($1) AND category=$2
		LIMIT 1`, name, category)
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

func (s *Store) ListAssets(ctx context.Context) ([]Asset, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		ORDER BY parent_id, start_year`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Frequency, &a.StartYear, &a.EndYear, &a.Notes, &a.UpdatedAt); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	if assets == nil {
		assets = []Asset{}
	}
	return assets, rows.Err()
}

func (s *Store) GetAsset(ctx context.Context, id string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       name,
		       category,
		       current_value,
		       annual_growth_rate,
		       COALESCE(frequency, 'annual') as frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_assets
		WHERE id = $1`, id)
	var a Asset
	if err := row.Scan(&a.ID, &a.ParentID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Frequency, &a.StartYear, &a.EndYear, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return a, nil
}

func (s *Store) CreateAsset(ctx context.Context, a Asset) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_assets (parent_id, name, category, current_value, annual_growth_rate, frequency, start_year, end_year, notes)
		VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, COALESCE($6,'annual'), COALESCE($7,0), $8, NULLIF($9, ''))
		RETURNING id, parent_id, name, category, current_value, annual_growth_rate, COALESCE(frequency,'annual'), COALESCE(start_year,0), end_year, COALESCE(notes, ''), updated_at`,
		nullIfEmpty(a.ParentID), a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, a.Frequency, a.StartYear, nullableFromNullInt32(a.EndYear), a.Notes)
	var created Asset
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentValue, &created.AnnualGrowthRate, &created.Frequency, &created.StartYear, &created.EndYear, &created.Notes, &created.UpdatedAt); err != nil {
		return Asset{}, err
	}
	return created, nil
}

func (s *Store) UpdateAsset(ctx context.Context, a Asset) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET name=$2,
		    category=$3,
		    current_value=$4,
		    annual_growth_rate=$5,
		    frequency=COALESCE($6, frequency),
		    start_year=COALESCE($7, start_year),
		    end_year=$8,
		    notes=NULLIF($9, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, COALESCE(parent_id,id), name, category, current_value, annual_growth_rate, COALESCE(frequency,'annual'), COALESCE(start_year,0), end_year, COALESCE(notes, ''), updated_at`,
		a.ID, a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, nullIfEmpty(a.Frequency), nullableInt32(a.StartYear), nullableFromNullInt32(a.EndYear), a.Notes)
	var updated Asset
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return updated, nil
}

func (s *Store) DeleteAsset(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_assets WHERE id=$1`, id)
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
func (s *Store) ConvertAssetToProperty(ctx context.Context, id string) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_assets
		SET category='property',
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`, id)
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

func (s *Store) ListLiabilities(ctx context.Context) ([]Liability, error) {
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
		       end_year,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_liabilities
		ORDER BY parent_id, start_year`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		if err := rows.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Frequency, &li.StartYear, &li.EndYear, &li.Notes, &li.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, li)
	}
	if items == nil {
		items = []Liability{}
	}
	return items, rows.Err()
}

func (s *Store) GetLiability(ctx context.Context, id string) (Liability, error) {
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
		       end_year,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_liabilities
		WHERE id = $1`, id)
	var li Liability
	if err := row.Scan(&li.ID, &li.ParentID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Frequency, &li.StartYear, &li.EndYear, &li.Notes, &li.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	return li, nil
}

func (s *Store) CreateLiability(ctx context.Context, li Liability) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, frequency, start_year, end_year, notes)
		VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, COALESCE($7,'annual'), COALESCE($8,0), $9, NULLIF($10, ''))
		RETURNING id, parent_id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(frequency,'annual'), COALESCE(start_year,0), end_year, COALESCE(notes, ''), updated_at`,
		nullIfEmpty(li.ParentID), li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, li.Frequency, li.StartYear, nullableFromNullInt32(li.EndYear), li.Notes)
	var created Liability
	if err := row.Scan(&created.ID, &created.ParentID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.Frequency, &created.StartYear, &created.EndYear, &created.Notes, &created.UpdatedAt); err != nil {
		return Liability{}, err
	}
	return created, nil
}

func (s *Store) UpdateLiability(ctx context.Context, li Liability) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET name=$2,
		    category=$3,
		    current_balance=$4,
		    interest_rate_apr=$5,
		    minimum_payment=$6,
		    frequency=COALESCE($7, frequency),
		    start_year=COALESCE($8, start_year),
		    end_year=$9,
		    notes=NULLIF($10, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, COALESCE(parent_id,id), name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(frequency,'annual'), COALESCE(start_year,0), end_year, COALESCE(notes, ''), updated_at`,
		li.ID, li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, nullIfEmpty(li.Frequency), nullableInt32(li.StartYear), nullableFromNullInt32(li.EndYear), li.Notes)
	var updated Liability
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Name, &updated.Category, &updated.CurrentBalance, &updated.InterestRateAPR, &updated.MinimumPayment, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	return updated, nil
}

func (s *Store) DeleteLiability(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_liabilities WHERE id=$1`, id)
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
func (s *Store) ConvertLiabilityToProperty(ctx context.Context, id string) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_liabilities
		SET category='property',
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`, id)
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

func (s *Store) ListPropertyScenarios(ctx context.Context) ([]PropertyScenario, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at
		FROM property_scenarios
		ORDER BY updated_at DESC`)
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

func (s *Store) GetPropertyScenario(ctx context.Context, id string) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at
		FROM property_scenarios
		WHERE id = $1`, id)
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

func (s *Store) CreatePropertyScenario(ctx context.Context, ps PropertyScenario) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO property_scenarios (property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, notes, amortization, snapshot, timeline, milestones, insights)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), COALESCE($11::jsonb, '{}'::jsonb), COALESCE($12::jsonb, '{}'::jsonb), COALESCE($13::jsonb, '{}'::jsonb), COALESCE($14::jsonb, '{}'::jsonb), COALESCE($15::jsonb, '{}'::jsonb))
		RETURNING id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at`,
		ps.PropertyType, ps.Headline, ps.Subheadline, ps.LastRefreshed, ps.PropertyPrice, ps.DownPayment, ps.LoanAmount, ps.InterestRate, ps.LoanTenure, ps.Notes, encodeJSON(ps.Amortization), encodeJSON(ps.Snapshot), encodeJSON(ps.Timeline), encodeJSON(ps.Milestones), encodeJSON(ps.Insights))
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

func (s *Store) UpdatePropertyScenario(ctx context.Context, ps PropertyScenario) (PropertyScenario, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE property_scenarios
		SET property_type=$2,
		    headline=$3,
		    subheadline=$4,
		    last_refreshed=$5,
		    property_price=$6,
		    down_payment=$7,
		    loan_amount=$8,
		    interest_rate=$9,
		    loan_tenure=$10,
		    notes=NULLIF($11, ''),
		    amortization=COALESCE($12::jsonb, '{}'::jsonb),
		    snapshot=COALESCE($13::jsonb, '{}'::jsonb),
		    timeline=COALESCE($14::jsonb, '{}'::jsonb),
		    milestones=COALESCE($15::jsonb, '{}'::jsonb),
		    insights=COALESCE($16::jsonb, '{}'::jsonb),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, property_type, headline, subheadline, last_refreshed, property_price, down_payment, loan_amount, interest_rate, loan_tenure, COALESCE(notes, ''), amortization, snapshot, timeline, milestones, insights, updated_at`,
		ps.ID, ps.PropertyType, ps.Headline, ps.Subheadline, ps.LastRefreshed, ps.PropertyPrice, ps.DownPayment, ps.LoanAmount, ps.InterestRate, ps.LoanTenure, ps.Notes, encodeJSON(ps.Amortization), encodeJSON(ps.Snapshot), encodeJSON(ps.Timeline), encodeJSON(ps.Milestones), encodeJSON(ps.Insights))
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

func (s *Store) DeletePropertyScenario(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM property_scenarios WHERE id=$1`, id)
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

func (s *Store) ListIncomes(ctx context.Context) ([]Income, error) {
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
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_incomes
		ORDER BY parent_id, start_year`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.StartDate, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Income{}
	}
	return items, rows.Err()
}

func (s *Store) GetIncome(ctx context.Context, id string) (Income, error) {
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
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_incomes
		WHERE id = $1`, id)
	var it Income
	if err := row.Scan(&it.ID, &it.ParentID, &it.Source, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.StartDate, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	return it, nil
}

func (s *Store) CreateIncome(ctx context.Context, it Income) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (parent_id, source, amount, frequency, start_year, end_year, start_date, category, notes)
		VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, COALESCE($5,0), $6, COALESCE($7, NOW()), $8, NULLIF($9, ''))
		RETURNING id, parent_id, source, amount, frequency, start_year, end_year, start_date, category, COALESCE(notes, ''), updated_at`,
		nullIfEmpty(it.ParentID), it.Source, it.Amount, it.Frequency, it.StartYear, nullableFromNullInt32(it.EndYear), it.StartDate, it.Category, it.Notes)
	var created Income
	if err := row.Scan(&created.ID, &created.ParentID, &created.Source, &created.Amount, &created.Frequency, &created.StartYear, &created.EndYear, &created.StartDate, &created.Category, &created.Notes, &created.UpdatedAt); err != nil {
		return Income{}, err
	}
	return created, nil
}

func (s *Store) UpdateIncome(ctx context.Context, it Income) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_incomes
		SET source=$2,
		    amount=$3,
		    frequency=$4,
		    start_year=COALESCE($5, start_year),
		    end_year=$6,
		    start_date=COALESCE($7, start_date, NOW()),
		    category=$8,
		    notes=NULLIF($9, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, COALESCE(parent_id,id), source, amount, frequency, COALESCE(start_year,0), end_year, start_date, category, COALESCE(notes, ''), updated_at`,
		it.ID, it.Source, it.Amount, it.Frequency, nullableInt32(it.StartYear), nullableFromNullInt32(it.EndYear), it.StartDate, it.Category, it.Notes)
	var updated Income
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Source, &updated.Amount, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.StartDate, &updated.Category, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	return updated, nil
}

func (s *Store) DeleteIncome(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_incomes WHERE id=$1`, id)
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

func (s *Store) ListExpenses(ctx context.Context) ([]Expense, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       category,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_expenses
		ORDER BY parent_id, start_year`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		if err := rows.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []Expense{}
	}
	return items, rows.Err()
}

func (s *Store) GetExpense(ctx context.Context, id string) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id,
		       COALESCE(parent_id, id) as parent_id,
		       payee,
		       amount,
		       frequency,
		       COALESCE(start_year, 0) as start_year,
		       end_year,
		       category,
		       COALESCE(notes, '') as notes,
		       updated_at
		FROM finance_expenses
		WHERE id = $1`, id)
	var it Expense
	if err := row.Scan(&it.ID, &it.ParentID, &it.Payee, &it.Amount, &it.Frequency, &it.StartYear, &it.EndYear, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	return it, nil
}

func (s *Store) CreateExpense(ctx context.Context, it Expense) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (parent_id, payee, amount, frequency, start_year, end_year, category, notes)
		VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, COALESCE($5,0), $6, $7, NULLIF($8, ''))
		RETURNING id, parent_id, payee, amount, frequency, start_year, end_year, category, COALESCE(notes, ''), updated_at`,
		nullIfEmpty(it.ParentID), it.Payee, it.Amount, it.Frequency, it.StartYear, nullableFromNullInt32(it.EndYear), it.Category, it.Notes)
	var created Expense
	if err := row.Scan(&created.ID, &created.ParentID, &created.Payee, &created.Amount, &created.Frequency, &created.StartYear, &created.EndYear, &created.Category, &created.Notes, &created.UpdatedAt); err != nil {
		return Expense{}, err
	}
	return created, nil
}

func (s *Store) UpdateExpense(ctx context.Context, it Expense) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_expenses
		SET payee=$2,
		    amount=$3,
		    frequency=$4,
		    start_year=COALESCE($5, start_year),
		    end_year=$6,
		    category=$7,
		    notes=NULLIF($8, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, COALESCE(parent_id,id), payee, amount, frequency, COALESCE(start_year,0), end_year, category, COALESCE(notes, ''), updated_at`,
		it.ID, it.Payee, it.Amount, it.Frequency, nullableInt32(it.StartYear), nullableFromNullInt32(it.EndYear), it.Category, it.Notes)
	var updated Expense
	if err := row.Scan(&updated.ID, &updated.ParentID, &updated.Payee, &updated.Amount, &updated.Frequency, &updated.StartYear, &updated.EndYear, &updated.Category, &updated.Notes, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	return updated, nil
}

func (s *Store) DeleteExpense(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_expenses WHERE id=$1`, id)
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
func (s *Store) CreateOrReplacePropertyLink(ctx context.Context, link PropertyLink) (PropertyLink, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO property_links (property_scenario_id, asset_id, liability_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (property_scenario_id, asset_id) DO UPDATE
		SET liability_id = EXCLUDED.liability_id,
		    updated_at = NOW()
		RETURNING id, property_scenario_id, asset_id, liability_id, created_at, updated_at`,
		link.PropertyScenarioID, link.AssetID, link.LiabilityID)
	var created PropertyLink
	if err := row.Scan(&created.ID, &created.PropertyScenarioID, &created.AssetID, &created.LiabilityID, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return PropertyLink{}, err
	}
	return created, nil
}

// UpdatePropertyLink updates asset/liability for a link by ID.
func (s *Store) UpdatePropertyLink(ctx context.Context, link PropertyLink) (PropertyLink, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE property_links
		SET property_scenario_id = $2,
		    asset_id = $3,
		    liability_id = $4,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, property_scenario_id, asset_id, liability_id, created_at, updated_at`,
		link.ID, link.PropertyScenarioID, link.AssetID, link.LiabilityID)
	var updated PropertyLink
	if err := row.Scan(&updated.ID, &updated.PropertyScenarioID, &updated.AssetID, &updated.LiabilityID, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PropertyLink{}, ErrNotFound
		}
		return PropertyLink{}, err
	}
	return updated, nil
}

// ListPropertyLinksByScenario lists links for a scenario.
func (s *Store) ListPropertyLinksByScenario(ctx context.Context, scenarioID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_scenario_id, asset_id, liability_id, created_at, updated_at
		FROM property_links
		WHERE property_scenario_id = $1
		ORDER BY updated_at DESC`, scenarioID)
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

// ListPropertyLinksByAsset lists links for an asset.
func (s *Store) ListPropertyLinksByAsset(ctx context.Context, assetID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_scenario_id, asset_id, liability_id, created_at, updated_at
		FROM property_links
		WHERE asset_id = $1
		ORDER BY updated_at DESC`, assetID)
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

// ListPropertyLinksByLiability lists links for a liability.
func (s *Store) ListPropertyLinksByLiability(ctx context.Context, liabilityID string) ([]PropertyLink, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, property_scenario_id, asset_id, liability_id, created_at, updated_at
		FROM property_links
		WHERE liability_id = $1
		ORDER BY updated_at DESC`, liabilityID)
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
