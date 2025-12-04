package contribution

import (
	"testing"

	"financial-chat-system/backend/internal/cpf/config"
)

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
			OA:                        0.025,
			SA:                        0.04,
			MA:                        0.04,
			RA:                        0.04,
			Extra1PctFirst60k:         0.01,
			Extra2PctFirst30kAbove55:  0.02,
			Extra1PctNext30kAbove55:   0.01,
		},

		ContributionRates: config.ContributionRateTable{
			CitizenAndPR3Plus: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: 0.20, Employer: 0.17},
				Above55To60: config.RatePair{Employee: 0.15, Employer: 0.145},
				Above60To65: config.RatePair{Employee: 0.095, Employer: 0.11},
				Above65To70: config.RatePair{Employee: 0.075, Employer: 0.09},
				Above70:     config.RatePair{Employee: 0.05, Employer: 0.075},
			},
			PRYear1: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: 0.05, Employer: 0.04},
				Above55To60: config.RatePair{Employee: 0.05, Employer: 0.04},
				Above60To65: config.RatePair{Employee: 0.05, Employer: 0.04},
				Above65To70: config.RatePair{Employee: 0.05, Employer: 0.04},
				Above70:     config.RatePair{Employee: 0.05, Employer: 0.04},
			},
			PRYear2: config.AgeBasedContributionRates{
				UpTo55:      config.RatePair{Employee: 0.15, Employer: 0.09},
				Above55To60: config.RatePair{Employee: 0.125, Employer: 0.09},
				Above60To65: config.RatePair{Employee: 0.075, Employer: 0.085},
				Above65To70: config.RatePair{Employee: 0.05, Employer: 0.065},
				Above70:     config.RatePair{Employee: 0.05, Employer: 0.065},
			},
		},

		AllocationRates: config.AllocationRateTable{
			UpTo35:      config.AllocationRates{OA: 0.6217, SA: 0.1621, MA: 0.2162},
			Above35To45: config.AllocationRates{OA: 0.5676, SA: 0.1892, MA: 0.2432},
			Above45To50: config.AllocationRates{OA: 0.5135, SA: 0.2162, MA: 0.2703},
			Above50To55: config.AllocationRates{OA: 0.4054, SA: 0.3108, MA: 0.2838},
			Above55To60: config.AllocationRates{OA: 0.4068, SA: 0.1186, MA: 0.3559, RA: 0.1186},
			Above60To65: config.AllocationRates{OA: 0.1707, SA: 0.1220, MA: 0.5122, RA: 0.1951},
			Above65:     config.AllocationRates{OA: 0.0800, SA: 0.0800, MA: 0.5200, RA: 0.3200},
		},
	}
}

