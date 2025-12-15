package repayment

import (
	"time"

	"financial-chat-system/backend/internal/decimal"
)

type StrategyType string

const (
	StandardAmortization StrategyType = "standard_amortization"
	InterestOnly         StrategyType = "interest_only"
	MinimumPayment       StrategyType = "minimum_payment"
	ExtraPayment         StrategyType = "extra_payment"
	FixedPayment         StrategyType = "fixed_payment"
)

// Params contains all parameters needed for repayment calculation
type Params struct {
	CurrentBalance  *decimal.Decimal // Outstanding principal
	InterestRateAPR *decimal.Decimal // Annual interest rate (percentage, e.g., 4.5 for 4.5%)
	MinimumPayment  *decimal.Decimal // Minimum payment amount (for revolving debt)
	PeriodIndex     int              // Month index (0-based from loan start)
	TotalPeriods    int              // Total loan term in months

	// Strategy-specific parameters
	InterestOnlyMonths int              // For InterestOnly strategy: number of interest-only months (0 = always interest-only)
	MinPaymentPct      *decimal.Decimal // For MinimumPayment strategy: percentage of balance (e.g., 2 for 2%)
	MinPaymentFloor    *decimal.Decimal // For MinimumPayment strategy: minimum dollar floor (e.g., 25)
	ExtraPayment       *decimal.Decimal // For ExtraPayment strategy: additional monthly principal payment
}

// Result contains the repayment calculation output
type Result struct {
	MonthlyPayment   *decimal.Decimal // Total payment this month
	PrincipalPortion *decimal.Decimal // Principal paid
	InterestPortion  *decimal.Decimal // Interest paid
	RemainingBalance *decimal.Decimal // Balance after payment (check IsZero() for payoff)
}

// Strategy is the interface that all repayment strategies implement
type Strategy interface {
	Calculate(params Params) (*Result, error)
	Type() StrategyType
}

// StandardAmortizationStrategy applies standard amortization formula:
// M = P * [r(1+r)^n] / [(1+r)^n - 1]
// Used for: Mortgages, car loans, personal loans
type StandardAmortizationStrategy struct{}

func NewStandardAmortization() StandardAmortizationStrategy {
	return StandardAmortizationStrategy{}
}

func (s StandardAmortizationStrategy) Type() StrategyType {
	return StandardAmortization
}

func (s StandardAmortizationStrategy) Calculate(params Params) (*Result, error) {
	// Calculate remaining periods (how many months left to pay)
	remainingPeriods := params.TotalPeriods - params.PeriodIndex
	if remainingPeriods <= 0 || params.CurrentBalance.IsZero() {
		return &Result{
			MonthlyPayment:   decimal.Zero(),
			PrincipalPortion: decimal.Zero(),
			InterestPortion:  decimal.Zero(),
			RemainingBalance: params.CurrentBalance,
		}, nil
	}

	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")
	one := decimal.One()

	// Calculate monthly interest rate: r = APR / 100 / 12
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)

	var monthlyPayment *decimal.Decimal

	if params.InterestRateAPR.IsZero() {
		// Zero interest: simple division
		periods := decimal.NewFromInt64(int64(remainingPeriods), 0)
		monthlyPayment = params.CurrentBalance.Div(periods)
	} else {
		// M = P * [r(1+r)^n] / [(1+r)^n - 1]
		// n = remaining periods, not total periods
		n := decimal.NewFromInt64(int64(remainingPeriods), 0)

		// (1 + r)
		onePlusR := one.Add(monthlyRate)

		// (1 + r)^n
		onePlusRPowN, err := onePlusR.Pow(n)
		if err != nil {
			return nil, err
		}

		// r * (1+r)^n
		numerator := monthlyRate.Mul(onePlusRPowN)

		// (1+r)^n - 1
		denominator := onePlusRPowN.Sub(one)

		// P * [r(1+r)^n] / [(1+r)^n - 1]
		monthlyPayment = params.CurrentBalance.Mul(numerator).Div(denominator)
	}

	// Round monthly payment to 2 decimal places
	monthlyPayment = monthlyPayment.Round(2)

	// Calculate interest portion for this period: balance * monthly_rate (round to 2 decimal places)
	interestPortion := params.CurrentBalance.Mul(monthlyRate).Round(2)

	// Principal portion = payment - interest
	principalPortion := monthlyPayment.Sub(interestPortion).Round(2)

	// Remaining balance = current balance - principal paid
	remainingBalance := params.CurrentBalance.Sub(principalPortion).Round(2)

	// Clamp to zero if paid off
	if remainingBalance.Cmp(decimal.Zero()) <= 0 {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   monthlyPayment,
		PrincipalPortion: principalPortion,
		InterestPortion:  interestPortion,
		RemainingBalance: remainingBalance,
	}, nil
}

