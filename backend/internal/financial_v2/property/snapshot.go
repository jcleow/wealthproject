package property

import (
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// PropertySnapshot represents a property scenario in the timeline
type PropertySnapshot struct {
	ID              string                `json:"id"`
	Name            string                `json:"name"`
	Icon            *string               `json:"icon"`
	IconColor       *string               `json:"iconColor"`
	PropertyValue   decimal.Decimal       `json:"propertyValue"`   // Current/projected value at this point
	MortgageBalance decimal.Decimal       `json:"mortgageBalance"` // Current/projected outstanding balance
	NetEquity       decimal.Decimal       `json:"netEquity"`       // PropertyValue - MortgageBalance
	PurchaseDate    string                `json:"purchaseDate"`    // First rate period start_month
	SaleDate        *string               `json:"saleDate,omitempty"`
	Fees            []PropertyFeeSnapshot `json:"fees"`
}

// PropertyFeeSnapshot represents a fee associated with a property event
type PropertyFeeSnapshot struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	FeeContext string          `json:"feeContext"` // "purchase", "recurring", "sale"
	Amount     decimal.Decimal `json:"amount"`     // Computed amount
	Date       string          `json:"date"`       // When the fee is due
}

// PropertyFeeExpense represents a property fee converted to an expense format
// for use in timeline responses. This allows the property module to handle
// the conversion logic instead of the timeline service.
type PropertyFeeExpense struct {
	ID                   string
	ParentID             string // Property scenario ID
	Name                 string
	Category             string          // "purchase", "recurring", "sale"
	Amount               decimal.Decimal // Monthly amount
	EventAdjAmount       decimal.Decimal // Same as Amount (no scenario adjustment for property fees)
	AnnualAmount         decimal.Decimal // For recurring: Amount * 12, otherwise same as Amount
	EventAdjAnnualAmount decimal.Decimal // Same as AnnualAmount
	SourceFrequency      string          // "one_time" or "monthly"
	ItemType             string          // "property_fee"
	StartYear            int
	StartMonth           int
	ScenarioEventID      *string // Points to property scenario ID
	Icon                 *string
	IconColor            *string
}

// ToExpenses converts property fees from this snapshot to PropertyFeeExpense slice
// for use in timeline expense responses
func (s *PropertySnapshot) ToExpenses(currentDate time.Time) []PropertyFeeExpense {
	expenses := make([]PropertyFeeExpense, 0, len(s.Fees))
	propScenarioID := s.ID

	for _, fee := range s.Fees {
		// Parse fee date to get year and month
		feeYear, feeMonth := currentDate.Year(), int(currentDate.Month())
		if feeDate, err := time.Parse("2006-01", fee.Date); err == nil {
			feeYear = feeDate.Year()
			feeMonth = int(feeDate.Month())
		}

		// Determine frequency based on fee context
		sourceFrequency := "one_time"
		if fee.FeeContext == "recurring" {
			sourceFrequency = "monthly"
		}

		// Calculate annual amount (one-time = same as monthly, recurring = monthly * 12)
		annualAmount := fee.Amount
		if fee.FeeContext == "recurring" {
			twelve := decimal.MustFromFloat64(12)
			annualAmount = *fee.Amount.Mul(twelve)
		}

		expenses = append(expenses, PropertyFeeExpense{
			ID:                   fee.ID,
			ParentID:             propScenarioID,
			Name:                 fee.Name,
			Category:             fee.FeeContext, // "purchase", "recurring", "sale"
			Amount:               fee.Amount,
			EventAdjAmount:       fee.Amount,
			AnnualAmount:         annualAmount,
			EventAdjAnnualAmount: annualAmount,
			SourceFrequency:      sourceFrequency,
			ItemType:             "property_fee",
			StartYear:            feeYear,
			StartMonth:           feeMonth,
			ScenarioEventID:      &propScenarioID,
			Icon:                 s.Icon,
			IconColor:            s.IconColor,
		})
	}

	return expenses
}

// SnapshotBuilder handles building property snapshots for the timeline
type SnapshotBuilder struct {
	growthRegistry *growth.Registry
}

// NewSnapshotBuilder creates a new snapshot builder
func NewSnapshotBuilder() *SnapshotBuilder {
	return &SnapshotBuilder{
		growthRegistry: growth.NewRegistry(),
	}
}

