package projector

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/cpf/engine"
	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/cpf/retirement"
	"financial-chat-system/backend/internal/decimal"
)

// Projector projects CPF balances to a future date
type Projector struct{}

// New creates a new Projector instance
func New() *Projector {
	return &Projector{}
}

// convertToEngineAssumptions converts ProjectionAssumptions to engine.Assumptions
func convertToEngineAssumptions(pa *ProjectionAssumptions) *engine.Assumptions {
	if pa == nil {
		return engine.DefaultAssumptions()
	}

	base := engine.DefaultAssumptions()

	// Override with provided values (converting percentage to decimal if needed)
	if pa.InterestRateOA != nil {
		base.InterestRateOA = convertPercentageToDecimal(pa.InterestRateOA)
	}
	if pa.InterestRateSA != nil {
		base.InterestRateSA = convertPercentageToDecimal(pa.InterestRateSA)
	}
	if pa.InterestRateMA != nil {
		base.InterestRateMA = convertPercentageToDecimal(pa.InterestRateMA)
	}
	if pa.InterestRateRA != nil {
		base.InterestRateRA = convertPercentageToDecimal(pa.InterestRateRA)
	}
	if pa.ExtraInterestFirst60K != nil {
		base.ExtraInterestFirst60K = convertPercentageToDecimal(pa.ExtraInterestFirst60K)
	}
	if pa.ExtraInterestFirst30KAbove55 != nil {
		base.ExtraInterestFirst30KAbove55 = convertPercentageToDecimal(pa.ExtraInterestFirst30KAbove55)
	}
	if pa.FRSGrowthRate != nil {
		base.FRSGrowthRate = pa.FRSGrowthRate
	}

	return base
}

// convertPercentageToDecimal converts a rate from percentage (2.5) to decimal (0.025)
// if it appears to be in percentage format (>= 1).
func convertPercentageToDecimal(rate *decimal.Decimal) *decimal.Decimal {
	if rate == nil {
		return nil
	}
	one := decimal.NewFromInt64(1, 0)
	if rate.Cmp(one) >= 0 {
		hundred := decimal.NewFromInt64(100, 0)
		return rate.Div(hundred)
	}
	return rate
}

// createEngineState creates an engine.CPFState from an AccountSnapshot
func createEngineState(account AccountSnapshot) *engine.CPFState {
	residency := parseResidency(account.ResidencyStatus)
	return engine.NewCPFState(
		account.OABalance,
		account.SABalance,
		account.MABalance,
		account.RABalance,
		account.DateOfBirth,
		account.Gender,
		residency,
		account.AsOfDate,
	)
}