// InterestOnlyStrategy pays only interest, with optional transition to amortization.
// If InterestOnlyMonths is 0, stays interest-only forever.
// If InterestOnlyMonths > 0, switches to amortization after that period.
type InterestOnlyStrategy struct{}

func NewInterestOnly() InterestOnlyStrategy {
	return InterestOnlyStrategy{}
}

func (s InterestOnlyStrategy) Type() StrategyType {
	return InterestOnly
}

func (s InterestOnlyStrategy) Calculate(params Params) (*Result, error) {
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")

	// Calculate monthly interest rate
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)

	// If InterestOnlyMonths is 0, stay interest-only forever
	// If InterestOnlyMonths > 0, check if we're still in the interest-only period
	alwaysInterestOnly := params.InterestOnlyMonths == 0
	inInterestOnlyPeriod := params.PeriodIndex < params.InterestOnlyMonths

	if alwaysInterestOnly || inInterestOnlyPeriod {
		// Interest-only: pay only interest, principal unchanged
		interestPortion := params.CurrentBalance.Mul(monthlyRate).Round(2)

		return &Result{
			MonthlyPayment:   interestPortion,
			PrincipalPortion: decimal.Zero(),
			InterestPortion:  interestPortion,
			RemainingBalance: params.CurrentBalance,
		}, nil
	}

	// After interest-only period: switch to standard amortization
	remainingPeriods := params.TotalPeriods - params.InterestOnlyMonths
	if remainingPeriods <= 0 {
		remainingPeriods = 1 // At least 1 period to pay off
	}

	// Use standard amortization for remaining term
	amortStrategy := NewStandardAmortization()
	return amortStrategy.Calculate(Params{
		CurrentBalance:  params.CurrentBalance,
		InterestRateAPR: params.InterestRateAPR,
		MinimumPayment:  params.MinimumPayment,
		PeriodIndex:     params.PeriodIndex - params.InterestOnlyMonths,
		TotalPeriods:    remainingPeriods,
	})
}

// MinimumPaymentStrategy for revolving debt (credit cards)
// Use Params.MinPaymentPct and Params.MinPaymentFloor for configuration
type MinimumPaymentStrategy struct{}

func NewMinimumPayment() MinimumPaymentStrategy {
	return MinimumPaymentStrategy{}
}

func (s MinimumPaymentStrategy) Type() StrategyType {
	return MinimumPayment
}

func (s MinimumPaymentStrategy) Calculate(params Params) (*Result, error) {
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")

	// Get min payment parameters from params (defaults: 2%, $25 floor)
	minPaymentPct := decimal.MustFromFloat64(2.0)
	minPaymentFloor := decimal.MustFromFloat64(25.0)

	if params.MinPaymentPct != nil {
		minPaymentPct = params.MinPaymentPct
	}
	if params.MinPaymentFloor != nil {
		minPaymentFloor = params.MinPaymentFloor
	}

	// Calculate monthly interest (round to 2 decimal places)
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)
	interestPortion := params.CurrentBalance.Mul(monthlyRate).Round(2)

	// Calculate minimum payment: max(balance * pct%, floor, interest + $1)
	pctPayment := params.CurrentBalance.Mul(minPaymentPct).Div(hundred).Round(2)
	interestPlusOne := interestPortion.Add(decimal.One())

	// Use the largest of the three
	monthlyPayment := pctPayment
	if minPaymentFloor.Cmp(monthlyPayment) > 0 {
		monthlyPayment = minPaymentFloor
	}
	if interestPlusOne.Cmp(monthlyPayment) > 0 {
		monthlyPayment = interestPlusOne
	}

	// If balance is less than minimum payment, pay off the balance
	if params.CurrentBalance.Cmp(monthlyPayment) < 0 {
		monthlyPayment = params.CurrentBalance.Add(interestPortion)
	}

	// Round payment to 2 decimal places
	monthlyPayment = monthlyPayment.Round(2)

	// Principal = payment - interest
	principalPortion := monthlyPayment.Sub(interestPortion).Round(2)
	if principalPortion.Cmp(decimal.Zero()) < 0 {
		principalPortion = decimal.Zero()
	}

	// Remaining balance
	remainingBalance := params.CurrentBalance.Sub(principalPortion).Round(2)
	if remainingBalance.Cmp(decimal.Zero()) <= 0 {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   monthlyPayment,
		PrincipalPortion: principalPortion,
		InterestPortion:  interestPortion,
		RemainingBalance: remainingBalance,
	}, nil
}

