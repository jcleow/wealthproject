package timeline_v2

import (
	"sort"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
)

// PaymentExecution represents the result of executing a single payment rule.
// Tracks how much was paid from which source to support attribution in the response.
type PaymentExecution struct {
	RuleID       string           `json:"ruleId"`
	RuleName     string           `json:"ruleName"`
	SourceType   string           `json:"sourceType"`   // "cpf" or "cash"
	SourceID     string           `json:"sourceId"`     // ID of the source account
	SourceName   string           `json:"sourceName"`   // Name for display
	TargetType   string           `json:"targetType"`   // "liability" or "property"
	TargetID     string           `json:"targetId"`     // ID of the target
	Amount       *decimal.Decimal `json:"amount"`       // Amount actually paid
	Priority     int              `json:"priority"`     // Rule priority (lower = higher priority)
	AmountType   string           `json:"amountType"`   // "fixed", "max_available", "remainder", etc.
	WasFallback  bool             `json:"wasFallback"`  // True if this was a lower-priority rule covering remainder
}

// FundFlowExecutionResult holds all payment executions for a month
type FundFlowExecutionResult struct {
	// PaymentsByTarget maps target ID (liability or property) to list of payments made
	PaymentsByTarget map[string][]PaymentExecution
}

// executePaymentRules processes all payment-type fund flow rules for the current month.
// Returns a result struct with attribution information for the response.
//
// Payment rules work as follows:
// 1. Rules are grouped by target (liability or property)
// 2. Within each group, rules are sorted by priority (lower number = higher priority)
// 3. Each rule attempts to pay its amount from the source
// 4. "max_available" rules use up to source balance
// 5. "remainder" rules cover whatever is left after higher-priority rules
//
// State is mutated: source balances are decreased by payment amounts.
func executePaymentRules(
	rules []repository.FundFlowRule,
	state map[string]*decimal.Decimal,
	requiredPayments map[string]*decimal.Decimal, // target ID -> monthly payment required
	currentDate time.Time,
) FundFlowExecutionResult {
	result := FundFlowExecutionResult{
		PaymentsByTarget: make(map[string][]PaymentExecution),
	}

	// Filter to only payment rules active at current date
	paymentRules := filterActivePaymentRules(rules, currentDate)
	if len(paymentRules) == 0 {
		return result
	}

	// Group rules by target
	byTarget := groupPaymentsByTarget(paymentRules)

	// Process each target
	for targetID, targetRules := range byTarget {
		required, exists := requiredPayments[targetID]
		if !exists || required == nil || required.IsZero() || required.IsNegative() {
			continue
		}

		executions := executePaymentGroup(targetID, targetRules, state, required)
		if len(executions) > 0 {
			result.PaymentsByTarget[targetID] = executions
		}
	}

	return result
}

// filterActivePaymentRules returns only payment rules that are active on the given date
func filterActivePaymentRules(rules []repository.FundFlowRule, date time.Time) []repository.FundFlowRule {
	var active []repository.FundFlowRule
	for _, rule := range rules {
		if rule.RuleType != "payment" {
			continue
		}
		// Check if rule is active (start_date <= date AND (end_date IS NULL OR end_date >= date))
		if rule.StartDate.After(date) {
			continue
		}
		if rule.EndDate != nil && rule.EndDate.Before(date) {
			continue
		}
		active = append(active, rule)
	}
	return active
}

// groupPaymentsByTarget groups payment rules by their target (liability or property)
func groupPaymentsByTarget(rules []repository.FundFlowRule) map[string][]repository.FundFlowRule {
	byTarget := make(map[string][]repository.FundFlowRule)
	for _, rule := range rules {
		var targetID string
		if rule.TargetLiabilityID != nil {
			targetID = *rule.TargetLiabilityID
		} else if rule.TargetPropertyID != nil {
			targetID = *rule.TargetPropertyID
		} else {
			continue // Invalid payment rule - no target
		}
		byTarget[targetID] = append(byTarget[targetID], rule)
	}
	return byTarget
}

