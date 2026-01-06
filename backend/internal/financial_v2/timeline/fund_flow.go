package timeline_v2

import (
	"sort"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
)

// Fund flow rule type constants
const (
	RuleTypePayment  = "payment"
	RuleTypeTransfer = "transfer"
)

// Amount type constants for payment rules
const (
	AmountTypeFixed          = "fixed"
	AmountTypePctTarget      = "pct_target"
	AmountTypePctSource      = "pct_source"
	AmountTypeTargetRequired = "target_required"
	AmountTypeMaxAvailable   = "max_available"
	AmountTypeRemainder      = "remainder"
)

// Source type constants
const (
	SourceTypeCPF        = "cpf"
	SourceTypeCash       = "cash"
	SourceTypeInvestment = "investment"
	SourceTypeProperty   = "property"
)

// Target type constants for payment rules
const (
	TargetTypeLiability = "liability"
	TargetTypeProperty  = "property"
)

// Target type constants for transfer rules
const (
	TargetTypeCPF        = "cpf"
	TargetTypeCash       = "cash"
	TargetTypeInvestment = "investment"
)

// SourceBalanceMap maps account IDs to their current balances.
// Keys are account IDs (CPF account IDs or cash account IDs).
// Values are the current balance available for payments.
type SourceBalanceMap map[string]*decimal.Decimal

// RequiredPaymentMap maps target IDs to their required monthly payments.
// Keys are liability or property IDs.
// Values are the monthly payment amount required.
type RequiredPaymentMap map[string]*decimal.Decimal

// RulesByTargetMap groups fund flow rules by their target entity.
// Keys are target IDs (liability or property IDs).
// Values are slices of rules that apply to that target.
type RulesByTargetMap map[string][]repository.FundFlowRule

// PaymentExecution represents the result of executing a single payment rule.
// Tracks how much was paid from which source to support attribution in the response.
type PaymentExecution struct {
	RuleID     string           `json:"ruleId"`
	RuleName   string           `json:"ruleName"`
	SourceType string           `json:"sourceType"` // SourceTypeCPF or SourceTypeCash
	SourceID   string           `json:"sourceId"`   // ID of the source account
	SourceName string           `json:"sourceName"` // Name for display
	TargetType string           `json:"targetType"` // TargetTypeLiability or TargetTypeProperty
	TargetID   string           `json:"targetId"`   // ID of the target
	Amount     *decimal.Decimal `json:"amount"`     // Amount actually paid
	Priority   int              `json:"priority"`   // Rule priority (lower = higher priority)
	AmountType string           `json:"amountType"` // One of the AmountType* constants

	// WasFallback indicates whether this payment came from a lower-priority fallback rule.
	// This is useful for understanding payment attribution:
	// - false: This was the primary source (highest priority rule that could pay)
	// - true: This was a secondary source covering the remainder after higher-priority rules
	// Example: If CPF (priority 1) pays $800 and Cash (priority 2) covers remaining $200,
	// the Cash payment would have WasFallback=true.
	WasFallback bool `json:"wasFallback"`
}

// FundFlowExecutionResult holds all payment executions for a month
type FundFlowExecutionResult struct {
	// PaymentsByTarget maps target ID (liability or property) to list of payments made
	PaymentsByTarget map[string][]PaymentExecution
}

// TransferExecution represents the result of executing a single transfer rule.
// Transfer rules move money between accounts (not income→account like allocations,
// and not account→liability like payments).
//
// Supported transfer directions:
//   - CPF → Cash (withdrawals at age 55+)
//   - Cash → CPF (voluntary top-ups to SA/MA/RA)
//   - Investment → Cash (liquidation/drawdown)
//   - Cash → Investment (contributions beyond income allocation)
//   - Property → Cash/CPF (sale proceeds - future phase)
type TransferExecution struct {
	RuleID     string           `json:"ruleId"`
	RuleName   string           `json:"ruleName"`
	SourceType string           `json:"sourceType"` // "cpf", "cash", "investment", "property"
	SourceID   string           `json:"sourceId"`   // ID of the source account
	SourceName string           `json:"sourceName"` // Source account name for display
	TargetType string           `json:"targetType"` // "cpf", "cash", "investment"
	TargetID   string           `json:"targetId"`   // ID of the target account
	TargetName string           `json:"targetName"` // Target account name for display
	Amount     *decimal.Decimal `json:"amount"`     // Amount actually transferred
	Priority   int              `json:"priority"`   // Rule priority (lower = higher priority)
	AmountType string           `json:"amountType"` // One of the AmountType* constants

	// WasFallback is true if this was a lower-priority rule covering remainder.
	// For transfers, this typically means a backup source was used after
	// the primary source was exhausted.
	WasFallback bool `json:"wasFallback"`
}

