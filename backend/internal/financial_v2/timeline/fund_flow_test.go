package timeline_v2

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
)

// =============================================================================
// Test Helpers (strPtr already defined in service_test.go)
// =============================================================================

func dec(s string) *decimal.Decimal {
	return decimal.MustFromString(s)
}

func dt(year, month, day int) time.Time {
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

// =============================================================================
// Payment Rule Execution Tests
// =============================================================================

func TestExecutePaymentRules_SingleSourceCoversFullPayment(t *testing.T) {
	// Scenario: CPF OA has enough balance to cover the full mortgage payment
	// Expected: Full payment from CPF, no fallback needed

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("50000"), // $50,000 in CPF OA
		"mortgage-456": dec("400000"), // $400,000 mortgage balance
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"), // $2,500 monthly payment
	}

	currentDate := dt(2025, 6, 1)

	result := executePaymentRules(rules, sourceBalances, requiredPayments, currentDate)

	// Verify payment was made
	if len(result.PaymentsByTarget) != 1 {
		t.Fatalf("expected 1 target with payments, got %d", len(result.PaymentsByTarget))
	}

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 1 {
		t.Fatalf("expected 1 payment, got %d", len(payments))
	}

	payment := payments[0]
	expectedAmount := dec("2500")
	if payment.Amount.Cmp(expectedAmount) != 0 {
		t.Errorf("expected payment amount %s, got %s", expectedAmount.String(), payment.Amount.String())
	}

	if payment.SourceType != SourceTypeCPF {
		t.Errorf("expected source type '%s', got '%s'", SourceTypeCPF, payment.SourceType)
	}

	if payment.WasFallback {
		t.Error("expected WasFallback to be false for primary payment")
	}

	// Verify CPF balance was reduced
	expectedCPF := dec("47500") // 50000 - 2500
	if sourceBalances["cpf-oa-123"].Cmp(expectedCPF) != 0 {
		t.Errorf("expected CPF balance %s, got %s", expectedCPF.String(), sourceBalances["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_FallbackToSecondarySource(t *testing.T) {
	// Scenario: CPF OA doesn't have enough, cash covers the remainder
	// Expected: Partial from CPF, remainder from cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Mortgage from Cash",
			RuleType:            RuleTypePayment,
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          AmountTypeRemainder,
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("1000"),  // Only $1,000 in CPF OA
		"savings-789":  dec("20000"), // $20,000 in savings
		"mortgage-456": dec("400000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"), // $2,500 monthly payment
	}

	currentDate := dt(2025, 6, 1)

	result := executePaymentRules(rules, sourceBalances, requiredPayments, currentDate)

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 2 {
		t.Fatalf("expected 2 payments, got %d", len(payments))
	}

	// First payment: $1,000 from CPF (all available)
	cpfPayment := payments[0]
	if cpfPayment.Amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected CPF payment $1000, got %s", cpfPayment.Amount.String())
	}
	if cpfPayment.WasFallback {
		t.Error("CPF payment should not be marked as fallback")
	}

	// Second payment: $1,500 from cash (remainder)
	cashPayment := payments[1]
	if cashPayment.Amount.Cmp(dec("1500")) != 0 {
		t.Errorf("expected cash payment $1500, got %s", cashPayment.Amount.String())
	}
	if !cashPayment.WasFallback {
		t.Error("cash payment should be marked as fallback")
	}

	// Verify balances
	if sourceBalances["cpf-oa-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected CPF depleted to $0, got %s", sourceBalances["cpf-oa-123"].String())
	}
	if sourceBalances["savings-789"].Cmp(dec("18500")) != 0 {
		t.Errorf("expected savings at $18500, got %s", sourceBalances["savings-789"].String())
	}
}

