package timeline_v2

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFilterActiveAllocationRules(t *testing.T) {
	currentDate := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)

	incomeID := "income-1"
	investmentID := "investment-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-active",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:            nil,
		},
		{
			ID:                 "rule-not-started",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			StartDate:          time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:            nil,
		},
		{
			ID:                 "rule-ended",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			StartDate:          time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:            testutil.Ptr(time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)),
		},
		{
			ID:                 "rule-payment-type",
			RuleType:           RuleTypePayment, // Should be filtered out
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:            nil,
		},
	}

	active := filterActiveAllocationRules(rules, currentDate)

	require.Len(t, active, 1)
	assert.Equal(t, "rule-active", active[0].ID)
}

func TestFilterActiveAllocationRules_EndDateBoundary(t *testing.T) {
	// Test boundary conditions for rule end dates.
	// A rule with EndDate = 2026-06-14 should be INACTIVE on 2026-06-15
	// A rule with EndDate = 2026-06-15 should be ACTIVE on 2026-06-15
	currentDate := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)

	incomeID := "income-1"
	investmentID := "investment-1"

	tests := []struct {
		name           string
		endDate        time.Time
		expectActive   bool
		expectedReason string
	}{
		{
			name:           "rule ends day before current date - should be inactive",
			endDate:        time.Date(2026, 6, 14, 0, 0, 0, 0, time.UTC),
			expectActive:   false,
			expectedReason: "EndDate 2026-06-14 is before currentDate 2026-06-15",
		},
		{
			name:           "rule ends on current date - should be active",
			endDate:        time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC),
			expectActive:   true,
			expectedReason: "EndDate 2026-06-15 equals currentDate 2026-06-15",
		},
		{
			name:           "rule ends day after current date - should be active",
			endDate:        time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC),
			expectActive:   true,
			expectedReason: "EndDate 2026-06-16 is after currentDate 2026-06-15",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rules := []repository.FundFlowRule{
				{
					ID:                 "test-rule",
					RuleType:           RuleTypeAllocation,
					SourceIncomeID:     &incomeID,
					TargetInvestmentID: &investmentID,
					StartDate:          time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:            &tt.endDate,
				},
			}

			active := filterActiveAllocationRules(rules, currentDate)

			if tt.expectActive {
				require.Len(t, active, 1, tt.expectedReason)
				assert.Equal(t, "test-rule", active[0].ID)
			} else {
				require.Empty(t, active, tt.expectedReason)
			}
		})
	}
}

func TestGroupAllocationsByIncome(t *testing.T) {
	income1 := "income-1"
	income2 := "income-2"
	investmentID := "investment-1"

	rules := []repository.FundFlowRule{
		{ID: "rule-1", SourceIncomeID: &income1, TargetInvestmentID: &investmentID},
		{ID: "rule-2", SourceIncomeID: &income1, TargetInvestmentID: &investmentID},
		{ID: "rule-3", SourceIncomeID: &income2, TargetInvestmentID: &investmentID},
		{ID: "rule-invalid", SourceIncomeID: nil, TargetInvestmentID: &investmentID}, // No source - ignored
	}

	grouped := groupAllocationsByIncome(rules)

	assert.Len(t, grouped, 2)
	assert.Len(t, grouped[income1], 2)
	assert.Len(t, grouped[income2], 1)
}