// ExtraPaymentStrategy applies additional principal payments on top of standard amortization
// Use Params.ExtraPayment to specify the additional monthly principal payment
type ExtraPaymentStrategy struct{}

func NewExtraPayment() ExtraPaymentStrategy {
	return ExtraPaymentStrategy{}
}

func (s ExtraPaymentStrategy) Type() StrategyType {
	return ExtraPayment
}

func (s ExtraPaymentStrategy) Calculate(params Params) (*Result, error) {
	// First calculate standard amortization payment
	amortStrategy := NewStandardAmortization()
	baseResult, err := amortStrategy.Calculate(params)
	if err != nil {
		return nil, err
	}

	// Get extra payment from params (default 0)
	if params.ExtraPayment == nil || params.ExtraPayment.Cmp(decimal.Zero()) <= 0 {
		return baseResult, nil
	}

	extraPaymentDecimal := params.ExtraPayment

	// Add extra payment to monthly payment (all goes to principal)
	totalPayment := baseResult.MonthlyPayment.Add(extraPaymentDecimal).Round(2)
	totalPrincipal := baseResult.PrincipalPortion.Add(extraPaymentDecimal).Round(2)

	// Calculate new remaining balance
	remainingBalance := params.CurrentBalance.Sub(totalPrincipal).Round(2)
	if remainingBalance.Cmp(decimal.Zero()) <= 0 {
		remainingBalance = decimal.Zero()
		// Adjust payment if overpaying
		overpayment := totalPrincipal.Sub(params.CurrentBalance).Round(2)
		if overpayment.Cmp(decimal.Zero()) > 0 {
			totalPayment = totalPayment.Sub(overpayment).Round(2)
			totalPrincipal = params.CurrentBalance
		}
	}

	return &Result{
		MonthlyPayment:   totalPayment,
		PrincipalPortion: totalPrincipal,
		InterestPortion:  baseResult.InterestPortion,
		RemainingBalance: remainingBalance,
	}, nil
}

// FixedPaymentStrategy applies a fixed payment amount (typically from a linked expense).
// Interest accrues on the balance, then the fixed payment is applied.
// If payment < interest, balance grows (negative principal).
// Used for: Open-ended liabilities with linked expenses (e.g., credit cards with fixed monthly payments)
type FixedPaymentStrategy struct{}

func NewFixedPayment() FixedPaymentStrategy {
	return FixedPaymentStrategy{}
}

func (s FixedPaymentStrategy) Type() StrategyType {
	return FixedPayment
}

func (s FixedPaymentStrategy) Calculate(params Params) (*Result, error) {
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")

	// Calculate monthly interest rate: r = APR / 100 / 12
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)

	// Calculate interest on current balance (round to 2 decimal places)
	interestPortion := params.CurrentBalance.Mul(monthlyRate).Round(2)

	// Use MinimumPayment as the fixed payment amount
	payment := params.MinimumPayment
	if payment == nil {
		payment = decimal.Zero()
	}

	// Principal = payment - interest (can be negative if payment < interest)
	principalPortion := payment.Sub(interestPortion).Round(2)

	// New balance = current balance - principal
	// If principal is negative, balance increases
	remainingBalance := params.CurrentBalance.Sub(principalPortion).Round(2)

	// Clamp to zero (can't have negative debt)
	if remainingBalance.Cmp(decimal.Zero()) < 0 {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   payment.Round(2),
		PrincipalPortion: principalPortion,
		InterestPortion:  interestPortion,
		RemainingBalance: remainingBalance,
	}, nil
}

// GetStrategy returns the appropriate strategy for the given type
func GetStrategy(strategyType StrategyType) Strategy {
	switch strategyType {
	case StandardAmortization:
		return NewStandardAmortization()
	case InterestOnly:
		return NewInterestOnly()
	case MinimumPayment:
		return NewMinimumPayment()
	case ExtraPayment:
		return NewExtraPayment()
	case FixedPayment:
		return NewFixedPayment()
	default:
		// Default to standard amortization
		return NewStandardAmortization()
	}
}

// LiabilityMonthParams contains all parameters needed for processing a liability for one month.
// The repayment module owns all logic for calculating payments - callers just provide raw data.
type LiabilityMonthParams struct {
	// Liability configuration
	CurrentBalance    *decimal.Decimal // Outstanding principal
	InterestRateAPR   *decimal.Decimal // Annual interest rate (percentage)
	RepaymentStrategy string           // Strategy type from database
	MinimumPayment    *decimal.Decimal // Minimum payment field from liability
	EndDate           *int64           // Unix timestamp of end date (nil if open-ended)
	CurrentDate       int64            // Unix timestamp of current month being processed

	// Linked expense (optional) - repayment module will calculate monthly amount
	LinkedExpenseAmount    *decimal.Decimal // Raw expense amount (nil if no linked expense)
	LinkedExpenseFrequency string           // Expense frequency (monthly, yearly, etc.)
}