func TestExecutePaymentRules_FixedAmountType(t *testing.T) {
	// Scenario: Fixed amount payment of $2,000 from CPF
	// Expected: Exactly $2,000 paid even though more is available

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Fixed CPF Payment",
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeFixed,
			AmountValue:        dec("2000"),
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"),
	}

	result := executePaymentRules(rules, sourceBalances, requiredPayments, dt(2025, 6, 1))

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 1 {
		t.Fatalf("expected 1 payment, got %d", len(payments))
	}

	// Should pay exactly $2,000 (fixed amount)
	if payments[0].Amount.Cmp(dec("2000")) != 0 {
		t.Errorf("expected fixed payment $2000, got %s", payments[0].Amount.String())
	}

	// CPF should be reduced by $2,000
	if sourceBalances["cpf-oa-123"].Cmp(dec("48000")) != 0 {
		t.Errorf("expected CPF at $48000, got %s", sourceBalances["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_PercentageOfTarget(t *testing.T) {
	// Scenario: Pay 60% of mortgage from CPF, remainder from cash
	// Expected: $1,500 from CPF (60% of $2,500), $1,000 from cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "60% from CPF",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypePctTarget,
			AmountValue:        dec("60"),
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Remainder from Cash",
			RuleType:            RuleTypePayment,
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          AmountTypeRemainder,
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("50000"),
		"savings-789":  dec("20000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"),
	}

	result := executePaymentRules(rules, sourceBalances, requiredPayments, dt(2025, 6, 1))

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 2 {
		t.Fatalf("expected 2 payments, got %d", len(payments))
	}

	// 60% of $2,500 = $1,500 from CPF
	if payments[0].Amount.Cmp(dec("1500")) != 0 {
		t.Errorf("expected CPF payment $1500 (60%%), got %s", payments[0].Amount.String())
	}

	// Remainder: $1,000 from cash
	if payments[1].Amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected cash payment $1000, got %s", payments[1].Amount.String())
	}
}

func TestExecutePaymentRules_InactiveRuleSkipped(t *testing.T) {
	// Scenario: Rule hasn't started yet or has ended
	// Expected: No payments made

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Future Rule",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2026, 1, 1), // Starts in the future
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"),
	}

	currentDate := dt(2025, 6, 1) // Before rule starts

	result := executePaymentRules(rules, sourceBalances, requiredPayments, currentDate)

	// No payments should be made
	if len(result.PaymentsByTarget) != 0 {
		t.Errorf("expected no payments, got %d targets", len(result.PaymentsByTarget))
	}

	// Balance should be unchanged
	if sourceBalances["cpf-oa-123"].Cmp(dec("50000")) != 0 {
		t.Errorf("expected CPF unchanged at $50000, got %s", sourceBalances["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_MultipleTargets(t *testing.T) {
	// Scenario: Payments to both mortgage and car loan
	// Expected: Each target gets its payments processed independently

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Mortgage from Cash",
			RuleType:            RuleTypePayment,
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          AmountTypeTargetRequired,
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Car Loan from Cash",
			RuleType:            RuleTypePayment,
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("car-loan-111"),
			AmountType:          AmountTypeTargetRequired,
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"savings-789":  dec("20000"),
		"mortgage-456": dec("400000"),
		"car-loan-111": dec("30000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"),
		"car-loan-111": dec("500"),
	}

	result := executePaymentRules(rules, sourceBalances, requiredPayments, dt(2025, 6, 1))

	// Both targets should have payments
	if len(result.PaymentsByTarget) != 2 {
		t.Fatalf("expected 2 targets with payments, got %d", len(result.PaymentsByTarget))
	}

	// Savings should be reduced by total: $2,500 + $500 = $3,000
	if sourceBalances["savings-789"].Cmp(dec("17000")) != 0 {
		t.Errorf("expected savings at $17000, got %s", sourceBalances["savings-789"].String())
	}
}

func TestExecutePaymentRules_InsufficientFundsPartialPayment(t *testing.T) {
	// Scenario: Neither CPF nor cash has enough for full payment
	// Expected: Partial payment from both sources

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Mortgage from Cash",
			RuleType:            RuleTypePayment,
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          AmountTypeMaxAvailable,
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("1000"), // Only $1,000
		"savings-789":  dec("500"),  // Only $500
		"mortgage-456": dec("400000"),
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("2500"), // Needs $2,500
	}

	result := executePaymentRules(rules, sourceBalances, requiredPayments, dt(2025, 6, 1))

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 2 {
		t.Fatalf("expected 2 payments, got %d", len(payments))
	}

	// Total paid: $1,000 + $500 = $1,500 (less than required $2,500)
	totalPaid := payments[0].Amount.Add(payments[1].Amount)
	if totalPaid.Cmp(dec("1500")) != 0 {
		t.Errorf("expected total payment $1500, got %s", totalPaid.String())
	}

	// Both sources should be depleted
	if sourceBalances["cpf-oa-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected CPF depleted, got %s", sourceBalances["cpf-oa-123"].String())
	}
	if sourceBalances["savings-789"].Cmp(dec("0")) != 0 {
		t.Errorf("expected savings depleted, got %s", sourceBalances["savings-789"].String())
	}
}

