package processor

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/decimal"
)

func TestProcessOrdinaryWage_CitizenUnder55(t *testing.T) {
	// Standard case: citizen under 55 with $8,000 salary
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC), // 35 years old in 2025
		ResidencyStatus: config.ResidencyCitizen,
		OABalance:       *decimal.NewFromInt64(50000, 0),
		SABalance:       *decimal.NewFromInt64(20000, 0),
		MABalance:       *decimal.NewFromInt64(15000, 0),
		RABalance:       *decimal.NewFromInt64(0, 0),
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	grossAmount := decimal.MustFromString("8000")
	date := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessOrdinaryWage(grossAmount, state, date)
	if err != nil {
		t.Fatalf("failed to process OW: %v", err)
	}

	// Citizen under 55: 20% employee, 17% employer
	// Wage capped at $7,400 (OW ceiling)
	// 7400 * 0.20 = 1480 employee
	// 7400 * 0.17 = 1258 employer
	// Total = 2738
	// Take home = 8000 - 1480 = 6520

	employeeExpected := decimal.MustFromString("1480")
	if result.EmployeeContribution.Cmp(employeeExpected) != 0 {
		t.Errorf("employee contribution: expected %s, got %s",
			employeeExpected.String(), result.EmployeeContribution.String())
	}

	employerExpected := decimal.MustFromString("1258")
	if result.EmployerContribution.Cmp(employerExpected) != 0 {
		t.Errorf("employer contribution: expected %s, got %s",
			employerExpected.String(), result.EmployerContribution.String())
	}

	totalExpected := decimal.MustFromString("2738")
	if result.TotalContribution.Cmp(totalExpected) != 0 {
		t.Errorf("total contribution: expected %s, got %s",
			totalExpected.String(), result.TotalContribution.String())
	}

	takeHomeExpected := decimal.MustFromString("6520")
	if result.NetTakeHomePay.Cmp(takeHomeExpected) != 0 {
		t.Errorf("take home pay: expected %s, got %s",
			takeHomeExpected.String(), result.NetTakeHomePay.String())
	}

	if result.CPFWageType != CPFWageTypeOW {
		t.Errorf("wage type: expected %s, got %s", CPFWageTypeOW, result.CPFWageType)
	}

	t.Logf("OW Result: Employee=%s, Employer=%s, Total=%s, TakeHome=%s",
		result.EmployeeContribution.String(),
		result.EmployerContribution.String(),
		result.TotalContribution.String(),
		result.NetTakeHomePay.String())
}

func TestProcessOrdinaryWage_AtCeiling(t *testing.T) {
	// Test wage at OW ceiling ($7,400 in 2025)
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	grossAmount := decimal.MustFromString("7400") // At ceiling
	date := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessOrdinaryWage(grossAmount, state, date)
	if err != nil {
		t.Fatalf("failed to process OW: %v", err)
	}

	// Should use full 7400 for calculation
	if result.CappedAmount.Cmp(grossAmount) != 0 {
		t.Errorf("capped amount should equal gross at ceiling: expected %s, got %s",
			grossAmount.String(), result.CappedAmount.String())
	}

	// 7400 * 0.20 = 1480 employee
	employeeExpected := decimal.MustFromString("1480")
	if result.EmployeeContribution.Cmp(employeeExpected) != 0 {
		t.Errorf("employee contribution: expected %s, got %s",
			employeeExpected.String(), result.EmployeeContribution.String())
	}

	t.Logf("At Ceiling: Capped=%s, Employee=%s",
		result.CappedAmount.String(), result.EmployeeContribution.String())
}

func TestProcessOrdinaryWage_AboveCeiling(t *testing.T) {
	// Test wage above OW ceiling - should be capped
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	grossAmount := decimal.MustFromString("10000") // Above ceiling
	date := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessOrdinaryWage(grossAmount, state, date)
	if err != nil {
		t.Fatalf("failed to process OW: %v", err)
	}

	// Should be capped at 7400
	cappedExpected := decimal.MustFromString("7400")
	if result.CappedAmount.Cmp(cappedExpected) != 0 {
		t.Errorf("capped amount: expected %s, got %s",
			cappedExpected.String(), result.CappedAmount.String())
	}

	// Employee contribution based on capped amount: 7400 * 0.20 = 1480
	employeeExpected := decimal.MustFromString("1480")
	if result.EmployeeContribution.Cmp(employeeExpected) != 0 {
		t.Errorf("employee contribution: expected %s, got %s",
			employeeExpected.String(), result.EmployeeContribution.String())
	}

	// Take home = gross - employee contribution = 10000 - 1480 = 8520
	takeHomeExpected := decimal.MustFromString("8520")
	if result.NetTakeHomePay.Cmp(takeHomeExpected) != 0 {
		t.Errorf("take home pay: expected %s, got %s",
			takeHomeExpected.String(), result.NetTakeHomePay.String())
	}

	t.Logf("Above Ceiling: Gross=%s, Capped=%s, TakeHome=%s",
		grossAmount.String(), result.CappedAmount.String(), result.NetTakeHomePay.String())
}