// TestCalculateAllocationAmount tests the pure calculation function in isolation.
// This function computes how much to allocate based on the rule type, but does NOT
// modify any state. The actual tracking of remaining income happens in the caller
// (computeIncomeAllocations), not in this function.
//
// Parameters explained:
//   - totalIncome: The original gross income amount (never changes across allocations)
//   - remainingIncome: What's left after previous allocation rules have been processed.
//     This is passed IN as a parameter to simulate being called mid-pipeline.
//
// Example flow in computeIncomeAllocations:
//
//	Income: $5000
//	Rule 1 (priority 0, fixed $500):  calculateAllocationAmount(..., 5000, 5000) → returns 500
//	                                  remaining = 5000 - 500 = 4500  ← subtraction happens in caller
//	Rule 2 (priority 1, 30%):         calculateAllocationAmount(..., 5000, 4500) → returns 1500
//	                                  remaining = 4500 - 1500 = 3000
//	Rule 3 (priority 2, remainder):   calculateAllocationAmount(..., 5000, 3000) → returns 3000
func TestCalculateAllocationAmount(t *testing.T) {
	tests := []struct {
		name            string
		amountType      string
		amountValue     *decimal.Decimal
		totalIncome     *decimal.Decimal // Original income (used by percentage rules)
		remainingIncome *decimal.Decimal // Simulated remaining after previous rules
		expected        *decimal.Decimal
	}{
		{
			// Fixed allocations ignore remainingIncome - they just return the fixed amount.
			// The caller is responsible for capping at remaining if needed.
			name:            "fixed allocation",
			amountType:      AmountTypeFixed,
			amountValue:     decimal.MustFromString("500"),
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("5000"), // Not used by fixed type
			expected:        decimal.MustFromString("500"),
		},
		{
			// Percentage allocations use totalIncome (the original), not remainingIncome.
			// This ensures 30% always means 30% of gross, regardless of prior allocations.
			name:            "percentage allocation (30%)",
			amountType:      AmountTypePctSource,
			amountValue:     decimal.MustFromString("30"),
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("5000"), // Not used by percentage type
			expected:        decimal.MustFromString("1500"), // 30% of 5000
		},
		{
			// Remainder allocations use remainingIncome - takes whatever is left.
			// Here we simulate that $1500 was already allocated, leaving $3500.
			name:            "remainder allocation",
			amountType:      AmountTypeRemainder,
			amountValue:     nil,
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("3500"), // Simulates: prior rules took $1500
			expected:        decimal.MustFromString("3500"), // Takes all remaining
		},
		{
			// max_available with cap: takes up to the cap from remaining.
			// Here $3000 remains but cap is $1000, so returns $1000.
			name:            "max_available with cap",
			amountType:      AmountTypeMaxAvailable,
			amountValue:     decimal.MustFromString("1000"), // Cap
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("3000"), // Simulates: prior rules took $2000
			expected:        decimal.MustFromString("1000"), // Capped at 1000
		},
		{
			// max_available without cap: takes all remaining (like remainder).
			name:            "max_available without cap",
			amountType:      AmountTypeMaxAvailable,
			amountValue:     nil,
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("2000"), // Simulates: prior rules took $3000
			expected:        decimal.MustFromString("2000"), // Takes all remaining
		},
		{
			name:            "fixed with nil value",
			amountType:      AmountTypeFixed,
			amountValue:     nil,
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("5000"),
			expected:        decimal.Zero(),
		},
		{
			// Fixed allocation exceeding total income.
			// calculateAllocationAmount returns the requested amount; the caller
			// (computeIncomeAllocations) is responsible for capping at remaining.
			name:            "fixed allocation exceeds total income - returns requested amount",
			amountType:      AmountTypeFixed,
			amountValue:     decimal.MustFromString("10000"),
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("5000"),
			expected:        decimal.MustFromString("10000"), // Caller will cap this
		},
		{
			// Percentage over 100% - returns computed amount (caller caps it)
			name:            "percentage over 100% - returns computed amount",
			amountType:      AmountTypePctSource,
			amountValue:     decimal.MustFromString("150"),
			totalIncome:     decimal.MustFromString("5000"),
			remainingIncome: decimal.MustFromString("5000"),
			expected:        decimal.MustFromString("7500"), // 150% of 5000
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rule := repository.FundFlowRule{
				AmountType:  tt.amountType,
				AmountValue: tt.amountValue,
			}

			result := calculateAllocationAmount(rule, tt.totalIncome, tt.remainingIncome)
			assert.True(t, testutil.DecimalEqual(tt.expected, result), "expected %s, got %s", tt.expected.String(), result.String())
		})
	}
}