func TestExecutePaymentRules_ZeroRequiredPayment(t *testing.T) {
	// Scenario: Liability requires $0 payment (e.g., paid off)
	// Expected: No payments made

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           RuleTypePayment,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	sourceBalances := SourceBalanceMap{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("0"), // Paid off
	}

	requiredPayments := RequiredPaymentMap{
		"mortgage-456": dec("0"), // No payment required
	}

	result := executePaymentRules(rules, sourceBalances, requiredPayments, dt(2025, 6, 1))

	// No payments should be made
	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 0 {
		t.Errorf("expected no payments for zero required, got %d", len(payments))
	}

	// CPF should be unchanged
	if sourceBalances["cpf-oa-123"].Cmp(dec("50000")) != 0 {
		t.Errorf("expected CPF unchanged, got %s", sourceBalances["cpf-oa-123"].String())
	}
}

// =============================================================================
// Required Payments Map Tests
// =============================================================================

func TestBuildRequiredPaymentsMap_ActiveLiabilities(t *testing.T) {
	liabilities := []FinancialDataRow{
		{
			ID:         "mortgage-456",
			Name:       "Home Mortgage",
			ItemType:   FinLiabilities,
			MinimumPay: *dec("2500"),
			StartDate:  dt(2020, 1, 1),
			EndDate:    nil, // Ongoing
		},
		{
			ID:         "car-loan-111",
			Name:       "Car Loan",
			ItemType:   FinLiabilities,
			MinimumPay: *dec("500"),
			StartDate:  dt(2023, 1, 1),
			EndDate:    nil,
		},
	}

	// Note: state is no longer used by buildRequiredPaymentsMap (it only needs liabilities)
	currentDate := dt(2025, 6, 1)

	required := buildRequiredPaymentsMap(liabilities, currentDate)

	if len(required) != 2 {
		t.Fatalf("expected 2 required payments, got %d", len(required))
	}

	mortgagePayment, ok := required["mortgage-456"]
	if !ok {
		t.Error("mortgage payment not found")
	} else if mortgagePayment.Cmp(dec("2500")) != 0 {
		t.Errorf("expected mortgage payment $2500, got %s", mortgagePayment.String())
	}

	carPayment, ok := required["car-loan-111"]
	if !ok {
		t.Error("car loan payment not found")
	} else if carPayment.Cmp(dec("500")) != 0 {
		t.Errorf("expected car payment $500, got %s", carPayment.String())
	}
}

func TestBuildRequiredPaymentsMap_ExcludesInactiveLiabilities(t *testing.T) {
	endDate := dt(2024, 12, 31)
	liabilities := []FinancialDataRow{
		{
			ID:         "paid-off-loan",
			Name:       "Old Loan",
			ItemType:   FinLiabilities,
			MinimumPay: *dec("300"),
			StartDate:  dt(2020, 1, 1),
			EndDate:    &endDate, // Ended before current date
		},
		{
			ID:         "future-loan",
			Name:       "Future Loan",
			ItemType:   FinLiabilities,
			MinimumPay: *dec("400"),
			StartDate:  dt(2026, 1, 1), // Starts in future
			EndDate:    nil,
		},
	}

	currentDate := dt(2025, 6, 1)

	required := buildRequiredPaymentsMap(liabilities, currentDate)

	if len(required) != 0 {
		t.Errorf("expected 0 required payments for inactive liabilities, got %d", len(required))
	}
}

// =============================================================================
// Amount Calculation Tests
// =============================================================================