// executePaymentGroup executes all payment rules for a single target in priority order
func executePaymentGroup(
	targetID string,
	rules []repository.FundFlowRule,
	state map[string]*decimal.Decimal,
	required *decimal.Decimal,
) []PaymentExecution {
	// Sort by priority (lower = higher priority)
	sort.Slice(rules, func(i, j int) bool {
		return rules[i].Priority < rules[j].Priority
	})

	remaining := required
	var executions []PaymentExecution
	isFirstExecution := true

	for _, rule := range rules {
		if remaining.IsZero() || remaining.IsNegative() {
			break
		}

		sourceID := getSourceID(rule)
		if sourceID == "" {
			continue
		}

		sourceBalance := state[sourceID]
		if sourceBalance == nil || sourceBalance.IsZero() || sourceBalance.IsNegative() {
			continue
		}

		// Calculate the intended amount based on amount type
		intendedAmount := calculatePaymentAmount(rule, required, remaining, sourceBalance)
		if intendedAmount.IsZero() || intendedAmount.IsNegative() {
			continue
		}

		// Actual amount is minimum of: intended amount, source balance, remaining required
		actualAmount := minDecimal(intendedAmount, sourceBalance, remaining)
		if actualAmount.IsZero() || actualAmount.IsNegative() {
			continue
		}

		// Deduct from source balance
		newBalance := sourceBalance.Sub(actualAmount)
		state[sourceID] = newBalance

		// Track the execution
		execution := PaymentExecution{
			RuleID:      rule.ID,
			RuleName:    rule.Name,
			SourceType:  getSourceType(rule),
			SourceID:    sourceID,
			TargetType:  getTargetType(rule),
			TargetID:    targetID,
			Amount:      actualAmount,
			Priority:    rule.Priority,
			AmountType:  rule.AmountType,
			WasFallback: !isFirstExecution,
		}
		executions = append(executions, execution)

		// Reduce remaining
		remaining = remaining.Sub(actualAmount)
		isFirstExecution = false
	}

	return executions
}

// calculatePaymentAmount determines the intended payment amount based on the rule's amount type
func calculatePaymentAmount(
	rule repository.FundFlowRule,
	required *decimal.Decimal,
	remaining *decimal.Decimal,
	sourceBalance *decimal.Decimal,
) *decimal.Decimal {
	switch rule.AmountType {
	case "fixed":
		// Pay exactly the specified amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		return rule.AmountValue

	case "pct_target", "percentage":
		// Pay percentage of target's required amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		// pct_target: percentage of original required amount
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return required.Mul(percentage)

	case "pct_source":
		// Pay percentage of source balance
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return sourceBalance.Mul(percentage)

	case "target_required":
		// Pay whatever target needs (optionally capped)
		amount := remaining
		if rule.AmountValue != nil && rule.AmountValue.Cmp(amount) < 0 {
			amount = rule.AmountValue
		}
		return amount

	case "max_available":
		// Use up to source balance, capped by remaining required (and optional cap)
		amount := sourceBalance
		if amount.Cmp(remaining) > 0 {
			amount = remaining
		}
		// Apply optional cap
		if rule.AmountValue != nil && amount.Cmp(rule.AmountValue) > 0 {
			amount = rule.AmountValue
		}
		return amount

	case "remainder":
		// Pay whatever is left after higher-priority rules
		return remaining

	default:
		return decimal.Zero()
	}
}

// getSourceID returns the source account ID from a payment rule
func getSourceID(rule repository.FundFlowRule) string {
	if rule.SourceCpfAccountID != nil {
		return *rule.SourceCpfAccountID
	}
	if rule.SourceCashAccountID != nil {
		return *rule.SourceCashAccountID
	}
	return ""
}

// getSourceType returns "cpf" or "cash" based on which source is set
func getSourceType(rule repository.FundFlowRule) string {
	if rule.SourceCpfAccountID != nil {
		return "cpf"
	}
	if rule.SourceCashAccountID != nil {
		return "cash"
	}
	return ""
}

// getTargetType returns "liability" or "property" based on which target is set
func getTargetType(rule repository.FundFlowRule) string {
	if rule.TargetLiabilityID != nil {
		return "liability"
	}
	if rule.TargetPropertyID != nil {
		return "property"
	}
	return ""
}

// minDecimal returns the minimum of the given decimal values
func minDecimal(values ...*decimal.Decimal) *decimal.Decimal {
	if len(values) == 0 {
		return decimal.Zero()
	}
	min := values[0]
	for _, v := range values[1:] {
		if v.Cmp(min) < 0 {
			min = v
		}
	}
	return min
}

// buildRequiredPaymentsMap creates a map of liability/property ID to required monthly payment.
// This is used by executePaymentRules to know how much needs to be paid to each target.
func buildRequiredPaymentsMap(
	liabilities []FinancialDataRow,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
) map[string]*decimal.Decimal {
	required := make(map[string]*decimal.Decimal)

	zero := decimal.Zero()
	for _, liability := range liabilities {
		// Skip inactive liabilities
		if !isLiabilityActiveForPayment(liability, currentDate) {
			continue
		}

		// Get the minimum payment amount for this liability
		// MinimumPay is the monthly payment amount (value type, need address for Cmp)
		minPay := &liability.MinimumPay
		if minPay.Cmp(zero) > 0 {
			required[liability.ID] = minPay
		}
	}

	// TODO: Add property mortgage payments when property integration is complete
	// Properties have their own mortgage payment schedules

	return required
}

// isLiabilityActiveForPayment checks if a liability is active and should receive payments
func isLiabilityActiveForPayment(liability FinancialDataRow, date time.Time) bool {
	// Check start date
	if liability.StartDate.After(date) {
		return false
	}
	// Check end date if set
	if liability.EndDate != nil && liability.EndDate.Before(date) {
		return false
	}
	return true
}
