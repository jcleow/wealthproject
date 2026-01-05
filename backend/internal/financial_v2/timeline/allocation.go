package timeline_v2

import (
	"sort"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
)

// Allocation rule type constant
const (
	RuleTypeAllocation = "allocation"
)

// Allocation target type constants
const (
	AllocationTargetInvestment = "investment"
	AllocationTargetCash       = "cash"
	AllocationTargetCPF        = "cpf"
)

// AllocationExecution represents the result of executing a single allocation rule.
// Tracks how much was allocated from which income to which target.
type AllocationExecution struct {
	RuleID       string           `json:"ruleId"`
	RuleName     string           `json:"ruleName"`
	SourceType   string           `json:"sourceType"`   // Always "income" for allocation rules
	SourceID     string           `json:"sourceId"`     // ID of the source income
	SourceName   string           `json:"sourceName"`   // Income name for display
	TargetType   string           `json:"targetType"`   // "investment", "cash", or "cpf"
	TargetID     string           `json:"targetId"`     // ID of the target account
	TargetName   string           `json:"targetName"`   // Target account name for display
	Amount       *decimal.Decimal `json:"amount"`       // Amount actually allocated
	Priority     int              `json:"priority"`     // Rule priority (lower = higher priority)
	AmountType   string           `json:"amountType"`   // One of the AmountType* constants
	WasFallback  bool             `json:"wasFallback"`  // True if this was a remainder/fallback allocation
}

// AllocationExecutionResult holds all allocation executions for a month
type AllocationExecutionResult struct {
	// AllocationsByIncome maps income ID to list of allocations made from that income
	AllocationsByIncome map[string][]AllocationExecution
	// TotalToInvestments is the total amount allocated to investment accounts
	TotalToInvestments *decimal.Decimal
	// TotalToCash is the total amount allocated to cash accounts
	TotalToCash *decimal.Decimal
}

// executeAllocationRules processes all allocation-type fund flow rules for the current month.
// Allocation rules route income to target accounts (investments, cash, CPF).
//
// Unlike payment rules which deduct from source balances, allocation rules:
// 1. Take from an income's monthly amount (not a balance)
// 2. Route money to target account balances (investments, cash, CPF)
// 3. Process by income, then by priority within each income
//
// IMPORTANT: targetBalances is mutated - target account balances are increased by allocated amounts.
//
// Parameters:
//   - rules: All fund flow rules (will filter to allocation type)
//   - incomes: Active income rows for this month
//   - incomeMonthlyAmounts: Map of income ID to monthly income amount
//   - targetBalances: Map of account ID to current balance (will be mutated)
//   - currentDate: The current month being processed
//   - applyToBalances: Whether to actually mutate the targetBalances map
func executeAllocationRules(
	rules []repository.FundFlowRule,
	incomes []FinancialDataRow,
	incomeMonthlyAmounts map[string]*decimal.Decimal,
	targetBalances map[string]*decimal.Decimal,
	currentDate time.Time,
	applyToBalances bool,
) AllocationExecutionResult {
	result := AllocationExecutionResult{
		AllocationsByIncome: make(map[string][]AllocationExecution),
		TotalToInvestments:  decimal.Zero(),
		TotalToCash:         decimal.Zero(),
	}

	// Filter to only allocation rules active at current date
	allocationRules := filterActiveAllocationRules(rules, currentDate)
	if len(allocationRules) == 0 {
		return result
	}

	// Build income lookup by ParentID (for versioned incomes)
	incomeByParentID := make(map[string]FinancialDataRow)
	for _, income := range incomes {
		if isActiveInMonth(income, currentDate) {
			incomeByParentID[income.ParentID] = income
		}
	}

	// Group rules by source income ID
	byIncome := groupAllocationsByIncome(allocationRules)

	// Process each income's allocations
	for incomeID, incomeRules := range byIncome {
		// Find the income record (may be versioned, so use ParentID)
		income, exists := incomeByParentID[incomeID]
		if !exists {
			continue
		}

		// Get the monthly income amount
		monthlyAmount, hasAmount := incomeMonthlyAmounts[income.ID]
		if !hasAmount || monthlyAmount == nil || monthlyAmount.IsZero() {
			continue
		}

		executions := executeAllocationGroup(
			income,
			monthlyAmount,
			incomeRules,
			targetBalances,
			applyToBalances,
		)

		// Accumulate totals
		for _, exec := range executions {
			switch exec.TargetType {
			case AllocationTargetInvestment:
				result.TotalToInvestments = result.TotalToInvestments.Add(exec.Amount)
			case AllocationTargetCash:
				result.TotalToCash = result.TotalToCash.Add(exec.Amount)
			}
		}

		if len(executions) > 0 {
			result.AllocationsByIncome[incomeID] = executions
		}
	}

	return result
}