func TestCalculatePaymentAmount_Fixed(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypeFixed,
		AmountValue: dec("1500"),
	}

	required := dec("2500")
	remaining := dec("2500")
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	if amount.Cmp(dec("1500")) != 0 {
		t.Errorf("expected fixed amount $1500, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_PctTarget(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypePctTarget,
		AmountValue: dec("60"), // 60%
	}

	required := dec("2500")
	remaining := dec("2500")
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// 60% of $2500 = $1500
	if amount.Cmp(dec("1500")) != 0 {
		t.Errorf("expected 60%% of target = $1500, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_MaxAvailable(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: AmountTypeMaxAvailable,
	}

	required := dec("2500")
	remaining := dec("2000")      // Already $500 paid
	sourceBalance := dec("10000") // More than remaining

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be limited to remaining ($2000), not source balance
	if amount.Cmp(dec("2000")) != 0 {
		t.Errorf("expected max_available capped at remaining $2000, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_MaxAvailableWithCap(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypeMaxAvailable,
		AmountValue: dec("1000"), // Cap at $1000
	}

	required := dec("2500")
	remaining := dec("2500")
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be capped at $1000
	if amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected max_available capped at $1000, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_Remainder(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: AmountTypeRemainder,
	}

	required := dec("2500")
	remaining := dec("1000") // $1500 already paid
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be exactly the remaining $1000
	if amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected remainder $1000, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_TargetRequired(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: AmountTypeTargetRequired,
	}

	required := dec("2500")
	remaining := dec("2500")
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be the full remaining required
	if amount.Cmp(dec("2500")) != 0 {
		t.Errorf("expected target_required $2500, got %s", amount.String())
	}
}

// =============================================================================
// Transfer Rule Execution Tests (Phase 3)
// =============================================================================

func TestExecuteTransferRules_FixedAmountCashToCPF(t *testing.T) {
	// Scenario: Voluntary CPF top-up of $1,000 from cash to CPF SA
	// Expected: $1,000 transferred from cash to CPF

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Voluntary SA Top-up",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetCpfAccountID:  strPtr("cpf-sa-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("1000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("20000"), // $20,000 in savings
		"cpf-sa-456":  dec("50000"), // $50,000 in CPF SA
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Verify transfer was made
	if len(result.Executions) != 1 {
		t.Fatalf("expected 1 transfer execution, got %d", len(result.Executions))
	}

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected transfer amount $1000, got %s", transfer.Amount.String())
	}

	if transfer.SourceType != SourceTypeCash {
		t.Errorf("expected source type '%s', got '%s'", SourceTypeCash, transfer.SourceType)
	}

	if transfer.TargetType != TargetTypeCPF {
		t.Errorf("expected target type '%s', got '%s'", TargetTypeCPF, transfer.TargetType)
	}

	if transfer.WasFallback {
		t.Error("expected WasFallback to be false for first transfer")
	}

	// Verify balances updated
	expectedSavings := dec("19000") // 20000 - 1000
	if balances["savings-123"].Cmp(expectedSavings) != 0 {
		t.Errorf("expected savings balance %s, got %s", expectedSavings.String(), balances["savings-123"].String())
	}

	expectedCPF := dec("51000") // 50000 + 1000
	if balances["cpf-sa-456"].Cmp(expectedCPF) != 0 {
		t.Errorf("expected CPF balance %s, got %s", expectedCPF.String(), balances["cpf-sa-456"].String())
	}

	// Verify totals
	if result.TotalToCPF.Cmp(dec("1000")) != 0 {
		t.Errorf("expected TotalToCPF $1000, got %s", result.TotalToCPF.String())
	}
}

func TestExecuteTransferRules_CPFToCashWithdrawal(t *testing.T) {
	// Scenario: CPF withdrawal at retirement (CPF OA → Cash)
	// Expected: Full withdrawal from CPF to cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "CPF OA Withdrawal",
			RuleType:           RuleTypeTransfer,
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetCashAccountID: strPtr("savings-456"),
			AmountType:         AmountTypeMaxAvailable,
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"cpf-oa-123":  dec("100000"), // $100,000 in CPF OA
		"savings-456": dec("10000"),  // $10,000 in savings
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Verify transfer
	if len(result.Executions) != 1 {
		t.Fatalf("expected 1 transfer execution, got %d", len(result.Executions))
	}

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("100000")) != 0 {
		t.Errorf("expected transfer amount $100000, got %s", transfer.Amount.String())
	}

	if transfer.SourceType != SourceTypeCPF {
		t.Errorf("expected source type '%s', got '%s'", SourceTypeCPF, transfer.SourceType)
	}

	// Verify balances
	if balances["cpf-oa-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected CPF OA depleted, got %s", balances["cpf-oa-123"].String())
	}

	expectedSavings := dec("110000") // 10000 + 100000
	if balances["savings-456"].Cmp(expectedSavings) != 0 {
		t.Errorf("expected savings %s, got %s", expectedSavings.String(), balances["savings-456"].String())
	}

	// Verify totals
	if result.TotalFromCPF.Cmp(dec("100000")) != 0 {
		t.Errorf("expected TotalFromCPF $100000, got %s", result.TotalFromCPF.String())
	}
	if result.TotalToCash.Cmp(dec("100000")) != 0 {
		t.Errorf("expected TotalToCash $100000, got %s", result.TotalToCash.String())
	}
}

