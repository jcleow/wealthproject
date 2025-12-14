package repayment

import (
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

	// Strategy-specific parameters (preferred over Metadata)
	InterestOnlyMonths int              // For InterestOnly strategy: number of interest-only months
	MinPaymentPct      *decimal.Decimal // For MinimumPayment strategy: percentage of balance (e.g., 2 for 2%)
	MinPaymentFloor    *decimal.Decimal // For MinimumPayment strategy: minimum dollar floor (e.g., 25)
	ExtraPayment       *decimal.Decimal // For ExtraPayment strategy: additional monthly principal payment

	// Deprecated: use typed fields above instead
	Metadata map[string]interface{}
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

	// Calculate interest portion for this period: balance * monthly_rate
	interestPortion := params.CurrentBalance.Mul(monthlyRate)

	// Principal portion = payment - interest
	principalPortion := monthlyPayment.Sub(interestPortion)

	// Remaining balance = current balance - principal paid
	remainingBalance := params.CurrentBalance.Sub(principalPortion)

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

// InterestOnlyStrategy pays only interest for specified period, then amortizes
// Use Params.InterestOnlyMonths to specify the interest-only period
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

	// Get interest-only period from params (default 12 months)
	interestOnlyMonths := params.InterestOnlyMonths
	if interestOnlyMonths == 0 {
		interestOnlyMonths = 12
	}

	// Calculate monthly interest rate
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)

	if params.PeriodIndex < interestOnlyMonths {
		// Interest-only period: pay only interest, principal unchanged
		interestPortion := params.CurrentBalance.Mul(monthlyRate)

		return &Result{
			MonthlyPayment:   interestPortion,
			PrincipalPortion: decimal.Zero(),
			InterestPortion:  interestPortion,
			RemainingBalance: params.CurrentBalance,
		}, nil
	}

	// After interest-only period: switch to standard amortization
	remainingPeriods := params.TotalPeriods - interestOnlyMonths
	if remainingPeriods <= 0 {
		remainingPeriods = 1 // At least 1 period to pay off
	}

	// Use standard amortization for remaining term
	amortStrategy := NewStandardAmortization()
	return amortStrategy.Calculate(Params{
		CurrentBalance:  params.CurrentBalance,
		InterestRateAPR: params.InterestRateAPR,
		MinimumPayment:  params.MinimumPayment,
		PeriodIndex:     params.PeriodIndex - interestOnlyMonths,
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

	// Calculate monthly interest
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)
	interestPortion := params.CurrentBalance.Mul(monthlyRate)

	// Calculate minimum payment: max(balance * pct%, floor, interest + $1)
	pctPayment := params.CurrentBalance.Mul(minPaymentPct).Div(hundred)
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

	// Principal = payment - interest
	principalPortion := monthlyPayment.Sub(interestPortion)
	if principalPortion.Cmp(decimal.Zero()) < 0 {
		principalPortion = decimal.Zero()
	}

	// Remaining balance
	remainingBalance := params.CurrentBalance.Sub(principalPortion)
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
	totalPayment := baseResult.MonthlyPayment.Add(extraPaymentDecimal)
	totalPrincipal := baseResult.PrincipalPortion.Add(extraPaymentDecimal)

	// Calculate new remaining balance
	remainingBalance := params.CurrentBalance.Sub(totalPrincipal)
	if remainingBalance.Cmp(decimal.Zero()) <= 0 {
		remainingBalance = decimal.Zero()
		// Adjust payment if overpaying
		overpayment := totalPrincipal.Sub(params.CurrentBalance)
		if overpayment.Cmp(decimal.Zero()) > 0 {
			totalPayment = totalPayment.Sub(overpayment)
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

	// Calculate interest on current balance
	interestPortion := params.CurrentBalance.Mul(monthlyRate)

	// Use MinimumPayment as the fixed payment amount
	payment := params.MinimumPayment
	if payment == nil {
		payment = decimal.Zero()
	}

	// Principal = payment - interest (can be negative if payment < interest)
	principalPortion := payment.Sub(interestPortion)

	// New balance = current balance - principal
	// If principal is negative, balance increases
	remainingBalance := params.CurrentBalance.Sub(principalPortion)

	// Clamp to zero (can't have negative debt)
	if remainingBalance.Cmp(decimal.Zero()) < 0 {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   payment,
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
