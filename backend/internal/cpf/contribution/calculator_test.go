package contribution

import (
	"testing"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/decimal"
)

// d is a helper to create decimal from string
func d(s string) decimal.Decimal {
	return *decimal.MustFromString(s)
}

// testConfig2025 returns a test config matching 2025 CPF rates
func testConfig2025() *config.ConfigData {
	return &config.ConfigData{
		OWCeiling:      7400,
		AnnualCeiling:  102000,
		CPFAnnualLimit: 37740,

		RetirementSums: config.RetirementSums{
			BRS: 106500,
			FRS: 213000,
			ERS: 426000,
		},

		BHS: 71500,

		InterestRates: config.InterestRates{
			OA:                       d("0.025"),
			SA:                       d("0.04"),
			MA:                       d("0.04"),
			RA:                       d("0.04"),
			Extra1PctFirst60k:        d("0.01"),
			Extra2PctFirst30kAbove55: d("0.02"),
			Extra1PctNext30kAbove55:  d("0.01"),
		},

		ContributionRates: config.ContributionRateTable{
			CitizenAndPR3Plus: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: d("0.20"), Employer: d("0.17")},
				Above55To60: config.RatePair{Employee: d("0.15"), Employer: d("0.145")},
				Above60To65: config.RatePair{Employee: d("0.095"), Employer: d("0.11")},
				Above65To70: config.RatePair{Employee: d("0.075"), Employer: d("0.09")},
				Above70:     config.RatePair{Employee: d("0.05"), Employer: d("0.075")},
			},
			PRYear1: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: d("0.05"), Employer: d("0.04")},
				Above55To60: config.RatePair{Employee: d("0.05"), Employer: d("0.04")},
				Above60To65: config.RatePair{Employee: d("0.05"), Employer: d("0.04")},
				Above65To70: config.RatePair{Employee: d("0.05"), Employer: d("0.04")},
				Above70:     config.RatePair{Employee: d("0.05"), Employer: d("0.04")},
			},
			PRYear2: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: d("0.15"), Employer: d("0.09")},
				Above55To60: config.RatePair{Employee: d("0.125"), Employer: d("0.09")},
				Above60To65: config.RatePair{Employee: d("0.075"), Employer: d("0.085")},
				Above65To70: config.RatePair{Employee: d("0.05"), Employer: d("0.065")},
				Above70:     config.RatePair{Employee: d("0.05"), Employer: d("0.065")},
			},
		},

		AllocationRates: config.AllocationRateTable{
			UpTo35:      config.AllocationRates{OA: d("0.6217"), SA: d("0.1621"), MA: d("0.2162"), RA: d("0")},
			Above35To45: config.AllocationRates{OA: d("0.5676"), SA: d("0.1892"), MA: d("0.2432"), RA: d("0")},
			Above45To50: config.AllocationRates{OA: d("0.5135"), SA: d("0.2162"), MA: d("0.2703"), RA: d("0")},
			Above50To55: config.AllocationRates{OA: d("0.4054"), SA: d("0.3108"), MA: d("0.2838"), RA: d("0")},
			Above55To60: config.AllocationRates{OA: d("0.4068"), SA: d("0.1186"), MA: d("0.3559"), RA: d("0.1186")},
			Above60To65: config.AllocationRates{OA: d("0.1707"), SA: d("0.1220"), MA: d("0.5122"), RA: d("0.1951")},
			Above65:     config.AllocationRates{OA: d("0.0800"), SA: d("0.0800"), MA: d("0.5200"), RA: d("0.3200")},
		},
	}
}