func TestExecuteAllocationGroup(t *testing.T) {
	income := FinancialDataRow{
		ID:       "income-1",
		ParentID: "income-1",
		Name:     "Salary",
	}
	monthlyAmount := decimal.MustFromString("6400") // Net after CPF

	investmentID := "inv-1"
	cashID := "cash-1"
	incomeID := "income-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "30% to Investment",
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypePctSource,
			AmountValue:        decimal.MustFromString("30"),
			Priority:           0,
		},
		{
			ID:                  "rule-2",
			Name:                "Remainder to Savings",
			SourceIncomeID:      &incomeID,
			TargetCashAccountID: &cashID,
			AmountType:          AmountTypeRemainder,
			Priority:            1,
		},
	}

	targetBalances := map[string]*decimal.Decimal{
		investmentID: decimal.MustFromString("10000"),
		cashID:       decimal.MustFromString("5000"),
	}

	executions := computeIncomeAllocations(income, monthlyAmount, rules, targetBalances, true)

	require.Len(t, executions, 2)

	// First execution: 30% = 1920
	assert.Equal(t, "rule-1", executions[0].RuleID)
	assert.True(t, testutil.DecimalEqual(executions[0].Amount, decimal.MustFromString("1920")))
	assert.Equal(t, AllocationTargetInvestment, executions[0].TargetType)
	assert.False(t, executions[0].WasFallback)

	// Second execution: remainder = 4480
	assert.Equal(t, "rule-2", executions[1].RuleID)
	assert.True(t, testutil.DecimalEqual(executions[1].Amount, decimal.MustFromString("4480")))
	assert.Equal(t, AllocationTargetCash, executions[1].TargetType)
	assert.True(t, executions[1].WasFallback)

	// Verify balances were updated
	assert.True(t, testutil.DecimalEqual(targetBalances[investmentID], decimal.MustFromString("11920"))) // 10000 + 1920
	assert.True(t, testutil.DecimalEqual(targetBalances[cashID], decimal.MustFromString("9480")))        // 5000 + 4480
}

func TestComputeIncomeAllocations_FixedExceedsRemaining(t *testing.T) {
	// Test that when a fixed allocation exceeds remaining income, it gets capped
	income := FinancialDataRow{
		ID:       "income-1",
		ParentID: "income-1",
		Name:     "Salary",
	}
	monthlyAmount := decimal.MustFromString("1000") // Only $1000 available

	investmentID := "inv-1"
	cashID := "cash-1"
	incomeID := "income-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "$800 to Investment",
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypeFixed,
			AmountValue:        decimal.MustFromString("800"), // Takes $800
			Priority:           0,
		},
		{
			ID:                  "rule-2",
			Name:                "$500 to Cash (exceeds remaining)",
			SourceIncomeID:      &incomeID,
			TargetCashAccountID: &cashID,
			AmountType:          AmountTypeFixed,
			AmountValue:         decimal.MustFromString("500"), // Wants $500 but only $200 left
			Priority:            1,
		},
	}

	targetBalances := map[string]*decimal.Decimal{
		investmentID: decimal.MustFromString("0"),
		cashID:       decimal.MustFromString("0"),
	}

	executions := computeIncomeAllocations(income, monthlyAmount, rules, targetBalances, true)

	require.Len(t, executions, 2)

	// First execution: fixed $800
	assert.True(t, testutil.DecimalEqual(executions[0].Amount, decimal.MustFromString("800")))

	// Second execution: wanted $500 but capped at remaining $200
	assert.True(t, testutil.DecimalEqual(executions[1].Amount, decimal.MustFromString("200")),
		"expected 200 (capped), got %s", executions[1].Amount.String())

	// Verify total allocated equals income (fully allocated)
	assert.True(t, testutil.DecimalEqual(targetBalances[investmentID], decimal.MustFromString("800")))
	assert.True(t, testutil.DecimalEqual(targetBalances[cashID], decimal.MustFromString("200")))
}

