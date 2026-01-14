package projector

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/decimal"
)

// Projector projects CPF balances to a future date
type Projector struct{}

// New creates a new Projector instance
func New() *Projector {
	return &Projector{}
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
	// Initialize running balances from snapshot
	oa := cloneOrZero(account.OABalance)
	sa := cloneOrZero(account.SABalance)
	ma := cloneOrZero(account.MABalance)
	ra := cloneOrZero(account.RABalance)

	// Track contributions and interest separately for transparency
	totalContribOA := decimal.Zero()
	totalInterestOA := decimal.Zero()

	// Initialize YTD wage tracking
	ytdOW := decimal.Zero()
	ytdAW := decimal.Zero()
	currentYear := account.AsOfDate.Year()

	// Convert residency string to config type
	residency := parseResidency(account.ResidencyStatus)

	// Iterate month by month
	current := firstOfMonth(account.AsOfDate)
	target := firstOfMonth(targetDate)

	// If target is before or equal to current, return current balances
	if !target.After(current) {
		return &ProjectedBalances{
			OA:              oa,
			SA:              sa,
			MA:              ma,
			RA:              ra,
			AsOfDate:        targetDate,
			ContributionsOA: totalContribOA,
			InterestOA:      totalInterestOA,
		}, nil
	}

	// Move to next month to start projection (don't double-count current month)
	current = current.AddDate(0, 1, 0)

	for !current.After(target) {
		// Reset YTD at year boundary
		if current.Year() != currentYear {
			ytdOW = decimal.Zero()
			ytdAW = decimal.Zero()
			currentYear = current.Year()
		}

		// Get config for this date
		cfg, err := config.GetByDate(current)
		if err != nil {
			// Fall back to latest available config
			cfg, err = config.GetByYear(2025)
			if err != nil {
				return nil, err
			}
		}

		// Create calculator with config
		calc := contribution.NewCalculator(&cfg.Config)

		// Calculate age at this date
		age := ageAt(account.DateOfBirth, current)

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
				result = calc.CalculateAW(income.MonthlyAmount, age, residency, ytdOW, ytdAW)
				// Update YTD AW
				if result.CappedWage != nil {
					ytdAW = ytdAW.Add(result.CappedWage)
				}
			} else {
				// Default to OW
				result = calc.CalculateOW(income.MonthlyAmount, age, residency)
				// Update YTD OW
				if result.CappedWage != nil {
					ytdOW = ytdOW.Add(result.CappedWage)
				}
			}

			// Add allocations to balances
			if result.Allocation.OA != nil {
				oa = oa.Add(result.Allocation.OA)
				totalContribOA = totalContribOA.Add(result.Allocation.OA)
			}
			if result.Allocation.SA != nil {
				sa = sa.Add(result.Allocation.SA)
			}
			if result.Allocation.MA != nil {
				ma = ma.Add(result.Allocation.MA)
			}
			if result.Allocation.RA != nil {
				ra = ra.Add(result.Allocation.RA)
			}
		}

		// Get interest rates from assumptions (or use defaults)
		oaRatePct, saRatePct, maRatePct, raRatePct := getInterestRates(assumptions)

		// Apply monthly base interest using the growth module
		oaInterest := CalculateMonthlyInterest(oa, oaRatePct)
		saInterest := CalculateMonthlyInterest(sa, saRatePct)
		maInterest := CalculateMonthlyInterest(ma, maRatePct)
		raInterest := CalculateMonthlyInterest(ra, raRatePct)

		oa = oa.Add(oaInterest)
		sa = sa.Add(saInterest)
		ma = ma.Add(maInterest)
		ra = ra.Add(raInterest)
		totalInterestOA = totalInterestOA.Add(oaInterest)

		// Apply extra interest on first $60k (and additional for 55+)
		extraResult := CalculateExtraInterest(oa, sa, ma, ra, age, assumptions)
		if extraResult.Amount != nil && !extraResult.Amount.IsZero() {
			if extraResult.CreditTo == "ra" {
				ra = ra.Add(extraResult.Amount)
			} else {
				sa = sa.Add(extraResult.Amount)
			}
		}

		// Move to next month
		current = current.AddDate(0, 1, 0)
	}

	return &ProjectedBalances{
		OA:              oa.Round(2),
		SA:              sa.Round(2),
		MA:              ma.Round(2),
		RA:              ra.Round(2),
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
	// Initialize running balances from snapshot
	oa := cloneOrZero(account.OABalance)
	sa := cloneOrZero(account.SABalance)
	ma := cloneOrZero(account.MABalance)

	// For RA, only use the stored value if the person is already 55 or older.
	// Before age 55, RA should be 0 (RA formation happens at 55).
	currentAge := ageAt(account.DateOfBirth, account.AsOfDate)
	var ra *decimal.Decimal
	if currentAge >= 55 {
		ra = cloneOrZero(account.RABalance)
	} else {
		// Person is under 55, RA should be 0 (will be formed at age 55)
		ra = decimal.Zero()
	}


	// Track yearly contributions and interest
	yearlyContrib := decimal.Zero()
	yearlyInterest := decimal.Zero()

	// CPF LIFE payout tracking
	var monthlyPayout *decimal.Decimal  // Monthly payout amount (calculated at payout start age)
	yearlyPayout := decimal.Zero()      // Payouts received this year
	cumulativePayouts := decimal.Zero() // Total payouts received to date
	payoutsStarted := false             // Whether CPF LIFE payouts have begun

	// Validate payout start age (default to 65 if invalid)
	if payoutStartAge < 65 || payoutStartAge > 70 {
		payoutStartAge = 65
	}

	// Initialize YTD wage tracking
	ytdOW := decimal.Zero()
	ytdAW := decimal.Zero()

	// Convert residency string to config type
	residency := parseResidency(account.ResidencyStatus)

	// Calculate projection range
	// (currentAge already calculated above for RA initialization)
	startYear := account.AsOfDate.Year()
	endAge := 100 // Project to age 100 for full lifetime view

	// Track whether RA has been formed
	raFormed := ra != nil && !ra.IsZero()

	// Result containers
	snapshots := make([]YearlySnapshot, 0)
	var age55Balances, age65Balances *ProjectedBalances

	// Iterate year by year
	currentYear := startYear
	current := firstOfMonth(account.AsOfDate).AddDate(0, 1, 0) // Start next month

	for {
		age := ageAt(account.DateOfBirth, current)
		if age > endAge {
			break
		}

		// Reset yearly tracking at year boundary
		if current.Year() != currentYear {
			// Capture snapshot for the completed year
			total := oa.Add(sa).Add(ma).Add(ra)
			snapshot := YearlySnapshot{
				Year:          currentYear,
				Age:           ageAt(account.DateOfBirth, time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC)),
				OA:            oa.Round(2),
				SA:            sa.Round(2),
				MA:            ma.Round(2),
				RA:            ra.Round(2),
				Total:         total.Round(2),
				Contributions: yearlyContrib.Round(2),
				Interest:      yearlyInterest.Round(2),
			}

			// Add payout tracking if payouts have started
			if payoutsStarted {
				snapshot.MonthlyPayout = monthlyPayout
				snapshot.YearlyPayout = yearlyPayout.Round(2)
				snapshot.CumulativePayouts = cumulativePayouts.Round(2)
			}

			snapshots = append(snapshots, snapshot)

			// Check for age milestones
			snapshotAge := ageAt(account.DateOfBirth, time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC))
			if snapshotAge == 55 && age55Balances == nil {
				age55Balances = &ProjectedBalances{
					OA:       oa.Round(2),
					SA:       sa.Round(2),
					MA:       ma.Round(2),
					RA:       ra.Round(2),
					AsOfDate: time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC),
				}
			}
			if snapshotAge == 65 && age65Balances == nil {
				age65Balances = &ProjectedBalances{
					OA:       oa.Round(2),
					SA:       sa.Round(2),
					MA:       ma.Round(2),
					RA:       ra.Round(2),
					AsOfDate: time.Date(currentYear, 12, 31, 0, 0, 0, 0, time.UTC),
				}
			}

			// Reset yearly tracking
			currentYear = current.Year()
			yearlyContrib = decimal.Zero()
			yearlyInterest = decimal.Zero()
			yearlyPayout = decimal.Zero() // Reset yearly payout for new year
			ytdOW = decimal.Zero()
			ytdAW = decimal.Zero()
		}

		// RA formation at age 55
		if age == 55 && !raFormed {
			// Calculate FRS for this year (using 2026 base)
			yearsFromBase := current.Year() - 2026
			if yearsFromBase < 0 {
				yearsFromBase = 0
			}
			growthFactor, _ := decimal.MustFromFloat64(1 + retirementSumGrowthRate).Pow(decimal.NewFromInt64(int64(yearsFromBase), 0))
			frs := decimal.NewFromInt64(frs2026, 0).Mul(growthFactor)

			// Transfer from SA first, then OA if needed
			saTransfer := sa
			if sa.Cmp(frs) > 0 {
				saTransfer = frs
			}
			remaining := frs.Sub(saTransfer)
			oaTransfer := decimal.Zero()
			if remaining.Cmp(decimal.Zero()) > 0 && oa.Cmp(decimal.Zero()) > 0 {
				oaTransfer = oa
				if oa.Cmp(remaining) > 0 {
					oaTransfer = remaining
				}
			}

			ra = ra.Add(saTransfer).Add(oaTransfer)
			sa = sa.Sub(saTransfer)
			oa = oa.Sub(oaTransfer)
			raFormed = true
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

		// Only contribute if still employed
		if age <= retirementAge {
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
					result = calc.CalculateAW(income.MonthlyAmount, age, residency, ytdOW, ytdAW)
					if result.CappedWage != nil {
						ytdAW = ytdAW.Add(result.CappedWage)
					}
				} else {
					result = calc.CalculateOW(income.MonthlyAmount, age, residency)
					if result.CappedWage != nil {
						ytdOW = ytdOW.Add(result.CappedWage)
					}
				}

				// Add allocations to balances
				if result.Allocation.OA != nil {
					oa = oa.Add(result.Allocation.OA)
					yearlyContrib = yearlyContrib.Add(result.Allocation.OA)
				}
				if result.Allocation.SA != nil {
					sa = sa.Add(result.Allocation.SA)
					yearlyContrib = yearlyContrib.Add(result.Allocation.SA)
				}
				if result.Allocation.MA != nil {
					ma = ma.Add(result.Allocation.MA)
					yearlyContrib = yearlyContrib.Add(result.Allocation.MA)
				}
				// Note: RA contributions start at 55+ when SA allocation goes to RA
				if age >= 55 && result.Allocation.SA != nil {
					// SA contributions redirect to RA after 55
					ra = ra.Add(result.Allocation.SA)
					sa = sa.Sub(result.Allocation.SA) // Undo the SA addition above
				}
			}
		}

		// Get interest rates from assumptions (or use defaults)
		oaRatePct, saRatePct, maRatePct, raRatePct := getInterestRates(assumptions)

		// Apply monthly base interest
		// Note: Once CPF LIFE payouts start, RA no longer earns separate interest
		// (the RA becomes the premium pool for the annuity)
		oaInterest := CalculateMonthlyInterest(oa, oaRatePct)
		saInterest := CalculateMonthlyInterest(sa, saRatePct)
		maInterest := CalculateMonthlyInterest(ma, maRatePct)

		oa = oa.Add(oaInterest)
		sa = sa.Add(saInterest)
		ma = ma.Add(maInterest)
		yearlyInterest = yearlyInterest.Add(oaInterest).Add(saInterest).Add(maInterest)

		// RA only earns interest BEFORE CPF LIFE payouts start
		if !payoutsStarted {
			raInterest := CalculateMonthlyInterest(ra, raRatePct)
			ra = ra.Add(raInterest)
			yearlyInterest = yearlyInterest.Add(raInterest)

			// Apply extra interest on first $60k (and additional for 55+)
			// Once payouts start, extra interest goes to SA instead of RA
			extraResult := CalculateExtraInterest(oa, sa, ma, ra, age, assumptions)
			if extraResult.Amount != nil && !extraResult.Amount.IsZero() {
				if extraResult.CreditTo == "ra" {
					ra = ra.Add(extraResult.Amount)
				} else {
					sa = sa.Add(extraResult.Amount)
				}
				yearlyInterest = yearlyInterest.Add(extraResult.Amount)
			}
		} else {
			// After CPF LIFE starts, extra interest (if any) goes to OA
			// (SA is typically 0 by this point, RA is premium pool)
			extraResult := CalculateExtraInterest(oa, sa, ma, decimal.Zero(), age, assumptions)
			if extraResult.Amount != nil && !extraResult.Amount.IsZero() {
				oa = oa.Add(extraResult.Amount)
				yearlyInterest = yearlyInterest.Add(extraResult.Amount)
			}
		}

		// CPF LIFE payout logic - starts at payoutStartAge
		// Note: CPF LIFE is a lifelong annuity - payouts continue even after RA is depleted
		if age >= payoutStartAge {
			// Calculate payout amount once when payouts start
			if !payoutsStarted && ra != nil && !ra.IsZero() {
				// Determine gender for payout calculation
				gender := payout.GenderMale
				if account.Gender == "female" {
					gender = payout.GenderFemale
				}

				// Calculate CPF LIFE payout using Standard plan (most common)
				payoutInput := payout.PayoutInput{
					BirthYear:      account.DateOfBirth.Year(),
					Gender:         gender,
					Plan:           payout.PlanStandard,
					RABalanceAt65:  ra, // Use RA balance at payout start age
					PayoutStartAge: payoutStartAge,
				}
				payoutResult, err := payout.CalculatePayout(payoutInput)
				if err == nil && payoutResult.MonthlyPayout != nil {
					monthlyPayout = payoutResult.MonthlyPayout
				}
				payoutsStarted = true
			}

			// Track and deduct monthly payout (CPF LIFE is lifelong)
			if monthlyPayout != nil && !monthlyPayout.IsZero() {
				// Deduct from RA only if RA has balance remaining
				if ra != nil && !ra.IsZero() {
					if ra.Cmp(monthlyPayout) >= 0 {
						ra = ra.Sub(monthlyPayout)
					} else {
						// RA is depleted, take whatever is left
						ra = decimal.Zero()
					}
				}
				// Always track payouts (lifelong annuity continues regardless of RA balance)
				yearlyPayout = yearlyPayout.Add(monthlyPayout)
				cumulativePayouts = cumulativePayouts.Add(monthlyPayout)
			}
		}

		// Move to next month
		current = current.AddDate(0, 1, 0)
	}

	// Capture final year snapshot if not yet captured
	if len(snapshots) == 0 || snapshots[len(snapshots)-1].Year != currentYear-1 {
		total := oa.Add(sa).Add(ma).Add(ra)
		snapshot := YearlySnapshot{
			Year:          currentYear - 1,
			Age:           ageAt(account.DateOfBirth, time.Date(currentYear-1, 12, 31, 0, 0, 0, 0, time.UTC)),
			OA:            oa.Round(2),
			SA:            sa.Round(2),
			MA:            ma.Round(2),
			RA:            ra.Round(2),
			Total:         total.Round(2),
			Contributions: yearlyContrib.Round(2),
			Interest:      yearlyInterest.Round(2),
		}

		// Add payout tracking if payouts have started
		if payoutsStarted {
			snapshot.MonthlyPayout = monthlyPayout
			snapshot.YearlyPayout = yearlyPayout.Round(2)
			snapshot.CumulativePayouts = cumulativePayouts.Round(2)
		}

		snapshots = append(snapshots, snapshot)
	}

	// Calculate retirement sums at age 55 (using 2026 base values)
	// Project from 2026 to the year when user turns 55
	yearsToAge55 := 55 - currentAge
	if yearsToAge55 < 0 {
		yearsToAge55 = 0
	}
	yearAt55 := startYear + yearsToAge55
	yearsFrom2026 := yearAt55 - 2026
	if yearsFrom2026 < 0 {
		yearsFrom2026 = 0
	}
	growthExp := decimal.NewFromInt64(int64(yearsFrom2026), 0)
	growthFactorAt55, _ := decimal.MustFromFloat64(1 + retirementSumGrowthRate).Pow(growthExp)
	brsAt55 := decimal.NewFromInt64(brs2026, 0).Mul(growthFactorAt55)
	frsAt55 := decimal.NewFromInt64(frs2026, 0).Mul(growthFactorAt55)
	ersAt55 := decimal.NewFromInt64(ers2026, 0).Mul(growthFactorAt55)

	// BHS (Basic Healthcare Sum) - use official 2026 value with ~4% annual growth projection
	yearsFromBHS2026 := startYear - 2026
	if yearsFromBHS2026 < 0 {
		yearsFromBHS2026 = 0
	}
	bhsGrowthFactor, _ := decimal.MustFromFloat64(1.04).Pow(decimal.NewFromInt64(int64(yearsFromBHS2026), 0))
	currentBHS := decimal.NewFromInt64(bhs2026, 0).Mul(bhsGrowthFactor)

	return &BalanceProjection{
		Snapshots:            snapshots,
		Age55Balances:        age55Balances,
		Age65Balances:        age65Balances,
		FRSAtAge55:           frsAt55.Round(0),
		BRSAtAge55:           brsAt55.Round(0),
		ERSAtAge55:           ersAt55.Round(0),
		BHS:                  currentBHS.Round(0),
		CPFLifeMonthlyPayout: monthlyPayout,
	}, nil
}

// Helper functions

func firstOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func ageAt(dob, date time.Time) int {
	age := date.Year() - dob.Year()
	// Adjust if birthday hasn't occurred yet this year
	dobThisYear := time.Date(date.Year(), dob.Month(), dob.Day(), 0, 0, 0, 0, dob.Location())
	if date.Before(dobThisYear) {
		age--
	}
	return age
}

func isActiveAt(income IncomeStream, date time.Time) bool {
	// Check if income has started
	if date.Before(income.StartDate) {
		return false
	}
	// Check if income has ended
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
	// Create a copy to avoid mutating the original
	return decimal.Zero().Add(d)
}