func TestExecuteTransferRules_InvestmentLiquidation(t *testing.T) {
	// Scenario: Liquidate 10% of investment portfolio to cash
	// Expected: 10% of investment balance transferred to cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Investment Drawdown",
			RuleType:           RuleTypeTransfer,
			SourceInvestmentID: strPtr("stock-portfolio-123"),
			TargetCashAccountID: strPtr("savings-456"),
			AmountType:         AmountTypePctSource,
			AmountValue:        dec("10"), // 10%
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"stock-portfolio-123": dec("500000"), // $500,000 in stocks
		"savings-456":         dec("10000"),  // $10,000 in savings
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Verify transfer (10% of $500,000 = $50,000)
	if len(result.Executions) != 1 {
		t.Fatalf("expected 1 transfer execution, got %d", len(result.Executions))
	}

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("50000")) != 0 {
		t.Errorf("expected transfer amount $50000 (10%%), got %s", transfer.Amount.String())
	}

	if transfer.SourceType != SourceTypeInvestment {
		t.Errorf("expected source type '%s', got '%s'", SourceTypeInvestment, transfer.SourceType)
	}

	// Verify balances
	expectedStocks := dec("450000") // 500000 - 50000
	if balances["stock-portfolio-123"].Cmp(expectedStocks) != 0 {
		t.Errorf("expected stock balance %s, got %s", expectedStocks.String(), balances["stock-portfolio-123"].String())
	}

	expectedSavings := dec("60000") // 10000 + 50000
	if balances["savings-456"].Cmp(expectedSavings) != 0 {
		t.Errorf("expected savings %s, got %s", expectedSavings.String(), balances["savings-456"].String())
	}
}

func TestExecuteTransferRules_CashToInvestment(t *testing.T) {
	// Scenario: Monthly investment contribution from cash
	// Expected: Fixed amount transferred from cash to investment

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Monthly Investment",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("etf-portfolio-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("2000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123":       dec("15000"), // $15,000 in savings
		"etf-portfolio-456": dec("30000"), // $30,000 in ETFs
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Verify transfer
	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("2000")) != 0 {
		t.Errorf("expected transfer amount $2000, got %s", transfer.Amount.String())
	}

	// Verify totals
	if result.TotalToInvestments.Cmp(dec("2000")) != 0 {
		t.Errorf("expected TotalToInvestments $2000, got %s", result.TotalToInvestments.String())
	}

	// Verify balances
	if balances["savings-123"].Cmp(dec("13000")) != 0 {
		t.Errorf("expected savings $13000, got %s", balances["savings-123"].String())
	}
	if balances["etf-portfolio-456"].Cmp(dec("32000")) != 0 {
		t.Errorf("expected investment $32000, got %s", balances["etf-portfolio-456"].String())
	}
}

func TestExecuteTransferRules_PriorityOrdering(t *testing.T) {
	// Scenario: Two transfers from same source, different priorities
	// Priority 0: Transfer $5,000 to CPF
	// Priority 1: Transfer $3,000 to investment
	// Source only has $6,000 - so second transfer should get less

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "CPF Top-up First",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetCpfAccountID:  strPtr("cpf-sa-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("5000"),
			Priority:            0, // Higher priority (runs first)
			StartDate:           dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Investment Second",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-789"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("3000"),
			Priority:            1, // Lower priority (runs second)
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("6000"), // Only $6,000 available
		"cpf-sa-456":  dec("0"),
		"stocks-789":  dec("0"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	if len(result.Executions) != 2 {
		t.Fatalf("expected 2 transfers, got %d", len(result.Executions))
	}

	// First transfer: $5,000 to CPF (full amount)
	cpfTransfer := result.Executions[0]
	if cpfTransfer.Amount.Cmp(dec("5000")) != 0 {
		t.Errorf("expected CPF transfer $5000, got %s", cpfTransfer.Amount.String())
	}
	if cpfTransfer.WasFallback {
		t.Error("CPF transfer should not be marked as fallback")
	}

	// Second transfer: Only $1,000 to investment (remaining balance)
	invTransfer := result.Executions[1]
	if invTransfer.Amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected investment transfer $1000 (remaining), got %s", invTransfer.Amount.String())
	}
	if !invTransfer.WasFallback {
		t.Error("investment transfer should be marked as fallback (not first from this source)")
	}

	// Verify savings depleted
	if balances["savings-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected savings depleted, got %s", balances["savings-123"].String())
	}
}