func TestCalculateOW_CitizenUnder55(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $7000 salary, age 30, citizen
	result := calc.CalculateOW(7000, 30, config.ResidencyCitizen)

	// Employee: 20% of $7000 = $1400
	// Employer: 17% of $7000 = $1190
	// Total: $2590
	if result.EmployeeContribution != 1400 {
		t.Errorf("Expected employee contribution $1400, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 1190 {
		t.Errorf("Expected employer contribution $1190, got $%.2f", result.EmployerContribution)
	}
	if result.TotalContribution != 2590 {
		t.Errorf("Expected total contribution $2590, got $%.2f", result.TotalContribution)
	}
	if result.TakeHomePay != 5600 {
		t.Errorf("Expected take-home pay $5600, got $%.2f", result.TakeHomePay)
	}
	if result.CappedWage != 7000 {
		t.Errorf("Expected capped wage $7000, got $%.2f", result.CappedWage)
	}
}

func TestCalculateOW_WageCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $10000 salary (above $7400 ceiling), age 30, citizen
	result := calc.CalculateOW(10000, 30, config.ResidencyCitizen)

	// Wage is capped at $7400
	if result.CappedWage != 7400 {
		t.Errorf("Expected capped wage $7400, got $%.2f", result.CappedWage)
	}
	if result.GrossWage != 10000 {
		t.Errorf("Expected gross wage $10000, got $%.2f", result.GrossWage)
	}

	// Employee: 20% of $7400 = $1480
	// Employer: 17% of $7400 = $1258
	if result.EmployeeContribution != 1480 {
		t.Errorf("Expected employee contribution $1480, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 1258 {
		t.Errorf("Expected employer contribution $1258, got $%.2f", result.EmployerContribution)
	}

	// Take-home: $10000 - $1480 = $8520
	if result.TakeHomePay != 8520 {
		t.Errorf("Expected take-home pay $8520, got $%.2f", result.TakeHomePay)
	}
}

func TestCalculateOW_AgeBasedRates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := 5000.0

	tests := []struct {
		name             string
		age              int
		expectedEmployee float64
		expectedEmployer float64
	}{
		{"Age 30 (≤55)", 30, 1000, 850},       // 20%, 17%
		{"Age 55 (≤55)", 55, 1000, 850},       // 20%, 17%
		{"Age 56 (55-60)", 56, 750, 725},      // 15%, 14.5%
		{"Age 60 (55-60)", 60, 750, 725},      // 15%, 14.5%
		{"Age 61 (60-65)", 61, 475, 550},      // 9.5%, 11%
		{"Age 65 (60-65)", 65, 475, 550},      // 9.5%, 11%
		{"Age 66 (65-70)", 66, 375, 450},      // 7.5%, 9%
		{"Age 70 (65-70)", 70, 375, 450},      // 7.5%, 9%
		{"Age 71 (>70)", 71, 250, 375},        // 5%, 7.5%
		{"Age 80 (>70)", 80, 250, 375},        // 5%, 7.5%
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calc.CalculateOW(wage, tt.age, config.ResidencyCitizen)
			if result.EmployeeContribution != tt.expectedEmployee {
				t.Errorf("Expected employee contribution $%.2f, got $%.2f", tt.expectedEmployee, result.EmployeeContribution)
			}
			if result.EmployerContribution != tt.expectedEmployer {
				t.Errorf("Expected employer contribution $%.2f, got $%.2f", tt.expectedEmployer, result.EmployerContribution)
			}
		})
	}
}

func TestCalculateOW_PRYear1Rates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := 5000.0

	// PR Year 1: 5% employee, 4% employer for all age groups
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear1)

	if result.EmployeeContribution != 250 {
		t.Errorf("Expected employee contribution $250, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 200 {
		t.Errorf("Expected employer contribution $200, got $%.2f", result.EmployerContribution)
	}
	if result.RatesApplied.ResidencyStatus != config.ResidencyPRYear1 {
		t.Errorf("Expected residency status pr_year_1, got %s", result.RatesApplied.ResidencyStatus)
	}
}

func TestCalculateOW_PRYear2Rates(t *testing.T) {
	calc := NewCalculator(testConfig2025())
	wage := 5000.0

	// PR Year 2 under 55: 15% employee, 9% employer
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear2)

	if result.EmployeeContribution != 750 {
		t.Errorf("Expected employee contribution $750, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 450 {
		t.Errorf("Expected employer contribution $450, got $%.2f", result.EmployerContribution)
	}
}

