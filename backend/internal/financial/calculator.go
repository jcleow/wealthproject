package financial

import (
	"fmt"
	"math"
)

// FinancialCalculator provides financial calculation utilities
type FinancialCalculator struct{}

// NewFinancialCalculator creates a new financial calculator
func NewFinancialCalculator() *FinancialCalculator {
	return &FinancialCalculator{}
}

// CalculateImpact calculates the financial impact of an action
func (c *FinancialCalculator) CalculateImpact(toolName string, args map[string]interface{}) *ImpactEstimate {
	switch toolName {
	case "createAsset":
		return c.calculateAssetImpact(args, false)
	case "updateAsset":
		return c.calculateAssetUpdateImpact(args)
	case "deleteAsset":
		return c.calculateAssetDeleteImpact(args)
	case "createLiability":
		return c.calculateLiabilityImpact(args, false)
	case "updateLiability":
		return c.calculateLiabilityUpdateImpact(args)
	case "deleteLiability":
		return c.calculateLiabilityDeleteImpact(args)
	case "createIncome":
		return c.calculateIncomeImpact(args, false)
	case "updateIncome":
		return c.calculateIncomeImpact(args, true)
	case "deleteIncome":
		return c.calculateIncomeDeleteImpact(args)
	case "createExpense":
		return c.calculateExpenseImpact(args, false)
	case "updateExpense":
		return c.calculateExpenseImpact(args, true)
	case "deleteExpense":
		return c.calculateExpenseDeleteImpact(args)
	case "createPropertyScenario":
		return c.calculatePropertyScenarioImpact(args)
	default:
		return &ImpactEstimate{
			NetWorthChange: 0,
			Description:    "Impact calculation not available for this action",
		}
	}
}

// calculateAssetImpact calculates impact of creating/updating an asset
func (c *FinancialCalculator) calculateAssetImpact(args map[string]interface{}, isUpdate bool) *ImpactEstimate {
	value := getFloatParam(args, "currentValue", 0)
	category := getStringParam(args, "category", "")

	var description string
	if isUpdate {
		// For updates, we'd need the previous value to calculate the change
		// For now, assume positive impact
		description = fmt.Sprintf("Updates asset value to %s", formatCurrency(value))
	} else {
		description = fmt.Sprintf("Increases net worth by %s", formatCurrency(value))
	}

	// Estimate monthly cash flow impact for income-generating assets
	var monthlyChange float64
	if category == "stocks_portfolio" || category == "bonds_investment" {
		// Assume 3% annual dividend yield
		monthlyChange = value * 0.03 / 12
	}

	return &ImpactEstimate{
		NetWorthChange: value,
		MonthlyChange:  monthlyChange,
		Description:    description,
	}
}

// calculateAssetUpdateImpact calculates impact of updating an asset
func (c *FinancialCalculator) calculateAssetUpdateImpact(args map[string]interface{}) *ImpactEstimate {
	// For asset updates, we don't know the previous value, so we can't calculate exact impact
	if _, exists := args["currentValue"]; exists {
		value := getFloatParam(args, "currentValue", 0)
		return &ImpactEstimate{
			NetWorthChange: 0, // Would need previous value to calculate change
			Description:    fmt.Sprintf("Updates asset value to %s (exact impact depends on previous value)", formatCurrency(value)),
		}
	}

	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    "Updates asset details (no value change)",
	}
}

// calculateAssetDeleteImpact estimates impact of deleting an asset.
func (c *FinancialCalculator) calculateAssetDeleteImpact(args map[string]interface{}) *ImpactEstimate {
	name := getStringParam(args, "name", "asset")
	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    fmt.Sprintf("Remove %s from your records (impact depends on its last recorded value)", name),
	}
}

// calculateLiabilityImpact calculates impact of creating/updating a liability
func (c *FinancialCalculator) calculateLiabilityImpact(args map[string]interface{}, isUpdate bool) *ImpactEstimate {
	balance := getFloatParam(args, "currentBalance", 0)
	rate := getFloatParam(args, "interestRate", 0)
	monthlyPayment := getFloatParam(args, "monthlyPayment", 0)
	tenure := getIntParam(args, "loanTenure", 25)

	var description string
	if isUpdate {
		description = fmt.Sprintf("Updates liability balance to %s", formatCurrency(balance))
	} else {
		description = fmt.Sprintf("Decreases net worth by %s", formatCurrency(balance))
	}

	// If monthly payment is not provided, estimate it
	if monthlyPayment == 0 && balance > 0 && rate > 0 {
		if tenure <= 0 {
			tenure = 25
		}
		monthlyPayment = c.CalculateMonthlyPayment(balance, rate, tenure)
	}

	return &ImpactEstimate{
		NetWorthChange: -balance,        // Liability decreases net worth
		MonthlyChange:  -monthlyPayment, // Monthly payment reduces cash flow
		Description:    description,
	}
}