func TestExecuteTransferRules_InactiveRuleSkipped(t *testing.T) {
	// Scenario: Transfer rule hasn't started yet
	// Expected: No transfer made

	futureStart := dt(2026, 1, 1)
	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Future Transfer",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetCpfAccountID:  strPtr("cpf-sa-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("1000"),
			Priority:            0,
			StartDate:           futureStart, // Starts in the future
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("20000"),
		"cpf-sa-456":  dec("50000"),
	}

	currentDate := dt(2025, 6, 1) // Before rule starts

	result := executeTransferRules(rules, balances, currentDate)

	// No transfers should be made
	if len(result.Executions) != 0 {
		t.Errorf("expected 0 transfers for inactive rule, got %d", len(result.Executions))
	}

	// Balances unchanged
	if balances["savings-123"].Cmp(dec("20000")) != 0 {
		t.Errorf("expected savings unchanged, got %s", balances["savings-123"].String())
	}
}

func TestExecuteTransferRules_EndedRuleSkipped(t *testing.T) {
	// Scenario: Transfer rule has ended
	// Expected: No transfer made

	endDate := dt(2025, 3, 31)
	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Ended Transfer",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetCpfAccountID:  strPtr("cpf-sa-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("1000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
			EndDate:             &endDate, // Ended before current date
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("20000"),
		"cpf-sa-456":  dec("50000"),
	}

	currentDate := dt(2025, 6, 1) // After rule ended

	result := executeTransferRules(rules, balances, currentDate)

	if len(result.Executions) != 0 {
		t.Errorf("expected 0 transfers for ended rule, got %d", len(result.Executions))
	}
}

func TestExecuteTransferRules_InsufficientSourceBalance(t *testing.T) {
	// Scenario: Source balance less than fixed transfer amount
	// Expected: Transfer capped at source balance

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Large Transfer",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("10000"), // Wants $10,000
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("3000"), // Only $3,000 available
		"stocks-456":  dec("0"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Transfer should be capped at $3,000 (source balance)
	if len(result.Executions) != 1 {
		t.Fatalf("expected 1 transfer, got %d", len(result.Executions))
	}

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("3000")) != 0 {
		t.Errorf("expected transfer capped at $3000, got %s", transfer.Amount.String())
	}

	// Source depleted, target increased
	if balances["savings-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected savings depleted, got %s", balances["savings-123"].String())
	}
	if balances["stocks-456"].Cmp(dec("3000")) != 0 {
		t.Errorf("expected stocks at $3000, got %s", balances["stocks-456"].String())
	}
}

func TestExecuteTransferRules_RemainderType(t *testing.T) {
	// Scenario: Transfer whatever is left in source
	// Expected: Full source balance transferred

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Sweep to Investment",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-456"),
			AmountType:          AmountTypeRemainder,
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("7500"),
		"stocks-456":  dec("20000"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("7500")) != 0 {
		t.Errorf("expected remainder transfer $7500, got %s", transfer.Amount.String())
	}

	// Source should be empty
	if balances["savings-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected savings empty after remainder transfer, got %s", balances["savings-123"].String())
	}
}