func TestCalculateOW_CitizenUnder55(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $7000 salary, age 30, citizen
	wage := decimal.MustFromString("7000")
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Employee: 20% of $7000 = $1400
	// Employer: 17% of $7000 = $1190
	// Total: $2590
	expected1400 := decimal.MustFromString("1400")
	expected1190 := decimal.MustFromString("1190")
	expected2590 := decimal.MustFromString("2590")
	expected5600 := decimal.MustFromString("5600")

	if result.EmployeeContribution.Cmp(expected1400) != 0 {
		t.Errorf("Expected employee contribution $1400, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected1190) != 0 {
		t.Errorf("Expected employer contribution $1190, got %s", result.EmployerContribution.String())
	}
	if result.TotalContribution.Cmp(expected2590) != 0 {
		t.Errorf("Expected total contribution $2590, got %s", result.TotalContribution.String())
	}
	if result.TakeHomePay.Cmp(expected5600) != 0 {
		t.Errorf("Expected take-home pay $5600, got %s", result.TakeHomePay.String())
	}
	if result.CappedWage.Cmp(wage) != 0 {
		t.Errorf("Expected capped wage $7000, got %s", result.CappedWage.String())
	}
}

func TestCalculateOW_WageCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $10000 salary (above $7400 ceiling), age 30, citizen
	wage := decimal.MustFromString("10000")
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Wage is capped at $7400
	expected7400 := decimal.MustFromString("7400")
	expected10000 := decimal.MustFromString("10000")
	expected1480 := decimal.MustFromString("1480")
	expected1258 := decimal.MustFromString("1258")
	expected8520 := decimal.MustFromString("8520")

	if result.CappedWage.Cmp(expected7400) != 0 {
		t.Errorf("Expected capped wage $7400, got %s", result.CappedWage.String())
	}
	if result.GrossWage.Cmp(expected10000) != 0 {
		t.Errorf("Expected gross wage $10000, got %s", result.GrossWage.String())
	}

	// Employee: 20% of $7400 = $1480
	// Employer: 17% of $7400 = $1258
	if result.EmployeeContribution.Cmp(expected1480) != 0 {
		t.Errorf("Expected employee contribution $1480, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected1258) != 0 {
		t.Errorf("Expected employer contribution $1258, got %s", result.EmployerContribution.String())
	}

	// Take-home: $10000 - $1480 = $8520
	if result.TakeHomePay.Cmp(expected8520) != 0 {
		t.Errorf("Expected take-home pay $8520, got %s", result.TakeHomePay.String())
	}
}

func TestCalculateOW_AgeBasedRates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := decimal.MustFromString("5000")

	tests := []struct {
		name             string
		age              int
		expectedEmployee string
		expectedEmployer string
	}{
		{"Age 30 (≤55)", 30, "1000", "850"},       // 20%, 17%
		{"Age 55 (≤55)", 55, "1000", "850"},       // 20%, 17%
		{"Age 56 (55-60)", 56, "750", "725"},      // 15%, 14.5%
		{"Age 60 (55-60)", 60, "750", "725"},      // 15%, 14.5%
		{"Age 61 (60-65)", 61, "475", "550"},      // 9.5%, 11%
		{"Age 65 (60-65)", 65, "475", "550"},      // 9.5%, 11%
		{"Age 66 (65-70)", 66, "375", "450"},      // 7.5%, 9%
		{"Age 70 (65-70)", 70, "375", "450"},      // 7.5%, 9%
		{"Age 71 (>70)", 71, "250", "375"},        // 5%, 7.5%
		{"Age 80 (>70)", 80, "250", "375"},        // 5%, 7.5%
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calc.CalculateOW(wage, tt.age, config.ResidencyCitizen)
			expectedEmployee := decimal.MustFromString(tt.expectedEmployee)
			expectedEmployer := decimal.MustFromString(tt.expectedEmployer)

			if result.EmployeeContribution.Cmp(expectedEmployee) != 0 {
				t.Errorf("Expected employee contribution $%s, got %s", tt.expectedEmployee, result.EmployeeContribution.String())
			}
			if result.EmployerContribution.Cmp(expectedEmployer) != 0 {
				t.Errorf("Expected employer contribution $%s, got %s", tt.expectedEmployer, result.EmployerContribution.String())
			}
		})
	}
}

