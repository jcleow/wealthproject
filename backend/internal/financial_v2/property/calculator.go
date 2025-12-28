package property

import (
	"strconv"

	"financial-chat-system/backend/internal/decimal"
)

// Calculator handles all property-related calculations
type Calculator struct{}

// NewCalculator creates a new property calculator
func NewCalculator() *Calculator {
	return &Calculator{}
}

// MortgageResult contains all mortgage calculation outputs
type MortgageResult struct {
	LoanAmount      *decimal.Decimal  `json:"loanAmount"`
	MonthlyPayment  *decimal.Decimal  `json:"monthlyPayment"`
	TotalInterest   *decimal.Decimal  `json:"totalInterest"`
	TotalAmountPaid *decimal.Decimal  `json:"totalAmountPaid"`
	LoanEndDate     string            `json:"loanEndDate"`
	Amortization    []AmortizationYear `json:"amortization"`
}

// AmortizationYear contains yearly amortization summary
type AmortizationYear struct {
	Year            int              `json:"year"`
	StartingBalance *decimal.Decimal `json:"startingBalance"`
	TotalPrincipal  *decimal.Decimal `json:"totalPrincipal"`
	TotalInterest   *decimal.Decimal `json:"totalInterest"`
	EndingBalance   *decimal.Decimal `json:"endingBalance"`
}

// PaymentPeriod represents a payment segment with specific rate
type PaymentPeriod struct {
	PeriodStart    string           `json:"periodStart"`
	PeriodEnd      string           `json:"periodEnd"`
	MonthlyPayment *decimal.Decimal `json:"monthlyPayment"`
	Rate           *decimal.Decimal `json:"rate"`
}

// LoanRatePeriod represents a loan segment input
type LoanRatePeriod struct {
	StartMonth string           `json:"startMonth"`
	EndMonth   string           `json:"endMonth"`
	TermMonths int              `json:"termMonths"`
	AnnualRate *decimal.Decimal `json:"annualRate"`
}

// MortgageWithSegmentsResult contains multi-period mortgage results
type MortgageWithSegmentsResult struct {
	PaymentPeriods []PaymentPeriod  `json:"paymentPeriods"`
	TotalInterest  *decimal.Decimal `json:"totalInterest"`
}

// GrowthPeriod represents a period with specific growth rate
type GrowthPeriod struct {
	StartYear      int              `json:"startYear"`
	EndYear        *int             `json:"endYear"`
	GrowthRate     *decimal.Decimal `json:"growthRate"`
	GrowthStrategy string           `json:"growthStrategy"`
}

// AffordabilityResult contains MSR/TDSR calculation results
type AffordabilityResult struct {
	MsrRatio         *decimal.Decimal `json:"msrRatio"`
	TdsrRatio        *decimal.Decimal `json:"tdsrRatio"`
	MsrPasses        bool             `json:"msrPasses"`
	TdsrPasses       bool             `json:"tdsrPasses"`
	MaxLoanMSR       *decimal.Decimal `json:"maxLoanMsr"`
	MaxLoanTDSR      *decimal.Decimal `json:"maxLoanTdsr"`
	EffectiveMaxLoan *decimal.Decimal `json:"effectiveMaxLoan"`
}