func TestExecuteTransferRules_ZeroSourceBalance(t *testing.T) {
	// Scenario: Source has zero balance
	// Expected: No transfer made

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Transfer from Empty",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("1000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("0"), // No balance
		"stocks-456":  dec("10000"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	if len(result.Executions) != 0 {
		t.Errorf("expected 0 transfers for zero source, got %d", len(result.Executions))
	}
}

func TestExecuteTransferRules_NonTransferRuleIgnored(t *testing.T) {
	// Scenario: Mix of transfer and payment rules
	// Expected: Only transfer rules executed

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Payment Rule (ignored)",
			RuleType:            RuleTypePayment, // Not a transfer
			SourceCashAccountID: strPtr("savings-123"),
			TargetLiabilityID:   strPtr("mortgage-789"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("2000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Transfer Rule",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-456"),
			AmountType:          AmountTypeFixed,
			AmountValue:         dec("1000"),
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123":  dec("10000"),
		"stocks-456":   dec("0"),
		"mortgage-789": dec("100000"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	// Only the transfer rule should execute
	if len(result.Executions) != 1 {
		t.Fatalf("expected 1 transfer (ignoring payment), got %d", len(result.Executions))
	}

	if result.Executions[0].RuleName != "Transfer Rule" {
		t.Errorf("expected 'Transfer Rule', got '%s'", result.Executions[0].RuleName)
	}

	// Savings should only be reduced by $1,000 (transfer), not $2,000 (payment)
	if balances["savings-123"].Cmp(dec("9000")) != 0 {
		t.Errorf("expected savings $9000, got %s", balances["savings-123"].String())
	}
}

func TestExecuteTransferRules_MaxAvailableWithCap(t *testing.T) {
	// Scenario: MaxAvailable with a cap value
	// Expected: Transfer capped at the specified amount

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Capped Transfer",
			RuleType:            RuleTypeTransfer,
			SourceCashAccountID: strPtr("savings-123"),
			TargetInvestmentID:  strPtr("stocks-456"),
			AmountType:          AmountTypeMaxAvailable,
			AmountValue:         dec("5000"), // Cap at $5,000
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	balances := map[string]*decimal.Decimal{
		"savings-123": dec("20000"), // More than cap
		"stocks-456":  dec("0"),
	}

	currentDate := dt(2025, 6, 1)

	result := executeTransferRules(rules, balances, currentDate)

	transfer := result.Executions[0]
	if transfer.Amount.Cmp(dec("5000")) != 0 {
		t.Errorf("expected max_available capped at $5000, got %s", transfer.Amount.String())
	}

	// Only $5,000 should be transferred
	if balances["savings-123"].Cmp(dec("15000")) != 0 {
		t.Errorf("expected savings $15000, got %s", balances["savings-123"].String())
	}
}

// =============================================================================
// Transfer Amount Calculation Tests
// =============================================================================

func TestCalculateTransferAmount_Fixed(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypeFixed,
		AmountValue: dec("1500"),
	}

	sourceBalance := dec("50000")

	amount := calculateTransferAmount(rule, sourceBalance)

	if amount.Cmp(dec("1500")) != 0 {
		t.Errorf("expected fixed amount $1500, got %s", amount.String())
	}
}

func TestCalculateTransferAmount_PctSource(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypePctSource,
		AmountValue: dec("25"), // 25%
	}

	sourceBalance := dec("10000")

	amount := calculateTransferAmount(rule, sourceBalance)

	// 25% of $10,000 = $2,500
	if amount.Cmp(dec("2500")) != 0 {
		t.Errorf("expected 25%% of source = $2500, got %s", amount.String())
	}
}

func TestCalculateTransferAmount_MaxAvailable(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: AmountTypeMaxAvailable,
	}

	sourceBalance := dec("8000")

	amount := calculateTransferAmount(rule, sourceBalance)

	// Should be full source balance
	if amount.Cmp(dec("8000")) != 0 {
		t.Errorf("expected max_available = source balance $8000, got %s", amount.String())
	}
}

func TestCalculateTransferAmount_MaxAvailableCapped(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  AmountTypeMaxAvailable,
		AmountValue: dec("3000"), // Cap
	}

	sourceBalance := dec("8000")

	amount := calculateTransferAmount(rule, sourceBalance)

	// Should be capped at $3,000
	if amount.Cmp(dec("3000")) != 0 {
		t.Errorf("expected max_available capped at $3000, got %s", amount.String())
	}
}

func TestCalculateTransferAmount_Remainder(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: AmountTypeRemainder,
	}

	sourceBalance := dec("5000")

	amount := calculateTransferAmount(rule, sourceBalance)

	// Should be full source balance
	if amount.Cmp(dec("5000")) != 0 {
		t.Errorf("expected remainder = source balance $5000, got %s", amount.String())
	}
}

