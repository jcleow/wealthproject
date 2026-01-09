package projector

import (
	"math"
	"time"
)

// ProjectRange generates a multi-year CPF projection.
func ProjectRange(input ProjectionInput, years int) *ProjectionRangeResult {
	if years <= 0 {
		years = 30
	}

	projections := make([]ProjectionYear, 0, years+1)
	var milestones Milestones

	// Current state
	oa := input.OABalance
	sa := input.SABalance
	ma := input.MABalance
	ra := input.RABalance

	currentYear := input.CurrentDate.Year()
	currentAge := calculateAge(input.DateOfBirth, input.CurrentDate)
	salary := input.MonthlySalary
	bonus := input.AnnualBonus

	// Track FRS growth for age 55 RA formation
	frs := float64(input.FRS)
	brs := float64(input.BRS)
	ers := float64(input.ERS)
	bhs := float64(input.BHS)

	for i := 0; i <= years; i++ {
		year := currentYear + i
		age := currentAge + i

		// Age 55: RA formation
		if age == 55 && ra == 0 {
			// Transfer SA to RA first, then OA if needed
			saTransfer := math.Min(sa, frs)
			oaTransfer := math.Min(oa, math.Max(0, frs-saTransfer))
			ra = saTransfer + oaTransfer
			sa = sa - saTransfer
			oa = oa - oaTransfer

			milestones.Age55 = &Milestone{
				Year:     year,
				Balances: AccountBalances{OA: oa, SA: sa, MA: ma, RA: ra},
			}
		}

		// Calculate annual contribution (if still employed)
		var annualContrib, oaContrib, saContrib, maContrib float64
		if input.AssumeContinuousEmployment && age <= input.RetirementAge {
			contribResult := calculateAnnualContribution(salary, bonus, age)
			annualContrib = contribResult.total
			oaContrib = contribResult.oa
			saContrib = contribResult.sa
			maContrib = contribResult.ma
		}

		// Calculate interest
		oaInterest := oa * input.InterestRateOA
		saInterest := sa * input.InterestRateSA
		maInterest := ma * input.InterestRateMA
		raInterest := ra * input.InterestRateRA

		// Extra interest calculation
		var extraInterest float64
		if age < 55 {
			// Below 55: Extra 1% on first $60k (OA up to $20k + SA + MA + RA)
			oaForExtra := math.Min(oa, 20000)
			combined := oaForExtra + sa + ma + ra
			extraInterest = math.Min(combined, 60000) * input.ExtraInterestFirst60k
		} else {
			// Age 55+: Extra 2% on first $30k, extra 1% on next $30k
			combined := oa + sa + ma + ra
			first30k := math.Min(combined, 30000)
			next30k := math.Max(0, math.Min(combined-30000, 30000))
			extraInterest = first30k*input.ExtraInterestFirst30kAbove55 + next30k*input.ExtraInterestFirst60k
		}

		totalInterest := oaInterest + saInterest + maInterest + raInterest + extraInterest

		// Apply contributions and interest
		oa = oa + oaContrib + oaInterest
		if age < 55 {
			sa = sa + saContrib + saInterest + extraInterest
		} else {
			ra = ra + raInterest + extraInterest
		}
		ma = math.Min(ma+maContrib+maInterest, bhs)

		// Record projection year
		projections = append(projections, ProjectionYear{
			Year:          year,
			Age:           age,
			OA:            round(oa),
			SA:            round(sa),
			MA:            round(ma),
			RA:            round(ra),
			Total:         round(oa + sa + ma + ra),
			Contributions: round(annualContrib),
			Interest:      round(totalInterest),
		})

		// Record age 65 milestone
		if age == 65 {
			milestones.Age65 = &Milestone{
				Year:     year,
				Balances: AccountBalances{OA: oa, SA: sa, MA: ma, RA: ra},
			}
		}

		// Grow FRS/BRS/ERS and BHS for next year (approximately 3% per year)
		frs *= (1 + input.FRSGrowthRate)
		brs *= (1 + input.FRSGrowthRate)
		ers *= (1 + input.FRSGrowthRate)
		bhs *= (1 + input.FRSGrowthRate)

		// Grow salary for next year
		salary *= (1 + input.SalaryGrowthRate)
	}

	// Calculate CPF LIFE estimates based on RA at age 65
	var raAt65 float64
	if milestones.Age65 != nil {
		raAt65 = milestones.Age65.Balances.RA
	}

	// Get final FRS for retirement summary (FRS at age 55)
	yearsTo55 := 55 - currentAge
	if yearsTo55 < 0 {
		yearsTo55 = 0
	}
	frsAt55 := float64(input.FRS) * math.Pow(1+input.FRSGrowthRate, float64(yearsTo55))
	brsAt55 := float64(input.BRS) * math.Pow(1+input.FRSGrowthRate, float64(yearsTo55))
	ersAt55 := float64(input.ERS) * math.Pow(1+input.FRSGrowthRate, float64(yearsTo55))

	return &ProjectionRangeResult{
		Projections: projections,
		Milestones:  milestones,
		Retirement: RetirementSummary{
			FRSTarget:        round(frsAt55),
			BRSTarget:        round(brsAt55),
			ERSTarget:        round(ersAt55),
			CPFLifeEstimates: estimateCPFLife(raAt65, input.PayoutStartAge),
		},
	}
}

