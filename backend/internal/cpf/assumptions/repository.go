// Package assumptions provides CPF assumptions management and persistence.
//
// Assumptions control how CPF projections are calculated, including interest rates,
// growth rates, and retirement planning preferences.
package assumptions

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("cpf assumptions not found")

// CPFLifePlan represents the type of CPF LIFE plan.
type CPFLifePlan string

const (
	CPFLifePlanStandard   CPFLifePlan = "standard"
	CPFLifePlanBasic      CPFLifePlan = "basic"
	CPFLifePlanEscalating CPFLifePlan = "escalating"
)

// PresetName represents the assumption preset type.
type PresetName string

const (
	PresetOfficial     PresetName = "official"
	PresetConservative PresetName = "conservative"
	PresetOptimistic   PresetName = "optimistic"
	PresetCustom       PresetName = "custom"
)

// CPFAssumptions represents user-specific CPF calculation assumptions.
type CPFAssumptions struct {
	ID           string `json:"id"`
	CPFAccountID string `json:"cpfAccountId"`

	// Interest rate assumptions (stored as decimals, e.g., 0.025 = 2.5%)
	InterestRateOA              float64 `json:"interestRateOa"`
	InterestRateSA              float64 `json:"interestRateSa"`
	InterestRateMA              float64 `json:"interestRateMa"`
	InterestRateRA              float64 `json:"interestRateRa"`
	ExtraInterestFirst60k       float64 `json:"extraInterestFirst60k"`
	ExtraInterestFirst30kAbove55 float64 `json:"extraInterestFirst30kAbove55"`

	// Growth rate assumptions
	InflationRate   float64 `json:"inflationRate"`
	FRSGrowthRate   float64 `json:"frsGrowthRate"`
	SalaryGrowthRate float64 `json:"salaryGrowthRate"`

	// Employment assumptions
	AssumeContinuousEmployment bool `json:"assumeContinuousEmployment"`
	RetirementAge              int  `json:"retirementAge"`

	// CPF LIFE assumptions
	CPFLifePlan          CPFLifePlan `json:"cpfLifePlan"`
	PayoutStartAge       int         `json:"payoutStartAge"`
	EscalatingPlanGrowth float64     `json:"escalatingPlanGrowth"`

	// Preset tracking
	PresetName PresetName `json:"presetName"`

	// Metadata
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// DefaultAssumptions returns the official CPF assumptions.
func DefaultAssumptions(cpfAccountID string) *CPFAssumptions {
	return &CPFAssumptions{
		CPFAccountID:                 cpfAccountID,
		InterestRateOA:               0.025,
		InterestRateSA:               0.04,
		InterestRateMA:               0.04,
		InterestRateRA:               0.04,
		ExtraInterestFirst60k:        0.01,
		ExtraInterestFirst30kAbove55: 0.01,
		InflationRate:                0.02,
		FRSGrowthRate:                0.035,
		SalaryGrowthRate:             0.03,
		AssumeContinuousEmployment:   true,
		RetirementAge:                65,
		CPFLifePlan:                  CPFLifePlanStandard,
		PayoutStartAge:               65,
		EscalatingPlanGrowth:         0.02,
		PresetName:                   PresetOfficial,
	}
}

// Repository handles CPF assumptions persistence.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new CPF assumptions repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByCPFAccountID retrieves assumptions for a CPF account.
func (r *Repository) GetByCPFAccountID(ctx context.Context, cpfAccountID string) (*CPFAssumptions, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, cpf_account_id,
		       interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		       extra_interest_first_60k, extra_interest_first_30k_above_55,
		       inflation_rate, frs_growth_rate, salary_growth_rate,
		       assume_continuous_employment, retirement_age,
		       cpf_life_plan, payout_start_age, escalating_plan_growth,
		       preset_name, created_at, updated_at
		FROM cpf_assumptions
		WHERE cpf_account_id = $1`, cpfAccountID)

	return scanAssumptions(row)
}

// GetByID retrieves assumptions by ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*CPFAssumptions, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, cpf_account_id,
		       interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		       extra_interest_first_60k, extra_interest_first_30k_above_55,
		       inflation_rate, frs_growth_rate, salary_growth_rate,
		       assume_continuous_employment, retirement_age,
		       cpf_life_plan, payout_start_age, escalating_plan_growth,
		       preset_name, created_at, updated_at
		FROM cpf_assumptions
		WHERE id = $1`, id)

	return scanAssumptions(row)
}