func TestProcessAdditionalWage_Bonus(t *testing.T) {
	// Test bonus (AW) calculation
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)

	// Simulate 6 months of salary at $7,000/month
	monthlySalary := decimal.MustFromString("7000")
	for month := 1; month <= 6; month++ {
		date := time.Date(2025, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		_, err := processor.ProcessOrdinaryWage(monthlySalary, state, date)
		if err != nil {
			t.Fatalf("failed to process month %d OW: %v", month, err)
		}
	}

	// YTD OW should be 6 * 7000 = 42000
	ytdExpected := decimal.MustFromString("42000")
	if state.YTDOrdinaryWages.Cmp(ytdExpected) != 0 {
		t.Errorf("YTD OW: expected %s, got %s",
			ytdExpected.String(), state.YTDOrdinaryWages.String())
	}

	// Now process a bonus
	bonus := decimal.MustFromString("12000")
	date := time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessAdditionalWage(bonus, state, date)
	if err != nil {
		t.Fatalf("failed to process AW: %v", err)
	}

	if result.CPFWageType != CPFWageTypeAW {
		t.Errorf("wage type: expected %s, got %s", CPFWageTypeAW, result.CPFWageType)
	}

	// Bonus should be fully used (under annual ceiling)
	// Annual ceiling = 102000, YTD OW = 42000, remaining = 60000
	if result.CappedAmount.Cmp(bonus) != 0 {
		t.Errorf("bonus should be fully used: expected %s, got %s",
			bonus.String(), result.CappedAmount.String())
	}

	t.Logf("Bonus: YTD_OW=%s, Bonus=%s, Capped=%s, Employee=%s",
		state.YTDOrdinaryWages.String(),
		bonus.String(),
		result.CappedAmount.String(),
		result.EmployeeContribution.String())
}

func TestYTDReset_AtYearBoundary(t *testing.T) {
	// Test that YTD resets when transitioning to a new year
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)

	// Process some wages in 2025
	salary := decimal.MustFromString("7000")
	date := time.Date(2025, 12, 1, 0, 0, 0, 0, time.UTC)
	_, _ = processor.ProcessOrdinaryWage(salary, state, date)

	// YTD should have value
	if state.YTDOrdinaryWages.IsZero() {
		t.Error("YTD should not be zero after processing")
	}

	// Reset for new year
	processor.ResetYTDBalances(state)

	// YTD should be zero
	if !state.YTDOrdinaryWages.IsZero() {
		t.Errorf("YTD OW should be zero after reset, got %s", state.YTDOrdinaryWages.String())
	}
	if !state.YTDAWSWages.IsZero() {
		t.Errorf("YTD AW should be zero after reset, got %s", state.YTDAWSWages.String())
	}

	t.Log("YTD reset successful")
}

func TestAddContributionToBalances(t *testing.T) {
	// Test that contributions are added to accumulated balances
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
		OABalance:       *decimal.NewFromInt64(10000, 0),
		SABalance:       *decimal.NewFromInt64(5000, 0),
		MABalance:       *decimal.NewFromInt64(3000, 0),
		RABalance:       *decimal.NewFromInt64(0, 0),
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	initialTotal := state.TotalBalance()

	// Process a wage
	salary := decimal.MustFromString("8000")
	date := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessOrdinaryWage(salary, state, date)
	if err != nil {
		t.Fatalf("failed to process OW: %v", err)
	}

	// Add contribution to state
	processor.AddContributionToBalances(result, state)

	// Total balance should increase by total contribution
	newTotal := state.TotalBalance()
	expectedTotal, _ := initialTotal.Add(result.TotalContribution)

	if newTotal.Cmp(expectedTotal) != 0 {
		t.Errorf("total balance: expected %s, got %s",
			expectedTotal.String(), newTotal.String())
	}

	t.Logf("Initial: %s, Added: %s, New Total: %s",
		initialTotal.String(),
		result.TotalContribution.String(),
		newTotal.String())
}