// calculateLiabilityUpdateImpact calculates impact of updating a liability
func (c *FinancialCalculator) calculateLiabilityUpdateImpact(args map[string]interface{}) *ImpactEstimate {
	if _, exists := args["currentBalance"]; exists {
		balance := getFloatParam(args, "currentBalance", 0)
		return &ImpactEstimate{
			NetWorthChange: 0, // Would need previous value to calculate change
			Description:    fmt.Sprintf("Updates liability balance to %s (exact impact depends on previous balance)", formatCurrency(balance)),
		}
	}

	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    "Updates liability details (no balance change)",
	}
}

// calculateLiabilityDeleteImpact estimates impact of deleting a liability.
func (c *FinancialCalculator) calculateLiabilityDeleteImpact(args map[string]interface{}) *ImpactEstimate {
	name := getStringParam(args, "name", "liability")
	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    fmt.Sprintf("Remove %s from your records (impact depends on its last recorded balance)", name),
	}
}

// calculateIncomeImpact estimates impact of creating/updating income.
func (c *FinancialCalculator) calculateIncomeImpact(args map[string]interface{}, isUpdate bool) *ImpactEstimate {
	amount := getFloatParam(args, "amount", 0)
	freq := getStringParam(args, "frequency", "monthly")
	monthly := normalizeToMonthly(amount, freq)
	desc := fmt.Sprintf("%s income of %s (%s)", ternary(isUpdate, "Update", "Add"), formatCurrency(amount), freq)
	return &ImpactEstimate{
		NetWorthChange: 0,
		MonthlyChange:  monthly,
		Description:    desc,
	}
}

// calculateIncomeDeleteImpact estimates impact of deleting an income.
func (c *FinancialCalculator) calculateIncomeDeleteImpact(args map[string]interface{}) *ImpactEstimate {
	name := getStringParam(args, "name", "income")
	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    fmt.Sprintf("Remove income source %s (impact depends on its recurring amount)", name),
	}
}

// calculateExpenseImpact estimates impact of creating/updating an expense.
func (c *FinancialCalculator) calculateExpenseImpact(args map[string]interface{}, isUpdate bool) *ImpactEstimate {
	amount := getFloatParam(args, "amount", 0)
	freq := getStringParam(args, "frequency", "monthly")
	monthly := normalizeToMonthly(amount, freq)
	desc := fmt.Sprintf("%s expense of %s (%s)", ternary(isUpdate, "Update", "Add"), formatCurrency(amount), freq)
	return &ImpactEstimate{
		NetWorthChange: 0,
		MonthlyChange:  -monthly,
		Description:    desc,
	}
}

// calculateExpenseDeleteImpact estimates impact of deleting an expense.
func (c *FinancialCalculator) calculateExpenseDeleteImpact(args map[string]interface{}) *ImpactEstimate {
	name := getStringParam(args, "name", "expense")
	return &ImpactEstimate{
		NetWorthChange: 0,
		Description:    fmt.Sprintf("Remove expense %s (impact depends on its recurring amount)", name),
	}
}

// normalizeToMonthly converts an arbitrary frequency amount to a monthly estimate.
func normalizeToMonthly(amount float64, frequency string) float64 {
	switch frequency {
	case "weekly":
		return amount * 52 / 12
	case "biweekly":
		return amount * 26 / 12
	case "quarterly":
		return amount / 3
	case "annual", "annually":
		return amount / 12
	default: // monthly or unknown
		return amount
	}
}

func ternary[T any](cond bool, a, b T) T {
	if cond {
		return a
	}
	return b
}

// calculatePropertyScenarioImpact calculates impact of a property scenario
func (c *FinancialCalculator) calculatePropertyScenarioImpact(args map[string]interface{}) *ImpactEstimate {
	propertyPrice := getFloatParam(args, "propertyPrice", 0)
	downPayment := getFloatParam(args, "downPayment", 0)
	loanAmount := getFloatParam(args, "loanAmount", 0)
	rate := getFloatParam(args, "interestRate", 0)
	tenure := getIntParam(args, "loanTenure", 25)

	// Net worth impact: property value minus down payment (since loan is a liability)
	netWorthChange := propertyPrice - downPayment

	// Monthly payment calculation
	monthlyPayment := c.CalculateMonthlyPayment(loanAmount, rate, tenure)

	// Estimate monthly property costs (maintenance, property tax, etc.)
	monthlyCosts := propertyPrice * 0.003 / 12 // 0.3% of property value annually

	totalMonthlyCost := monthlyPayment + monthlyCosts

	description := fmt.Sprintf("Property acquisition: %s asset, %s down payment, %s monthly payment",
		formatCurrency(propertyPrice), formatCurrency(downPayment), formatCurrency(totalMonthlyCost))

	return &ImpactEstimate{
		NetWorthChange: netWorthChange,
		MonthlyChange:  -totalMonthlyCost, // Negative because it's a monthly outflow
		Description:    description,
	}
}

