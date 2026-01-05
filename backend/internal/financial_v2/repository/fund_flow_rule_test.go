package repository

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/stretchr/testify/require"
)

// =============================================================================
// VALIDATION TESTS
// =============================================================================

func TestValidateFundFlowRule_PaymentRules(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	cashAccountID := "cash-account-uuid"
	investmentID := "investment-uuid"
	incomeID := "income-uuid"
	propertyID := "property-uuid"
	liabilityID := "liability-uuid"

	tests := []struct {
		name        string
		rule        FundFlowRule
		expectedErr error
	}{
		{
			name: "valid payment rule - CPF to property",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
			},
			expectedErr: nil,
		},
		{
			name: "valid payment rule - cash to liability",
			rule: FundFlowRule{
				RuleType:            "payment",
				SourceCashAccountID: &cashAccountID,
				TargetLiabilityID:   &liabilityID,
				AmountType:          "target_required",
			},
			expectedErr: nil,
		},
		{
			name: "valid payment rule - fixed amount",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "fixed",
				AmountValue:        decimal.MustFromString("2500"),
			},
			expectedErr: nil,
		},
		{
			name: "invalid payment rule - income source not allowed",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceIncomeID:     &incomeID,
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
			},
			expectedErr: ErrPaymentCannotHaveIncomeSource,
		},
		{
			name: "invalid payment rule - investment source not allowed",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceInvestmentID: &investmentID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
			},
			expectedErr: ErrPaymentCannotUseInvestmentSource,
		},
		{
			name: "invalid payment rule - no source",
			rule: FundFlowRule{
				RuleType:         "payment",
				TargetPropertyID: &propertyID,
				AmountType:       "max_available",
			},
			expectedErr: ErrPaymentRequiresOneSource,
		},
		{
			name: "invalid payment rule - multiple sources",
			rule: FundFlowRule{
				RuleType:            "payment",
				SourceCpfAccountID:  &cpfAccountID,
				SourceCashAccountID: &cashAccountID,
				TargetPropertyID:    &propertyID,
				AmountType:          "max_available",
			},
			expectedErr: ErrPaymentRequiresOneSource,
		},
		{
			name: "invalid payment rule - no target",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				AmountType:         "max_available",
			},
			expectedErr: ErrPaymentRequiresLiabilityOrProperty,
		},
		{
			name: "invalid payment rule - account target not allowed",
			rule: FundFlowRule{
				RuleType:            "payment",
				SourceCpfAccountID:  &cpfAccountID,
				TargetCashAccountID: &cashAccountID, // Should be liability or property
				AmountType:          "max_available",
			},
			expectedErr: ErrPaymentRequiresLiabilityOrProperty,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFundFlowRule(tc.rule)
			if tc.expectedErr == nil {
				require.NoError(t, err)
			} else {
				require.ErrorIs(t, err, tc.expectedErr)
			}
		})
	}
}

func TestValidateFundFlowRule_AllocationRules(t *testing.T) {
	t.Parallel()

	incomeID := "income-uuid"
	cashAccountID := "cash-account-uuid"
	investmentID := "investment-uuid"
	cpfAccountID := "cpf-account-uuid"

	tests := []struct {
		name        string
		rule        FundFlowRule
		expectedErr error
	}{
		{
			name: "valid allocation rule - income to cash",
			rule: FundFlowRule{
				RuleType:            "allocation",
				SourceIncomeID:      &incomeID,
				TargetCashAccountID: &cashAccountID,
				AmountType:          "percentage",
				AmountValue:         decimal.MustFromString("30"),
			},
			expectedErr: nil,
		},
		{
			name: "valid allocation rule - income to investment",
			rule: FundFlowRule{
				RuleType:           "allocation",
				SourceIncomeID:     &incomeID,
				TargetInvestmentID: &investmentID,
				AmountType:         "remainder",
			},
			expectedErr: nil,
		},
		{
			name: "valid allocation rule - income to CPF (voluntary)",
			rule: FundFlowRule{
				RuleType:           "allocation",
				SourceIncomeID:     &incomeID,
				TargetCpfAccountID: &cpfAccountID,
				AmountType:         "fixed",
				AmountValue:        decimal.MustFromString("500"),
			},
			expectedErr: nil,
		},
		{
			name: "invalid allocation rule - no income source",
			rule: FundFlowRule{
				RuleType:            "allocation",
				TargetCashAccountID: &cashAccountID,
				AmountType:          "percentage",
				AmountValue:         decimal.MustFromString("30"),
			},
			expectedErr: ErrAllocationRequiresIncomeSource,
		},
		{
			name: "invalid allocation rule - no target",
			rule: FundFlowRule{
				RuleType:       "allocation",
				SourceIncomeID: &incomeID,
				AmountType:     "percentage",
				AmountValue:    decimal.MustFromString("30"),
			},
			expectedErr: ErrAllocationRequiresOneAccountTarget,
		},
		{
			name: "invalid allocation rule - multiple targets",
			rule: FundFlowRule{
				RuleType:            "allocation",
				SourceIncomeID:      &incomeID,
				TargetCashAccountID: &cashAccountID,
				TargetInvestmentID:  &investmentID,
				AmountType:          "percentage",
				AmountValue:         decimal.MustFromString("30"),
			},
			expectedErr: ErrAllocationRequiresOneAccountTarget,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFundFlowRule(tc.rule)
			if tc.expectedErr == nil {
				require.NoError(t, err)
			} else {
				require.ErrorIs(t, err, tc.expectedErr)
			}
		})
	}
}

