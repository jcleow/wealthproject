package growth

import (
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// PeriodConfig defines a single growth period with its rate and strategy
type PeriodConfig struct {
	StartDate      time.Time        // When this growth period begins
	EndDate        *time.Time       // When this period ends (nil = indefinite)
	AnnualRatePct  *decimal.Decimal // Annual growth rate as percentage (e.g., 3.0 for 3%)
	StrategyName   string           // Name of the strategy ("annual_step", "monthly_compound", etc.)
}

// MultiPeriodCalculator handles growth calculations across multiple periods
// with potentially different rates and strategies for each period.
type MultiPeriodCalculator struct {
	registry *Registry
}

// NewMultiPeriodCalculator creates a new multi-period calculator
func NewMultiPeriodCalculator() *MultiPeriodCalculator {
	return &MultiPeriodCalculator{
		registry: NewRegistry(),
	}
}

// NewMultiPeriodCalculatorWithRegistry creates a calculator with a custom registry
func NewMultiPeriodCalculatorWithRegistry(registry *Registry) *MultiPeriodCalculator {
	return &MultiPeriodCalculator{
		registry: registry,
	}
}

// CalculateValueAtDate calculates the value at a specific target date,
// applying the appropriate growth from each period in sequence.
//
// Parameters:
//   - initialValue: the starting value (e.g., property purchase price)
//   - purchaseDate: when the asset was acquired (growth starts from here)
//   - targetDate: the date to calculate the value for
//   - periods: list of growth periods with their rates and strategies
//
// The calculation:
//  1. Iterates through each year from purchase to target
//  2. For each year, finds the applicable period and applies growth
//  3. Respects period boundaries (StartDate/EndDate)
//  4. Returns the final compounded value
func (c *MultiPeriodCalculator) CalculateValueAtDate(
	initialValue *decimal.Decimal,
	purchaseDate time.Time,
	targetDate time.Time,
	periods []PeriodConfig,
) *decimal.Decimal {
	if initialValue == nil || len(periods) == 0 {
		return initialValue
	}

	// No growth if target is before or at purchase date
	if !targetDate.After(purchaseDate) {
		return initialValue
	}

	currentValue := initialValue

	// Iterate year by year from purchase to target
	startYear := purchaseDate.Year()
	endYear := targetDate.Year()

	for year := startYear + 1; year <= endYear; year++ {
		// Find the period applicable to this year
		yearDate := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
		period := c.findApplicablePeriodForYear(year, periods)

		if period == nil {
			continue // No growth defined for this year
		}

		// Get the strategy for this period
		strategyName := period.StrategyName
		if strategyName == "" {
			strategyName = StrategyAnnualStep
		}

		strategy, err := c.registry.Get(strategyName)
		if err != nil {
			// Fall back to annual_step if strategy not found
			strategy, _ = c.registry.Get(StrategyAnnualStep)
		}

		// Apply growth for this year
		params := Params{
			AnnualRatePct: period.AnnualRatePct,
		}

		// For annual_step, we need currentMonth > 12 and monthOfYear == 1
		// Calculate the absolute month index (years since purchase * 12 + January)
		yearsSincePurchase := year - startYear
		currentMonth := yearsSincePurchase*12 + 1 // January of this year
		monthOfYear := 1                          // January

		// Ensure currentMonth is past the first year for annual_step to trigger
		if currentMonth <= 12 {
			currentMonth = 13 // Force into year 2+ range
		}

		currentValue = strategy.Apply(currentValue, params, currentMonth, monthOfYear)
		_ = yearDate // Suppress unused warning
	}

	return currentValue
}

// findApplicablePeriodForYear returns the period that applies to a given year
func (c *MultiPeriodCalculator) findApplicablePeriodForYear(year int, periods []PeriodConfig) *PeriodConfig {
	for i := range periods {
		period := &periods[i]

		// Check if year is within this period's range
		if year < period.StartDate.Year() {
			continue
		}
		if period.EndDate != nil && year > period.EndDate.Year() {
			continue
		}

		return period
	}
	return nil
}

// CalculateValueAtMonth provides more granular month-by-month growth calculation.
// This is useful for strategies like monthly_compound that need month-level precision.
//
// Parameters:
//   - initialValue: the starting value
//   - purchaseDate: when the asset was acquired
//   - targetDate: the target month to calculate value for
//   - periods: list of growth periods
//
// Returns the value at the target month after applying all applicable growth.
func (c *MultiPeriodCalculator) CalculateValueAtMonth(
	initialValue *decimal.Decimal,
	purchaseDate time.Time,
	targetDate time.Time,
	periods []PeriodConfig,
) *decimal.Decimal {
	if initialValue == nil || len(periods) == 0 {
		return initialValue
	}

	// No growth if target is before or at purchase date
	if !targetDate.After(purchaseDate) {
		return initialValue
	}

	currentValue := initialValue

	// Calculate total months between purchase and target
	totalMonths := monthsBetween(purchaseDate, targetDate)
	if totalMonths <= 0 {
		return currentValue
	}

	// Process month by month
	// Note: We iterate starting from the first month AFTER purchase
	// currentMonth is passed directly to the strategy which handles its own logic
	currentTime := purchaseDate
	for monthIdx := 1; monthIdx <= totalMonths; monthIdx++ {
		// Advance to next month
		currentTime = currentTime.AddDate(0, 1, 0)

		// Find the applicable period for this month
		period := c.findApplicablePeriod(currentTime, periods)
		if period == nil {
			continue // No growth defined for this month
		}

		// Get the strategy
		strategyName := period.StrategyName
		if strategyName == "" {
			strategyName = StrategyAnnualStep
		}

		strategy, err := c.registry.Get(strategyName)
		if err != nil {
			strategy, _ = c.registry.Get(StrategyAnnualStep)
		}

		// Apply growth for this month
		params := Params{
			AnnualRatePct: period.AnnualRatePct,
		}

		monthOfYear := int(currentTime.Month())
		currentMonth := monthIdx

		currentValue = strategy.Apply(currentValue, params, currentMonth, monthOfYear)
	}

	return currentValue
}

// findApplicablePeriod returns the period that applies to a given date
func (c *MultiPeriodCalculator) findApplicablePeriod(date time.Time, periods []PeriodConfig) *PeriodConfig {
	for i := range periods {
		period := &periods[i]

		// Check if date is within this period's range
		if date.Before(period.StartDate) {
			continue
		}
		if period.EndDate != nil && date.After(*period.EndDate) {
			continue
		}

		return period
	}
	return nil
}

// monthsBetween calculates the number of months between two dates
func monthsBetween(start, end time.Time) int {
	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())
	return years*12 + months
}