// ProjectToDate calculates projected CPF balances at targetDate
// starting from the account snapshot and applying monthly contributions + interest.
// If assumptions is nil, official CPF rates are used.
func (p *Projector) ProjectToDate(
	ctx context.Context,
	account AccountSnapshot,
	incomes []IncomeStream,
	targetDate time.Time,
	assumptions *ProjectionAssumptions,
) (*ProjectedBalances, error) {
	// Create engine state from snapshot
	state := createEngineState(account)
	engineAssumptions := convertToEngineAssumptions(assumptions)

	// Track contributions and interest separately for transparency
	totalContribOA := decimal.Zero()
	totalInterestOA := decimal.Zero()

	// Convert residency string to config type
	residency := parseResidency(account.ResidencyStatus)

	// Iterate month by month
	current := firstOfMonth(account.AsOfDate)
	target := firstOfMonth(targetDate)

	// If target is before or equal to current, return current balances
	if !target.After(current) {
		return &ProjectedBalances{
			OA:              cloneOrZero(state.OA),
			SA:              cloneOrZero(state.SA),
			MA:              cloneOrZero(state.MA),
			RA:              cloneOrZero(state.RA),
			AsOfDate:        targetDate,
			ContributionsOA: totalContribOA,
			InterestOA:      totalInterestOA,
		}, nil
	}

	// Move to next month to start projection (don't double-count current month)
	previousYear := current.Year()
	current = current.AddDate(0, 1, 0)

	for !current.After(target) {
		// Get config for this date
		cfg, err := config.GetByDate(current)
		if err != nil {
			cfg, err = config.GetByYear(2025)
			if err != nil {
				return nil, err
			}
		}

		// Create calculator with config
		calc := contribution.NewCalculator(&cfg.Config)

		// Calculate age at this date
		age := state.AgeAt(current)

		// Collect contributions for this month
		var contributions []contribution.ContributionResult

		// Process each active income
		for _, income := range incomes {
			if !isActiveAt(income, current) {
				continue
			}
			if income.MonthlyAmount == nil || income.MonthlyAmount.IsZero() {
				continue
			}

			// Calculate contribution based on wage type
			var result contribution.ContributionResult
			if income.WageType == "aw" {
				result = calc.CalculateAW(income.MonthlyAmount, age, residency, state.YTDOrdinaryWages, state.YTDAdditionalWages)
				if result.CappedWage != nil {
					state.YTDAdditionalWages = state.YTDAdditionalWages.Add(result.CappedWage)
				}
			} else {
				result = calc.CalculateOW(income.MonthlyAmount, age, residency)
				if result.CappedWage != nil {
					state.YTDOrdinaryWages = state.YTDOrdinaryWages.Add(result.CappedWage)
				}
			}

			// Track OA contributions separately
			if result.Allocation.OA != nil {
				totalContribOA = totalContribOA.Add(result.Allocation.OA)
			}

			contributions = append(contributions, result)
		}

		// Use engine.ProcessMonth for consistent calculation
		monthResult, err := engine.ProcessMonth(state, current, engine.ProcessMonthOptions{
			ApplyContributions: true,
			Contributions:      contributions,
			Assumptions:        engineAssumptions,
			PreviousYear:       previousYear,
		})
		if err != nil {
			return nil, err
		}

		// Track OA interest
		if monthResult.Interest != nil && monthResult.Interest.BaseInterestOA != nil {
			totalInterestOA = totalInterestOA.Add(monthResult.Interest.BaseInterestOA)
		}

		// Move to next month
		previousYear = current.Year()
		current = current.AddDate(0, 1, 0)
	}

	return &ProjectedBalances{
		OA:              state.OA.Round(2),
		SA:              state.SA.Round(2),
		MA:              state.MA.Round(2),
		RA:              state.RA.Round(2),
		AsOfDate:        targetDate,
		ContributionsOA: totalContribOA.Round(2),
		InterestOA:      totalInterestOA.Round(2),
	}, nil
}

// FRS/BRS/ERS values for 2026 (base year)
// From 2025 onwards: ERS = 4x BRS (previously 3x)
// Official values: https://www.cpf.gov.sg/service/article/what-are-the-retirement-sums-basic-retirement-sum-brs-full-retirement-sum-frs-and-enhanced-retirement-sum-ers
const (
	brs2026 = 110200
	frs2026 = 220400
	ers2026 = 440800 // 4x BRS from 2025 onwards
	// Retirement sums grow at approximately 3.5% per year
	retirementSumGrowthRate = 0.035
	// BHS (Basic Healthcare Sum) - official 2026 value
	bhs2026 = 79000
)

