// Package assumptions provides CPF assumptions management and persistence.
// Assumptions control how CPF projections are calculated, including interest rates,
// growth rates, and employment assumptions.
package assumptions

import (
	"context"
	"errors"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("cpf assumptions not found")

// PgxPool interface for database operations.
type PgxPool interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// CPFLifePlan represents the CPF LIFE plan type.
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

// CPFAssumptions represents user-specific CPF projection assumptions.
type CPFAssumptions struct {
	ID           string `json:"id"`
	CPFAccountID string `json:"cpfAccountId"`

	// Interest rate assumptions (stored as decimals, e.g., 0.025 = 2.5%)
	InterestRateOA               decimal.Decimal `json:"interestRateOA"`
	InterestRateSA               decimal.Decimal `json:"interestRateSA"`
	InterestRateMA               decimal.Decimal `json:"interestRateMA"`
	InterestRateRA               decimal.Decimal `json:"interestRateRA"`
	ExtraInterestFirst60K        decimal.Decimal `json:"extraInterestFirst60K"`
	ExtraInterestFirst30KAbove55 decimal.Decimal `json:"extraInterestFirst30KAbove55"`

	// Growth rate assumptions (inflation_rate is global, not CPF-specific)
	FRSGrowthRate    decimal.Decimal `json:"frsGrowthRate"`
	SalaryGrowthRate decimal.Decimal `json:"salaryGrowthRate"`

	// Employment assumptions
	AssumeContinuousEmployment bool `json:"assumeContinuousEmployment"`
	RetirementAge              int  `json:"retirementAge"`

	// CPF LIFE assumptions
	CPFLifePlan          CPFLifePlan     `json:"cpfLifePlan"`
	PayoutStartAge       int             `json:"payoutStartAge"`
	EscalatingPlanGrowth decimal.Decimal `json:"escalatingPlanGrowth"`

	// Preset tracking
	PresetName PresetName `json:"presetName"`
}

// Repository handles CPF assumptions persistence.
type Repository struct {
	pool PgxPool
}

// NewRepository creates a new CPF assumptions repository.
func NewRepository(pool PgxPool) *Repository {
	return &Repository{pool: pool}
}

// GetByCPFAccountID retrieves assumptions for a specific CPF account.
func (r *Repository) GetByCPFAccountID(ctx context.Context, cpfAccountID string) (*CPFAssumptions, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, cpf_account_id,
		       interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
		       extra_interest_first_60k, extra_interest_first_30k_above_55,
		       frs_growth_rate, salary_growth_rate,
		       assume_continuous_employment, retirement_age,
		       cpf_life_plan, payout_start_age, escalating_plan_growth,
		       preset_name
		FROM cpf_assumptions
		WHERE cpf_account_id = $1`, cpfAccountID)

	var a CPFAssumptions
	var cpfLifePlan, presetName string

	err := row.Scan(
		&a.ID, &a.CPFAccountID,
		&a.InterestRateOA, &a.InterestRateSA, &a.InterestRateMA, &a.InterestRateRA,
		&a.ExtraInterestFirst60K, &a.ExtraInterestFirst30KAbove55,
		&a.FRSGrowthRate, &a.SalaryGrowthRate,
		&a.AssumeContinuousEmployment, &a.RetirementAge,
		&cpfLifePlan, &a.PayoutStartAge, &a.EscalatingPlanGrowth,
		&presetName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	a.CPFLifePlan = CPFLifePlan(cpfLifePlan)
	a.PresetName = PresetName(presetName)

	return &a, nil
}

// Upsert creates or updates assumptions for a CPF account.
// This is the primary method for saving assumptions since each account has exactly one assumptions record.
func (r *Repository) Upsert(ctx context.Context, a *CPFAssumptions) (*CPFAssumptions, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO cpf_assumptions (
			cpf_account_id,
			interest_rate_oa, interest_rate_sa, interest_rate_ma, interest_rate_ra,
			extra_interest_first_60k, extra_interest_first_30k_above_55,
			frs_growth_rate, salary_growth_rate,
			assume_continuous_employment, retirement_age,
			cpf_life_plan, payout_start_age, escalating_plan_growth,
			preset_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (cpf_account_id) DO UPDATE
		SET interest_rate_oa = EXCLUDED.interest_rate_oa,
		    interest_rate_sa = EXCLUDED.interest_rate_sa,
		    interest_rate_ma = EXCLUDED.interest_rate_ma,
		    interest_rate_ra = EXCLUDED.interest_rate_ra,
		    extra_interest_first_60k = EXCLUDED.extra_interest_first_60k,
		    extra_interest_first_30k_above_55 = EXCLUDED.extra_interest_first_30k_above_55,
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
		          frs_growth_rate, salary_growth_rate,
		          assume_continuous_employment, retirement_age,
		          cpf_life_plan, payout_start_age, escalating_plan_growth,
		          preset_name`,
		a.CPFAccountID,
		a.InterestRateOA, a.InterestRateSA, a.InterestRateMA, a.InterestRateRA,
		a.ExtraInterestFirst60K, a.ExtraInterestFirst30KAbove55,
		a.FRSGrowthRate, a.SalaryGrowthRate,
		a.AssumeContinuousEmployment, a.RetirementAge,
		string(a.CPFLifePlan), a.PayoutStartAge, a.EscalatingPlanGrowth,
		string(a.PresetName),
	)

	var result CPFAssumptions
	var cpfLifePlan, presetName string

	err := row.Scan(
		&result.ID, &result.CPFAccountID,
		&result.InterestRateOA, &result.InterestRateSA, &result.InterestRateMA, &result.InterestRateRA,
		&result.ExtraInterestFirst60K, &result.ExtraInterestFirst30KAbove55,
		&result.FRSGrowthRate, &result.SalaryGrowthRate,
		&result.AssumeContinuousEmployment, &result.RetirementAge,
		&cpfLifePlan, &result.PayoutStartAge, &result.EscalatingPlanGrowth,
		&presetName,
	)
	if err != nil {
		return nil, err
	}

	result.CPFLifePlan = CPFLifePlan(cpfLifePlan)
	result.PresetName = PresetName(presetName)

	return &result, nil
}