// LiabilityMonthResult contains the result of processing a liability for one month
type LiabilityMonthResult struct {
	NewBalance     *decimal.Decimal // Balance after this month's payment
	MonthlyPayment *decimal.Decimal // Payment amount for this month
}

// ProcessLiabilityMonth processes a liability for one month using the appropriate strategy.
// This encapsulates ALL payment calculation logic - callers just provide raw liability data.
func ProcessLiabilityMonth(p LiabilityMonthParams) (*LiabilityMonthResult, error) {
	// Validate inputs
	if p.CurrentBalance == nil || p.CurrentBalance.Cmp(decimal.Zero()) <= 0 {
		return &LiabilityMonthResult{
			NewBalance:     p.CurrentBalance,
			MonthlyPayment: decimal.Zero(),
		}, nil
	}

	// Calculate remaining months for fixed-term liabilities
	hasEndDate := p.EndDate != nil
	remainingMonths := 0
	if hasEndDate {
		remainingMonths = monthsBetweenTimestamps(p.CurrentDate, *p.EndDate)
		if remainingMonths <= 0 {
			// Past end date - balance carries over unchanged
			return &LiabilityMonthResult{
				NewBalance:     p.CurrentBalance,
				MonthlyPayment: decimal.Zero(),
			}, nil
		}
	}

	// Calculate linked expense monthly amount
	var linkedExpenseMonthly *decimal.Decimal
	if p.LinkedExpenseAmount != nil {
		linkedExpenseMonthly = toMonthlyAmount(p.LinkedExpenseAmount, p.LinkedExpenseFrequency)
	}

	// Build base params
	params := Params{
		CurrentBalance:  p.CurrentBalance,
		InterestRateAPR: p.InterestRateAPR,
	}

	// Get strategy type (default to standard_amortization)
	strategyType := StrategyType(p.RepaymentStrategy)
	if p.RepaymentStrategy == "" {
		strategyType = StandardAmortization
	}

	// For fixed-term liabilities, set remaining term for amortization
	if hasEndDate && remainingMonths > 0 {
		params.TotalPeriods = remainingMonths
		params.PeriodIndex = 0 // Always treat as first period for reamortization
	}

	// Configure strategy-specific params based on strategy type
	switch strategyType {
	case InterestOnly:
		// InterestOnlyMonths = 0 means always interest-only (no transition to amortization)

	case MinimumPayment:
		params.MinPaymentPct = p.MinimumPayment // Interpret as percentage

	case FixedPayment:
		if linkedExpenseMonthly != nil {
			params.MinimumPayment = linkedExpenseMonthly
		} else {
			params.MinimumPayment = p.MinimumPayment
		}

	case StandardAmortization:
		// For open-ended liabilities with standard_amortization, fall back to fixed payment
		if !hasEndDate {
			if linkedExpenseMonthly != nil {
				params.MinimumPayment = linkedExpenseMonthly
			} else {
				params.MinimumPayment = decimal.Zero()
			}
			strategyType = FixedPayment
		}
	}

	// Calculate using the appropriate strategy
	strategy := GetStrategy(strategyType)
	result, err := strategy.Calculate(params)
	if err != nil {
		return nil, err
	}

	return &LiabilityMonthResult{
		NewBalance:     result.RemainingBalance,
		MonthlyPayment: result.MonthlyPayment,
	}, nil
}

// monthsBetweenTimestamps calculates months between two unix timestamps (inclusive)
func monthsBetweenTimestamps(startUnix, endUnix int64) int {
	start := time.Unix(startUnix, 0).UTC()
	end := time.Unix(endUnix, 0).UTC()
	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())
	return years*12 + months + 1
}

// toMonthlyAmount converts an amount to monthly based on frequency
func toMonthlyAmount(amount *decimal.Decimal, frequency string) *decimal.Decimal {
	if amount == nil {
		return decimal.Zero()
	}

	switch frequency {
	case "monthly":
		return amount
	case "yearly", "annually":
		twelve := decimal.MustFromString("12")
		return amount.Div(twelve)
	case "quarterly":
		three := decimal.MustFromString("3")
		return amount.Div(three)
	case "weekly":
		// ~4.33 weeks per month
		weeksPerMonth := decimal.MustFromString("4.33")
		return amount.Mul(weeksPerMonth)
	case "fortnightly", "biweekly":
		// ~2.17 fortnights per month
		fortnightsPerMonth := decimal.MustFromString("2.17")
		return amount.Mul(fortnightsPerMonth)
	default:
		return amount // Assume monthly if unknown
	}
}