// ProjectBalances calculates year-by-year CPF projections for charting.
// Projects from current date until age 100.
// If assumptions is nil, official CPF rates are used.
// After payoutStartAge (65-70), CPF LIFE payouts are deducted from RA.
func (p *Projector) ProjectBalances(
	ctx context.Context,
	account AccountSnapshot,
	incomes []IncomeStream,
	retirementAge int, // Age at which contributions stop
	payoutStartAge int, // Age at which CPF LIFE payouts begin (65-70)
	assumptions *ProjectionAssumptions,
) (*BalanceProjection, error) {
	// Create engine state from snapshot
	state := createEngineState(account)
	engineAssumptions := convertToEngineAssumptions(assumptions)

	// For RA, only use the stored value if the person is already 55 or older.
	// Before age 55, RA should be 0 (RA formation happens at 55).
	currentAge := state.AgeAt(account.AsOfDate)
	if currentAge < 55 {
		state.RA = decimal.Zero()
		state.RAFormed = false
	}

	// Track yearly contributions and interest
	yearlyContrib := decimal.Zero()
	yearlyInterest := decimal.Zero()

	// CPF LIFE payout tracking
	yearlyPayout := decimal.Zero()

	// Validate payout start age (default to 65 if invalid)
	if payoutStartAge < 65 || payoutStartAge > 70 {
		payoutStartAge = 65
	}

	// Convert residency string to config type
	residency := parseResidency(account.ResidencyStatus)

	// Calculate projection range
	startYear := account.AsOfDate.Year()
	endAge := 100 // Project to age 100 for full lifetime view

	// Result containers
	snapshots := make([]YearlySnapshot, 0)
	var age55Balances, age65Balances *ProjectedBalances

	// Iterate year by year
	currentYear := startYear
	previousYear := startYear
	current := firstOfMonth(account.AsOfDate).AddDate(0, 1, 0) // Start next month

	for {
		age := state.AgeAt(current)
		if age > endAge {
			break
		}

		// Reset yearly tracking at year boundary
		if current.Year() != currentYear {
			// Capture snapshot for the completed year
			total := state.TotalBalance()
			snapshot := YearlySnapshot{
				Year:          currentYear,
				Age:           state.AgeAt(time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC)),
				OA:            state.OA.Round(2),
				SA:            state.SA.Round(2),
				MA:            state.MA.Round(2),
				RA:            state.RA.Round(2),
				Total:         total.Round(2),
				Contributions: yearlyContrib.Round(2),
				Interest:      yearlyInterest.Round(2),
			}

			// Add payout tracking if payouts have started
			if state.PayoutsActive {
				snapshot.MonthlyPayout = state.MonthlyPayout
				snapshot.YearlyPayout = yearlyPayout.Round(2)
				snapshot.CumulativePayouts = state.CumulativePayouts.Round(2)
			}

			snapshots = append(snapshots, snapshot)

			// Check for age milestones
			snapshotAge := state.AgeAt(time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC))
			if snapshotAge == 55 && age55Balances == nil {
				age55Balances = &ProjectedBalances{
					OA:       state.OA.Round(2),
					SA:       state.SA.Round(2),
					MA:       state.MA.Round(2),
					RA:       state.RA.Round(2),
					AsOfDate: time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC),
				}
			}
			if snapshotAge == 65 && age65Balances == nil {
				age65Balances = &ProjectedBalances{
					OA:       state.OA.Round(2),
					SA:       state.SA.Round(2),
					MA:       state.MA.Round(2),
					RA:       state.RA.Round(2),
					AsOfDate: time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC),
				}
			}

			// Reset yearly tracking
			currentYear = current.Year()
			yearlyContrib = decimal.Zero()
			yearlyInterest = decimal.Zero()
			yearlyPayout = decimal.Zero()
		}

		// Get config for this date
		cfg, err := config.GetByDate(current)
		if err != nil {
			cfg, err = config.GetByYear(2026)
			if err != nil {
				return nil, err
			}
		}

		// Create calculator with config
		calc := contribution.NewCalculator(&cfg.Config)

		// Collect contributions for this month (only if still employed)
		var contributions []contribution.ContributionResult
		if age <= retirementAge {
			for _, income := range incomes {
				if !isActiveAt(income, current) {
					continue
				}
				if income.MonthlyAmount == nil || income.MonthlyAmount.IsZero() {
					continue
				}

				// Calculate contribution based on wage type
				var result contribution.ContributionResult
				if income.WageType == "aw" {
					result = calc.CalculateAW(income.MonthlyAmount, age, residency, state.YTDOrdinaryWages, state.YTDAdditionalWages)
				} else {
					result = calc.CalculateOW(income.MonthlyAmount, age, residency)
				}

				contributions = append(contributions, result)
			}
		}

		// Use engine.ProcessMonth for consistent calculation
		// This handles: YTD reset, RA formation, contributions, SA→RA redirect, interest, payouts
		monthResult, err := engine.ProcessMonth(state, current, engine.ProcessMonthOptions{
			ApplyContributions: len(contributions) > 0,
			Contributions:      contributions,
			TargetScheme:       retirement.TargetFRS,
			PayoutStartAge:     payoutStartAge,
			PayoutPlan:         payout.PlanStandard,
			Assumptions:        engineAssumptions,
			PreviousYear:       previousYear,
		})
		if err != nil {
			return nil, err
		}

		// Track yearly contributions
		if monthResult.TotalContributions != nil {
			yearlyContrib = yearlyContrib.Add(monthResult.TotalContributions)
		}

		// Track yearly interest
		if monthResult.Interest != nil && monthResult.Interest.TotalInterest != nil {
			yearlyInterest = yearlyInterest.Add(monthResult.Interest.TotalInterest)
		}

		// Track yearly payouts
		if monthResult.PayoutAmount != nil {
			yearlyPayout = yearlyPayout.Add(monthResult.PayoutAmount)
		}

		// Move to next month
		previousYear = current.Year()
		current = current.AddDate(0, 1, 0)
	}

	// Capture final year snapshot if not yet captured
	if len(snapshots) == 0 || snapshots[len(snapshots)-1].Year != currentYear-1 {
		total := state.TotalBalance()
		snapshot := YearlySnapshot{
			Year:          currentYear - 1,
			Age:           state.AgeAt(time.Date(currentYear-1, 12, 31, 0, 0, 0, 0, time.UTC)),
			OA:            state.OA.Round(2),
			SA:            state.SA.Round(2),
			MA:            state.MA.Round(2),
			RA:            state.RA.Round(2),
			Total:         total.Round(2),
			Contributions: yearlyContrib.Round(2),
			Interest:      yearlyInterest.Round(2),
		}

		if state.PayoutsActive {
			snapshot.MonthlyPayout = state.MonthlyPayout
			snapshot.YearlyPayout = yearlyPayout.Round(2)
			snapshot.CumulativePayouts = state.CumulativePayouts.Round(2)
		}

		snapshots = append(snapshots, snapshot)
	}

	// Calculate retirement sums at age 55 (using assumptions if available)
	yearsToAge55 := 55 - currentAge
	if yearsToAge55 < 0 {
		yearsToAge55 = 0
	}
	yearAt55 := startYear + yearsToAge55
	brsAt55 := engineAssumptions.GetRetirementSum("brs", yearAt55)
	frsAt55 := engineAssumptions.GetRetirementSum("frs", yearAt55)
	ersAt55 := engineAssumptions.GetRetirementSum("ers", yearAt55)
	currentBHS := engineAssumptions.GetBHS(startYear)

	return &BalanceProjection{
		Snapshots:            snapshots,
		Age55Balances:        age55Balances,
		Age65Balances:        age65Balances,
		FRSAtAge55:           frsAt55.Round(0),
		BRSAtAge55:           brsAt55.Round(0),
		ERSAtAge55:           ersAt55.Round(0),
		BHS:                  currentBHS.Round(0),
		CPFLifeMonthlyPayout: state.MonthlyPayout,
	}, nil
}