// Create creates new assumptions for a CPF account.
func (r *Repository) Create(ctx context.Context, a *CPFAssumptions) (*CPFAssumptions, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO cpf_assumptions (
			cpf_account_id,
			interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
			extra_interest_first_60k, extra_interest_first_30k_above_55,
			inflation_rate, frs_growth_rate, salary_growth_rate,
			assume_continuous_employment, retirement_age,
			cpf_life_plan, payout_start_age, escalating_plan_growth,
			preset_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, cpf_account_id,
		          interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		          extra_interest_first_60k, extra_interest_first_30k_above_55,
		          inflation_rate, frs_growth_rate, salary_growth_rate,
		          assume_continuous_employment, retirement_age,
		          cpf_life_plan, payout_start_age, escalating_plan_growth,
		          preset_name, created_at, updated_at`,
		a.CPFAccountID,
		a.InterestRateOA, a.InterestRateSA, a.InterestRateMA, a.InterestRateRA,
		a.ExtraInterestFirst60k, a.ExtraInterestFirst30kAbove55,
		a.InflationRate, a.FRSGrowthRate, a.SalaryGrowthRate,
		a.AssumeContinuousEmployment, a.RetirementAge,
		string(a.CPFLifePlan), a.PayoutStartAge, a.EscalatingPlanGrowth,
		string(a.PresetName),
	)

	return scanAssumptions(row)
}

// Update updates existing assumptions.
func (r *Repository) Update(ctx context.Context, a *CPFAssumptions) (*CPFAssumptions, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE cpf_assumptions
		SET interest_rate_oa = $2,
		    interest_rate_sa = $3,
		    interest_rate_ma = $4,
		    interest_rate_ra = $5,
		    extra_interest_first_60k = $6,
		    extra_interest_first_30k_above_55 = $7,
		    inflation_rate = $8,
		    frs_growth_rate = $9,
		    salary_growth_rate = $10,
		    assume_continuous_employment = $11,
		    retirement_age = $12,
		    cpf_life_plan = $13,
		    payout_start_age = $14,
		    escalating_plan_growth = $15,
		    preset_name = $16,
		    updated_at = NOW()
		WHERE cpf_account_id = $1
		RETURNING id, cpf_account_id,
		          interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		          extra_interest_first_60k, extra_interest_first_30k_above_55,
		          inflation_rate, frs_growth_rate, salary_growth_rate,
		          assume_continuous_employment, retirement_age,
		          cpf_life_plan, payout_start_age, escalating_plan_growth,
		          preset_name, created_at, updated_at`,
		a.CPFAccountID,
		a.InterestRateOA, a.InterestRateSA, a.InterestRateMA, a.InterestRateRA,
		a.ExtraInterestFirst60k, a.ExtraInterestFirst30kAbove55,
		a.InflationRate, a.FRSGrowthRate, a.SalaryGrowthRate,
		a.AssumeContinuousEmployment, a.RetirementAge,
		string(a.CPFLifePlan), a.PayoutStartAge, a.EscalatingPlanGrowth,
		string(a.PresetName),
	)

	return scanAssumptions(row)
}