func TestCalculateOW_PRYear1Rates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := decimal.MustFromString("5000")

	// PR Year 1: 5% employee, 4% employer for all age groups
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear1)

	expected250 := decimal.MustFromString("250")
	expected200 := decimal.MustFromString("200")

	if result.EmployeeContribution.Cmp(expected250) != 0 {
		t.Errorf("Expected employee contribution $250, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected200) != 0 {
		t.Errorf("Expected employer contribution $200, got %s", result.EmployerContribution.String())
	}
	if result.RatesApplied.ResidencyStatus != config.ResidencyPRYear1 {
		t.Errorf("Expected residency status pr_year_1, got %s", result.RatesApplied.ResidencyStatus)
	}
}

func TestCalculateOW_PRYear2Rates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := decimal.MustFromString("5000")

	// PR Year 2 under 55: 15% employee, 9% employer
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear2)

	expected750 := decimal.MustFromString("750")
	expected450 := decimal.MustFromString("450")

	if result.EmployeeContribution.Cmp(expected750) != 0 {
		t.Errorf("Expected employee contribution $750, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected450) != 0 {
		t.Errorf("Expected employer contribution $450, got %s", result.EmployerContribution.String())
	}
}

func TestCalculateOW_Allocation(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test allocation for age 30 (≤35 bracket)
	wage := decimal.MustFromString("5000")
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Total: $1850 (1000 employee + 850 employer)
	total := result.TotalContribution

	// Allocation rates for ≤35: OA 62.17%, SA 16.21%, MA 21.62%
	// Due to rounding adjustments, allocations should sum to total
	allocSum := decimal.Zero()
	allocSum, _ = allocSum.Add(result.Allocation.OA)
	allocSum, _ = allocSum.Add(result.Allocation.SA)
	allocSum, _ = allocSum.Add(result.Allocation.MA)
	allocSum, _ = allocSum.Add(result.Allocation.RA)

	// Allow for small differences
	diff, _ := total.Sub(allocSum)
	tolerance := decimal.MustFromString("0.01")
	if diff.Abs().Cmp(tolerance) > 0 {
		t.Errorf("Expected allocations to sum to %s, got %s (diff: %s)", total.String(), allocSum.String(), diff.String())
	}

	// OA should be the largest portion for young workers
	if result.Allocation.OA.Cmp(result.Allocation.SA) <= 0 || result.Allocation.OA.Cmp(result.Allocation.MA) <= 0 {
		t.Errorf("Expected OA to be largest allocation for age 30, got OA=%s, SA=%s, MA=%s",
			result.Allocation.OA.String(), result.Allocation.SA.String(), result.Allocation.MA.String())
	}

	// RA should be 0 for age < 55
	zero := decimal.Zero()
	if result.Allocation.RA.Cmp(zero) != 0 {
		t.Errorf("Expected RA allocation $0 for age 30, got %s", result.Allocation.RA.String())
	}
}

func TestCalculateOW_AllocationAbove55(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test allocation for age 57 (55-60 bracket) - should have RA allocation
	wage := decimal.MustFromString("5000")
	result := calc.CalculateOW(wage, 57, config.ResidencyCitizen)

	// RA should be non-zero for age > 55
	zero := decimal.Zero()
	if result.Allocation.RA.Cmp(zero) == 0 {
		t.Errorf("Expected non-zero RA allocation for age 57, got %s", result.Allocation.RA.String())
	}
}

func TestCalculateAW_BasicBonus(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $5000 bonus, no prior wages
	bonus := decimal.MustFromString("5000")
	ytdOW := decimal.Zero()
	ytdAW := decimal.Zero()
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// AW ceiling = $102,000 - $0 - $0 = $102,000
	// Bonus is fully within ceiling
	expected5000 := decimal.MustFromString("5000")
	expected1000 := decimal.MustFromString("1000")

	if result.CappedWage.Cmp(expected5000) != 0 {
		t.Errorf("Expected capped wage $5000, got %s", result.CappedWage.String())
	}
	if result.EmployeeContribution.Cmp(expected1000) != 0 {
		t.Errorf("Expected employee contribution $1000, got %s", result.EmployeeContribution.String())
	}
}