// Helper functions

func firstOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func isActiveAt(income IncomeStream, date time.Time) bool {
	if date.Before(income.StartDate) {
		return false
	}
	if income.EndDate != nil && date.After(*income.EndDate) {
		return false
	}
	return true
}

func parseResidency(status string) config.ResidencyStatus {
	switch status {
	case "pr_year_1":
		return config.ResidencyPRYear1
	case "pr_year_2":
		return config.ResidencyPRYear2
	case "pr_year_3_plus":
		return config.ResidencyPRYear3Plus
	default:
		return config.ResidencyCitizen
	}
}

func cloneOrZero(d *decimal.Decimal) *decimal.Decimal {
	if d == nil {
		return decimal.Zero()
	}
	return decimal.Zero().Add(d)
}

// ageAt calculates age at a given date from date of birth.
// Kept for test compatibility - use engine.CPFState.AgeAt() for production code.
func ageAt(dob, date time.Time) int {
	age := date.Year() - dob.Year()
	dobThisYear := time.Date(date.Year(), dob.Month(), dob.Day(), 0, 0, 0, 0, dob.Location())
	if date.Before(dobThisYear) {
		age--
	}
	return age
}

// CalculateMonthlyInterest calculates interest for one month.
// This is a wrapper around engine.CalculateMonthlyInterest for backwards compatibility.
func CalculateMonthlyInterest(balance, annualRatePct *decimal.Decimal) *decimal.Decimal {
	return engine.CalculateMonthlyInterest(balance, annualRatePct)
}
