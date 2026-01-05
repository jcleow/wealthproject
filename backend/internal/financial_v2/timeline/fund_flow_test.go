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
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "max_available",
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("50000"), // $50,000 in CPF OA
		"mortgage-456": dec("400000"), // $400,000 mortgage balance
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"), // $2,500 monthly payment
	}

	currentDate := dt(2025, 6, 1)

	result := executePaymentRules(rules, state, requiredPayments, currentDate)

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

	if payment.SourceType != "cpf" {
		t.Errorf("expected source type 'cpf', got '%s'", payment.SourceType)
	}

	if payment.WasFallback {
		t.Error("expected WasFallback to be false for primary payment")
	}

	// Verify CPF balance was reduced
	expectedCPF := dec("47500") // 50000 - 2500
	if state["cpf-oa-123"].Cmp(expectedCPF) != 0 {
		t.Errorf("expected CPF balance %s, got %s", expectedCPF.String(), state["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_FallbackToSecondarySource(t *testing.T) {
	// Scenario: CPF OA doesn't have enough, cash covers the remainder
	// Expected: Partial from CPF, remainder from cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "max_available",
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Mortgage from Cash",
			RuleType:            "payment",
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          "remainder",
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("1000"),  // Only $1,000 in CPF OA
		"savings-789":  dec("20000"), // $20,000 in savings
		"mortgage-456": dec("400000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"), // $2,500 monthly payment
	}

	currentDate := dt(2025, 6, 1)

	result := executePaymentRules(rules, state, requiredPayments, currentDate)

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
	if state["cpf-oa-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected CPF depleted to $0, got %s", state["cpf-oa-123"].String())
	}
	if state["savings-789"].Cmp(dec("18500")) != 0 {
		t.Errorf("expected savings at $18500, got %s", state["savings-789"].String())
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
			AmountType:         "fixed",
			AmountValue:        dec("2000"),
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"),
	}

	result := executePaymentRules(rules, state, requiredPayments, dt(2025, 6, 1))

	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 1 {
		t.Fatalf("expected 1 payment, got %d", len(payments))
	}

	// Should pay exactly $2,000 (fixed amount)
	if payments[0].Amount.Cmp(dec("2000")) != 0 {
		t.Errorf("expected fixed payment $2000, got %s", payments[0].Amount.String())
	}

	// CPF should be reduced by $2,000
	if state["cpf-oa-123"].Cmp(dec("48000")) != 0 {
		t.Errorf("expected CPF at $48000, got %s", state["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_PercentageOfTarget(t *testing.T) {
	// Scenario: Pay 60% of mortgage from CPF, remainder from cash
	// Expected: $1,500 from CPF (60% of $2,500), $1,000 from cash

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "60% from CPF",
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "pct_target",
			AmountValue:        dec("60"),
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Remainder from Cash",
			RuleType:            "payment",
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          "remainder",
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("50000"),
		"savings-789":  dec("20000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"),
	}

	result := executePaymentRules(rules, state, requiredPayments, dt(2025, 6, 1))

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
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "max_available",
			Priority:           0,
			StartDate:          dt(2026, 1, 1), // Starts in the future
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("400000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"),
	}

	currentDate := dt(2025, 6, 1) // Before rule starts

	result := executePaymentRules(rules, state, requiredPayments, currentDate)

	// No payments should be made
	if len(result.PaymentsByTarget) != 0 {
		t.Errorf("expected no payments, got %d targets", len(result.PaymentsByTarget))
	}

	// Balance should be unchanged
	if state["cpf-oa-123"].Cmp(dec("50000")) != 0 {
		t.Errorf("expected CPF unchanged at $50000, got %s", state["cpf-oa-123"].String())
	}
}

func TestExecutePaymentRules_MultipleTargets(t *testing.T) {
	// Scenario: Payments to both mortgage and car loan
	// Expected: Each target gets its payments processed independently

	rules := []repository.FundFlowRule{
		{
			ID:                  "rule-1",
			Name:                "Mortgage from Cash",
			RuleType:            "payment",
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          "target_required",
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Car Loan from Cash",
			RuleType:            "payment",
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("car-loan-111"),
			AmountType:          "target_required",
			Priority:            0,
			StartDate:           dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"savings-789":  dec("20000"),
		"mortgage-456": dec("400000"),
		"car-loan-111": dec("30000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"),
		"car-loan-111": dec("500"),
	}

	result := executePaymentRules(rules, state, requiredPayments, dt(2025, 6, 1))

	// Both targets should have payments
	if len(result.PaymentsByTarget) != 2 {
		t.Fatalf("expected 2 targets with payments, got %d", len(result.PaymentsByTarget))
	}

	// Savings should be reduced by total: $2,500 + $500 = $3,000
	if state["savings-789"].Cmp(dec("17000")) != 0 {
		t.Errorf("expected savings at $17000, got %s", state["savings-789"].String())
	}
}

func TestExecutePaymentRules_InsufficientFundsPartialPayment(t *testing.T) {
	// Scenario: Neither CPF nor cash has enough for full payment
	// Expected: Partial payment from both sources

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "max_available",
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
		{
			ID:                  "rule-2",
			Name:                "Mortgage from Cash",
			RuleType:            "payment",
			SourceCashAccountID: strPtr("savings-789"),
			TargetLiabilityID:   strPtr("mortgage-456"),
			AmountType:          "max_available",
			Priority:            1,
			StartDate:           dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("1000"), // Only $1,000
		"savings-789":  dec("500"),  // Only $500
		"mortgage-456": dec("400000"),
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("2500"), // Needs $2,500
	}

	result := executePaymentRules(rules, state, requiredPayments, dt(2025, 6, 1))

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
	if state["cpf-oa-123"].Cmp(dec("0")) != 0 {
		t.Errorf("expected CPF depleted, got %s", state["cpf-oa-123"].String())
	}
	if state["savings-789"].Cmp(dec("0")) != 0 {
		t.Errorf("expected savings depleted, got %s", state["savings-789"].String())
	}
}

func TestExecutePaymentRules_ZeroRequiredPayment(t *testing.T) {
	// Scenario: Liability requires $0 payment (e.g., paid off)
	// Expected: No payments made

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Mortgage from CPF",
			RuleType:           "payment",
			SourceCpfAccountID: strPtr("cpf-oa-123"),
			TargetLiabilityID:  strPtr("mortgage-456"),
			AmountType:         "max_available",
			Priority:           0,
			StartDate:          dt(2025, 1, 1),
		},
	}

	state := map[string]*decimal.Decimal{
		"cpf-oa-123":   dec("50000"),
		"mortgage-456": dec("0"), // Paid off
	}

	requiredPayments := map[string]*decimal.Decimal{
		"mortgage-456": dec("0"), // No payment required
	}

	result := executePaymentRules(rules, state, requiredPayments, dt(2025, 6, 1))

	// No payments should be made
	payments := result.PaymentsByTarget["mortgage-456"]
	if len(payments) != 0 {
		t.Errorf("expected no payments for zero required, got %d", len(payments))
	}

	// CPF should be unchanged
	if state["cpf-oa-123"].Cmp(dec("50000")) != 0 {
		t.Errorf("expected CPF unchanged, got %s", state["cpf-oa-123"].String())
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
		AmountType:  "fixed",
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
		AmountType:  "pct_target",
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
		AmountType: "max_available",
	}

	required := dec("2500")
	remaining := dec("2000")  // Already $500 paid
	sourceBalance := dec("10000") // More than remaining

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be limited to remaining ($2000), not source balance
	if amount.Cmp(dec("2000")) != 0 {
		t.Errorf("expected max_available capped at remaining $2000, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_MaxAvailableWithCap(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType:  "max_available",
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
		AmountType: "remainder",
	}

	required := dec("2500")
	remaining := dec("1000")  // $1500 already paid
	sourceBalance := dec("50000")

	amount := calculatePaymentAmount(rule, required, remaining, sourceBalance)

	// Should be exactly the remaining $1000
	if amount.Cmp(dec("1000")) != 0 {
		t.Errorf("expected remainder $1000, got %s", amount.String())
	}
}

func TestCalculatePaymentAmount_TargetRequired(t *testing.T) {
	rule := repository.FundFlowRule{
		AmountType: "target_required",
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