// Upsert creates or updates assumptions for a CPF account.
func (r *Repository) Upsert(ctx context.Context, a *CPFAssumptions) (*CPFAssumptions, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO cpf_assumptions (
			cpf_account_id,
			interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
			extra_interest_first_60k, extra_interest_first_30k_above_55,
			inflation_rate, frs_growth_rate, salary_growth_rate,
			assume_continuous_employment, retirement_age,
			cpf_life_plan, payout_start_age, escalating_plan_growth,
			preset_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (cpf_account_id) DO UPDATE
		SET interest_rate_oa = EXCLUDED.interest_rate_oa,
		    interest_rate_sa = EXCLUDED.interest_rate_sa,
		    interest_rate_ma = EXCLUDED.interest_rate_ma,
		    interest_rate_ra = EXCLUDED.interest_rate_ra,
		    extra_interest_first_60k = EXCLUDED.extra_interest_first_60k,
		    extra_interest_first_30k_above_55 = EXCLUDED.extra_interest_first_30k_above_55,
		    inflation_rate = EXCLUDED.inflation_rate,
		    frs_growth_rate = EXCLUDED.frs_growth_rate,
		    salary_growth_rate = EXCLUDED.salary_growth_rate,
		    assume_continuous_employment = EXCLUDED.assume_continuous_employment,
		    retirement_age = EXCLUDED.retirement_age,
		    cpf_life_plan = EXCLUDED.cpf_life_plan,
		    payout_start_age = EXCLUDED.payout_start_age,
		    escalating_plan_growth = EXCLUDED.escalating_plan_growth,
		    preset_name = EXCLUDED.preset_name,
		    updated_at = NOW()
		RETURNING id, cpf_account_id,
		          interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		          extra_interest_first_60k, extra_interest_first_30k_above_55,
		          inflation_rate, frs_growth_rate, salary_growth_rate,
		          assume_continuous_employment, retirement_age,
		          cpf_life_plan, payout_start_age, escalating_plan_growth,
		          preset_name, created_at, updated_at`,
		a.CPFAccountID,
		a.InterestRateOA, a.InterestRateSA, a.InterestRateMA, a.InterestRateRA,
		a.ExtraInterestFirst60k, a.ExtraInterestFirst30kAbove55,
		a.InflationRate, a.FRSGrowthRate, a.SalaryGrowthRate,
		a.AssumeContinuousEmployment, a.RetirementAge,
		string(a.CPFLifePlan), a.PayoutStartAge, a.EscalatingPlanGrowth,
		string(a.PresetName),
	)

	return scanAssumptions(row)
}

// Delete removes assumptions for a CPF account.
func (r *Repository) Delete(ctx context.Context, cpfAccountID string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM cpf_assumptions WHERE cpf_account_id = $1`, cpfAccountID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// GetOrCreateDefault retrieves assumptions or creates default ones if none exist.
func (r *Repository) GetOrCreateDefault(ctx context.Context, cpfAccountID string) (*CPFAssumptions, error) {
	existing, err := r.GetByCPFAccountID(ctx, cpfAccountID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	// Create default assumptions
	defaults := DefaultAssumptions(cpfAccountID)
	return r.Create(ctx, defaults)
}

// scanAssumptions scans a row into a CPFAssumptions struct.
func scanAssumptions(row *sql.Row) (*CPFAssumptions, error) {
	var a CPFAssumptions
	var cpfLifePlan, presetName string

	err := row.Scan(
		&a.ID, &a.CPFAccountID,
		&a.InterestRateOA, &a.InterestRateSA, &a.InterestRateMA, &a.InterestRateRA,
		&a.ExtraInterestFirst60k, &a.ExtraInterestFirst30kAbove55,
		&a.InflationRate, &a.FRSGrowthRate, &a.SalaryGrowthRate,
		&a.AssumeContinuousEmployment, &a.RetirementAge,
		&cpfLifePlan, &a.PayoutStartAge, &a.EscalatingPlanGrowth,
		&presetName, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	a.CPFLifePlan = CPFLifePlan(cpfLifePlan)
	a.PresetName = PresetName(presetName)

	return &a, nil
}