func TestCalculateOW_Allocation(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test allocation for age 30 (≤35 bracket)
	result := calc.CalculateOW(5000, 30, config.ResidencyCitizen)

	// Total: $1850 (1000 employee + 850 employer)
	total := result.TotalContribution

	// Allocation rates for ≤35: OA 62.17%, SA 16.21%, MA 21.62%
	// Due to rounding adjustments, allocations should sum to total
	allocSum := result.Allocation.OA + result.Allocation.SA + result.Allocation.MA + result.Allocation.RA

	// Allow for small floating point differences
	diff := total - allocSum
	if diff < -0.01 || diff > 0.01 {
		t.Errorf("Expected allocations to sum to $%.2f, got $%.2f (diff: $%.2f)", total, allocSum, diff)
	}

	// OA should be the largest portion for young workers
	if result.Allocation.OA <= result.Allocation.SA || result.Allocation.OA <= result.Allocation.MA {
		t.Errorf("Expected OA to be largest allocation for age 30, got OA=$%.2f, SA=$%.2f, MA=$%.2f",
			result.Allocation.OA, result.Allocation.SA, result.Allocation.MA)
	}

	// RA should be 0 for age < 55
	if result.Allocation.RA != 0 {
		t.Errorf("Expected RA allocation $0 for age 30, got $%.2f", result.Allocation.RA)
	}
}

func TestCalculateOW_AllocationAbove55(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test allocation for age 57 (55-60 bracket) - should have RA allocation
	result := calc.CalculateOW(5000, 57, config.ResidencyCitizen)

	// RA should be non-zero for age > 55
	if result.Allocation.RA == 0 {
		t.Errorf("Expected non-zero RA allocation for age 57, got $%.2f", result.Allocation.RA)
	}
}

