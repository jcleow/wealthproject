package retirement

import (
	"errors"

	"financial-chat-system/backend/internal/decimal"
)

var (
	// ErrInvalidTargetScheme is returned when the target scheme is not valid.
	ErrInvalidTargetScheme = errors.New("invalid target scheme: must be 'brs', 'frs', or 'ers'")
	// ErrMissingRetirementSums is returned when retirement sums are not provided.
	ErrMissingRetirementSums = errors.New("missing retirement sums: BRS, FRS, and ERS are required")
	// ErrNegativeBalance is returned when a balance is negative.
	ErrNegativeBalance = errors.New("negative balance: balances must be zero or positive")
)

// CalculateConversion calculates the Age 55 RA conversion based on CPF rules.
//
// At age 55, the following transfers occur:
// 1. ALL SA is transferred to RA
// 2. If RA < target (BRS/FRS/ERS), OA is transferred to RA up to the needed amount
// 3. If property pledge is provided, the required OA→RA transfer is reduced
// 4. If MA > BHS, the excess is transferred to RA
// 5. Remaining OA can be withdrawn
//
// Reference: https://www.cpf.gov.sg/member/faq/retirement-income/retirement-withdrawals/at-age-55--how-will-cpf-savings-be-transferred-to-my-retir
func CalculateConversion(input ConversionInput) (*ConversionResult, error) {
	// Validate inputs
	if err := validateConversionInput(input); err != nil {
		return nil, err
	}

	// Initialize balances
	oa := cloneOrZero(input.OABalance)
	sa := cloneOrZero(input.SABalance)
	ma := cloneOrZero(input.MABalance)
	ra := decimal.Zero()

	// Get target amount based on scheme
	targetAmount := getTargetAmount(input)

	// Track transfers
	saToRA := decimal.Zero()
	oaToRA := decimal.Zero()
	maOverflowToRA := decimal.Zero()

	// Step 1: Transfer ALL SA to RA
	if !sa.IsZero() {
		saToRA = sa
		ra = ra.Add(sa)
		sa = decimal.Zero()
	}

	// Calculate effective target (reduced by property pledge if any)
	effectiveTarget := targetAmount
	if input.PropertyPledgeAmount != nil && !input.PropertyPledgeAmount.IsZero() {
		// Property pledge can reduce target up to 50% of BRS
		maxPledge := input.BRS.Mul(MaxPropertyPledgePct)
		pledgeAmount := input.PropertyPledgeAmount
		if pledgeAmount.Cmp(maxPledge) > 0 {
			pledgeAmount = maxPledge
		}
		effectiveTarget = effectiveTarget.Sub(pledgeAmount)
		if effectiveTarget.IsNegative() {
			effectiveTarget = decimal.Zero()
		}
	}

	// Step 2: Transfer OA to RA if needed to meet target
	if ra.Cmp(effectiveTarget) < 0 {
		needed := effectiveTarget.Sub(ra)
		if oa.Cmp(needed) >= 0 {
			// Transfer exactly what's needed
			oaToRA = needed
			ra = ra.Add(needed)
			oa = oa.Sub(needed)
		} else {
			// Transfer all available OA
			oaToRA = oa
			ra = ra.Add(oa)
			oa = decimal.Zero()
		}
	}

	// Step 3: Handle MA overflow to RA
	// If MA exceeds BHS, excess goes to RA
	bhs := cloneOrZero(input.BHS)
	if ma.Cmp(bhs) > 0 {
		overflow := ma.Sub(bhs)
		maOverflowToRA = overflow
		ra = ra.Add(overflow)
		ma = bhs
	}

	// Determine if target is met
	meetsTarget := ra.Cmp(effectiveTarget) >= 0

	// Determine CPF LIFE eligibility (RA >= $60,000)
	cpfLifeEligible := ra.Cmp(CPFLifeMinimumRA) >= 0

	return &ConversionResult{
		// Transfer breakdown
		SAToRA:         saToRA.Round(2),
		OAToRA:         oaToRA.Round(2),
		MAOverflowToRA: maOverflowToRA.Round(2),

		// Final balances
		FinalOA: oa.Round(2),
		FinalSA: sa.Round(2),
		FinalMA: ma.Round(2),
		FinalRA: ra.Round(2),

		// Status
		MeetsTarget:     meetsTarget,
		CPFLifeEligible: cpfLifeEligible,

		// Withdrawable
		WithdrawableOA: oa.Round(2),

		// Target details
		TargetScheme: input.TargetScheme,
		TargetAmount: targetAmount.Round(2),
	}, nil
}

// validateConversionInput validates the conversion input.
func validateConversionInput(input ConversionInput) error {
	// Validate target scheme
	switch input.TargetScheme {
	case TargetBRS, TargetFRS, TargetERS:
		// Valid
	default:
		return ErrInvalidTargetScheme
	}

	// Validate retirement sums are provided
	if input.BRS == nil || input.FRS == nil || input.ERS == nil {
		return ErrMissingRetirementSums
	}

	// Validate balances are not negative
	if input.OABalance != nil && input.OABalance.IsNegative() {
		return ErrNegativeBalance
	}
	if input.SABalance != nil && input.SABalance.IsNegative() {
		return ErrNegativeBalance
	}
	if input.MABalance != nil && input.MABalance.IsNegative() {
		return ErrNegativeBalance
	}

	return nil
}

// getTargetAmount returns the target amount based on the scheme.
func getTargetAmount(input ConversionInput) *decimal.Decimal {
	switch input.TargetScheme {
	case TargetBRS:
		return input.BRS
	case TargetFRS:
		return input.FRS
	case TargetERS:
		return input.ERS
	default:
		return input.FRS // Default to FRS
	}
}

// cloneOrZero returns a copy of the decimal or zero if nil.
func cloneOrZero(d *decimal.Decimal) *decimal.Decimal {
	if d == nil {
		return decimal.Zero()
	}
	return decimal.Zero().Add(d)
}