// contributionResult holds breakdown of contributions.
type contributionResult struct {
	total float64
	oa    float64
	sa    float64
	ma    float64
}

// calculateAnnualContribution estimates annual CPF contribution.
// This is a simplified calculation - real implementation would use the contribution calculator.
func calculateAnnualContribution(monthlySalary, annualBonus float64, age int) contributionResult {
	// Simplified contribution rates by age
	var totalRate, oaRate, saRate, maRate float64
	switch {
	case age <= 55:
		totalRate = 0.37
		oaRate = 0.6216
		saRate = 0.1622
		maRate = 0.2162
	case age <= 60:
		totalRate = 0.295
		oaRate = 0.4966
		saRate = 0.1186
		maRate = 0.3848
	case age <= 65:
		totalRate = 0.225
		oaRate = 0.4000
		saRate = 0.1111
		maRate = 0.4889
	case age <= 70:
		totalRate = 0.165
		oaRate = 0.3030
		saRate = 0.0909
		maRate = 0.6061
	default:
		totalRate = 0.125
		oaRate = 0.2000
		saRate = 0.0800
		maRate = 0.7200
	}

	// Calculate total annual wages (capped)
	owCeiling := 7400.0
	annualCeiling := 102000.0

	cappedMonthly := math.Min(monthlySalary, owCeiling)
	annualOW := cappedMonthly * 12
	remainingCeiling := annualCeiling - annualOW
	cappedBonus := math.Min(annualBonus, remainingCeiling)
	totalWages := annualOW + cappedBonus

	total := totalWages * totalRate

	return contributionResult{
		total: total,
		oa:    total * oaRate,
		sa:    total * saRate,
		ma:    total * maRate,
	}
}

// estimateCPFLife calculates estimated monthly payouts.
// Uses simplified payout factors per $1,000 RA balance.
func estimateCPFLife(raBalance float64, payoutStartAge int) CPFLifeEstimates {
	if raBalance <= 0 {
		return CPFLifeEstimates{}
	}

	// Payout factors per $1,000 RA (simplified, varies by payout start age)
	// These are approximate values based on CPF LIFE estimator
	var standardFactor, basicFactor, escalatingFactor float64
	switch payoutStartAge {
	case 65:
		standardFactor = 5.50
		basicFactor = 5.00
		escalatingFactor = 4.40
	case 66:
		standardFactor = 5.90
		basicFactor = 5.40
		escalatingFactor = 4.70
	case 67:
		standardFactor = 6.30
		basicFactor = 5.80
		escalatingFactor = 5.00
	case 68:
		standardFactor = 6.80
		basicFactor = 6.20
		escalatingFactor = 5.40
	case 69:
		standardFactor = 7.30
		basicFactor = 6.70
		escalatingFactor = 5.80
	case 70:
		standardFactor = 7.90
		basicFactor = 7.20
		escalatingFactor = 6.30
	default:
		standardFactor = 5.50
		basicFactor = 5.00
		escalatingFactor = 4.40
	}

	raThousands := raBalance / 1000

	return CPFLifeEstimates{
		Standard:   round(raThousands * standardFactor),
		Basic:      round(raThousands * basicFactor),
		Escalating: round(raThousands * escalatingFactor),
	}
}

// calculateAge returns age based on date of birth.
func calculateAge(dob, current time.Time) int {
	age := current.Year() - dob.Year()
	if current.YearDay() < dob.YearDay() {
		age--
	}
	return age
}

// round rounds to nearest cent.
func round(v float64) float64 {
	return math.Round(v*100) / 100
}