func TestValidateFundFlowRule_TransferRules(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	cashAccountID := "cash-account-uuid"
	investmentID := "investment-uuid"

	tests := []struct {
		name        string
		rule        FundFlowRule
		expectedErr error
	}{
		{
			name: "valid transfer rule - cash to CPF (SA top-up)",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceCashAccountID: &cashAccountID,
				TargetCpfAccountID:  &cpfAccountID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("583.33"),
			},
			expectedErr: nil,
		},
		{
			name: "valid transfer rule - investment to cash (drawdown)",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceInvestmentID:  &investmentID,
				TargetCashAccountID: &cashAccountID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("5000"),
			},
			expectedErr: nil,
		},
		{
			name: "valid transfer rule - CPF to cash (retirement)",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceCpfAccountID:  &cpfAccountID,
				TargetCashAccountID: &cashAccountID,
				AmountType:          "max_available",
				AmountValue:         decimal.MustFromString("500"), // capped at $500
			},
			expectedErr: nil,
		},
		{
			name: "invalid transfer rule - no source",
			rule: FundFlowRule{
				RuleType:            "transfer",
				TargetCashAccountID: &cashAccountID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("1000"),
			},
			expectedErr: ErrTransferRequiresOneAccountSource,
		},
		{
			name: "invalid transfer rule - multiple sources",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceCpfAccountID:  &cpfAccountID,
				SourceCashAccountID: &cashAccountID,
				TargetInvestmentID:  &investmentID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("1000"),
			},
			expectedErr: ErrTransferRequiresOneAccountSource,
		},
		{
			name: "invalid transfer rule - no target",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceCashAccountID: &cashAccountID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("1000"),
			},
			expectedErr: ErrTransferRequiresOneAccountTarget,
		},
		{
			name: "invalid transfer rule - multiple targets",
			rule: FundFlowRule{
				RuleType:            "transfer",
				SourceCashAccountID: &cashAccountID,
				TargetCpfAccountID:  &cpfAccountID,
				TargetInvestmentID:  &investmentID,
				AmountType:          "fixed",
				AmountValue:         decimal.MustFromString("1000"),
			},
			expectedErr: ErrTransferRequiresOneAccountTarget,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFundFlowRule(tc.rule)
			if tc.expectedErr == nil {
				require.NoError(t, err)
			} else {
				require.ErrorIs(t, err, tc.expectedErr)
			}
		})
	}
}