func TestCalculateAW_BasicBonus(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $5000 bonus, no prior wages
	ytdOW := 0.0
	ytdAW := 0.0
	result := calc.CalculateAW(5000, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// AW ceiling = $102,000 - $0 - $0 = $102,000
	// Bonus is fully within ceiling
	if result.CappedWage != 5000 {
		t.Errorf("Expected capped wage $5000, got $%.2f", result.CappedWage)
	}
	if result.EmployeeContribution != 1000 {
		t.Errorf("Expected employee contribution $1000, got $%.2f", result.EmployeeContribution)
	}
}

func TestCalculateAW_WithYTDWages(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $10000 bonus with prior YTD wages
	// YTD OW: $88,800 (12 months at $7,400 ceiling)
	// YTD AW: $0
	// AW ceiling = $102,000 - $88,800 - $0 = $13,200
	ytdOW := 88800.0
	ytdAW := 0.0
	result := calc.CalculateAW(10000, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Bonus is fully within ceiling
	if result.CappedWage != 10000 {
		t.Errorf("Expected capped wage $10000, got $%.2f", result.CappedWage)
	}
}

func TestCalculateAW_ExceedingCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $20000 bonus when near annual ceiling
	// YTD OW: $88,800 (12 months at $7,400 ceiling)
	// YTD AW: $5,000 (prior bonus)
	// AW ceiling = $102,000 - $88,800 - $5,000 = $8,200
	ytdOW := 88800.0
	ytdAW := 5000.0
	result := calc.CalculateAW(20000, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Bonus capped at remaining ceiling
	if result.CappedWage != 8200 {
		t.Errorf("Expected capped wage $8200, got $%.2f", result.CappedWage)
	}
	if result.GrossWage != 20000 {
		t.Errorf("Expected gross wage $20000, got $%.2f", result.GrossWage)
	}

	// Employee: 20% of $8200 = $1640
	if result.EmployeeContribution != 1640 {
		t.Errorf("Expected employee contribution $1640, got $%.2f", result.EmployeeContribution)
	}
}

func TestCalculateAW_ZeroCeiling(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: Already at annual ceiling
	// YTD OW: $88,800
	// YTD AW: $13,200
	// AW ceiling = $102,000 - $88,800 - $13,200 = $0
	ytdOW := 88800.0
	ytdAW := 13200.0
	result := calc.CalculateAW(10000, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	if result.CappedWage != 0 {
		t.Errorf("Expected capped wage $0, got $%.2f", result.CappedWage)
	}
	if result.EmployeeContribution != 0 {
		t.Errorf("Expected employee contribution $0, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 0 {
		t.Errorf("Expected employer contribution $0, got $%.2f", result.EmployerContribution)
	}
}

func TestCalculateAnnualFromMonthly(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month for 12 months
	result := calc.CalculateAnnualFromMonthly(6000, 30, config.ResidencyCitizen, 12)

	// Monthly employee: 20% of $6000 = $1200
	// Monthly employer: 17% of $6000 = $1020
	// Annual totals
	expectedEmployeeAnnual := 1200.0 * 12
	expectedEmployerAnnual := 1020.0 * 12

	if result.EmployeeContribution != expectedEmployeeAnnual {
		t.Errorf("Expected annual employee contribution $%.2f, got $%.2f", expectedEmployeeAnnual, result.EmployeeContribution)
	}
	if result.EmployerContribution != expectedEmployerAnnual {
		t.Errorf("Expected annual employer contribution $%.2f, got $%.2f", expectedEmployerAnnual, result.EmployerContribution)
	}
	if result.GrossWage != 72000 {
		t.Errorf("Expected annual gross wage $72000, got $%.2f", result.GrossWage)
	}
}

func TestCalculateAnnualFromMonthly_PartialYear(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month for 6 months
	result := calc.CalculateAnnualFromMonthly(6000, 30, config.ResidencyCitizen, 6)

	expectedEmployeeAnnual := 1200.0 * 6
	if result.EmployeeContribution != expectedEmployeeAnnual {
		t.Errorf("Expected employee contribution $%.2f, got $%.2f", expectedEmployeeAnnual, result.EmployeeContribution)
	}
	if result.GrossWage != 36000 {
		t.Errorf("Expected gross wage $36000, got $%.2f", result.GrossWage)
	}
}

func TestCalculateAnnualWithBonus(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	// Test case: $6000/month + $12000 annual bonus
	result := calc.CalculateAnnualWithBonus(6000, 12000, 30, config.ResidencyCitizen)

	// OW: $72000 gross, employee $14400, employer $12240
	// AW: $12000 bonus, employee $2400, employer $2040
	// YTD OW = $72000 (below ceiling)
	expectedGross := 72000.0 + 12000.0
	if result.GrossWage != expectedGross {
		t.Errorf("Expected gross wage $%.2f, got $%.2f", expectedGross, result.GrossWage)
	}

	expectedEmployee := 14400.0 + 2400.0
	if result.EmployeeContribution != expectedEmployee {
		t.Errorf("Expected employee contribution $%.2f, got $%.2f", expectedEmployee, result.EmployeeContribution)
	}
}

func TestCalculateOW_ZeroWage(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	result := calc.CalculateOW(0, 30, config.ResidencyCitizen)

	if result.EmployeeContribution != 0 {
		t.Errorf("Expected employee contribution $0, got $%.2f", result.EmployeeContribution)
	}
	if result.EmployerContribution != 0 {
		t.Errorf("Expected employer contribution $0, got $%.2f", result.EmployerContribution)
	}
	if result.TakeHomePay != 0 {
		t.Errorf("Expected take-home pay $0, got $%.2f", result.TakeHomePay)
	}
}

func TestRatesApplied(t *testing.T) {
	calc := NewCalculator(testConfig2025())

	result := calc.CalculateOW(5000, 30, config.ResidencyCitizen)

	if result.RatesApplied.Employee != 0.20 {
		t.Errorf("Expected employee rate 0.20, got %.4f", result.RatesApplied.Employee)
	}
	if result.RatesApplied.Employer != 0.17 {
		t.Errorf("Expected employer rate 0.17, got %.4f", result.RatesApplied.Employer)
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

func TestRoundToNearest(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{100.0, 100.0},
		{100.005, 100.01},
		{100.004, 100.0},
		{100.125, 100.13},
		{100.124, 100.12},
	}

	for _, tt := range tests {
		result := roundToNearest(tt.input)
		if result != tt.expected {
			t.Errorf("roundToNearest(%.3f) = %.2f, want %.2f", tt.input, result, tt.expected)
		}
	}
}