// Delete removes assumptions for a CPF account.
func (r *Repository) Delete(ctx context.Context, cpfAccountID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM cpf_assumptions WHERE cpf_account_id = $1`, cpfAccountID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetOrCreateDefault retrieves existing assumptions or creates default ones for a CPF account.
// This ensures projections always have assumptions to work with.
func (r *Repository) GetOrCreateDefault(ctx context.Context, cpfAccountID string) (*CPFAssumptions, error) {
	// Try to get existing first
	existing, err := r.GetByCPFAccountID(ctx, cpfAccountID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	// Create default assumptions
	defaults := DefaultAssumptions(cpfAccountID)
	return r.Upsert(ctx, defaults)
}

// DefaultAssumptions returns a CPFAssumptions struct with official CPF default values.
func DefaultAssumptions(cpfAccountID string) *CPFAssumptions {
	return &CPFAssumptions{
		CPFAccountID: cpfAccountID,

		// Official CPF interest rates
		InterestRateOA:               *decimal.MustFromString("0.025"), // 2.5%
		InterestRateSA:               *decimal.MustFromString("0.04"),  // 4.0%
		InterestRateMA:               *decimal.MustFromString("0.04"),  // 4.0%
		InterestRateRA:               *decimal.MustFromString("0.04"),  // 4.0%
		ExtraInterestFirst60K:        *decimal.MustFromString("0.01"),  // +1%
		ExtraInterestFirst30KAbove55: *decimal.MustFromString("0.01"),  // +1%

		// Growth rate assumptions (inflation_rate is global, not CPF-specific)
		FRSGrowthRate:    *decimal.MustFromString("0.035"), // 3.5%
		SalaryGrowthRate: *decimal.MustFromString("0.03"),  // 3%

		// Employment assumptions
		AssumeContinuousEmployment: true,
		RetirementAge:              65,

		// CPF LIFE assumptions
		CPFLifePlan:          CPFLifePlanStandard,
		PayoutStartAge:       65,
		EscalatingPlanGrowth: *decimal.MustFromString("0.02"), // 2%

		// Preset tracking
		PresetName: PresetOfficial,
	}
}