func TestValidateFundFlowRule_AmountTypes(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	propertyID := "property-uuid"

	tests := []struct {
		name        string
		rule        FundFlowRule
		expectedErr error
	}{
		{
			name: "fixed amount - valid with value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "fixed",
				AmountValue:        decimal.MustFromString("2500"),
			},
			expectedErr: nil,
		},
		{
			name: "fixed amount - missing value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "fixed",
				AmountValue:        nil,
			},
			expectedErr: ErrAmountValueRequired,
		},
		{
			name: "percentage - valid 30%",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        decimal.MustFromString("30"),
			},
			expectedErr: nil,
		},
		{
			name: "percentage - valid 100%",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        decimal.MustFromString("100"),
			},
			expectedErr: nil,
		},
		{
			name: "percentage - valid 0%",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        decimal.MustFromString("0"),
			},
			expectedErr: nil,
		},
		{
			name: "percentage - missing value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        nil,
			},
			expectedErr: ErrAmountValueRequired,
		},
		{
			name: "percentage - out of range (negative)",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        decimal.MustFromString("-10"),
			},
			expectedErr: ErrPercentageOutOfRange,
		},
		{
			name: "percentage - out of range (over 100)",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "percentage",
				AmountValue:        decimal.MustFromString("150"),
			},
			expectedErr: ErrPercentageOutOfRange,
		},
		{
			name: "remainder - valid without value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "remainder",
				AmountValue:        nil,
			},
			expectedErr: nil,
		},
		{
			name: "target_required - valid without value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "target_required",
				AmountValue:        nil,
			},
			expectedErr: nil,
		},
		{
			name: "max_available - valid without value",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
				AmountValue:        nil,
			},
			expectedErr: nil,
		},
		{
			name: "max_available - valid with optional cap",
			rule: FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
				AmountValue:        decimal.MustFromString("2000"), // optional cap
			},
			expectedErr: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateFundFlowRule(tc.rule)
			if tc.expectedErr == nil {
				require.NoError(t, err)
			} else {
				require.ErrorIs(t, err, tc.expectedErr)
			}
		})
	}
}

func TestValidateFundFlowRule_InvalidRuleType(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	propertyID := "property-uuid"

	rule := FundFlowRule{
		RuleType:           "unknown",
		SourceCpfAccountID: &cpfAccountID,
		TargetPropertyID:   &propertyID,
		AmountType:         "fixed",
		AmountValue:        decimal.MustFromString("1000"),
	}

	err := ValidateFundFlowRule(rule)
	require.ErrorIs(t, err, ErrInvalidRuleType)
}

// =============================================================================
// SCENARIO TESTS
// These test the complete data structure as per the spec scenarios
// =============================================================================

// Scenario 1: HDB Mortgage with Priority-Based Payment Sources
// User Story: John and Jane's HDB mortgage is $2,800/month. They want to:
// 1. First use John's CPF OA (as much as available)
// 2. Then use Jane's CPF OA (as much as available)
// 3. Finally, cash covers any remainder
func TestScenario1_HDBMortgageWithPriorityBasedSources(t *testing.T) {
	t.Parallel()

	cpfJohnID := "cpf-john-uuid"
	cpfJaneID := "cpf-jane-uuid"
	cashSavingsID := "cash-savings-uuid"
	propertyHDBID := "prop-hdb-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	// Rule 1: HDB from John CPF (priority 0)
	rule1 := FundFlowRule{
		Name:               "HDB from John CPF",
		RuleType:           "payment",
		SourceCpfAccountID: &cpfJohnID,
		TargetPropertyID:   &propertyHDBID,
		AmountType:         "max_available",
		Priority:           0,
		StartDate:          startDate,
	}

	// Rule 2: HDB from Jane CPF (priority 1)
	rule2 := FundFlowRule{
		Name:               "HDB from Jane CPF",
		RuleType:           "payment",
		SourceCpfAccountID: &cpfJaneID,
		TargetPropertyID:   &propertyHDBID,
		AmountType:         "max_available",
		Priority:           1,
		StartDate:          startDate,
	}

	// Rule 3: HDB from Cash (priority 2, remainder)
	rule3 := FundFlowRule{
		Name:                "HDB from Cash",
		RuleType:            "payment",
		SourceCashAccountID: &cashSavingsID,
		TargetPropertyID:    &propertyHDBID,
		AmountType:          "remainder",
		Priority:            2,
		StartDate:           startDate,
	}

	// All rules should be valid
	require.NoError(t, ValidateFundFlowRule(rule1), "Rule 1 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule2), "Rule 2 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule3), "Rule 3 should be valid")

	// Verify priority ordering
	require.Less(t, rule1.Priority, rule2.Priority, "John CPF should have higher priority than Jane CPF")
	require.Less(t, rule2.Priority, rule3.Priority, "Jane CPF should have higher priority than Cash")

	// Verify all target the same property
	require.Equal(t, rule1.TargetPropertyID, rule2.TargetPropertyID)
	require.Equal(t, rule2.TargetPropertyID, rule3.TargetPropertyID)
}

