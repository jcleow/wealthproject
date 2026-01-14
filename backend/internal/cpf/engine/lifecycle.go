package engine

import (
	"time"

	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/cpf/retirement"
	"financial-chat-system/backend/internal/decimal"
)

// MonthlyResult contains all calculations for a single month.
type MonthlyResult struct {
	// Interest applied
	Interest *InterestResult

	// RA formation (if occurred this month)
	RAFormation *RetirementFormationResult

	// Payout (if active)
	PayoutAmount      *decimal.Decimal      // Amount received this month
	PayoutActivated   bool                  // Whether payouts started this month
	PayoutActivation  *PayoutActivationResult // Details if activated

	// Contributions added this month
	TotalContributions *decimal.Decimal
	SARedirectedToRA   *decimal.Decimal // SA contribution redirected to RA (age 55+)

	// State snapshot after all operations
	EndOfMonthState *CPFState
}

// ProcessMonthOptions configures monthly processing.
type ProcessMonthOptions struct {
	// Contribution settings
	ApplyContributions bool                             // Whether to add contributions to balances
	Contributions      []contribution.ContributionResult // Contributions for this month

	// Retirement settings
	TargetScheme retirement.TargetScheme // BRS/FRS/ERS target at age 55 (default: FRS)

	// Payout settings
	PayoutStartAge int         // Age to start CPF LIFE (65-70, default: 65)
	PayoutPlan     payout.Plan // CPF LIFE plan choice (default: standard)

	// Custom assumptions (nil = use defaults)
	Assumptions *Assumptions

	// Previous year for YTD reset detection
	PreviousYear int // The year of the previous month (0 = unknown, will not reset YTD)
}

// ProcessMonth applies all monthly CPF calculations in the correct order:
// 1. Year boundary YTD reset (if applicable)
// 2. RA formation check (at age 55)
// 3. Apply contributions (with SA->RA redirect if age >= 55)
// 4. Apply interest (base + extra)
// 5. CPF LIFE payout check and application (at/after payoutStartAge)
//
// This is the main entry point for both projector and timeline service.
func ProcessMonth(
	state *CPFState,
	date time.Time,
	opts ProcessMonthOptions,
) (*MonthlyResult, error) {
	// Use defaults if not provided
	if opts.Assumptions == nil {
		opts.Assumptions = DefaultAssumptions()
	}
	if opts.TargetScheme == "" {
		opts.TargetScheme = retirement.TargetFRS
	}
	if opts.PayoutStartAge < 65 || opts.PayoutStartAge > 70 {
		opts.PayoutStartAge = 65
	}
	if opts.PayoutPlan == "" {
		opts.PayoutPlan = payout.PlanStandard
	}

	result := &MonthlyResult{
		TotalContributions: decimal.Zero(),
		SARedirectedToRA:   decimal.Zero(),
	}

	// Update state's AsOfDate to current date
	state.AsOfDate = date

	// Step 1: Reset YTD at year boundary
	if opts.PreviousYear > 0 && date.Year() != opts.PreviousYear {
		state.ResetYTD()
	}

	// Get current age
	age := state.AgeAt(date)

	// Step 2: RA formation at age 55
	if ShouldFormRA(state, date) {
		raResult, err := FormRetirementAccount(state, opts.TargetScheme, opts.Assumptions, date)
		if err != nil {
			return nil, err
		}
		result.RAFormation = raResult
	}

	// Step 3: Apply contributions (if any)
	if opts.ApplyContributions && len(opts.Contributions) > 0 {
		for _, contrib := range opts.Contributions {
			// Add allocations to balances
			if contrib.Allocation.OA != nil {
				state.OA = state.OA.Add(contrib.Allocation.OA)
				result.TotalContributions = result.TotalContributions.Add(contrib.Allocation.OA)
			}
			if contrib.Allocation.SA != nil {
				state.SA = state.SA.Add(contrib.Allocation.SA)
				result.TotalContributions = result.TotalContributions.Add(contrib.Allocation.SA)

				// For age 55+, redirect SA contribution to RA
				if age >= 55 {
					redirected := RedirectContributionToRA(state, contrib.Allocation.SA, age)
					result.SARedirectedToRA = result.SARedirectedToRA.Add(redirected)
				}
			}
			if contrib.Allocation.MA != nil {
				state.MA = state.MA.Add(contrib.Allocation.MA)
				result.TotalContributions = result.TotalContributions.Add(contrib.Allocation.MA)
			}
			if contrib.Allocation.RA != nil {
				state.RA = state.RA.Add(contrib.Allocation.RA)
				result.TotalContributions = result.TotalContributions.Add(contrib.Allocation.RA)
			}

			// Update YTD tracking
			if contrib.CappedWage != nil {
				state.YTDOrdinaryWages = state.YTDOrdinaryWages.Add(contrib.CappedWage)
			}
		}
	}

	// Step 4: Apply interest (base + extra)
	interestResult := ApplyMonthlyInterest(state, opts.Assumptions)
	result.Interest = interestResult

	// Step 5: CPF LIFE payout
	if age >= opts.PayoutStartAge {
		if !state.PayoutsActive && state.RA != nil && !state.RA.IsZero() {
			// Activate payouts
			payoutResult, err := ActivateCPFLifePayouts(state, opts.PayoutPlan, opts.PayoutStartAge)
			if err == nil && payoutResult != nil {
				result.PayoutActivated = true
				result.PayoutActivation = payoutResult
			}
		}

		// Apply monthly payout
		if state.PayoutsActive {
			result.PayoutAmount = ApplyMonthlyPayout(state)
		}
	}

	// Capture end of month state
	result.EndOfMonthState = state.Clone()

	return result, nil
}

// ProcessMonthSimple is a simplified version of ProcessMonth for basic projections.
// It only applies interest and does not handle contributions or payouts.
func ProcessMonthSimple(
	state *CPFState,
	date time.Time,
	assumptions *Assumptions,
) *InterestResult {
	if assumptions == nil {
		assumptions = DefaultAssumptions()
	}
	state.AsOfDate = date
	return ApplyMonthlyInterest(state, assumptions)
}
