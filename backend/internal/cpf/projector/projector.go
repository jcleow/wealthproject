package projector

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/decimal"
)

// Projector projects CPF balances to a future date
type Projector struct{}

// New creates a new Projector instance
func New() *Projector {
	return &Projector{}
}

// ProjectToDate calculates projected CPF balances at targetDate
// starting from the account snapshot and applying monthly contributions + interest
func (p *Projector) ProjectToDate(
	ctx context.Context,
	account AccountSnapshot,
	incomes []IncomeStream,
	targetDate time.Time,
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

		// Apply monthly interest using the growth module
		oaInterest := CalculateMonthlyInterest(oa, OAInterestRatePct)
		saInterest := CalculateMonthlyInterest(sa, SAInterestRatePct)
		maInterest := CalculateMonthlyInterest(ma, MAInterestRatePct)
		raInterest := CalculateMonthlyInterest(ra, RAInterestRatePct)

		oa = oa.Add(oaInterest)
		sa = sa.Add(saInterest)
		ma = ma.Add(maInterest)
		ra = ra.Add(raInterest)
		totalInterestOA = totalInterestOA.Add(oaInterest)

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
