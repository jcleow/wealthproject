package engine

import (
	"time"

	"financial-chat-system/backend/internal/cpf/retirement"
	"financial-chat-system/backend/internal/decimal"
)

// RAFormationAge is the age at which the Retirement Account (RA) is formed.
// At age 55, CPF creates the RA by transferring funds from SA/OA.
// Reference: https://www.cpf.gov.sg/member/retirement-income/retirement-withdrawals/cpf-retirement-sum
const RAFormationAge = 55

// RetirementFormationResult contains the outcome of RA formation at age 55.
type RetirementFormationResult struct {
	// Transfer amounts
	SAToRA         *decimal.Decimal // Amount transferred from SA to RA
	OAToRA         *decimal.Decimal // Amount transferred from OA to RA
	MAOverflowToRA *decimal.Decimal // MA excess transferred to RA

	// Status
	TargetAmount    *decimal.Decimal         // The target retirement sum used
	TargetScheme    retirement.TargetScheme  // BRS/FRS/ERS
	MeetsTarget     bool                     // Whether target was met
	CPFLifeEligible bool                     // RA >= $60,000
	WithdrawableOA  *decimal.Decimal         // OA that can be withdrawn
}

// ShouldFormRA checks if RA should be formed this month.
// Returns true if age is RAFormationAge (55) and RA hasn't been formed yet.
func ShouldFormRA(state *CPFState, date time.Time) bool {
	age := state.AgeAt(date)
	return age == RAFormationAge && !state.RAFormed
}

// FormRetirementAccount performs the Age 55 RA formation.
// Modifies state in place and sets RAFormed = true.
// Uses retirement.CalculateConversion() internally for the calculation.
func FormRetirementAccount(
	state *CPFState,
	targetScheme retirement.TargetScheme,
	assumptions *Assumptions,
	date time.Time,
) (*RetirementFormationResult, error) {
	if assumptions == nil {
		assumptions = DefaultAssumptions()
	}

	// Calculate retirement sums for the year
	year := date.Year()
	brs := assumptions.GetRetirementSum("brs", year)
	frs := assumptions.GetRetirementSum("frs", year)
	ers := assumptions.GetRetirementSum("ers", year)
	bhs := assumptions.GetBHS(year)

	// Prepare conversion input
	input := retirement.ConversionInput{
		OABalance:    state.OA,
		SABalance:    state.SA,
		MABalance:    state.MA,
		TargetScheme: targetScheme,
		BRS:          brs,
		FRS:          frs,
		ERS:          ers,
		BHS:          bhs,
	}

	// Calculate conversion
	result, err := retirement.CalculateConversion(input)
	if err != nil {
		return nil, err
	}

	// Update state with new balances
	state.OA = result.FinalOA
	state.SA = result.FinalSA
	state.MA = result.FinalMA
	state.RA = result.FinalRA
	state.RAFormed = true

	return &RetirementFormationResult{
		SAToRA:          result.SAToRA,
		OAToRA:          result.OAToRA,
		MAOverflowToRA:  result.MAOverflowToRA,
		TargetAmount:    result.TargetAmount,
		TargetScheme:    result.TargetScheme,
		MeetsTarget:     result.MeetsTarget,
		CPFLifeEligible: result.CPFLifeEligible,
		WithdrawableOA:  result.WithdrawableOA,
	}, nil
}

// RedirectContributionToRA redirects the SA portion of a contribution to RA.
// After age 55, CPF stops allocating to SA - instead, contributions that would
// normally go to SA are redirected to the RA (Retirement Account). This function
// handles that redirection for each monthly contribution.
// Modifies state in place: subtracts from SA, adds to RA.
// Returns the redirected amount.
func RedirectContributionToRA(
	state *CPFState,
	saContribution *decimal.Decimal,
	age int,
) *decimal.Decimal {
	// Only redirect for age 55+ (after RA is formed)
	if age < RAFormationAge {
		return decimal.Zero()
	}

	// If no SA contribution, nothing to redirect
	if saContribution == nil || saContribution.IsZero() {
		return decimal.Zero()
	}

	// Redirect SA contribution to RA
	// Note: The contribution was already added to SA by the contribution calculator
	// So we need to subtract from SA and add to RA
	state.SA = state.SA.Sub(saContribution)
	state.RA = state.RA.Add(saContribution)

	return saContribution
}
