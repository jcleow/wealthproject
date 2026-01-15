package engine

import (
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
)

// Extra interest limits for CPF accounts.
// Reference: https://www.cpf.gov.sg/member/growing-your-savings/earning-interest/interest-rates
var (
	// ExtraInterestLimit60K is the balance threshold for the first 1% extra interest
	ExtraInterestLimit60K = decimal.NewFromInt64(60000, 0)
	// ExtraInterestLimit30K is the additional balance threshold for members 55+ (extra 1%)
	ExtraInterestLimit30K = decimal.NewFromInt64(30000, 0)
)

// interestStrategy reuses the growth module's LinearGrowthStrategy for CPF interest.
var interestStrategy = &growth.LinearGrowthStrategy{}

// InterestResult contains the breakdown of interest calculation for a month.
type InterestResult struct {
	BaseInterestOA *decimal.Decimal // Base interest on OA
	BaseInterestSA *decimal.Decimal // Base interest on SA
	BaseInterestMA *decimal.Decimal // Base interest on MA
	BaseInterestRA *decimal.Decimal // Base interest on RA
	ExtraInterest  *decimal.Decimal // Extra interest amount
	ExtraInterestTo string          // "sa" or "ra" - where extra interest is credited
	TotalInterest  *decimal.Decimal // Sum of all interest
}

// ApplyMonthlyInterest applies one month of base + extra interest to the state.
// Modifies the state in place and returns the interest breakdown.
func ApplyMonthlyInterest(state *CPFState, assumptions *Assumptions) *InterestResult {
	if assumptions == nil {
		assumptions = DefaultAssumptions()
	}

	// Get rates as percentages (multiply by 100 since stored as decimals)
	oaRatePct := convertToPercentage(assumptions.InterestRateOA)
	saRatePct := convertToPercentage(assumptions.InterestRateSA)
	maRatePct := convertToPercentage(assumptions.InterestRateMA)
	raRatePct := convertToPercentage(assumptions.InterestRateRA)

	// Calculate base interest for each account
	oaInterest := CalculateMonthlyInterest(state.OA, oaRatePct)
	saInterest := CalculateMonthlyInterest(state.SA, saRatePct)
	maInterest := CalculateMonthlyInterest(state.MA, maRatePct)
	raInterest := CalculateMonthlyInterest(state.RA, raRatePct)

	// Apply base interest to balances
	state.OA = state.OA.Add(oaInterest)
	state.SA = state.SA.Add(saInterest)
	state.MA = state.MA.Add(maInterest)
	state.RA = state.RA.Add(raInterest)

	// Calculate extra interest
	age := state.AgeAt(state.AsOfDate)
	extraResult := CalculateExtraInterest(state.OA, state.SA, state.MA, state.RA, age, assumptions)

	// Apply extra interest to appropriate account
	if extraResult.Amount != nil && !extraResult.Amount.IsZero() {
		if extraResult.CreditTo == "ra" {
			state.RA = state.RA.Add(extraResult.Amount)
		} else {
			state.SA = state.SA.Add(extraResult.Amount)
		}
	}

	// Calculate total interest
	totalInterest := decimal.Zero()
	totalInterest = totalInterest.Add(oaInterest)
	totalInterest = totalInterest.Add(saInterest)
	totalInterest = totalInterest.Add(maInterest)
	totalInterest = totalInterest.Add(raInterest)
	if extraResult.Amount != nil {
		totalInterest = totalInterest.Add(extraResult.Amount)
	}

	return &InterestResult{
		BaseInterestOA:  oaInterest,
		BaseInterestSA:  saInterest,
		BaseInterestMA:  maInterest,
		BaseInterestRA:  raInterest,
		ExtraInterest:   extraResult.Amount,
		ExtraInterestTo: extraResult.CreditTo,
		TotalInterest:   totalInterest,
	}
}

// CalculateMonthlyInterest calculates interest for one month.
// Uses simple monthly interest: balance * (annualRate / 12)
// Note: annualRatePct is the annual rate as a percentage (e.g., 2.5 for 2.5%)
func CalculateMonthlyInterest(balance, annualRatePct *decimal.Decimal) *decimal.Decimal {
	if balance == nil || balance.IsZero() {
		return decimal.Zero()
	}

	// Use growth module's LinearGrowthStrategy for consistent calculation
	params := growth.Params{AnnualRatePct: annualRatePct}
	newBalance := interestStrategy.Apply(balance, params, 2, 1)

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
func CalculateExtraInterest(
	oa, sa, ma, ra *decimal.Decimal,
	age int,
	assumptions *Assumptions,
) *ExtraInterestResult {
	if assumptions == nil {
		assumptions = DefaultAssumptions()
	}

	// Get extra interest rates as percentages
	extraFirst60kPct := convertToPercentage(assumptions.ExtraInterestFirst60K)
	extraFirst30kAbove55Pct := convertToPercentage(assumptions.ExtraInterestFirst30KAbove55)

	// Calculate combined balance with priority: OA first, then SA/RA, then MA
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

// convertToPercentage converts a rate from decimal format (0.025) to percentage (2.5)
// if it appears to be in decimal format (less than 1).
func convertToPercentage(rate *decimal.Decimal) *decimal.Decimal {
	if rate == nil {
		return decimal.Zero()
	}
	// If rate is less than 1, it's likely in decimal format (e.g., 0.025 for 2.5%)
	one := decimal.NewFromInt64(1, 0)
	if rate.Cmp(one) < 0 {
		hundred := decimal.NewFromInt64(100, 0)
		return rate.Mul(hundred)
	}
	return rate
}