func TestCalculateAW_WithYTDWages(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $10000 bonus with prior YTD wages
	// YTD OW: $88,800 (12 months at $7,400 ceiling)
	// YTD AW: $0
	// AW ceiling = $102,000 - $88,800 - $0 = $13,200
	bonus := decimal.MustFromString("10000")
	ytdOW := decimal.MustFromString("88800")
	ytdAW := decimal.Zero()
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Bonus is fully within ceiling
	expected10000 := decimal.MustFromString("10000")
	if result.CappedWage.Cmp(expected10000) != 0 {
		t.Errorf("Expected capped wage $10000, got %s", result.CappedWage.String())
	}
}

func TestCalculateAW_ExceedingCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $20000 bonus when near annual ceiling
	// YTD OW: $88,800 (12 months at $7,400 ceiling)
	// YTD AW: $5,000 (prior bonus)
	// AW ceiling = $102,000 - $88,800 - $5,000 = $8,200
	bonus := decimal.MustFromString("20000")
	ytdOW := decimal.MustFromString("88800")
	ytdAW := decimal.MustFromString("5000")
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Bonus capped at remaining ceiling
	expected8200 := decimal.MustFromString("8200")
	expected20000 := decimal.MustFromString("20000")
	expected1640 := decimal.MustFromString("1640")

	if result.CappedWage.Cmp(expected8200) != 0 {
		t.Errorf("Expected capped wage $8200, got %s", result.CappedWage.String())
	}
	if result.GrossWage.Cmp(expected20000) != 0 {
		t.Errorf("Expected gross wage $20000, got %s", result.GrossWage.String())
	}

	// Employee: 20% of $8200 = $1640
	if result.EmployeeContribution.Cmp(expected1640) != 0 {
		t.Errorf("Expected employee contribution $1640, got %s", result.EmployeeContribution.String())
	}
}

func TestCalculateAW_ZeroCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: Already at annual ceiling
	// YTD OW: $88,800
	// YTD AW: $13,200
	// AW ceiling = $102,000 - $88,800 - $13,200 = $0
	bonus := decimal.MustFromString("10000")
	ytdOW := decimal.MustFromString("88800")
	ytdAW := decimal.MustFromString("13200")
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	zero := decimal.Zero()
	if result.CappedWage.Cmp(zero) != 0 {
		t.Errorf("Expected capped wage $0, got %s", result.CappedWage.String())
	}
	if result.EmployeeContribution.Cmp(zero) != 0 {
		t.Errorf("Expected employee contribution $0, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(zero) != 0 {
		t.Errorf("Expected employer contribution $0, got %s", result.EmployerContribution.String())
	}
}