// CalculateMortgage computes monthly payment for a single rate
// Formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
func (c *Calculator) CalculateMortgage(
	loanAmount *decimal.Decimal,
	termMonths int,
	annualRatePercent *decimal.Decimal,
) *MortgageResult {
	// Handle zero interest rate edge case
	hundred := decimal.MustFromString("100")
	zero := decimal.Zero()

	if annualRatePercent.Cmp(zero) == 0 {
		monthlyPayment := loanAmount.Div(decimal.NewFromInt64(int64(termMonths), 0))
		return &MortgageResult{
			LoanAmount:      loanAmount,
			MonthlyPayment:  roundTo2(monthlyPayment),
			TotalInterest:   zero,
			TotalAmountPaid: loanAmount,
			Amortization:    nil,
		}
	}

	// Convert annual rate from percentage to monthly decimal
	// annualRate = 2.6% -> 0.026 -> monthlyRate = 0.026/12
	annualRate := annualRatePercent.Div(hundred)
	twelve := decimal.MustFromString("12")
	monthlyRate := annualRate.Div(twelve)

	// (1 + r)^n
	one := decimal.One()
	onePlusR := one.Add(monthlyRate)
	onePlusRPowerN := c.power(onePlusR, termMonths)

	// r * (1+r)^n
	numerator := monthlyRate.Mul(onePlusRPowerN)

	// (1+r)^n - 1
	denominator := onePlusRPowerN.Sub(one)

	// PMT = P * numerator / denominator
	monthlyPayment := loanAmount.Mul(numerator).Div(denominator)

	// Total amount paid
	totalPaid := monthlyPayment.Mul(decimal.NewFromInt64(int64(termMonths), 0))
	totalInterest := totalPaid.Sub(loanAmount)

	return &MortgageResult{
		LoanAmount:      loanAmount,
		MonthlyPayment:  roundTo2(monthlyPayment),
		TotalInterest:   roundTo2(totalInterest),
		TotalAmountPaid: roundTo2(totalPaid),
		Amortization:    c.generateAmortization(loanAmount, monthlyPayment, monthlyRate, termMonths),
	}
}

// generateAmortization creates yearly amortization schedule
func (c *Calculator) generateAmortization(
	loanAmount *decimal.Decimal,
	monthlyPayment *decimal.Decimal,
	monthlyRate *decimal.Decimal,
	termMonths int,
) []AmortizationYear {
	var years []AmortizationYear
	balance := loanAmount
	zero := decimal.Zero()

	for month := 1; month <= termMonths; month++ {
		year := (month-1)/12 + 1

		// Ensure we have an entry for this year
		if len(years) < year {
			years = append(years, AmortizationYear{
				Year:            year,
				StartingBalance: balance,
				TotalPrincipal:  zero,
				TotalInterest:   zero,
				EndingBalance:   balance,
			})
		}

		// Calculate this month's interest and principal
		interestPayment := balance.Mul(monthlyRate)
		principalPayment := monthlyPayment.Sub(interestPayment)

		// Don't let balance go negative
		if principalPayment.Cmp(balance) > 0 {
			principalPayment = balance
		}

		balance = balance.Sub(principalPayment)
		if balance.Cmp(zero) < 0 {
			balance = zero
		}

		// Update year totals
		years[year-1].TotalPrincipal = years[year-1].TotalPrincipal.Add(principalPayment)
		years[year-1].TotalInterest = years[year-1].TotalInterest.Add(interestPayment)
		years[year-1].EndingBalance = balance
	}

	// Round all values
	for i := range years {
		years[i].StartingBalance = roundTo2(years[i].StartingBalance)
		years[i].TotalPrincipal = roundTo2(years[i].TotalPrincipal)
		years[i].TotalInterest = roundTo2(years[i].TotalInterest)
		years[i].EndingBalance = roundTo2(years[i].EndingBalance)
	}

	return years
}

// CalculateMortgageWithSegments handles multi-period refinancing
func (c *Calculator) CalculateMortgageWithSegments(
	loanAmount *decimal.Decimal,
	segments []LoanRatePeriod,
) *MortgageWithSegmentsResult {
	currentBalance := loanAmount
	totalInterest := decimal.Zero()
	var paymentPeriods []PaymentPeriod
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")

	for _, segment := range segments {
		// Calculate payment for this segment based on remaining balance
		result := c.CalculateMortgage(currentBalance, segment.TermMonths, segment.AnnualRate)

		paymentPeriods = append(paymentPeriods, PaymentPeriod{
			PeriodStart:    segment.StartMonth,
			PeriodEnd:      segment.EndMonth,
			MonthlyPayment: result.MonthlyPayment,
			Rate:           segment.AnnualRate,
		})

		// Calculate ending balance after this segment
		annualRate := segment.AnnualRate.Div(hundred)
		monthlyRate := annualRate.Div(twelve)

		for month := 0; month < segment.TermMonths; month++ {
			interestPayment := currentBalance.Mul(monthlyRate)
			principalPayment := result.MonthlyPayment.Sub(interestPayment)
			currentBalance = currentBalance.Sub(principalPayment)
			totalInterest = totalInterest.Add(interestPayment)
		}
	}

	return &MortgageWithSegmentsResult{
		PaymentPeriods: paymentPeriods,
		TotalInterest:  roundTo2(totalInterest),
	}
}

