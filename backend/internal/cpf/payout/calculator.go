package payout

import (
	"errors"
	"strconv"

	"financial-chat-system/backend/internal/decimal"
)

// Errors returned by payout calculations.
var (
	ErrInvalidGender     = errors.New("invalid gender: must be 'male' or 'female'")
	ErrInvalidPlan       = errors.New("invalid CPF LIFE plan: must be 'standard', 'basic', or 'escalating'")
	ErrInvalidPayoutAge  = errors.New("payout age must be between 65 and 70")
	ErrInvalidYearNumber = errors.New("year number must be >= 1")
	ErrNegativeBalance   = errors.New("RA balance cannot be negative")
)

// CalculateBasePayout computes the base monthly payout using the divisor method.
// Formula: monthly_payout = RA_at_55 / divisor
// Male divisor: 120, Female divisor: 132
func CalculateBasePayout(raBalance *decimal.Decimal, gender Gender) (*decimal.Decimal, error) {
	zero := decimal.Zero()

	// Validate inputs
	if raBalance.IsNegative() {
		return zero, ErrNegativeBalance
	}
	if raBalance.IsZero() {
		return zero, nil
	}

	var divisor *decimal.Decimal
	switch gender {
	case Male:
		divisor = MaleDivisor
	case Female:
		divisor = FemaleDivisor
	default:
		return zero, ErrInvalidGender
	}

	return raBalance.Div(divisor), nil
}

// ApplyPlanAdjustment adjusts the base payout based on plan type.
// Standard: 100%, Basic: 90%, Escalating: 80%
func ApplyPlanAdjustment(basePayout *decimal.Decimal, plan CPFLifePlan) (*decimal.Decimal, error) {
	zero := decimal.Zero()

	var adjustment *decimal.Decimal
	switch plan {
	case Standard:
		adjustment = StandardAdjustment
	case Basic:
		adjustment = BasicAdjustment
	case Escalating:
		adjustment = EscalatingAdjustment
	default:
		return zero, ErrInvalidPlan
	}

	return basePayout.Mul(adjustment), nil
}

// ApplyDefermentBonus increases payout for delayed start age.
// +7% per year deferred from age 65, max +40% at age 70.
func ApplyDefermentBonus(basePayout *decimal.Decimal, payoutStartAge int) (*decimal.Decimal, error) {
	zero := decimal.Zero()

	if payoutStartAge < MinPayoutAge || payoutStartAge > MaxPayoutAge {
		return zero, ErrInvalidPayoutAge
	}

	yearsDeferred := payoutStartAge - MinPayoutAge // 0 at 65, 5 at 70

	// Calculate bonus multiplier: 1 + (years × 0.07), capped at 1.40
	yearsDecimal := decimal.MustFromString(strconv.Itoa(yearsDeferred))
	bonus := DefermentBonusPerYear.Mul(yearsDecimal)
	if bonus.Cmp(MaxDefermentBonus) > 0 {
		bonus = MaxDefermentBonus
	}

	one := decimal.One()
	multiplier := one.Add(bonus)

	return basePayout.Mul(multiplier), nil
}

// CalculateEscalatingPayout computes the payout for a specific year in the Escalating plan.
// Formula: payout(year_n) = initial_payout × (1.02)^(n-1)
func CalculateEscalatingPayout(initialPayout *decimal.Decimal, yearNumber int) (*decimal.Decimal, error) {
	zero := decimal.Zero()

	if yearNumber < 1 {
		return zero, ErrInvalidYearNumber
	}

	if yearNumber == 1 {
		return initialPayout, nil
	}

	// Calculate 1.02^(yearNumber-1)
	result := initialPayout
	for i := 1; i < yearNumber; i++ {
		result = result.Mul(EscalatingGrowthMultiplier)
	}

	return result, nil
}

// ProjectRAToPayoutAge projects RA balance from age 55 to payout start age.
// Formula: RA_at_payout = RA_at_55 × (1.04)^years
func ProjectRAToPayoutAge(raAt55 *decimal.Decimal, payoutAge int, interestRate *decimal.Decimal) (*decimal.Decimal, error) {
	zero := decimal.Zero()

	if payoutAge < MinPayoutAge || payoutAge > MaxPayoutAge {
		return zero, ErrInvalidPayoutAge
	}

	years := payoutAge - RACreationAge // years from 55 to payout age

	one := decimal.One()
	growthMultiplier := one.Add(interestRate)

	result := raAt55
	for i := 0; i < years; i++ {
		result = result.Mul(growthMultiplier)
	}

	return result, nil
}