// Scenario 2: Investment Condo with Fixed Amounts
// User Story: Investment condo mortgage is $4,500/month. They want to:
// 1. Pay exactly $2,000 from John's CPF OA
// 2. Pay exactly $2,500 from joint savings
func TestScenario2_InvestmentCondoWithFixedAmounts(t *testing.T) {
	t.Parallel()

	cpfJohnID := "cpf-john-uuid"
	cashSavingsID := "cash-savings-uuid"
	propertyCondoID := "prop-condo-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	// Rule 1: Condo from John CPF - fixed $2,000
	rule1 := FundFlowRule{
		Name:               "Condo from John CPF",
		RuleType:           "payment",
		SourceCpfAccountID: &cpfJohnID,
		TargetPropertyID:   &propertyCondoID,
		AmountType:         "fixed",
		AmountValue:        decimal.MustFromString("2000"),
		Priority:           0,
		StartDate:          startDate,
	}

	// Rule 2: Condo from Cash - fixed $2,500
	rule2 := FundFlowRule{
		Name:                "Condo from Cash",
		RuleType:            "payment",
		SourceCashAccountID: &cashSavingsID,
		TargetPropertyID:    &propertyCondoID,
		AmountType:          "fixed",
		AmountValue:         decimal.MustFromString("2500"),
		Priority:            1,
		StartDate:           startDate,
	}

	// Both rules should be valid
	require.NoError(t, ValidateFundFlowRule(rule1), "Rule 1 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule2), "Rule 2 should be valid")

	// Verify fixed amounts sum to total mortgage
	expectedTotal := decimal.MustFromString("4500")
	actualTotal := rule1.AmountValue.Add(rule2.AmountValue)
	require.Equal(t, 0, actualTotal.Cmp(expectedTotal), "Fixed amounts should sum to $4,500")
}

// Scenario 3: Car Loan - Single Source
// User Story: Car loan is $800/month, paid entirely from joint savings.
func TestScenario3_CarLoanSingleSource(t *testing.T) {
	t.Parallel()

	cashSavingsID := "cash-savings-uuid"
	loanCarID := "loan-car-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2029, 12, 31, 0, 0, 0, 0, time.UTC)

	rule := FundFlowRule{
		Name:                "Car Loan Payment",
		RuleType:            "payment",
		SourceCashAccountID: &cashSavingsID,
		TargetLiabilityID:   &loanCarID,
		AmountType:          "target_required", // Pay whatever the liability requires
		Priority:            0,
		StartDate:           startDate,
		EndDate:             &endDate,
	}

	require.NoError(t, ValidateFundFlowRule(rule), "Rule should be valid")
	require.Equal(t, "target_required", rule.AmountType, "Should use target_required amount type")
	require.NotNil(t, rule.EndDate, "Rule should have an end date (loan tenure)")
}

// Scenario 4: Retirement Drawdown (Age 65+)
// User Story: At retirement, John needs $5,000/month for living expenses. Priority:
// 1. CPF LIFE payout (fixed $2,000/month)
// 2. Investment portfolio (fixed $2,500/month)
// 3. CPF RA as emergency backup (max_available, capped at $500)
func TestScenario4_RetirementDrawdown(t *testing.T) {
	t.Parallel()

	cpfJohnID := "cpf-john-uuid"
	investmentPortfolioID := "inv-portfolio-uuid"
	cashRetirementID := "cash-retirement-uuid"
	startDate := time.Date(2055, 1, 1, 0, 0, 0, 0, time.UTC)

	// Rule 1: CPF LIFE Payout - fixed $2,000
	rule1 := FundFlowRule{
		Name:                "CPF LIFE Payout",
		RuleType:            "transfer",
		SourceCpfAccountID:  &cpfJohnID,
		TargetCashAccountID: &cashRetirementID,
		AmountType:          "fixed",
		AmountValue:         decimal.MustFromString("2000"),
		Priority:            0,
		StartDate:           startDate,
	}

	// Rule 2: Investment Drawdown - fixed $2,500
	rule2 := FundFlowRule{
		Name:                "Investment Drawdown",
		RuleType:            "transfer",
		SourceInvestmentID:  &investmentPortfolioID,
		TargetCashAccountID: &cashRetirementID,
		AmountType:          "fixed",
		AmountValue:         decimal.MustFromString("2500"),
		Priority:            1,
		StartDate:           startDate,
	}

	// Rule 3: CPF RA Emergency - max_available with $500 cap
	rule3 := FundFlowRule{
		Name:                "CPF RA Emergency",
		RuleType:            "transfer",
		SourceCpfAccountID:  &cpfJohnID,
		TargetCashAccountID: &cashRetirementID,
		AmountType:          "max_available",
		AmountValue:         decimal.MustFromString("500"), // capped at $500
		Priority:            2,
		StartDate:           startDate,
	}

	// All rules should be valid
	require.NoError(t, ValidateFundFlowRule(rule1), "Rule 1 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule2), "Rule 2 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule3), "Rule 3 should be valid")

	// Verify rule types are 'transfer' (account to account)
	require.Equal(t, "transfer", rule1.RuleType)
	require.Equal(t, "transfer", rule2.RuleType)
	require.Equal(t, "transfer", rule3.RuleType)

	// Verify all target the same cash account
	require.Equal(t, rule1.TargetCashAccountID, rule2.TargetCashAccountID)
	require.Equal(t, rule2.TargetCashAccountID, rule3.TargetCashAccountID)

	// Verify priority ordering
	require.Less(t, rule1.Priority, rule2.Priority)
	require.Less(t, rule2.Priority, rule3.Priority)
}