// BSDTier represents a BSD tier bracket
type BSDTier struct {
	UpTo *decimal.Decimal
	Rate *decimal.Decimal
}

// GetBSDTiers returns the BSD tiers (IRAS 2024)
func GetBSDTiers() []BSDTier {
	return []BSDTier{
		{decimal.MustFromString("180000"), decimal.MustFromString("0.01")},
		{decimal.MustFromString("360000"), decimal.MustFromString("0.02")},
		{decimal.MustFromString("1000000"), decimal.MustFromString("0.03")},
		{decimal.MustFromString("1500000"), decimal.MustFromString("0.04")},
		{decimal.MustFromString("3000000"), decimal.MustFromString("0.05")},
		{nil, decimal.MustFromString("0.06")}, // No upper limit
	}
}

// CalculateBSD computes Buyer's Stamp Duty using progressive rates
func (c *Calculator) CalculateBSD(propertyPrice *decimal.Decimal) *decimal.Decimal {
	remainingPrice := propertyPrice
	totalBsd := decimal.Zero()
	previousThreshold := decimal.Zero()
	tiers := GetBSDTiers()

	for _, tier := range tiers {
		if tier.UpTo == nil {
			// Final tier - no upper limit
			taxableAmount := remainingPrice
			totalBsd = totalBsd.Add(taxableAmount.Mul(tier.Rate))
			break
		}

		zero := decimal.Zero()
		if remainingPrice.Cmp(zero) <= 0 {
			break
		}

		tierWidth := tier.UpTo.Sub(previousThreshold)
		taxableAmount := remainingPrice
		if taxableAmount.Cmp(tierWidth) > 0 {
			taxableAmount = tierWidth
		}

		totalBsd = totalBsd.Add(taxableAmount.Mul(tier.Rate))
		remainingPrice = remainingPrice.Sub(taxableAmount)
		previousThreshold = tier.UpTo
	}

	return roundTo2(totalBsd)
}

// GetABSDRates returns ABSD rates by residency and property count
func GetABSDRates() map[string]map[int]*decimal.Decimal {
	return map[string]map[int]*decimal.Decimal{
		"singapore_citizen": {
			0: decimal.Zero(),                 // 1st property: 0%
			1: decimal.MustFromString("20"),   // 2nd property: 20%
			2: decimal.MustFromString("30"),   // 3rd+ property: 30%
		},
		"permanent_resident": {
			0: decimal.MustFromString("5"),    // 1st property: 5%
			1: decimal.MustFromString("30"),   // 2nd+ property: 30%
		},
		"foreigner": {
			0: decimal.MustFromString("60"),   // All properties: 60%
		},
	}
}

// CalculateABSD computes Additional Buyer's Stamp Duty
func (c *Calculator) CalculateABSD(propertyPrice *decimal.Decimal, residency string, propertyCount int) *decimal.Decimal {
	rates := GetABSDRates()
	resRates, ok := rates[residency]
	if !ok {
		return decimal.Zero()
	}

	rate, ok := resRates[propertyCount]
	if !ok {
		// Use highest rate for that buyer type
		maxCount := 0
		for count := range resRates {
			if count > maxCount {
				maxCount = count
			}
		}
		rate = resRates[maxCount]
	}

	hundred := decimal.MustFromString("100")
	absd := propertyPrice.Mul(rate).Div(hundred)
	return roundTo2(absd)
}

