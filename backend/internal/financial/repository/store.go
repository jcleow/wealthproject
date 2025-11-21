package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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
	Name             string
	Category         string
	CurrentValue     float64
	AnnualGrowthRate float64
	Notes            string
	UpdatedAt        time.Time
}

// Liability represents a persisted liability record.
type Liability struct {
	ID              string
	Name            string
	Category        string
	CurrentBalance  float64
	InterestRateAPR float64
	MinimumPayment  float64
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
	Source    string
	Amount    float64
	Frequency string
	StartDate *time.Time
	Category  string
	Notes     string
	UpdatedAt time.Time
}

// Expense represents a persisted expense record.
type Expense struct {
	ID        string
	Payee     string
	Amount    float64
	Frequency string
	Category  string
	Notes     string
	UpdatedAt time.Time
}

// ----- Asset operations -----

func (s *Store) ListAssets(ctx context.Context) ([]Asset, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at
		FROM finance_assets
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Notes, &a.UpdatedAt); err != nil {
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
		SELECT id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at
		FROM finance_assets
		WHERE id = $1`, id)
	var a Asset
	if err := row.Scan(&a.ID, &a.Name, &a.Category, &a.CurrentValue, &a.AnnualGrowthRate, &a.Notes, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Asset{}, ErrNotFound
		}
		return Asset{}, err
	}
	return a, nil
}

func (s *Store) CreateAsset(ctx context.Context, a Asset) (Asset, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_assets (name, category, current_value, annual_growth_rate, notes)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`,
		a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, a.Notes)
	var created Asset
	if err := row.Scan(&created.ID, &created.Name, &created.Category, &created.CurrentValue, &created.AnnualGrowthRate, &created.Notes, &created.UpdatedAt); err != nil {
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
		    notes=NULLIF($6, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, name, category, current_value, annual_growth_rate, COALESCE(notes, ''), updated_at`,
		a.ID, a.Name, a.Category, a.CurrentValue, a.AnnualGrowthRate, a.Notes)
	var updated Asset
	if err := row.Scan(&updated.ID, &updated.Name, &updated.Category, &updated.CurrentValue, &updated.AnnualGrowthRate, &updated.Notes, &updated.UpdatedAt); err != nil {
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

// ----- Liability operations -----

func (s *Store) ListLiabilities(ctx context.Context) ([]Liability, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at
		FROM finance_liabilities
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Liability
	for rows.Next() {
		var li Liability
		if err := rows.Scan(&li.ID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Notes, &li.UpdatedAt); err != nil {
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
		SELECT id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at
		FROM finance_liabilities
		WHERE id = $1`, id)
	var li Liability
	if err := row.Scan(&li.ID, &li.Name, &li.Category, &li.CurrentBalance, &li.InterestRateAPR, &li.MinimumPayment, &li.Notes, &li.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Liability{}, ErrNotFound
		}
		return Liability{}, err
	}
	return li, nil
}

func (s *Store) CreateLiability(ctx context.Context, li Liability) (Liability, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_liabilities (name, category, current_balance, interest_rate_apr, minimum_payment, notes)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`,
		li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, li.Notes)
	var created Liability
	if err := row.Scan(&created.ID, &created.Name, &created.Category, &created.CurrentBalance, &created.InterestRateAPR, &created.MinimumPayment, &created.Notes, &created.UpdatedAt); err != nil {
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
		    notes=NULLIF($7, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, name, category, current_balance, interest_rate_apr, minimum_payment, COALESCE(notes, ''), updated_at`,
		li.ID, li.Name, li.Category, li.CurrentBalance, li.InterestRateAPR, li.MinimumPayment, li.Notes)
	var updated Liability
	if err := row.Scan(&updated.ID, &updated.Name, &updated.Category, &updated.CurrentBalance, &updated.InterestRateAPR, &updated.MinimumPayment, &updated.Notes, &updated.UpdatedAt); err != nil {
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
		SELECT id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at
		FROM finance_incomes
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Income
	for rows.Next() {
		var it Income
		if err := rows.Scan(&it.ID, &it.Source, &it.Amount, &it.Frequency, &it.StartDate, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
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
		SELECT id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at
		FROM finance_incomes
		WHERE id = $1`, id)
	var it Income
	if err := row.Scan(&it.ID, &it.Source, &it.Amount, &it.Frequency, &it.StartDate, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Income{}, ErrNotFound
		}
		return Income{}, err
	}
	return it, nil
}

func (s *Store) CreateIncome(ctx context.Context, it Income) (Income, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (source, amount, frequency, start_date, category, notes)
		VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, NULLIF($6, ''))
		RETURNING id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at`,
		it.Source, it.Amount, it.Frequency, it.StartDate, it.Category, it.Notes)
	var created Income
	if err := row.Scan(&created.ID, &created.Source, &created.Amount, &created.Frequency, &created.StartDate, &created.Category, &created.Notes, &created.UpdatedAt); err != nil {
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
		    start_date=COALESCE($5, start_date, NOW()),
		    category=$6,
		    notes=NULLIF($7, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, source, amount, frequency, start_date, category, COALESCE(notes, ''), updated_at`,
		it.ID, it.Source, it.Amount, it.Frequency, it.StartDate, it.Category, it.Notes)
	var updated Income
	if err := row.Scan(&updated.ID, &updated.Source, &updated.Amount, &updated.Frequency, &updated.StartDate, &updated.Category, &updated.Notes, &updated.UpdatedAt); err != nil {
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
		SELECT id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at
		FROM finance_expenses
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Expense
	for rows.Next() {
		var it Expense
		if err := rows.Scan(&it.ID, &it.Payee, &it.Amount, &it.Frequency, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
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
		SELECT id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at
		FROM finance_expenses
		WHERE id = $1`, id)
	var it Expense
	if err := row.Scan(&it.ID, &it.Payee, &it.Amount, &it.Frequency, &it.Category, &it.Notes, &it.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Expense{}, ErrNotFound
		}
		return Expense{}, err
	}
	return it, nil
}

func (s *Store) CreateExpense(ctx context.Context, it Expense) (Expense, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_expenses (payee, amount, frequency, category, notes)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
		RETURNING id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at`,
		it.Payee, it.Amount, it.Frequency, it.Category, it.Notes)
	var created Expense
	if err := row.Scan(&created.ID, &created.Payee, &created.Amount, &created.Frequency, &created.Category, &created.Notes, &created.UpdatedAt); err != nil {
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
		    category=$5,
		    notes=NULLIF($6, ''),
		    updated_at=NOW()
		WHERE id=$1
		RETURNING id, payee, amount, frequency, category, COALESCE(notes, ''), updated_at`,
		it.ID, it.Payee, it.Amount, it.Frequency, it.Category, it.Notes)
	var updated Expense
	if err := row.Scan(&updated.ID, &updated.Payee, &updated.Amount, &updated.Frequency, &updated.Category, &updated.Notes, &updated.UpdatedAt); err != nil {
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