// CalculateBequest computes the bequest (inheritance) amount at time of death.
// Standard/Escalating: bequest = max(0, premium - total_payouts)
// Basic: preserves more through different pooling mechanics
func CalculateBequest(input BequestInput) (BequestResult, error) {
	zero := decimal.Zero()

	// Calculate total payouts received
	months := input.YearsReceived * 12

	var totalPayouts *decimal.Decimal
	if input.Plan == Escalating {
		// Escalating plan: sum of increasing payouts
		totalPayouts = calculateEscalatingCumulativePayouts(input.MonthlyPayout, input.YearsReceived)
	} else {
		// Standard/Basic: fixed payout × months
		monthsDecimal := decimal.MustFromString(strconv.Itoa(months))
		totalPayouts = input.MonthlyPayout.Mul(monthsDecimal)
	}

	var bequest *decimal.Decimal
	switch input.Plan {
	case Standard, Escalating:
		// Simple: premium minus what was paid out
		bequest = input.Premium.Sub(totalPayouts)
		if bequest.IsNegative() {
			bequest = zero
		}
	case Basic:
		// Basic plan preserves more - only 10-20% of premium goes to pooled fund
		// The rest stays in RA earning interest
		// Simplified model: bequest depletes slower
		basicPooledFraction := decimal.MustFromString("0.15") // ~15% pooled
		pooledAmount := input.Premium.Mul(basicPooledFraction)
		unpooledAmount := input.Premium.Sub(pooledAmount)

		// Unpooled portion earns interest but no payouts come from it
		// Bequest = unpooled amount + (pooled - payouts)
		pooledRemaining := pooledAmount.Sub(totalPayouts)
		if pooledRemaining.IsNegative() {
			pooledRemaining = zero
		}
		bequest = unpooledAmount.Add(pooledRemaining)

		// But once total payouts exceed premium, bequest goes to zero
		if totalPayouts.Cmp(input.Premium) > 0 {
			bequest = zero
		}
	default:
		return BequestResult{}, ErrInvalidPlan
	}

	return BequestResult{
		Bequest:              bequest,
		TotalPayoutsReceived: totalPayouts,
		IsDepleted:           bequest.IsZero(),
	}, nil
}

// CalculateFullPayout performs the complete payout calculation.
func CalculateFullPayout(input PayoutInput) (PayoutResult, error) {
	zero := decimal.Zero()

	// Step 1: Calculate base payout using divisor method
	basePayout, err := CalculateBasePayout(input.RAAt55, input.Gender)
	if err != nil {
		return PayoutResult{}, err
	}

	// Step 2: Apply plan adjustment
	adjustedPayout, err := ApplyPlanAdjustment(basePayout, input.Plan)
	if err != nil {
		return PayoutResult{}, err
	}

	// Step 3: Get plan adjustment factor
	var planAdj *decimal.Decimal
	switch input.Plan {
	case Standard:
		planAdj = StandardAdjustment
	case Basic:
		planAdj = BasicAdjustment
	case Escalating:
		planAdj = EscalatingAdjustment
	}

	// Step 4: Apply deferment bonus
	finalPayout, err := ApplyDefermentBonus(adjustedPayout, input.PayoutStartAge)
	if err != nil {
		return PayoutResult{}, err
	}

	// Step 5: Calculate deferment bonus factor
	yearsDeferred := input.PayoutStartAge - MinPayoutAge
	yearsDecimal := decimal.MustFromString(strconv.Itoa(yearsDeferred))
	bonus := DefermentBonusPerYear.Mul(yearsDecimal)
	if bonus.Cmp(MaxDefermentBonus) > 0 {
		bonus = MaxDefermentBonus
	}
	one := decimal.One()
	defermentMultiplier := one.Add(bonus)

	// Step 6: Project RA to payout age
	raAtPayout, err := ProjectRAToPayoutAge(input.RAAt55, input.PayoutStartAge, RAInterestRate)
	if err != nil {
		raAtPayout = zero
	}

	return PayoutResult{
		MonthlyPayout:  finalPayout,
		RAAtPayoutAge:  raAtPayout,
		BasePayout:     basePayout,
		PlanAdjustment: planAdj,
		DefermentBonus: defermentMultiplier,
	}, nil
}

// FindMonthlyBreakevenAge finds when Escalating plan monthly payout exceeds a fixed payout.
// Returns the age when escalating payout >= fixed payout.
func FindMonthlyBreakevenAge(escalatingInitial, fixedPayout *decimal.Decimal) int {
	for year := 1; year <= 50; year++ {
		escalating, _ := CalculateEscalatingPayout(escalatingInitial, year)
		if escalating.Cmp(fixedPayout) >= 0 {
			return MinPayoutAge + year - 1
		}
	}
	return 0 // Never breaks even within 50 years
}

// FindCumulativeBreakevenAge finds when cumulative Escalating payouts exceed cumulative fixed payouts.
func FindCumulativeBreakevenAge(escalatingInitial, fixedPayout *decimal.Decimal) int {
	escalatingTotal := decimal.Zero()
	fixedTotal := decimal.Zero()
	twelve := decimal.MustFromString("12")

	for year := 1; year <= 50; year++ {
		// Add escalating year's payouts (monthly × 12)
		escalating, _ := CalculateEscalatingPayout(escalatingInitial, year)
		escalatingTotal = escalatingTotal.Add(escalating.Mul(twelve))

		// Add fixed year's payouts
		fixedTotal = fixedTotal.Add(fixedPayout.Mul(twelve))

		if escalatingTotal.Cmp(fixedTotal) >= 0 {
			return MinPayoutAge + year - 1
		}
	}
	return 0 // Never breaks even within 50 years
}

// Helper: calculate cumulative payouts for escalating plan over N years
func calculateEscalatingCumulativePayouts(initialMonthly *decimal.Decimal, years int) *decimal.Decimal {
	total := decimal.Zero()
	twelve := decimal.MustFromString("12")

	for year := 1; year <= years; year++ {
		yearlyPayout, _ := CalculateEscalatingPayout(initialMonthly, year)
		total = total.Add(yearlyPayout.Mul(twelve))
	}

	return total
}