// BuildPropertySnapshots builds property snapshot responses for the given month.
// Only includes properties where the purchase date is on or before the current date
// and either no sale date or sale date is after the current date.
func (b *SnapshotBuilder) BuildPropertySnapshots(properties []repo.PropertyScenarioFull, date time.Time) ([]PropertySnapshot, *decimal.Decimal, *decimal.Decimal) {
	snapshots := make([]PropertySnapshot, 0)
	propertyTotal := decimal.Zero()
	mortgageTotal := decimal.Zero()

	dateStr := date.Format("2006-01")

	for _, prop := range properties {
		if prop.SGDetails == nil {
			continue
		}
		details := prop.SGDetails

		// Get purchase date from first rate period
		// If no rate periods exist, skip this property as we can't determine when it was purchased
		var purchaseDate string
		if len(prop.RatePeriods) > 0 {
			purchaseDate = prop.RatePeriods[0].StartDate.Format("2006-01")
		} else {
			// No rate periods means no mortgage data - skip property as we can't determine purchase date
			continue
		}

		// Parse purchase date
		purchaseTime, err := time.Parse("2006-01", purchaseDate)
		if err != nil {
			continue
		}

		// Skip if property not yet purchased
		if date.Before(purchaseTime) {
			continue
		}

		// Check if property has been sold
		var saleDate *string
		if details.SaleExpectedDate != nil && *details.SaleExpectedDate != "" {
			saleDate = details.SaleExpectedDate
			saleTime, err := time.Parse("2006-01", *details.SaleExpectedDate)
			if err == nil && !date.Before(saleTime) {
				// Property has been sold, skip it
				continue
			}
		}

		// Calculate property value with appreciation
		propertyValue := &details.PropertyPrice
		if len(prop.GrowthPeriods) > 0 {
			propertyValue = b.calculatePropertyValueAtDate(&details.PropertyPrice, prop.GrowthPeriods, purchaseTime, date)
		}

		// Calculate total grants
		grantsTotal := decimal.Zero()
		for _, g := range prop.Grants {
			grantsTotal = grantsTotal.Add(&g.Amount)
		}

		// Calculate mortgage balance at this date
		mortgageBalance := b.calculateMortgageBalanceAtDate(prop.RatePeriods, details, grantsTotal, purchaseTime, date)

		// Build fee snapshots for fees applicable to this month
		feeSnapshots := b.BuildPropertyFeeSnapshots(prop.Fees, details, dateStr)

		netEquity := propertyValue.Sub(mortgageBalance)

		snapshot := PropertySnapshot{
			ID:              prop.Scenario.ID,
			Name:            details.Name,
			Icon:            details.Icon,
			IconColor:       details.IconColor,
			PropertyValue:   *propertyValue.Round(0),
			MortgageBalance: *mortgageBalance.Round(0),
			NetEquity:       *netEquity.Round(0),
			PurchaseDate:    purchaseDate,
			SaleDate:        saleDate,
			Fees:            feeSnapshots,
		}
		snapshots = append(snapshots, snapshot)

		propertyTotal = propertyTotal.Add(propertyValue)
		mortgageTotal = mortgageTotal.Add(mortgageBalance)
	}

	return snapshots, propertyTotal, mortgageTotal
}

// calculatePropertyValueAtDate applies growth periods to get property value at a specific date
// using the growth module for accurate decimal calculations
func (b *SnapshotBuilder) calculatePropertyValueAtDate(initialPrice *decimal.Decimal, periods []repo.GrowthPeriod, purchaseDate, targetDate time.Time) *decimal.Decimal {
	value := initialPrice

	// Growth periods use StartDate/EndDate (timestamptz)
	for _, period := range periods {
		periodStartYear := period.StartDate.Year()
		if targetDate.Year() < periodStartYear {
			continue
		}
		if period.EndDate != nil && targetDate.Year() > period.EndDate.Year() {
			continue
		}

		startYear := periodStartYear
		if purchaseDate.Year() > startYear {
			startYear = purchaseDate.Year()
		}

		yearsOfGrowth := targetDate.Year() - startYear
		if yearsOfGrowth <= 0 {
			continue
		}

		// Get the growth strategy from the registry (default to annual_step if not found)
		strategyName := period.GrowthStrategy
		if strategyName == "" {
			strategyName = growth.StrategyAnnualStep
		}

		strategy, err := b.growthRegistry.Get(strategyName)
		if err != nil {
			// Fall back to annual_step if strategy not found
			strategy, _ = b.growthRegistry.Get(growth.StrategyAnnualStep)
		}

		// Apply growth for each year using the growth module's strategy
		params := growth.Params{
			AnnualRatePct: &period.GrowthRate,
		}

		// For property appreciation, we apply annual growth
		// Calculate the month index for each January after purchase
		for year := 1; year <= yearsOfGrowth; year++ {
			// currentMonth is the absolute month (e.g., year 2 = month 13-24)
			// Apply in January (month 1 of that year)
			currentMonth := year*12 + 1 // January of the target year
			monthOfYear := 1             // January
			value = strategy.Apply(value, params, currentMonth, monthOfYear)
		}
	}

	return value
}

