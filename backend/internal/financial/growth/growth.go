package growth

import "math"

type StrategyType string

const (
	CompoundMonthly StrategyType = "compound_monthly"
	AnnualStep      StrategyType = "annual_step"
	TieredADB       StrategyType = "tiered_adb"
	Fixed           StrategyType = "fixed"
)

// Params contains all parameters needed for growth calculation
type Params struct {
	CurrentValue float64
	Rate         float64
	PeriodIndex  int    // Month or year index (0-based)
	Frequency    string // "monthly" or "yearly"
	Metadata     map[string]interface{}
}

// Strategy is the interface that all growth strategies implement
type Strategy interface {
	Calculate(params Params) float64
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

func (s CompoundMonthlyStrategy) Calculate(params Params) float64 {
	monthlyRate := math.Pow(1+params.Rate/100, 1.0/12.0) - 1
	return params.CurrentValue * (1 + monthlyRate)
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

func (s AnnualStepStrategy) Calculate(params Params) float64 {
	if params.Frequency == "monthly" {
		// Only increase at the start of each year
		yearIndex := params.PeriodIndex / 12
		return params.CurrentValue * math.Pow(1+params.Rate/100, float64(yearIndex))
	}
	// Yearly frequency
	return params.CurrentValue * math.Pow(1+params.Rate/100, float64(params.PeriodIndex))
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

func (s TieredADBStrategy) Calculate(params Params) float64 {
	tiers, ok := params.Metadata["tiers"].([]map[string]float64)
	if !ok {
		return params.CurrentValue
	}

	// Find applicable tier (highest tier where balance >= threshold)
	applicableRate := 0.0
	for _, tier := range tiers {
		if params.CurrentValue >= tier["threshold"] {
			applicableRate = tier["rate"]
		}
	}

	monthlyRate := math.Pow(1+applicableRate/100, 1.0/12.0) - 1
	return params.CurrentValue * (1 + monthlyRate)
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

func (s FixedStrategy) Calculate(params Params) float64 {
	return params.CurrentValue
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