// =============================================================================
// Transfer Helper Function Tests
// =============================================================================

func TestGetTransferSourceID(t *testing.T) {
	tests := []struct {
		name     string
		rule     repository.FundFlowRule
		expected string
	}{
		{
			name: "CPF source",
			rule: repository.FundFlowRule{
				SourceCpfAccountID: strPtr("cpf-123"),
			},
			expected: "cpf-123",
		},
		{
			name: "Cash source",
			rule: repository.FundFlowRule{
				SourceCashAccountID: strPtr("cash-456"),
			},
			expected: "cash-456",
		},
		{
			name: "Investment source",
			rule: repository.FundFlowRule{
				SourceInvestmentID: strPtr("inv-789"),
			},
			expected: "inv-789",
		},
		{
			name:     "No source",
			rule:     repository.FundFlowRule{},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getTransferSourceID(tt.rule)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetTransferSourceType(t *testing.T) {
	tests := []struct {
		name     string
		rule     repository.FundFlowRule
		expected string
	}{
		{
			name: "CPF source",
			rule: repository.FundFlowRule{
				SourceCpfAccountID: strPtr("cpf-123"),
			},
			expected: SourceTypeCPF,
		},
		{
			name: "Cash source",
			rule: repository.FundFlowRule{
				SourceCashAccountID: strPtr("cash-456"),
			},
			expected: SourceTypeCash,
		},
		{
			name: "Investment source",
			rule: repository.FundFlowRule{
				SourceInvestmentID: strPtr("inv-789"),
			},
			expected: SourceTypeInvestment,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getTransferSourceType(tt.rule)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetTransferTargetID(t *testing.T) {
	tests := []struct {
		name     string
		rule     repository.FundFlowRule
		expected string
	}{
		{
			name: "CPF target",
			rule: repository.FundFlowRule{
				TargetCpfAccountID: strPtr("cpf-123"),
			},
			expected: "cpf-123",
		},
		{
			name: "Cash target",
			rule: repository.FundFlowRule{
				TargetCashAccountID: strPtr("cash-456"),
			},
			expected: "cash-456",
		},
		{
			name: "Investment target",
			rule: repository.FundFlowRule{
				TargetInvestmentID: strPtr("inv-789"),
			},
			expected: "inv-789",
		},
		{
			name:     "No target",
			rule:     repository.FundFlowRule{},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getTransferTargetID(tt.rule)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestGetTransferTargetType(t *testing.T) {
	tests := []struct {
		name     string
		rule     repository.FundFlowRule
		expected string
	}{
		{
			name: "CPF target",
			rule: repository.FundFlowRule{
				TargetCpfAccountID: strPtr("cpf-123"),
			},
			expected: TargetTypeCPF,
		},
		{
			name: "Cash target",
			rule: repository.FundFlowRule{
				TargetCashAccountID: strPtr("cash-456"),
			},
			expected: TargetTypeCash,
		},
		{
			name: "Investment target",
			rule: repository.FundFlowRule{
				TargetInvestmentID: strPtr("inv-789"),
			},
			expected: TargetTypeInvestment,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getTransferTargetType(tt.rule)
			if result != tt.expected {
				t.Errorf("expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestFilterActiveTransferRules(t *testing.T) {
	endDate := dt(2025, 3, 31)
	rules := []repository.FundFlowRule{
		{
			ID:        "active-transfer",
			RuleType:  RuleTypeTransfer,
			StartDate: dt(2025, 1, 1),
		},
		{
			ID:        "future-transfer",
			RuleType:  RuleTypeTransfer,
			StartDate: dt(2026, 1, 1), // Future
		},
		{
			ID:        "ended-transfer",
			RuleType:  RuleTypeTransfer,
			StartDate: dt(2025, 1, 1),
			EndDate:   &endDate, // Ended
		},
		{
			ID:        "payment-rule",
			RuleType:  RuleTypePayment, // Wrong type
			StartDate: dt(2025, 1, 1),
		},
	}

	currentDate := dt(2025, 6, 1)

	active := filterActiveTransferRules(rules, currentDate)

	if len(active) != 1 {
		t.Fatalf("expected 1 active transfer rule, got %d", len(active))
	}

	if active[0].ID != "active-transfer" {
		t.Errorf("expected 'active-transfer', got '%s'", active[0].ID)
	}
}