// filterActiveAllocationRules returns only allocation rules that are active on the given date
func filterActiveAllocationRules(rules []repository.FundFlowRule, date time.Time) []repository.FundFlowRule {
	var active []repository.FundFlowRule
	for _, rule := range rules {
		if rule.RuleType != RuleTypeAllocation {
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

// groupAllocationsByIncome groups allocation rules by their source income ID
func groupAllocationsByIncome(rules []repository.FundFlowRule) map[string][]repository.FundFlowRule {
	byIncome := make(map[string][]repository.FundFlowRule)
	for _, rule := range rules {
		if rule.SourceIncomeID == nil {
			continue // Invalid allocation rule - no source income
		}
		incomeID := *rule.SourceIncomeID
		byIncome[incomeID] = append(byIncome[incomeID], rule)
	}
	return byIncome
}

// executeAllocationGroup executes all allocation rules for a single income in priority order
func executeAllocationGroup(
	income FinancialDataRow,
	monthlyAmount *decimal.Decimal,
	rules []repository.FundFlowRule,
	targetBalances map[string]*decimal.Decimal,
	applyToBalances bool,
) []AllocationExecution {
	// Sort by priority (lower = higher priority)
	sort.Slice(rules, func(i, j int) bool {
		return rules[i].Priority < rules[j].Priority
	})

	remainingAmount := monthlyAmount
	var executions []AllocationExecution
	isFirstExecution := true

	for _, rule := range rules {
		if remainingAmount.IsZero() || remainingAmount.IsNegative() {
			break
		}

		targetID := getAllocationTargetID(rule)
		if targetID == "" {
			continue
		}

		// Calculate the intended amount based on amount type
		intendedAmount := calculateAllocationAmount(rule, monthlyAmount, remainingAmount)
		if intendedAmount.IsZero() || intendedAmount.IsNegative() {
			continue
		}

		// Actual amount is minimum of: intended amount, remaining income
		actualAmount := decimal.Min(intendedAmount, remainingAmount)
		if actualAmount.IsZero() || actualAmount.IsNegative() {
			continue
		}

		// Add to target balance if applying
		if applyToBalances {
			if currentBalance, exists := targetBalances[targetID]; exists && currentBalance != nil {
				targetBalances[targetID] = currentBalance.Add(actualAmount)
			}
		}

		// Track the execution
		execution := AllocationExecution{
			RuleID:      rule.ID,
			RuleName:    rule.Name,
			SourceType:  "income",
			SourceID:    income.ParentID, // Use ParentID for consistency
			SourceName:  income.Name,
			TargetType:  getAllocationTargetType(rule),
			TargetID:    targetID,
			Amount:      actualAmount,
			Priority:    rule.Priority,
			AmountType:  rule.AmountType,
			WasFallback: !isFirstExecution && rule.AmountType == AmountTypeRemainder,
		}
		executions = append(executions, execution)

		// Reduce remaining
		remainingAmount = remainingAmount.Sub(actualAmount)
		isFirstExecution = false
	}

	return executions
}

// calculateAllocationAmount determines the intended allocation amount based on the rule's amount type
func calculateAllocationAmount(
	rule repository.FundFlowRule,
	totalIncomeAmount *decimal.Decimal,
	remainingAmount *decimal.Decimal,
) *decimal.Decimal {
	switch rule.AmountType {
	case AmountTypeFixed:
		// Allocate exactly the specified amount
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		return rule.AmountValue

	case AmountTypePctSource, "percentage":
		// Allocate percentage of source income amount
		// Note: "percentage" is the legacy value from income_allocations
		if rule.AmountValue == nil {
			return decimal.Zero()
		}
		hundred := decimal.MustFromString("100")
		percentage := rule.AmountValue.Div(hundred)
		return totalIncomeAmount.Mul(percentage)

	case AmountTypeRemainder:
		// Allocate whatever is left after higher-priority rules
		return remainingAmount

	case AmountTypeMaxAvailable:
		// Use up to the remaining amount (optionally capped)
		amount := remainingAmount
		if rule.AmountValue != nil && amount.Cmp(rule.AmountValue) > 0 {
			amount = rule.AmountValue
		}
		return amount

	default:
		return decimal.Zero()
	}
}

// getAllocationTargetID returns the target account ID from an allocation rule
func getAllocationTargetID(rule repository.FundFlowRule) string {
	if rule.TargetInvestmentID != nil {
		return *rule.TargetInvestmentID
	}
	if rule.TargetCashAccountID != nil {
		return *rule.TargetCashAccountID
	}
	if rule.TargetCpfAccountID != nil {
		return *rule.TargetCpfAccountID
	}
	return ""
}

// getAllocationTargetType returns the target type based on which target is set
func getAllocationTargetType(rule repository.FundFlowRule) string {
	if rule.TargetInvestmentID != nil {
		return AllocationTargetInvestment
	}
	if rule.TargetCashAccountID != nil {
		return AllocationTargetCash
	}
	if rule.TargetCpfAccountID != nil {
		return AllocationTargetCPF
	}
	return ""
}

// computeAllocationTotals calculates investment allocation totals using fund flow rules.
// This is a convenience function that matches the signature needed by calcCashAllocation.
// Returns total amount allocated to investments.
func computeAllocationTotals(
	rules []repository.FundFlowRule,
	incomes []FinancialDataRow,
	state map[string]*decimal.Decimal,
	currentDate time.Time,
	applyToBalances bool,
) *decimal.Decimal {
	// Build monthly amounts map for incomes
	incomeMonthlyAmounts := make(map[string]*decimal.Decimal)
	for _, income := range incomes {
		if isActiveInMonth(income, currentDate) {
			monthlyAmt := common.ToMonthlyAmount(state[income.ID], income.Frequency)
			incomeMonthlyAmounts[income.ID] = monthlyAmt
		}
	}

	result := executeAllocationRules(
		rules,
		incomes,
		incomeMonthlyAmounts,
		state,
		currentDate,
		applyToBalances,
	)

	return result.TotalToInvestments
}