func TestCalculateAnnualFromMonthly(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month for 12 months
	wage := decimal.MustFromString("6000")
	result := calc.CalculateAnnualFromMonthly(wage, 30, config.ResidencyCitizen, 12)

	// Monthly employee: 20% of $6000 = $1200
	// Monthly employer: 17% of $6000 = $1020
	// Annual totals
	expectedEmployeeAnnual := decimal.MustFromString("14400") // 1200 * 12
	expectedEmployerAnnual := decimal.MustFromString("12240") // 1020 * 12
	expectedGross := decimal.MustFromString("72000")

	if result.EmployeeContribution.Cmp(expectedEmployeeAnnual) != 0 {
		t.Errorf("Expected annual employee contribution %s, got %s", expectedEmployeeAnnual.String(), result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expectedEmployerAnnual) != 0 {
		t.Errorf("Expected annual employer contribution %s, got %s", expectedEmployerAnnual.String(), result.EmployerContribution.String())
	}
	if result.GrossWage.Cmp(expectedGross) != 0 {
		t.Errorf("Expected annual gross wage $72000, got %s", result.GrossWage.String())
	}
}

func TestCalculateAnnualFromMonthly_PartialYear(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month for 6 months
	wage := decimal.MustFromString("6000")
	result := calc.CalculateAnnualFromMonthly(wage, 30, config.ResidencyCitizen, 6)

	expectedEmployeeAnnual := decimal.MustFromString("7200") // 1200 * 6
	expectedGross := decimal.MustFromString("36000")

	if result.EmployeeContribution.Cmp(expectedEmployeeAnnual) != 0 {
		t.Errorf("Expected employee contribution %s, got %s", expectedEmployeeAnnual.String(), result.EmployeeContribution.String())
	}
	if result.GrossWage.Cmp(expectedGross) != 0 {
		t.Errorf("Expected gross wage $36000, got %s", result.GrossWage.String())
	}
}

func TestCalculateAnnualWithBonus(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month + $12000 annual bonus
	salary := decimal.MustFromString("6000")
	bonus := decimal.MustFromString("12000")
	result := calc.CalculateAnnualWithBonus(salary, bonus, 30, config.ResidencyCitizen)

	// OW: $72000 gross, employee $14400, employer $12240
	// AW: $12000 bonus, employee $2400, employer $2040
	// YTD OW = $72000 (below ceiling)
	expectedGross := decimal.MustFromString("84000") // 72000 + 12000
	expectedEmployee := decimal.MustFromString("16800") // 14400 + 2400

	if result.GrossWage.Cmp(expectedGross) != 0 {
		t.Errorf("Expected gross wage %s, got %s", expectedGross.String(), result.GrossWage.String())
	}
	if result.EmployeeContribution.Cmp(expectedEmployee) != 0 {
		t.Errorf("Expected employee contribution %s, got %s", expectedEmployee.String(), result.EmployeeContribution.String())
	}
}

func TestCalculateOW_ZeroWage(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	wage := decimal.Zero()
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	zero := decimal.Zero()
	if result.EmployeeContribution.Cmp(zero) != 0 {
		t.Errorf("Expected employee contribution $0, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(zero) != 0 {
		t.Errorf("Expected employer contribution $0, got %s", result.EmployerContribution.String())
	}
	if result.TakeHomePay.Cmp(zero) != 0 {
		t.Errorf("Expected take-home pay $0, got %s", result.TakeHomePay.String())
	}
}

func TestRatesApplied(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	wage := decimal.MustFromString("5000")
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	expected020 := decimal.MustFromString("0.20")
	expected017 := decimal.MustFromString("0.17")

	if result.RatesApplied.Employee.Cmp(expected020) != 0 {
		t.Errorf("Expected employee rate 0.20, got %s", result.RatesApplied.Employee.String())
	}
	if result.RatesApplied.Employer.Cmp(expected017) != 0 {
		t.Errorf("Expected employer rate 0.17, got %s", result.RatesApplied.Employer.String())
	}
	if result.RatesApplied.AgeGroup != "55 and below" {
		t.Errorf("Expected age group '55 and below', got '%s'", result.RatesApplied.AgeGroup)
	}
	if result.RatesApplied.ResidencyStatus != config.ResidencyCitizen {
		t.Errorf("Expected residency status 'citizen', got '%s'", result.RatesApplied.ResidencyStatus)
	}
}

func TestGetAgeGroupLabel(t *testing.T) {
	tests := []struct {
		age      int
		expected string
	}{
		{25, "55 and below"},
		{55, "55 and below"},
		{56, "Above 55 to 60"},
		{60, "Above 55 to 60"},
		{61, "Above 60 to 65"},
		{65, "Above 60 to 65"},
		{66, "Above 65 to 70"},
		{70, "Above 65 to 70"},
		{71, "Above 70"},
		{85, "Above 70"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := getAgeGroupLabel(tt.age)
			if result != tt.expected {
				t.Errorf("Expected '%s' for age %d, got '%s'", tt.expected, tt.age, result)
			}
		})
	}
}

func TestRoundToNearestCent(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"100.00", "100.00"},
		{"100.005", "100.01"},
		{"100.004", "100.00"},
		{"100.125", "100.13"},
		{"100.124", "100.12"},
	}

	for _, tt := range tests {
		input := decimal.MustFromString(tt.input)
		expected := decimal.MustFromString(tt.expected)
		result := roundToNearestCent(input)
		if result.Cmp(expected) != 0 {
			t.Errorf("roundToNearestCent(%s) = %s, want %s", tt.input, result.String(), tt.expected)
		}
	}
}