// Scenario 5: Income Allocation (Salary Distribution)
// User Story: John's $8,000 salary should be allocated:
// 1. 30% to Growth ETFs investment
// 2. 20% to Emergency Fund
// 3. Remainder to Joint Savings
func TestScenario5_IncomeAllocation(t *testing.T) {
	t.Parallel()

	incomeJohnID := "income-john-uuid"
	investmentGrowthID := "inv-growth-uuid"
	cashEmergencyID := "cash-emergency-uuid"
	cashSavingsID := "cash-savings-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	// Rule 1: Salary to Growth ETFs - 30%
	rule1 := FundFlowRule{
		Name:               "Salary to Growth ETFs",
		RuleType:           "allocation",
		SourceIncomeID:     &incomeJohnID,
		TargetInvestmentID: &investmentGrowthID,
		AmountType:         "percentage",
		AmountValue:        decimal.MustFromString("30"),
		Priority:           0,
		StartDate:          startDate,
	}

	// Rule 2: Salary to Emergency Fund - 20%
	rule2 := FundFlowRule{
		Name:                "Salary to Emergency",
		RuleType:            "allocation",
		SourceIncomeID:      &incomeJohnID,
		TargetCashAccountID: &cashEmergencyID,
		AmountType:          "percentage",
		AmountValue:         decimal.MustFromString("20"),
		Priority:            1,
		StartDate:           startDate,
	}

	// Rule 3: Salary to Savings - remainder
	rule3 := FundFlowRule{
		Name:                "Salary to Savings",
		RuleType:            "allocation",
		SourceIncomeID:      &incomeJohnID,
		TargetCashAccountID: &cashSavingsID,
		AmountType:          "remainder",
		Priority:            2,
		StartDate:           startDate,
	}

	// All rules should be valid
	require.NoError(t, ValidateFundFlowRule(rule1), "Rule 1 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule2), "Rule 2 should be valid")
	require.NoError(t, ValidateFundFlowRule(rule3), "Rule 3 should be valid")

	// Verify rule types are 'allocation' (income to account)
	require.Equal(t, "allocation", rule1.RuleType)
	require.Equal(t, "allocation", rule2.RuleType)
	require.Equal(t, "allocation", rule3.RuleType)

	// Verify all source from the same income
	require.Equal(t, rule1.SourceIncomeID, rule2.SourceIncomeID)
	require.Equal(t, rule2.SourceIncomeID, rule3.SourceIncomeID)

	// Verify percentages sum to less than or equal to 100
	// (30 + 20 = 50%, remainder gets the rest)
	totalPercentage := rule1.AmountValue.Add(rule2.AmountValue)
	hundred := decimal.MustFromString("100")
	require.LessOrEqual(t, totalPercentage.Cmp(hundred), 0, "Percentages should not exceed 100%")
}

// Scenario 6: Voluntary CPF SA Top-Up
// User Story: John wants to top up CPF SA by $7,000/year from savings.
func TestScenario6_VoluntaryCPFSATopUp(t *testing.T) {
	t.Parallel()

	cashSavingsID := "cash-savings-uuid"
	cpfJohnID := "cpf-john-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2054, 12, 31, 0, 0, 0, 0, time.UTC)

	// $7,000 / 12 months = $583.33/month
	monthlyTopUp := decimal.MustFromString("583.33")

	rule := FundFlowRule{
		Name:                "Annual SA Top-Up",
		RuleType:            "transfer",
		SourceCashAccountID: &cashSavingsID,
		TargetCpfAccountID:  &cpfJohnID,
		AmountType:          "fixed",
		AmountValue:         monthlyTopUp,
		Priority:            0,
		StartDate:           startDate,
		EndDate:             &endDate,
	}

	require.NoError(t, ValidateFundFlowRule(rule), "Rule should be valid")
	require.Equal(t, "transfer", rule.RuleType, "Should be a transfer rule")
	require.NotNil(t, rule.EndDate, "Rule should have an end date (before age 55)")

	// Verify annual amount
	twelve := decimal.MustFromString("12")
	annualAmount := rule.AmountValue.Mul(twelve)
	expectedAnnual := decimal.MustFromString("6999.96") // 583.33 * 12 = 6999.96
	require.Equal(t, 0, annualAmount.Cmp(expectedAnnual), "Annual top-up should be ~$7,000")
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

func TestValidateFundFlowRule_PaymentWithBothLiabilityAndProperty(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	propertyID := "property-uuid"
	liabilityID := "liability-uuid"

	// Having both liability and property target should still be valid
	// (validation just checks at least one is set)
	rule := FundFlowRule{
		RuleType:           "payment",
		SourceCpfAccountID: &cpfAccountID,
		TargetPropertyID:   &propertyID,
		TargetLiabilityID:  &liabilityID, // Both set
		AmountType:         "max_available",
	}

	// This should be valid - the validation only checks that at least one is set
	// Business logic can decide what to do with both
	err := ValidateFundFlowRule(rule)
	require.NoError(t, err, "Having both liability and property targets should be valid at validation level")
}

func TestValidateFundFlowRule_PriorityValues(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	propertyID := "property-uuid"

	tests := []struct {
		name     string
		priority int
	}{
		{"priority 0 (highest)", 0},
		{"priority 1", 1},
		{"priority 10", 10},
		{"priority 100", 100},
		{"negative priority", -1},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rule := FundFlowRule{
				RuleType:           "payment",
				SourceCpfAccountID: &cpfAccountID,
				TargetPropertyID:   &propertyID,
				AmountType:         "max_available",
				Priority:           tc.priority,
			}

			// Priority values don't affect validation - any int is valid
			err := ValidateFundFlowRule(rule)
			require.NoError(t, err)
		})
	}
}

func TestValidateFundFlowRule_DateFields(t *testing.T) {
	t.Parallel()

	cpfAccountID := "cpf-account-uuid"
	propertyID := "property-uuid"
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2030, 12, 31, 0, 0, 0, 0, time.UTC)

	// Rule with both start and end date
	rule := FundFlowRule{
		RuleType:           "payment",
		SourceCpfAccountID: &cpfAccountID,
		TargetPropertyID:   &propertyID,
		AmountType:         "max_available",
		StartDate:          startDate,
		EndDate:            &endDate,
	}

	err := ValidateFundFlowRule(rule)
	require.NoError(t, err)

	// Rule with no end date (perpetual)
	rule2 := FundFlowRule{
		RuleType:           "payment",
		SourceCpfAccountID: &cpfAccountID,
		TargetPropertyID:   &propertyID,
		AmountType:         "max_available",
		StartDate:          startDate,
		EndDate:            nil, // No end date
	}

	err = ValidateFundFlowRule(rule2)
	require.NoError(t, err)
}