// CalculateMonthlyPayment calculates monthly payment for a loan
func (c *FinancialCalculator) CalculateMonthlyPayment(principal, annualRate float64, years int) float64 {
	if annualRate == 0 {
		return principal / float64(years*12)
	}

	monthlyRate := annualRate / 12
	numPayments := float64(years * 12)

	// Standard mortgage payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
	numerator := monthlyRate * math.Pow(1+monthlyRate, numPayments)
	denominator := math.Pow(1+monthlyRate, numPayments) - 1

	return principal * (numerator / denominator)
}

// CalculateTotalInterest calculates total interest paid over loan term
func (c *FinancialCalculator) CalculateTotalInterest(principal, annualRate float64, years int) float64 {
	monthlyPayment := c.CalculateMonthlyPayment(principal, annualRate, years)
	totalPayments := monthlyPayment * float64(years*12)
	return totalPayments - principal
}

// CalculateEquityBuilding calculates equity building over time
func (c *FinancialCalculator) CalculateEquityBuilding(principal, annualRate float64, years int, monthsElapsed int) float64 {
	if monthsElapsed <= 0 {
		return 0
	}

	monthlyRate := annualRate / 12
	numPayments := float64(years * 12)

	// Calculate remaining balance after monthsElapsed
	remainingBalance := principal * ((math.Pow(1+monthlyRate, numPayments) - math.Pow(1+monthlyRate, float64(monthsElapsed))) /
		(math.Pow(1+monthlyRate, numPayments) - 1))

	return principal - remainingBalance
}

// CalculateAffordability calculates affordability metrics
func (c *FinancialCalculator) CalculateAffordability(monthlyIncome, monthlyDebts, propertyPrice, downPayment, rate float64, years int) AffordabilityResult {
	loanAmount := propertyPrice - downPayment
	monthlyPayment := c.CalculateMonthlyPayment(loanAmount, rate, years)

	// Total monthly debt including new mortgage
	totalMonthlyDebt := monthlyDebts + monthlyPayment

	// Debt service ratios
	dsr := totalMonthlyDebt / monthlyIncome
	msr := monthlyPayment / monthlyIncome

	// Singapore typical limits
	dsrLimit := 0.55 // 55% DSR limit
	msrLimit := 0.30 // 30% MSR limit

	return AffordabilityResult{
		MonthlyPayment:     monthlyPayment,
		DSR:                dsr,
		MSR:                msr,
		DSRWithinLimit:     dsr <= dsrLimit,
		MSRWithinLimit:     msr <= msrLimit,
		MaxAffordablePrice: c.calculateMaxAffordablePrice(monthlyIncome, monthlyDebts, rate, years, downPayment),
	}
}

// calculateMaxAffordablePrice calculates maximum affordable property price
func (c *FinancialCalculator) calculateMaxAffordablePrice(monthlyIncome, monthlyDebts, rate float64, years int, downPaymentRatio float64) float64 {
	// Use 30% MSR limit
	maxMonthlyPayment := monthlyIncome * 0.30

	// Calculate maximum loan amount based on payment
	if rate == 0 {
		maxLoanAmount := maxMonthlyPayment * float64(years*12)
		maxPrice := maxLoanAmount / (1 - downPaymentRatio)
		return maxPrice
	}

	monthlyRate := rate / 12
	numPayments := float64(years * 12)

	// Reverse mortgage payment formula to get principal
	factor := (math.Pow(1+monthlyRate, numPayments) - 1) / (monthlyRate * math.Pow(1+monthlyRate, numPayments))
	maxLoanAmount := maxMonthlyPayment * factor

	// Add down payment to get total affordable price
	maxPrice := maxLoanAmount / (1 - downPaymentRatio)
	return maxPrice
}

// AffordabilityResult represents affordability analysis results
type AffordabilityResult struct {
	MonthlyPayment     float64 `json:"monthly_payment"`
	DSR                float64 `json:"dsr"`
	MSR                float64 `json:"msr"`
	DSRWithinLimit     bool    `json:"dsr_within_limit"`
	MSRWithinLimit     bool    `json:"msr_within_limit"`
	MaxAffordablePrice float64 `json:"max_affordable_price"`
}
