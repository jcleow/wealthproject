package growth

import (
	"financial-chat-system/backend/internal/decimal"

	"github.com/cockroachdb/apd/v3"
)

type StrategyType string

const (
	CompoundMonthly StrategyType = "compound_monthly"
	AnnualStep      StrategyType = "annual_step"
	TieredADB       StrategyType = "tiered_adb"
	Fixed           StrategyType = "fixed"
)

// Params contains all parameters needed for growth calculation
type Params struct {
	CurrentValue *decimal.Decimal
	Rate         *decimal.Decimal // Percentage rate (e.g., 3.0 for 3%)
	PeriodIndex  int              // Month or year index (0-based)
	Frequency    string           // "monthly" or "yearly"
	Metadata     map[string]interface{}
}

// Strategy is the interface that all growth strategies implement
type Strategy interface {
	Calculate(params Params) (*decimal.Decimal, error)
	Type() StrategyType
}

// CompoundMonthlyStrategy applies monthly compounding growth
// Used for: Assets, Investments, Cash accounts that earn interest
type CompoundMonthlyStrategy struct{}

// NewCompoundMonthly returns a concrete CompoundMonthlyStrategy
func NewCompoundMonthly() CompoundMonthlyStrategy {
	return CompoundMonthlyStrategy{}
}

func (s CompoundMonthlyStrategy) Type() StrategyType {
	return CompoundMonthly
}

func (s CompoundMonthlyStrategy) Calculate(params Params) (*decimal.Decimal, error) {
	// Monthly rate calculation: (1 + Rate/100)^(1/12) - 1
	one := decimal.One()
	hundred := decimal.MustFromString("100")
	twelve := decimal.MustFromString("12")
	oneOverTwelve := decimal.MustFromString("0.083333333333") // 1/12

	// Convert rate from percentage: Rate / 100
	rateDecimal, err := params.Rate.Div(hundred)
	if err != nil {
		return nil, err
	}

	// 1 + rate
	onePlusRate, err := one.Add(rateDecimal)
	if err != nil {
		return nil, err
	}

	// (1 + rate)^(1/12)
	monthlyMultiplier, err := onePlusRate.Pow(oneOverTwelve)
	if err != nil {
		return nil, err
	}

	// CurrentValue * monthlyMultiplier
	result, err := params.CurrentValue.Mul(monthlyMultiplier)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// AnnualStepStrategy applies annual step increase (only once per year at year start)
// Used for: Income, Expenses (salary increases, rent increases)
type AnnualStepStrategy struct{}

// NewAnnualStep returns a concrete AnnualStepStrategy
func NewAnnualStep() AnnualStepStrategy {
	return AnnualStepStrategy{}
}

func (s AnnualStepStrategy) Type() StrategyType {
	return AnnualStep
}

func (s AnnualStepStrategy) Calculate(params Params) (*decimal.Decimal, error) {
	one := decimal.One()
	hundred := decimal.MustFromString("100")

	// Convert rate from percentage: Rate / 100
	rateDecimal, err := params.Rate.Div(hundred)
	if err != nil {
		return nil, err
	}

	// 1 + rate
	onePlusRate, err := one.Add(rateDecimal)
	if err != nil {
		return nil, err
	}

	var yearIndex int
	if params.Frequency == "monthly" {
		// Only increase at the start of each year
		yearIndex = params.PeriodIndex / 12
	} else {
		// Yearly frequency
		yearIndex = params.PeriodIndex
	}

	// (1 + rate)^yearIndex
	exponent := decimal.NewFromInt64(int64(yearIndex), 0)
	multiplier, err := onePlusRate.Pow(exponent)
	if err != nil {
		return nil, err
	}

	// CurrentValue * multiplier
	result, err := params.CurrentValue.Mul(multiplier)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// TieredADBStrategy applies tiered interest based on balance
// Used for: Bank accounts with tiered interest rates (e.g., DBS Multiplier)
type TieredADBStrategy struct{}

// NewTieredADB returns a concrete TieredADBStrategy
func NewTieredADB() TieredADBStrategy {
	return TieredADBStrategy{}
}

func (s TieredADBStrategy) Type() StrategyType {
	return TieredADB
}

func (s TieredADBStrategy) Calculate(params Params) (*decimal.Decimal, error) {
	// For tiered rates, expect metadata with tiers as []map[string]float64
	// This is complex to migrate, so for now return a simple implementation
	// TODO: Redesign tiered strategy to use decimal throughout

	tiers, ok := params.Metadata["tiers"].([]map[string]float64)
	if !ok {
		return params.CurrentValue, nil
	}

	// Find applicable tier (highest tier where balance >= threshold)
	applicableRate := 0.0
	for _, tier := range tiers {
		threshold := decimal.MustFromFloat64(tier["threshold"])
		if params.CurrentValue.Cmp(threshold) >= 0 {
			applicableRate = tier["rate"]
		}
	}

	if applicableRate == 0 {
		return params.CurrentValue, nil
	}

	// Apply compound monthly with the applicable rate
	rate := decimal.MustFromFloat64(applicableRate)
	compoundStrategy := NewCompoundMonthly()
	return compoundStrategy.Calculate(Params{
		CurrentValue: params.CurrentValue,
		Rate:         rate,
		PeriodIndex:  params.PeriodIndex,
		Frequency:    params.Frequency,
		Metadata:     params.Metadata,
	})
}

// FixedStrategy returns the same value (no growth)
// Used for: Items that don't grow (e.g., fixed expenses, expired items)
type FixedStrategy struct{}

// NewFixed returns a concrete FixedStrategy
func NewFixed() FixedStrategy {
	return FixedStrategy{}
}

func (s FixedStrategy) Type() StrategyType {
	return Fixed
}

func (s FixedStrategy) Calculate(params Params) (*decimal.Decimal, error) {
	return params.CurrentValue, nil
}

// GetStrategy returns the appropriate strategy for the given type
// This is a convenience function that returns the Strategy interface
func GetStrategy(strategyType StrategyType) Strategy {
	switch strategyType {
	case CompoundMonthly:
		return NewCompoundMonthly()
	case AnnualStep:
		return NewAnnualStep()
	case TieredADB:
		return NewTieredADB()
	case Fixed:
		return NewFixed()
	default:
		// Default to compound monthly for backward compatibility
		return NewCompoundMonthly()
	}
}
