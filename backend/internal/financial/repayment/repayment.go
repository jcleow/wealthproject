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
)

// Params contains all parameters needed for repayment calculation
type Params struct {
	CurrentBalance  *decimal.Decimal       // Outstanding principal
	InterestRateAPR *decimal.Decimal       // Annual interest rate (percentage, e.g., 4.5 for 4.5%)
	MinimumPayment  *decimal.Decimal       // Minimum payment amount (for revolving debt)
	PeriodIndex     int                    // Month index (0-based from loan start)
	TotalPeriods    int                    // Total loan term in months
	Metadata        map[string]interface{} // Strategy-specific config
}

// Result contains the repayment calculation output
type Result struct {
	MonthlyPayment   *decimal.Decimal // Total payment this month
	PrincipalPortion *decimal.Decimal // Principal paid
	InterestPortion  *decimal.Decimal // Interest paid
	RemainingBalance *decimal.Decimal // Balance after payment
	IsPayoff         bool             // True if loan is fully paid
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
			IsPayoff:         false,
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

	// Check if this is the final payment
	isPayoff := remainingBalance.Cmp(decimal.Zero()) <= 0

	if isPayoff {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   monthlyPayment,
		PrincipalPortion: principalPortion,
		InterestPortion:  interestPortion,
		RemainingBalance: remainingBalance,
		IsPayoff:         isPayoff,
	}, nil
}

// InterestOnlyStrategy pays only interest for specified period, then amortizes
// Metadata expected: {"interest_only_months": 24}
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

	// Get interest-only period from metadata (default 12 months)
	interestOnlyMonths := 12
	if val, ok := params.Metadata["interest_only_months"].(float64); ok {
		interestOnlyMonths = int(val)
	} else if val, ok := params.Metadata["interest_only_months"].(int); ok {
		interestOnlyMonths = val
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
			IsPayoff:         false,
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
		Metadata:        params.Metadata,
	})
}

// MinimumPaymentStrategy for revolving debt (credit cards)
// Metadata expected: {"min_payment_pct": 2.0, "min_payment_floor": 25.0}
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

	// Get min payment parameters from metadata
	minPaymentPct := 2.0 // Default 2% of balance
	minPaymentFloor := 25.0

	if val, ok := params.Metadata["min_payment_pct"].(float64); ok {
		minPaymentPct = val
	}
	if val, ok := params.Metadata["min_payment_floor"].(float64); ok {
		minPaymentFloor = val
	}

	// Calculate monthly interest
	monthlyRate := params.InterestRateAPR.Div(hundred).Div(twelve)
	interestPortion := params.CurrentBalance.Mul(monthlyRate)

	// Calculate minimum payment: max(balance * pct%, floor, interest + $1)
	pctPayment := params.CurrentBalance.Mul(decimal.MustFromFloat64(minPaymentPct / 100))
	floorPayment := decimal.MustFromFloat64(minPaymentFloor)
	interestPlusOne := interestPortion.Add(decimal.One())

	// Use the largest of the three
	monthlyPayment := pctPayment
	if floorPayment.Cmp(monthlyPayment) > 0 {
		monthlyPayment = floorPayment
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
	isPayoff := remainingBalance.Cmp(decimal.Zero()) <= 0
	if isPayoff {
		remainingBalance = decimal.Zero()
	}

	return &Result{
		MonthlyPayment:   monthlyPayment,
		PrincipalPortion: principalPortion,
		InterestPortion:  interestPortion,
		RemainingBalance: remainingBalance,
		IsPayoff:         isPayoff,
	}, nil
}

// ExtraPaymentStrategy applies additional principal payments on top of standard amortization
// Metadata expected: {"extra_payment": 500.0}
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

	// Get extra payment from metadata (default 0)
	extraPayment := 0.0
	if val, ok := params.Metadata["extra_payment"].(float64); ok {
		extraPayment = val
	}

	if extraPayment <= 0 {
		return baseResult, nil
	}

	extraPaymentDecimal := decimal.MustFromFloat64(extraPayment)

	// Add extra payment to monthly payment (all goes to principal)
	totalPayment := baseResult.MonthlyPayment.Add(extraPaymentDecimal)
	totalPrincipal := baseResult.PrincipalPortion.Add(extraPaymentDecimal)

	// Calculate new remaining balance
	remainingBalance := params.CurrentBalance.Sub(totalPrincipal)
	isPayoff := remainingBalance.Cmp(decimal.Zero()) <= 0
	if isPayoff {
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
		IsPayoff:         isPayoff,
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
	default:
		// Default to standard amortization
		return NewStandardAmortization()
	}
}