// TransferExecutionResult holds all transfer executions for a month.
// Unlike payments (grouped by target) or allocations (grouped by income),
// transfers are processed globally by priority since they can involve any accounts.
type TransferExecutionResult struct {
	// Executions is the ordered list of all transfer executions for the month
	Executions []TransferExecution

	// TotalToCPF is the net amount transferred TO CPF accounts (voluntary top-ups)
	TotalToCPF *decimal.Decimal
	// TotalFromCPF is the total amount transferred FROM CPF accounts (withdrawals)
	TotalFromCPF *decimal.Decimal
	// TotalToCash is the net amount transferred TO cash accounts
	TotalToCash *decimal.Decimal
	// TotalToInvestments is the net amount transferred TO investment accounts
	TotalToInvestments *decimal.Decimal
}

// executePaymentRules processes all payment-type fund flow rules for the current month.
// Returns a result struct with attribution information for the response.
//
// Payment rules work as follows:
// 1. Rules are grouped by target (liability or property)
// 2. Within each group, rules are sorted by priority (lower number = higher priority)
// 3. Each rule attempts to pay its amount from the source
// 4. AmountTypeMaxAvailable rules use up to source balance
// 5. AmountTypeRemainder rules cover whatever is left after higher-priority rules
//
// IMPORTANT: sourceBalances is mutated - source balances are decreased by payment amounts.
//
// Example parameter shapes:
//
//	rules: []repository.FundFlowRule{
//	    {
//	        ID: "rule-1",
//	        Name: "CPF OA to Mortgage",
//	        RuleType: "payment",
//	        SourceCpfAccountID: ptr("cpf-oa-123"),
//	        TargetLiabilityID: ptr("mortgage-456"),
//	        AmountType: "max_available",
//	        Priority: 1,
//	        StartDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
//	    },
//	}
//
//	sourceBalances: SourceBalanceMap{
//	    "cpf-oa-123": decimal.MustFromString("50000"),
//	    "cash-789": decimal.MustFromString("10000"),
//	}
//
//	requiredPayments: RequiredPaymentMap{
//	    "mortgage-456": decimal.MustFromString("2500"),  // Monthly mortgage payment
//	}
func executePaymentRules(
	rules []repository.FundFlowRule,
	sourceBalances SourceBalanceMap,
	requiredPayments RequiredPaymentMap,
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

		executions := executePaymentGroup(targetID, targetRules, sourceBalances, required)
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
		if rule.RuleType != RuleTypePayment {
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
func groupPaymentsByTarget(rules []repository.FundFlowRule) RulesByTargetMap {
	byTarget := make(RulesByTargetMap)
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
	sourceBalances SourceBalanceMap,
	requiredAmount *decimal.Decimal,
) []PaymentExecution {
	// Sort by priority (lower = higher priority)
	sort.Slice(rules, func(i, j int) bool {
		return rules[i].Priority < rules[j].Priority
	})

	remainingAmount := requiredAmount
	var executions []PaymentExecution
	isFirstExecution := true

	for _, rule := range rules {
		if remainingAmount.IsZero() || remainingAmount.IsNegative() {
			break
		}

		sourceID := getSourceID(rule)
		if sourceID == "" {
			continue
		}

		sourceBalance := sourceBalances[sourceID]
		if sourceBalance == nil || sourceBalance.IsZero() || sourceBalance.IsNegative() {
			continue
		}

		// Calculate the intended amount based on amount type
		intendedAmount := calculatePaymentAmount(rule, requiredAmount, remainingAmount, sourceBalance)
		if intendedAmount.IsZero() || intendedAmount.IsNegative() {
			continue
		}

		// Actual amount is minimum of: intended amount, source balance, remaining required
		actualAmount := decimal.Min(intendedAmount, sourceBalance, remainingAmount)
		if actualAmount.IsZero() || actualAmount.IsNegative() {
			continue
		}

		// Deduct from source balance
		newBalance := sourceBalance.Sub(actualAmount)
		sourceBalances[sourceID] = newBalance

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
		remainingAmount = remainingAmount.Sub(actualAmount)
		isFirstExecution = false
	}

	return executions
}

// calculatePaymentAmount determines the intended payment amount based on the rule's amount type
func calculatePaymentAmount(
	rule repository.FundFlowRule,
	requiredAmount *decimal.Decimal,
	remainingAmount *decimal.Decimal,
	sourceBalance *decimal.Decimal,
) *decimal.Decimal {
	switch rule.AmountType {
	case AmountTypeFixed:
		// Pay exactly the specified amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		return rule.AmountValue

	case AmountTypePctTarget:
		// Pay percentage of target's required amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return requiredAmount.Mul(percentage)

	case AmountTypePctSource:
		// Pay percentage of source balance
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return sourceBalance.Mul(percentage)

	case AmountTypeTargetRequired:
		// Pay whatever target needs (optionally capped)
		amount := remainingAmount
		if rule.AmountValue != nil && rule.AmountValue.Cmp(amount) < 0 {
			amount = rule.AmountValue
		}
		return amount

	case AmountTypeMaxAvailable:
		// Use up to source balance, capped by remaining required (and optional cap)
		amount := sourceBalance
		if amount.Cmp(remainingAmount) > 0 {
			amount = remainingAmount
		}
		// Apply optional cap
		if rule.AmountValue != nil && amount.Cmp(rule.AmountValue) > 0 {
			amount = rule.AmountValue
		}
		return amount

	case AmountTypeRemainder:
		// Pay whatever is left after higher-priority rules
		return remainingAmount

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

// getSourceType returns SourceTypeCPF or SourceTypeCash based on which source is set
func getSourceType(rule repository.FundFlowRule) string {
	if rule.SourceCpfAccountID != nil {
		return SourceTypeCPF
	}
	if rule.SourceCashAccountID != nil {
		return SourceTypeCash
	}
	return ""
}

// getTargetType returns TargetTypeLiability or TargetTypeProperty based on which target is set
func getTargetType(rule repository.FundFlowRule) string {
	if rule.TargetLiabilityID != nil {
		return TargetTypeLiability
	}
	if rule.TargetPropertyID != nil {
		return TargetTypeProperty
	}
	return ""
}

// buildRequiredPaymentsMap creates a map of liability/property ID to required monthly payment.
// This is used by executePaymentRules to know how much needs to be paid to each target.
func buildRequiredPaymentsMap(
	liabilities []FinancialDataRow,
	currentDate time.Time,
) RequiredPaymentMap {
	requiredPayments := make(RequiredPaymentMap)

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
			requiredPayments[liability.ID] = minPay
		}
	}

	// TODO: Add property mortgage payments when property integration is complete
	// Properties have their own mortgage payment schedules

	return requiredPayments
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

// =============================================================================
// Transfer Rule Execution
// =============================================================================

// executeTransferRules processes all transfer-type fund flow rules for the current month.
// Transfer rules move money between accounts (CPF ↔ Cash ↔ Investment).
//
// Unlike payment rules (grouped by target) or allocation rules (grouped by income),
// transfer rules are processed globally in priority order since they represent
// arbitrary account-to-account movements.
//
// IMPORTANT: balances map is mutated - source balances are decreased and target
// balances are increased by transfer amounts.
//
// Parameters:
//   - rules: All fund flow rules (will filter to transfer type)
//   - balances: Map of account ID to current balance (will be mutated for both source and target)
//   - currentDate: The current month being processed
func executeTransferRules(
	rules []repository.FundFlowRule,
	balances map[string]*decimal.Decimal,
	currentDate time.Time,
) TransferExecutionResult {
	result := TransferExecutionResult{
		Executions:         make([]TransferExecution, 0),
		TotalToCPF:         decimal.Zero(),
		TotalFromCPF:       decimal.Zero(),
		TotalToCash:        decimal.Zero(),
		TotalToInvestments: decimal.Zero(),
	}

	// Filter to only transfer rules active at current date
	transferRules := filterActiveTransferRules(rules, currentDate)
	if len(transferRules) == 0 {
		return result
	}

	// Sort ALL transfer rules by priority (lower = higher priority)
	// Unlike payments, transfers are not grouped - they run globally by priority
	sort.Slice(transferRules, func(i, j int) bool {
		return transferRules[i].Priority < transferRules[j].Priority
	})

	// Track which sources have been partially used (for WasFallback logic)
	sourceUsageCount := make(map[string]int)

	for _, rule := range transferRules {
		sourceID := getTransferSourceID(rule)
		targetID := getTransferTargetID(rule)
		if sourceID == "" || targetID == "" {
			continue
		}

		sourceBalance := balances[sourceID]
		if sourceBalance == nil || sourceBalance.IsZero() || sourceBalance.IsNegative() {
			continue
		}

		// Calculate the intended amount based on amount type
		intendedAmount := calculateTransferAmount(rule, sourceBalance)
		if intendedAmount.IsZero() || intendedAmount.IsNegative() {
			continue
		}

		// Actual amount is capped by source balance
		actualAmount := decimal.Min(intendedAmount, sourceBalance)
		if actualAmount.IsZero() || actualAmount.IsNegative() {
			continue
		}

		// Deduct from source balance
		balances[sourceID] = sourceBalance.Sub(actualAmount)

		// Add to target balance
		targetBalance := balances[targetID]
		if targetBalance == nil {
			targetBalance = decimal.Zero()
		}
		balances[targetID] = targetBalance.Add(actualAmount)

		// Determine if this is a fallback (not the first transfer from this source)
		wasFallback := sourceUsageCount[sourceID] > 0
		sourceUsageCount[sourceID]++

		// Track the execution
		execution := TransferExecution{
			RuleID:      rule.ID,
			RuleName:    rule.Name,
			SourceType:  getTransferSourceType(rule),
			SourceID:    sourceID,
			TargetType:  getTransferTargetType(rule),
			TargetID:    targetID,
			Amount:      actualAmount,
			Priority:    rule.Priority,
			AmountType:  rule.AmountType,
			WasFallback: wasFallback,
		}
		result.Executions = append(result.Executions, execution)

		// Update totals based on target type
		switch execution.TargetType {
		case TargetTypeCPF:
			result.TotalToCPF = result.TotalToCPF.Add(actualAmount)
		case TargetTypeCash:
			result.TotalToCash = result.TotalToCash.Add(actualAmount)
		case TargetTypeInvestment:
			result.TotalToInvestments = result.TotalToInvestments.Add(actualAmount)
		}

		// Track CPF outflows
		if execution.SourceType == SourceTypeCPF {
			result.TotalFromCPF = result.TotalFromCPF.Add(actualAmount)
		}
	}

	return result
}

// filterActiveTransferRules returns only transfer rules that are active on the given date
func filterActiveTransferRules(rules []repository.FundFlowRule, date time.Time) []repository.FundFlowRule {
	var active []repository.FundFlowRule
	for _, rule := range rules {
		if rule.RuleType != RuleTypeTransfer {
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

// getTransferSourceID returns the source account ID from a transfer rule
func getTransferSourceID(rule repository.FundFlowRule) string {
	if rule.SourceCpfAccountID != nil {
		return *rule.SourceCpfAccountID
	}
	if rule.SourceCashAccountID != nil {
		return *rule.SourceCashAccountID
	}
	if rule.SourceInvestmentID != nil {
		return *rule.SourceInvestmentID
	}
	// Note: SourcePropertyID is for sale proceeds - complex case handled separately
	return ""
}

// getTransferSourceType returns the source type string for a transfer rule
func getTransferSourceType(rule repository.FundFlowRule) string {
	if rule.SourceCpfAccountID != nil {
		return SourceTypeCPF
	}
	if rule.SourceCashAccountID != nil {
		return SourceTypeCash
	}
	if rule.SourceInvestmentID != nil {
		return SourceTypeInvestment
	}
	return ""
}

// getTransferTargetID returns the target account ID from a transfer rule
func getTransferTargetID(rule repository.FundFlowRule) string {
	if rule.TargetCpfAccountID != nil {
		return *rule.TargetCpfAccountID
	}
	if rule.TargetCashAccountID != nil {
		return *rule.TargetCashAccountID
	}
	if rule.TargetInvestmentID != nil {
		return *rule.TargetInvestmentID
	}
	return ""
}

// getTransferTargetType returns the target type string for a transfer rule
func getTransferTargetType(rule repository.FundFlowRule) string {
	if rule.TargetCpfAccountID != nil {
		return TargetTypeCPF
	}
	if rule.TargetCashAccountID != nil {
		return TargetTypeCash
	}
	if rule.TargetInvestmentID != nil {
		return TargetTypeInvestment
	}
	return ""
}

// calculateTransferAmount determines the intended transfer amount based on the rule's amount type
func calculateTransferAmount(
	rule repository.FundFlowRule,
	sourceBalance *decimal.Decimal,
) *decimal.Decimal {
	switch rule.AmountType {
	case AmountTypeFixed:
		// Transfer exactly the specified amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		return rule.AmountValue

	case AmountTypePctSource:
		// Transfer percentage of source balance
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return sourceBalance.Mul(percentage)

	case AmountTypeMaxAvailable:
		// Use up to source balance (optionally capped)
		amount := sourceBalance
		if rule.AmountValue != nil && amount.Cmp(rule.AmountValue) > 0 {
			amount = rule.AmountValue
		}
		return amount

	case AmountTypeRemainder:
		// Transfer whatever is left in source
		return sourceBalance

	default:
		return decimal.Zero()
	}
}
