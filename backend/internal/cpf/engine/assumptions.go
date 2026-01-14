package engine

import (
	"financial-chat-system/backend/internal/cpf/assumptions"
	"financial-chat-system/backend/internal/decimal"
)

// Assumptions contains all configurable parameters for CPF calculations.
// All rates are stored as decimals (e.g., 0.025 = 2.5% p.a.).
type Assumptions struct {
	// Base interest rates (annual, as decimals)
	InterestRateOA *decimal.Decimal // OA interest rate (default: 0.025 = 2.5%)
	InterestRateSA *decimal.Decimal // SA interest rate (default: 0.04 = 4.0%)
	InterestRateMA *decimal.Decimal // MA interest rate (default: 0.04 = 4.0%)
	InterestRateRA *decimal.Decimal // RA interest rate (default: 0.04 = 4.0%)

	// Extra interest rates (annual, as decimals)
	ExtraInterestFirst60K        *decimal.Decimal // Extra on first $60k (default: 0.01 = 1.0%)
	ExtraInterestFirst30KAbove55 *decimal.Decimal // Extra for 55+ on first $30k (default: 0.01 = 1.0%)

	// Retirement sum growth
	FRSGrowthRate *decimal.Decimal // FRS/BRS/ERS growth rate (default: 0.035 = 3.5%)

	// Retirement sums base values (for 2026)
	BRSBase *decimal.Decimal // BRS at base year 2026
	FRSBase *decimal.Decimal // FRS at base year 2026
	ERSBase *decimal.Decimal // ERS at base year 2026
	BHSBase *decimal.Decimal // BHS at base year 2026

	// BHS growth rate
	BHSGrowthRate *decimal.Decimal // BHS growth rate (default: 0.04 = 4.0%)

	// Lifecycle settings
	RetirementAge  int // Age when contributions stop (default: 65)
	PayoutStartAge int // Age to start CPF LIFE (default: 65)
}

// DefaultAssumptions returns assumptions with official CPF rates.
func DefaultAssumptions() *Assumptions {
	return &Assumptions{
		InterestRateOA:               assumptions.OAInterestRate,
		InterestRateSA:               assumptions.SAInterestRate,
		InterestRateMA:               assumptions.MAInterestRate,
		InterestRateRA:               assumptions.RAInterestRate,
		ExtraInterestFirst60K:        assumptions.ExtraInterestFirst60K,
		ExtraInterestFirst30KAbove55: assumptions.ExtraInterestFirst30KAbove55,
		FRSGrowthRate:                assumptions.FRSGrowthRate,
		BRSBase:                      decimal.NewFromInt64(110200, 0),
		FRSBase:                      decimal.NewFromInt64(220400, 0),
		ERSBase:                      decimal.NewFromInt64(440800, 0),
		BHSBase:                      decimal.NewFromInt64(79000, 0),
		BHSGrowthRate:                decimal.MustFromString("0.04"),
		RetirementAge:                assumptions.DefaultRetirementAge,
		PayoutStartAge:               assumptions.DefaultPayoutStartAge,
	}
}

// Merge applies overrides from another Assumptions (non-nil fields override).
// Returns a new Assumptions with merged values.
func (a *Assumptions) Merge(overrides *Assumptions) *Assumptions {
	if overrides == nil {
		return a
	}

	result := &Assumptions{
		InterestRateOA:               a.InterestRateOA,
		InterestRateSA:               a.InterestRateSA,
		InterestRateMA:               a.InterestRateMA,
		InterestRateRA:               a.InterestRateRA,
		ExtraInterestFirst60K:        a.ExtraInterestFirst60K,
		ExtraInterestFirst30KAbove55: a.ExtraInterestFirst30KAbove55,
		FRSGrowthRate:                a.FRSGrowthRate,
		BRSBase:                      a.BRSBase,
		FRSBase:                      a.FRSBase,
		ERSBase:                      a.ERSBase,
		BHSBase:                      a.BHSBase,
		BHSGrowthRate:                a.BHSGrowthRate,
		RetirementAge:                a.RetirementAge,
		PayoutStartAge:               a.PayoutStartAge,
	}

	if overrides.InterestRateOA != nil {
		result.InterestRateOA = overrides.InterestRateOA
	}
	if overrides.InterestRateSA != nil {
		result.InterestRateSA = overrides.InterestRateSA
	}
	if overrides.InterestRateMA != nil {
		result.InterestRateMA = overrides.InterestRateMA
	}
	if overrides.InterestRateRA != nil {
		result.InterestRateRA = overrides.InterestRateRA
	}
	if overrides.ExtraInterestFirst60K != nil {
		result.ExtraInterestFirst60K = overrides.ExtraInterestFirst60K
	}
	if overrides.ExtraInterestFirst30KAbove55 != nil {
		result.ExtraInterestFirst30KAbove55 = overrides.ExtraInterestFirst30KAbove55
	}
	if overrides.FRSGrowthRate != nil {
		result.FRSGrowthRate = overrides.FRSGrowthRate
	}
	if overrides.BRSBase != nil {
		result.BRSBase = overrides.BRSBase
	}
	if overrides.FRSBase != nil {
		result.FRSBase = overrides.FRSBase
	}
	if overrides.ERSBase != nil {
		result.ERSBase = overrides.ERSBase
	}
	if overrides.BHSBase != nil {
		result.BHSBase = overrides.BHSBase
	}
	if overrides.BHSGrowthRate != nil {
		result.BHSGrowthRate = overrides.BHSGrowthRate
	}
	if overrides.RetirementAge > 0 {
		result.RetirementAge = overrides.RetirementAge
	}
	if overrides.PayoutStartAge > 0 {
		result.PayoutStartAge = overrides.PayoutStartAge
	}

	return result
}

// GetRetirementSum returns BRS/FRS/ERS for a given year (projected from 2026 base).
func (a *Assumptions) GetRetirementSum(scheme string, year int) *decimal.Decimal {
	yearsFrom2026 := year - 2026
	if yearsFrom2026 < 0 {
		yearsFrom2026 = 0
	}

	var base *decimal.Decimal
	switch scheme {
	case "brs":
		base = a.BRSBase
	case "frs":
		base = a.FRSBase
	case "ers":
		base = a.ERSBase
	default:
		base = a.FRSBase
	}

	// Calculate growth factor: (1 + rate)^years
	growthRate := decimal.MustFromString("1").Add(a.FRSGrowthRate)
	growthFactor, _ := growthRate.Pow(decimal.NewFromInt64(int64(yearsFrom2026), 0))

	return base.Mul(growthFactor)
}

// GetBHS returns the BHS for a given year (projected from 2026 base).
func (a *Assumptions) GetBHS(year int) *decimal.Decimal {
	yearsFrom2026 := year - 2026
	if yearsFrom2026 < 0 {
		yearsFrom2026 = 0
	}

	growthRate := decimal.MustFromString("1").Add(a.BHSGrowthRate)
	growthFactor, _ := growthRate.Pow(decimal.NewFromInt64(int64(yearsFrom2026), 0))

	return a.BHSBase.Mul(growthFactor)
}