// calculateMortgageBalanceAtDate calculates the outstanding mortgage balance at a specific date
// using decimal arithmetic for precision
func (b *SnapshotBuilder) calculateMortgageBalanceAtDate(periods []repo.LiabilityRatePeriod, details *repo.PropertySG, grantsTotal *decimal.Decimal, purchaseDate, targetDate time.Time) *decimal.Decimal {
	if len(periods) == 0 {
		return decimal.Zero()
	}

	// Calculate initial loan amount: PropertyPrice - Downpayment - Grants
	loanAmount := details.PropertyPrice.Sub(&details.DownpaymentCash).Sub(&details.DownpaymentCpfOa).Sub(grantsTotal)
	if loanAmount.Sign() <= 0 {
		return decimal.Zero()
	}

	months := monthsBetween(purchaseDate, targetDate)
	if months <= 0 {
		return loanAmount
	}

	totalMonths := 0
	for _, period := range periods {
		totalMonths += period.TermYears * 12
	}

	if totalMonths == 0 {
		return loanAmount
	}

	// Use decimal arithmetic for accurate calculation
	totalMonthsDecimal := decimal.MustFromFloat64(float64(totalMonths))
	monthsElapsedDecimal := decimal.MustFromFloat64(float64(months))

	// Calculate monthly principal payment: loanAmount / totalMonths
	monthlyPrincipal := loanAmount.Div(totalMonthsDecimal)

	// Calculate total principal paid: monthlyPrincipal * monthsElapsed
	paidPrincipal := monthlyPrincipal.Mul(monthsElapsedDecimal)

	// If paid principal exceeds loan amount, loan is fully repaid
	// Cmp returns -1 if paidPrincipal < loanAmount, 0 if equal, 1 if greater
	if paidPrincipal.Cmp(loanAmount) >= 0 {
		return decimal.Zero()
	}

	// Remaining balance: loanAmount - paidPrincipal
	return loanAmount.Sub(paidPrincipal)
}

// BuildPropertyFeeSnapshots builds fee snapshots for fees applicable to a specific month
func (b *SnapshotBuilder) BuildPropertyFeeSnapshots(fees []repo.PropertyFee, details *repo.PropertySG, dateStr string) []PropertyFeeSnapshot {
	snapshots := make([]PropertyFeeSnapshot, 0)

	for _, fee := range fees {
		var feeDate string
		switch fee.FeeContext {
		case "purchase":
			// Purchase fees (e.g., renovation) occur on their start_date
			if fee.StartDate == nil {
				continue
			}
			feeStartMonth := fee.StartDate.Format("2006-01")
			// Only include if this is the month the fee occurs
			if feeStartMonth != dateStr {
				continue
			}
			feeDate = feeStartMonth
		case "recurring":
			feeDate = dateStr
		case "sale":
			if details.SaleExpectedDate != nil {
				feeDate = *details.SaleExpectedDate
			} else {
				continue
			}
		default:
			continue
		}

		var amount decimal.Decimal
		if fee.IsPercentage {
			feeFloat, _ := fee.Amount.Float64()
			priceFloat, _ := details.PropertyPrice.Float64()
			percentage := feeFloat / 100.0
			amount = *decimal.MustFromFloat64(priceFloat * percentage)
		} else {
			amount = fee.Amount
		}

		name := fee.FeeType
		if fee.Description != nil && *fee.Description != "" {
			name = *fee.Description
		}

		snapshots = append(snapshots, PropertyFeeSnapshot{
			ID:         fee.ID,
			Name:       name,
			FeeContext: fee.FeeContext,
			Amount:     amount,
			Date:       feeDate,
		})
	}

	return snapshots
}

// monthsBetween calculates the number of months between two dates
func monthsBetween(start, end time.Time) int {
	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())
	return years*12 + months
}