func TestAccumulation_MultipleMonths(t *testing.T) {
	// Test CPF accumulation over 3 months
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: config.ResidencyCitizen,
		OABalance:       *decimal.NewFromInt64(0, 0),
		SABalance:       *decimal.NewFromInt64(0, 0),
		MABalance:       *decimal.NewFromInt64(0, 0),
		RABalance:       *decimal.NewFromInt64(0, 0),
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	salary := decimal.MustFromString("8000")

	// Process 3 months
	for month := 1; month <= 3; month++ {
		date := time.Date(2025, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		result, err := processor.ProcessOrdinaryWage(salary, state, date)
		if err != nil {
			t.Fatalf("failed to process month %d: %v", month, err)
		}
		processor.AddContributionToBalances(result, state)

		t.Logf("Month %d: Total CPF Balance = %s", month, state.TotalBalance().String())
	}

	// After 3 months at 8000/month (capped at 7400):
	// Total contribution per month = 2738
	// 3 months = 8214
	expectedTotal := decimal.MustFromString("8214")
	if state.TotalBalance().Cmp(expectedTotal) != 0 {
		t.Errorf("3-month total: expected %s, got %s",
			expectedTotal.String(), state.TotalBalance().String())
	}
}

func TestNewCPFBalances_NilAccount(t *testing.T) {
	// Test creating state with nil account (no CPF account exists)
	state := NewCPFBalances(nil)

	if !state.AccumulatedOA.IsZero() {
		t.Errorf("OA should be zero for nil account, got %s", state.AccumulatedOA.String())
	}
	if !state.AccumulatedSA.IsZero() {
		t.Errorf("SA should be zero for nil account, got %s", state.AccumulatedSA.String())
	}
	if !state.AccumulatedMA.IsZero() {
		t.Errorf("MA should be zero for nil account, got %s", state.AccumulatedMA.String())
	}
	if !state.AccumulatedRA.IsZero() {
		t.Errorf("RA should be zero for nil account, got %s", state.AccumulatedRA.String())
	}
	if !state.TotalBalance().IsZero() {
		t.Errorf("Total should be zero for nil account, got %s", state.TotalBalance().String())
	}
}

func TestAllocation_Under35(t *testing.T) {
	// Test allocation percentages for age under 35
	// Age ≤35: OA 62.17%, SA 16.21%, MA 21.62%
	cpfAccount := &account.CPFAccount{
		DateOfBirth:     time.Date(1995, 1, 15, 0, 0, 0, 0, time.UTC), // 30 years old in 2025
		ResidencyStatus: config.ResidencyCitizen,
	}

	processor, err := NewProcessor(cpfAccount)
	if err != nil {
		t.Fatalf("failed to create processor: %v", err)
	}

	state := NewCPFBalances(cpfAccount)
	salary := decimal.MustFromString("5000")
	date := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	result, err := processor.ProcessOrdinaryWage(salary, state, date)
	if err != nil {
		t.Fatalf("failed to process OW: %v", err)
	}

	// Total contribution = 5000 * 0.37 = 1850
	totalExpected := decimal.MustFromString("1850")
	if result.TotalContribution.Cmp(totalExpected) != 0 {
		t.Errorf("total contribution: expected %s, got %s",
			totalExpected.String(), result.TotalContribution.String())
	}

	// Check that allocations sum to total
	allocSum := decimal.Zero()
	allocSum, _ = allocSum.Add(result.AllocationOA)
	allocSum, _ = allocSum.Add(result.AllocationSA)
	allocSum, _ = allocSum.Add(result.AllocationMA)
	allocSum, _ = allocSum.Add(result.AllocationRA)

	if allocSum.Cmp(result.TotalContribution) != 0 {
		t.Errorf("allocation sum (%s) != total contribution (%s)",
			allocSum.String(), result.TotalContribution.String())
	}

	t.Logf("Under 35 Allocation: OA=%s, SA=%s, MA=%s, RA=%s, Total=%s",
		result.AllocationOA.String(),
		result.AllocationSA.String(),
		result.AllocationMA.String(),
		result.AllocationRA.String(),
		result.TotalContribution.String())
}