func TestExecuteAllocationRules_MultipleIncomes(t *testing.T) {
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	income1ID := "income-1"
	income2ID := "income-2"
	investmentID := "inv-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "Income1 to Investment",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &income1ID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypePctSource,
			AmountValue:        decimal.MustFromString("50"),
			Priority:           0,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			ID:                 "rule-2",
			Name:               "Income2 to Investment",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &income2ID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypeFixed,
			AmountValue:        decimal.MustFromString("1000"),
			Priority:           0,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	incomes := []FinancialDataRow{
		{ID: "income-1", ParentID: "income-1", Name: "Salary 1", StartDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)},
		{ID: "income-2", ParentID: "income-2", Name: "Salary 2", StartDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)},
	}

	incomeMonthlyAmounts := map[string]*decimal.Decimal{
		"income-1": decimal.MustFromString("5000"),
		"income-2": decimal.MustFromString("3000"),
	}

	targetBalances := map[string]*decimal.Decimal{
		investmentID: decimal.MustFromString("10000"),
	}

	result := executeAllocationRules(rules, incomes, incomeMonthlyAmounts, targetBalances, currentDate, true)

	// Income1: 50% of 5000 = 2500
	// Income2: fixed 1000
	// Total to investments = 3500
	assert.True(t, testutil.DecimalEqual(result.TotalToInvestments, decimal.MustFromString("3500")))

	// Verify balance was updated
	assert.True(t, testutil.DecimalEqual(targetBalances[investmentID], decimal.MustFromString("13500"))) // 10000 + 3500
}

func TestExecuteAllocationRules_ApplyToBalancesFalse(t *testing.T) {
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	incomeID := "income-1"
	investmentID := "inv-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			Name:               "To Investment",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypePctSource,
			AmountValue:        decimal.MustFromString("30"),
			Priority:           0,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	incomes := []FinancialDataRow{
		{ID: "income-1", ParentID: "income-1", Name: "Salary", StartDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)},
	}

	incomeMonthlyAmounts := map[string]*decimal.Decimal{
		"income-1": decimal.MustFromString("5000"),
	}

	originalBalance := decimal.MustFromString("10000")
	targetBalances := map[string]*decimal.Decimal{
		investmentID: originalBalance,
	}

	result := executeAllocationRules(rules, incomes, incomeMonthlyAmounts, targetBalances, currentDate, false)

	// Should still calculate totals
	assert.True(t, testutil.DecimalEqual(result.TotalToInvestments, decimal.MustFromString("1500")))

	// But balance should NOT be mutated
	assert.True(t, testutil.DecimalEqual(targetBalances[investmentID], originalBalance))
}

func TestComputeAllocationTotals(t *testing.T) {
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	incomeID := "income-1"
	investmentID := "inv-1"

	rules := []repository.FundFlowRule{
		{
			ID:                 "rule-1",
			RuleType:           RuleTypeAllocation,
			SourceIncomeID:     &incomeID,
			TargetInvestmentID: &investmentID,
			AmountType:         AmountTypePctSource,
			AmountValue:        decimal.MustFromString("25"),
			Priority:           0,
			StartDate:          time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	incomes := []FinancialDataRow{
		{
			ID:        "income-1",
			ParentID:  "income-1",
			Name:      "Monthly Salary",
			Frequency: "monthly",
			StartDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	// State contains the income amount
	state := map[string]*decimal.Decimal{
		"income-1":   decimal.MustFromString("8000"), // Monthly amount
		investmentID: decimal.MustFromString("50000"),
	}

	total := computeAllocationTotals(rules, incomes, state, currentDate, true)

	// 25% of 8000 = 2000
	assert.True(t, testutil.DecimalEqual(total, decimal.MustFromString("2000")))

	// Investment balance should be updated
	assert.True(t, testutil.DecimalEqual(state[investmentID], decimal.MustFromString("52000"))) // 50000 + 2000
}