// CalculateSSD computes Seller's Stamp Duty based on holding period
func (c *Calculator) CalculateSSD(salePrice *decimal.Decimal, holdingMonths int) *decimal.Decimal {
	years := holdingMonths / 12
	var rate *decimal.Decimal

	switch {
	case years < 1:
		rate = decimal.MustFromString("0.16") // 16%
	case years < 2:
		rate = decimal.MustFromString("0.12") // 12%
	case years < 3:
		rate = decimal.MustFromString("0.08") // 8%
	case years < 4:
		rate = decimal.MustFromString("0.04") // 4%
	default:
		return decimal.Zero() // 0% after 4 years
	}

	return roundTo2(salePrice.Mul(rate))
}

// CalculateCpfAccruedInterest computes CPF refund with compound interest
// Formula: P * ((1 + r/12)^n - 1) where r = annual rate (e.g., 0.025 for 2.5%)
func (c *Calculator) CalculateCpfAccruedInterest(principalUsed *decimal.Decimal, holdingMonths int, annualRatePercent *decimal.Decimal) *decimal.Decimal {
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")
	one := decimal.One()

	annualRate := annualRatePercent.Div(hundred)
	monthlyRate := annualRate.Div(twelve)
	onePlusR := one.Add(monthlyRate)
	factor := c.power(onePlusR, holdingMonths).Sub(one)

	return roundTo2(principalUsed.Mul(factor))
}

// CalculatePropertyValueAtMonth projects property value with growth periods
func (c *Calculator) CalculatePropertyValueAtMonth(
	initialValue *decimal.Decimal,
	growthPeriods []GrowthPeriod,
	targetMonth string,
) *decimal.Decimal {
	currentValue := initialValue
	targetYear, _ := strconv.Atoi(targetMonth[:4])
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")
	one := decimal.One()

	for _, period := range growthPeriods {
		if period.StartYear > targetYear {
			break
		}

		endYear := targetYear
		if period.EndYear != nil && *period.EndYear < targetYear {
			endYear = *period.EndYear
		}

		yearsInPeriod := endYear - period.StartYear + 1
		if yearsInPeriod <= 0 {
			continue
		}

		rate := period.GrowthRate.Div(hundred)

		switch period.GrowthStrategy {
		case "annual_step":
			onePlusR := one.Add(rate)
			factor := c.power(onePlusR, yearsInPeriod)
			currentValue = currentValue.Mul(factor)
		case "compound_monthly":
			monthlyRate := rate.Div(twelve)
			onePlusR := one.Add(monthlyRate)
			factor := c.power(onePlusR, yearsInPeriod*12)
			currentValue = currentValue.Mul(factor)
		case "fixed":
			// No growth
		}
	}

	return roundTo2(currentValue)
}

// CalculateAffordability computes MSR/TDSR ratios
func (c *Calculator) CalculateAffordability(
	monthlyIncome *decimal.Decimal,
	monthlyPayment *decimal.Decimal,
	otherDebt *decimal.Decimal,
	propertyType string,
) *AffordabilityResult {
	msrRatio := monthlyPayment.Div(monthlyIncome)
	totalDebt := monthlyPayment.Add(otherDebt)
	tdsrRatio := totalDebt.Div(monthlyIncome)

	msrLimit := decimal.MustFromString("0.30") // 30%
	tdsrLimit := decimal.MustFromString("0.55") // 55%

	return &AffordabilityResult{
		MsrRatio:   roundTo4(msrRatio),
		TdsrRatio:  roundTo4(tdsrRatio),
		MsrPasses:  msrRatio.Cmp(msrLimit) <= 0,
		TdsrPasses: tdsrRatio.Cmp(tdsrLimit) <= 0,
	}
}

// power computes base^exp for decimal
func (c *Calculator) power(base *decimal.Decimal, exp int) *decimal.Decimal {
	result := decimal.One()
	for i := 0; i < exp; i++ {
		result = result.Mul(base)
	}
	return result
}

// roundTo2 rounds to 2 decimal places
func roundTo2(d *decimal.Decimal) *decimal.Decimal {
	return d.Round(2)
}

// roundTo4 rounds to 4 decimal places
func roundTo4(d *decimal.Decimal) *decimal.Decimal {
	return d.Round(4)
}
