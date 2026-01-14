package projector

import (
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
)

// CPF interest rates (annual percentage) as per CPF Board
// Reference: https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-interest-rates
var (
	OAInterestRatePct = decimal.MustFromFloat64(2.5) // 2.5% p.a.
	SAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.
	MAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.
	RAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.

	// Extra interest rates
	ExtraInterestFirst60KPct        = decimal.MustFromFloat64(1.0) // 1.0% p.a.
	ExtraInterestFirst30KAbove55Pct = decimal.MustFromFloat64(1.0) // 1.0% p.a.

	// Limits for extra interest calculation
	ExtraInterestLimit60K = decimal.NewFromInt64(60000, 0)
	ExtraInterestLimit30K = decimal.NewFromInt64(30000, 0)
)

// interestStrategy reuses the growth module's LinearGrowthStrategy for CPF interest.
// We use the growth module here (rather than duplicating the calculation) to ensure
// consistent arithmetic across all financial projections. The growth module provides
// well-tested percentage-based calculations that work for both asset growth and
// CPF interest - the underlying math is identical: balance * (rate / 100 / 12).
var interestStrategy = &growth.LinearGrowthStrategy{}

// getInterestRates returns the interest rates to use, preferring assumptions over defaults.
// Rates are returned as percentages (e.g., 2.5 for 2.5%).
func getInterestRates(assumptions *ProjectionAssumptions) (oa, sa, ma, ra *decimal.Decimal) {
	oa = OAInterestRatePct
	sa = SAInterestRatePct
	ma = MAInterestRatePct
	ra = RAInterestRatePct

	if assumptions != nil {
		if assumptions.InterestRateOA != nil {
			// Convert from decimal (0.025) to percentage (2.5) if needed
			oa = convertRateToPercentage(assumptions.InterestRateOA)
		}
		if assumptions.InterestRateSA != nil {
			sa = convertRateToPercentage(assumptions.InterestRateSA)
		}
		if assumptions.InterestRateMA != nil {
			ma = convertRateToPercentage(assumptions.InterestRateMA)
		}
		if assumptions.InterestRateRA != nil {
			ra = convertRateToPercentage(assumptions.InterestRateRA)
		}
	}
	return
}

// getExtraInterestRates returns the extra interest rates to use.
// Rates are returned as percentages (e.g., 1.0 for 1.0%).
func getExtraInterestRates(assumptions *ProjectionAssumptions) (first60k, first30kAbove55 *decimal.Decimal) {
	first60k = ExtraInterestFirst60KPct
	first30kAbove55 = ExtraInterestFirst30KAbove55Pct

	if assumptions != nil {
		if assumptions.ExtraInterestFirst60K != nil {
			first60k = convertRateToPercentage(assumptions.ExtraInterestFirst60K)
		}
		if assumptions.ExtraInterestFirst30KAbove55 != nil {
			first30kAbove55 = convertRateToPercentage(assumptions.ExtraInterestFirst30KAbove55)
		}
	}
	return
}

// convertRateToPercentage converts a rate from decimal format (0.025) to percentage (2.5)
// if it appears to be in decimal format (less than 1).
func convertRateToPercentage(rate *decimal.Decimal) *decimal.Decimal {
	if rate == nil {
		return nil
	}
	// If rate is less than 1, it's likely in decimal format (e.g., 0.025 for 2.5%)
	one := decimal.NewFromInt64(1, 0)
	if rate.Cmp(one) < 0 {
		hundred := decimal.NewFromInt64(100, 0)
		return rate.Mul(hundred)
	}
	return rate
}

// CalculateMonthlyInterest calculates interest for one month using the growth module.
// Uses simple monthly interest: balance * (annualRate / 12)
// Note: annualRatePct is the annual rate as a percentage (e.g., 2.5 for 2.5%)
func CalculateMonthlyInterest(balance, annualRatePct *decimal.Decimal) *decimal.Decimal {
	if balance == nil || balance.IsZero() {
		return decimal.Zero()
	}

	// Use growth module's LinearGrowthStrategy for consistent calculation
	// The strategy calculates: balance + (balance * rate/100 / 12)
	// We only need the interest portion, not the total
	params := growth.Params{AnnualRatePct: annualRatePct}
	newBalance := interestStrategy.Apply(balance, params, 2, 1) // month > 1 to trigger calculation

	interest := newBalance.Sub(balance)
	return interest.Round(2)
}

// ExtraInterestResult contains the calculated extra interest and where it should be credited.
type ExtraInterestResult struct {
	Amount   *decimal.Decimal // Monthly extra interest amount
	CreditTo string           // "sa" (age < 55) or "ra" (age >= 55)
}

// CalculateExtraInterest calculates the extra interest on combined CPF balances.
// CPF provides +1% extra interest on the first $60,000 of combined balances,
// and an additional +1% on the first $30,000 for members aged 55 and above.
// Extra interest is credited to SA (age < 55) or RA (age >= 55).
//
// Priority order for calculating the qualifying balance: OA first, then SA/RA, then MA.
func CalculateExtraInterest(
	oa, sa, ma, ra *decimal.Decimal,
	age int,
	assumptions *ProjectionAssumptions,
) *ExtraInterestResult {
	// Get extra interest rates
	extraFirst60kPct, extraFirst30kAbove55Pct := getExtraInterestRates(assumptions)

	// Calculate combined balance with priority: OA first, then SA/RA, then MA
	// This determines which balances qualify for extra interest
	combined := decimal.Zero()
	if oa != nil {
		combined = combined.Add(oa)
	}
	if sa != nil {
		combined = combined.Add(sa)
	}
	if ra != nil {
		combined = combined.Add(ra)
	}
	if ma != nil {
		combined = combined.Add(ma)
	}

	if combined.IsZero() {
		return &ExtraInterestResult{
			Amount:   decimal.Zero(),
			CreditTo: "sa",
		}
	}

	// Calculate extra interest on first $60k
	qualifyingFor60k := combined
	if combined.Cmp(ExtraInterestLimit60K) > 0 {
		qualifyingFor60k = ExtraInterestLimit60K
	}
	extraInterest := CalculateMonthlyInterest(qualifyingFor60k, extraFirst60kPct)

	// For members 55+, additional +1% on first $30k
	if age >= 55 {
		qualifyingFor30k := combined
		if combined.Cmp(ExtraInterestLimit30K) > 0 {
			qualifyingFor30k = ExtraInterestLimit30K
		}
		additionalExtra := CalculateMonthlyInterest(qualifyingFor30k, extraFirst30kAbove55Pct)
		extraInterest = extraInterest.Add(additionalExtra)
	}

	// Determine credit destination
	creditTo := "sa"
	if age >= 55 {
		creditTo = "ra"
	}

	return &ExtraInterestResult{
		Amount:   extraInterest.Round(2),
		CreditTo: creditTo,
	}
}
