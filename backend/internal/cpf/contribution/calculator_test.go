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

// testConfig2026 returns a test config matching 2026 CPF rates
// Key 2026 changes:
// - OW ceiling increases from $7,400 to $8,000/month
// - Contribution rates increase for ages 55-65 (+1.5% total)
// - SA closed at 55+, all retirement contributions go to RA
func testConfig2026() *config.ConfigData {
	return &config.ConfigData{
		OWCeiling:      8000,  // Increased from $7,400 in 2025
		AnnualCeiling:  102000,
		CPFAnnualLimit: 37740,

		RetirementSums: config.RetirementSums{
			BRS: 110200, // Updated for 2026
			FRS: 220400,
			ERS: 440800,
		},

		BHS: 75500, // Updated for 2026

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
				UpTo55:      config.RatePair{Employee: d("0.20"), Employer: d("0.17")},    // 37% total (unchanged)
				Above55To60: config.RatePair{Employee: d("0.18"), Employer: d("0.16")},    // 34% total (+1.5% from 2025)
				Above60To65: config.RatePair{Employee: d("0.125"), Employer: d("0.125")},  // 25% total (+1.5% from 2025)
				Above65To70: config.RatePair{Employee: d("0.075"), Employer: d("0.09")},   // 16.5% total (unchanged)
				Above70:     config.RatePair{Employee: d("0.05"), Employer: d("0.075")},   // 12.5% total (unchanged)
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

		// 2026 allocation rates - SA closed at 55+, all retirement contributions go to RA
		AllocationRates: config.AllocationRateTable{
			UpTo35:      config.AllocationRates{OA: d("0.6217"), SA: d("0.1621"), MA: d("0.2162"), RA: d("0")},
			Above35To45: config.AllocationRates{OA: d("0.5677"), SA: d("0.1891"), MA: d("0.2432"), RA: d("0")},
			Above45To50: config.AllocationRates{OA: d("0.5136"), SA: d("0.2162"), MA: d("0.2702"), RA: d("0")},
			Above50To55: config.AllocationRates{OA: d("0.4055"), SA: d("0.3108"), MA: d("0.2837"), RA: d("0")},
			Above55To60: config.AllocationRates{OA: d("0.353"), SA: d("0"), MA: d("0.3088"), RA: d("0.3382")},
			Above60To65: config.AllocationRates{OA: d("0.14"), SA: d("0"), MA: d("0.42"), RA: d("0.44")},
			Above65To70: config.AllocationRates{OA: d("0.0607"), SA: d("0"), MA: d("0.6363"), RA: d("0.303")},
			Above70:     config.AllocationRates{OA: d("0.08"), SA: d("0"), MA: d("0.84"), RA: d("0.08")},
		},
	}
}

func TestCalculateOW_CitizenUnder55_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("7000")
	// Computation for citizen age ≤55:
	// Employee rate = 20%, Employer rate = 17%
	// Employee contribution = $7,000 × 0.20 = $1,400
	// Employer contribution = $7,000 × 0.17 = $1,190
	// Total contribution = $1,400 + $1,190 = $2,590
	// Take-home pay = $7,000 - $1,400 = $5,600
	expected1400 := decimal.MustFromString("1400")
	expected1190 := decimal.MustFromString("1190")
	expected2590 := decimal.MustFromString("2590")
	expected5600 := decimal.MustFromString("5600")

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Assert
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

func TestCalculateOW_WageCeiling_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("10000") // Above $8,000 OW ceiling
	// Computation: Wage capped at OW ceiling of $8,000 (increased from $7,400 in 2025)
	// Employee contribution = $8,000 × 0.20 = $1,600
	// Employer contribution = $8,000 × 0.17 = $1,360
	// Take-home pay = $10,000 (gross) - $1,600 (employee CPF) = $8,400
	expected8000 := decimal.MustFromString("8000")
	expected10000 := decimal.MustFromString("10000")
	expected1600 := decimal.MustFromString("1600")
	expected1360 := decimal.MustFromString("1360")
	expected8400 := decimal.MustFromString("8400")

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Assert
	if result.CappedWage.Cmp(expected8000) != 0 {
		t.Errorf("Expected capped wage $8000, got %s", result.CappedWage.String())
	}
	if result.GrossWage.Cmp(expected10000) != 0 {
		t.Errorf("Expected gross wage $10000, got %s", result.GrossWage.String())
	}
	if result.EmployeeContribution.Cmp(expected1600) != 0 {
		t.Errorf("Expected employee contribution $1600, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected1360) != 0 {
		t.Errorf("Expected employer contribution $1360, got %s", result.EmployerContribution.String())
	}
	if result.TakeHomePay.Cmp(expected8400) != 0 {
		t.Errorf("Expected take-home pay $8400, got %s", result.TakeHomePay.String())
	}
}

func TestCalculateOW_AgeBasedRates_2026Rates(t *testing.T) {
	// Arrange - Common setup
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	// Computation: CPF contribution rates by age bracket for citizens (2026 rates)
	// All calculations based on $5,000 wage
	tests := []struct {
		name             string
		age              int
		expectedEmployee string
		expectedEmployer string
	}{
		// Age ≤55: Employee 20%, Employer 17% (unchanged from 2025)
		// $5,000 × 0.20 = $1,000 (employee), $5,000 × 0.17 = $850 (employer)
		{"Age 30 (≤55)", 30, "1000", "850"},
		{"Age 55 (≤55)", 55, "1000", "850"},
		// Age 55-60: Employee 18%, Employer 16% (34% total, +1.5% from 2025)
		// $5,000 × 0.18 = $900 (employee), $5,000 × 0.16 = $800 (employer)
		{"Age 56 (55-60)", 56, "900", "800"},
		{"Age 60 (55-60)", 60, "900", "800"},
		// Age 60-65: Employee 12.5%, Employer 12.5% (25% total, +1.5% from 2025)
		// $5,000 × 0.125 = $625 (employee), $5,000 × 0.125 = $625 (employer)
		{"Age 61 (60-65)", 61, "625", "625"},
		{"Age 65 (60-65)", 65, "625", "625"},
		// Age 65-70: Employee 7.5%, Employer 9% (unchanged from 2025)
		// $5,000 × 0.075 = $375 (employee), $5,000 × 0.09 = $450 (employer)
		{"Age 66 (65-70)", 66, "375", "450"},
		{"Age 70 (65-70)", 70, "375", "450"},
		// Age >70: Employee 5%, Employer 7.5% (unchanged from 2025)
		// $5,000 × 0.05 = $250 (employee), $5,000 × 0.075 = $375 (employer)
		{"Age 71 (>70)", 71, "250", "375"},
		{"Age 80 (>70)", 80, "250", "375"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			expectedEmployee := decimal.MustFromString(tt.expectedEmployee)
			expectedEmployer := decimal.MustFromString(tt.expectedEmployer)

			// Act
			result := calc.CalculateOW(wage, tt.age, config.ResidencyCitizen)

			// Assert
			if result.EmployeeContribution.Cmp(expectedEmployee) != 0 {
				t.Errorf("Expected employee contribution $%s, got %s", tt.expectedEmployee, result.EmployeeContribution.String())
			}
			if result.EmployerContribution.Cmp(expectedEmployer) != 0 {
				t.Errorf("Expected employer contribution $%s, got %s", tt.expectedEmployer, result.EmployerContribution.String())
			}
		})
	}
}

func TestCalculateOW_PRYear1_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	// Computation for PR Year 1 (all age groups have same rate):
	// Employee rate = 5%, Employer rate = 4%
	// Employee contribution = $5,000 × 0.05 = $250
	// Employer contribution = $5,000 × 0.04 = $200
	expected250 := decimal.MustFromString("250")
	expected200 := decimal.MustFromString("200")

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear1)

	// Assert
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

func TestCalculateOW_PRYear2_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	// Computation for PR Year 2 age ≤55:
	// Employee rate = 15%, Employer rate = 9%
	// Employee contribution = $5,000 × 0.15 = $750
	// Employer contribution = $5,000 × 0.09 = $450
	expected750 := decimal.MustFromString("750")
	expected450 := decimal.MustFromString("450")

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyPRYear2)

	// Assert
	if result.EmployeeContribution.Cmp(expected750) != 0 {
		t.Errorf("Expected employee contribution $750, got %s", result.EmployeeContribution.String())
	}
	if result.EmployerContribution.Cmp(expected450) != 0 {
		t.Errorf("Expected employer contribution $450, got %s", result.EmployerContribution.String())
	}
}

func TestCalculateOW_Allocation_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	tolerance := decimal.MustFromString("0.01")
	zero := decimal.Zero()

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Computation for age ≤35 allocation:
	// Total contribution = $1,000 + $850 = $1,850
	// Allocation rates (age ≤35): OA=62.17%, SA=16.21%, MA=21.62%, RA=0%
	// OA = $1,850 × 0.6217 = $1,150.15
	// SA = $1,850 × 0.1621 = $299.89
	// MA = $1,850 × 0.2162 = $399.97
	// RA = $1,850 × 0 = $0
	total := result.TotalContribution
	allocSum := decimal.Zero().Add(result.Allocation.OA).Add(result.Allocation.SA).Add(result.Allocation.MA).Add(result.Allocation.RA)
	diff := total.Sub(allocSum)

	// Assert - Allocations should sum to total (within tolerance due to rounding)
	if diff.Abs().Cmp(tolerance) > 0 {
		t.Errorf("Expected allocations to sum to %s, got %s (diff: %s)", total.String(), allocSum.String(), diff.String())
	}

	// Assert - OA should be the largest portion for young workers (≤35 bracket)
	if result.Allocation.OA.Cmp(result.Allocation.SA) <= 0 || result.Allocation.OA.Cmp(result.Allocation.MA) <= 0 {
		t.Errorf("Expected OA to be largest allocation for age 30, got OA=%s, SA=%s, MA=%s",
			result.Allocation.OA.String(), result.Allocation.SA.String(), result.Allocation.MA.String())
	}

	// Assert - RA should be 0 for age < 55 (RA only starts at age 55)
	if result.Allocation.RA.Cmp(zero) != 0 {
		t.Errorf("Expected RA allocation $0 for age 30, got %s", result.Allocation.RA.String())
	}
}

func TestCalculateOW_AllocationAbove55_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	zero := decimal.Zero()

	// Act
	result := calc.CalculateOW(wage, 57, config.ResidencyCitizen)

	// Computation for age 55-60 allocation (2026 rates):
	// Total contribution = $900 (18%) + $800 (16%) = $1,700
	// Allocation rates (age 55-60, 2026): OA=35.3%, SA=0%, MA=30.88%, RA=33.82%
	// RA = $1,700 × 0.3382 = $574.94 (non-zero)
	// Note: SA is closed at 55+ in 2026, all retirement contributions go to RA
	// Assert - RA should be non-zero for age > 55 (55-60 bracket)
	if result.Allocation.RA.Cmp(zero) == 0 {
		t.Errorf("Expected non-zero RA allocation for age 57, got %s", result.Allocation.RA.String())
	}
	// Assert - SA should be zero for age > 55 (SA closed in 2026)
	if result.Allocation.SA.Cmp(zero) != 0 {
		t.Errorf("Expected SA allocation $0 for age 57 (SA closed at 55+ in 2026), got %s", result.Allocation.SA.String())
	}
}

func TestCalculateAW_BasicBonus_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	bonus := decimal.MustFromString("5000")
	ytdOW := decimal.Zero()
	ytdAW := decimal.Zero()
	// Computation: AW ceiling = Annual ceiling - YTD OW - YTD AW
	// AW ceiling = $102,000 - $0 - $0 = $102,000
	// Bonus ($5,000) is fully within ceiling, so capped wage = $5,000
	// Employee contribution = $5,000 × 0.20 = $1,000
	expected5000 := decimal.MustFromString("5000")
	expected1000 := decimal.MustFromString("1000")

	// Act
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Assert
	if result.CappedWage.Cmp(expected5000) != 0 {
		t.Errorf("Expected capped wage $5000, got %s", result.CappedWage.String())
	}
	if result.EmployeeContribution.Cmp(expected1000) != 0 {
		t.Errorf("Expected employee contribution $1000, got %s", result.EmployeeContribution.String())
	}
}

func TestCalculateAW_WithYTDWages_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	bonus := decimal.MustFromString("10000")
	ytdOW := decimal.MustFromString("96000") // 12 months × $8,000 OW ceiling (2026)
	ytdAW := decimal.Zero()
	// Computation: AW ceiling = Annual ceiling - YTD OW - YTD AW
	// AW ceiling = $102,000 - $96,000 - $0 = $6,000
	// Bonus ($10,000) > AW ceiling ($6,000), so capped at $6,000
	expected6000 := decimal.MustFromString("6000")

	// Act
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Assert
	if result.CappedWage.Cmp(expected6000) != 0 {
		t.Errorf("Expected capped wage $6000, got %s", result.CappedWage.String())
	}
}

func TestCalculateAW_ExceedingCeiling_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	bonus := decimal.MustFromString("20000")
	ytdOW := decimal.MustFromString("96000") // 12 months × $8,000 (2026)
	ytdAW := decimal.MustFromString("5000")  // Prior bonus this year
	// Computation: AW ceiling = Annual ceiling - YTD OW - YTD AW
	// AW ceiling = $102,000 - $96,000 - $5,000 = $1,000
	// Bonus ($20,000) > AW ceiling ($1,000), so capped at $1,000
	// Employee contribution = $1,000 × 0.20 = $200
	expected1000 := decimal.MustFromString("1000")
	expected20000 := decimal.MustFromString("20000")
	expected200 := decimal.MustFromString("200")

	// Act
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Assert
	if result.CappedWage.Cmp(expected1000) != 0 {
		t.Errorf("Expected capped wage $1000, got %s", result.CappedWage.String())
	}
	if result.GrossWage.Cmp(expected20000) != 0 {
		t.Errorf("Expected gross wage $20000, got %s", result.GrossWage.String())
	}
	if result.EmployeeContribution.Cmp(expected200) != 0 {
		t.Errorf("Expected employee contribution $200, got %s", result.EmployeeContribution.String())
	}
}

func TestCalculateAW_ZeroCeiling_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	bonus := decimal.MustFromString("10000")
	ytdOW := decimal.MustFromString("96000")  // 12 months × $8,000 (2026)
	ytdAW := decimal.MustFromString("6000")   // Prior AW this year
	// Computation: AW ceiling = Annual ceiling - YTD OW - YTD AW
	// AW ceiling = $102,000 - $96,000 - $6,000 = $0
	// Already at annual ceiling, so no CPF contributions on this bonus
	zero := decimal.Zero()

	// Act
	result := calc.CalculateAW(bonus, 30, config.ResidencyCitizen, ytdOW, ytdAW)

	// Assert - All contributions should be zero when at ceiling
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

func TestCalculateAnnualFromMonthly_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("6000")
	// Computation for 12 months × $6,000/month:
	// Monthly employee contribution = $6,000 × 0.20 = $1,200
	// Monthly employer contribution = $6,000 × 0.17 = $1,020
	// Annual employee = $1,200 × 12 = $14,400
	// Annual employer = $1,020 × 12 = $12,240
	// Annual gross = $6,000 × 12 = $72,000
	expectedEmployeeAnnual := decimal.MustFromString("14400")
	expectedEmployerAnnual := decimal.MustFromString("12240")
	expectedGross := decimal.MustFromString("72000")

	// Act
	result := calc.CalculateAnnualFromMonthly(wage, 30, config.ResidencyCitizen, 12)

	// Assert
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

func TestCalculateAnnualFromMonthly_PartialYear_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("6000")
	// Computation for 6 months × $6,000/month:
	// Monthly employee contribution = $6,000 × 0.20 = $1,200
	// Partial year employee = $1,200 × 6 = $7,200
	// Partial year gross = $6,000 × 6 = $36,000
	expectedEmployeeAnnual := decimal.MustFromString("7200")
	expectedGross := decimal.MustFromString("36000")

	// Act
	result := calc.CalculateAnnualFromMonthly(wage, 30, config.ResidencyCitizen, 6)

	// Assert
	if result.EmployeeContribution.Cmp(expectedEmployeeAnnual) != 0 {
		t.Errorf("Expected employee contribution %s, got %s", expectedEmployeeAnnual.String(), result.EmployeeContribution.String())
	}
	if result.GrossWage.Cmp(expectedGross) != 0 {
		t.Errorf("Expected gross wage $36000, got %s", result.GrossWage.String())
	}
}

func TestCalculateAnnualWithBonus_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	salary := decimal.MustFromString("6000")
	bonus := decimal.MustFromString("12000")
	// Computation:
	// OW (Ordinary Wages): $6,000/month × 12 months = $72,000
	// OW employee contribution = $72,000 × 0.20 = $14,400
	// AW (Additional Wages/Bonus): $12,000
	// AW employee contribution = $12,000 × 0.20 = $2,400
	// Total gross = $72,000 + $12,000 = $84,000
	// Total employee contribution = $14,400 + $2,400 = $16,800
	expectedGross := decimal.MustFromString("84000")
	expectedEmployee := decimal.MustFromString("16800")

	// Act
	result := calc.CalculateAnnualWithBonus(salary, bonus, 30, config.ResidencyCitizen)

	// Assert
	if result.GrossWage.Cmp(expectedGross) != 0 {
		t.Errorf("Expected gross wage %s, got %s", expectedGross.String(), result.GrossWage.String())
	}
	if result.EmployeeContribution.Cmp(expectedEmployee) != 0 {
		t.Errorf("Expected employee contribution %s, got %s", expectedEmployee.String(), result.EmployeeContribution.String())
	}
}

func TestCalculateOW_ZeroWage_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.Zero()
	// Computation: $0 wage × any rate = $0
	// All contributions and take-home pay should be $0
	zero := decimal.Zero()

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Assert
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

func TestRatesApplied_2026Rates(t *testing.T) {
	// Arrange
	calc := NewCalculator(testConfig2026())
	wage := decimal.MustFromString("5000")
	// RatesApplied tracks the rates used in the calculation:
	// Citizen age 30 (≤55 bracket): Employee = 20%, Employer = 17%
	expected020 := decimal.MustFromString("0.20")
	expected017 := decimal.MustFromString("0.17")

	// Act
	result := calc.CalculateOW(wage, 30, config.ResidencyCitizen)

	// Assert
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
	// Arrange - test cases
	// Age group boundaries for CPF contribution rates:
	// ≤55, 55-60, 60-65, 65-70, >70
	tests := []struct {
		age      int
		expected string
	}{
		{25, "55 and below"},        // 25 ≤ 55
		{55, "55 and below"},        // 55 ≤ 55 (boundary)
		{56, "Above 55 to 60"},      // 55 < 56 ≤ 60
		{60, "Above 55 to 60"},      // 55 < 60 ≤ 60 (boundary)
		{61, "Above 60 to 65"},      // 60 < 61 ≤ 65
		{65, "Above 60 to 65"},      // 60 < 65 ≤ 65 (boundary)
		{66, "Above 65 to 70"},      // 65 < 66 ≤ 70
		{70, "Above 65 to 70"},      // 65 < 70 ≤ 70 (boundary)
		{71, "Above 70"},            // 71 > 70
		{85, "Above 70"},            // 85 > 70
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			// Act
			result := getAgeGroupLabel(tt.age)

			// Assert
			if result != tt.expected {
				t.Errorf("Expected '%s' for age %d, got '%s'", tt.expected, tt.age, result)
			}
		})
	}
}

func TestRoundToNearestCent(t *testing.T) {
	// Arrange - test cases
	// Rounding to nearest cent (2 decimal places) using banker's rounding:
	// 0.005+ rounds up, 0.004- rounds down
	tests := []struct {
		input    string
		expected string
	}{
		{"100.00", "100.00"},   // No rounding needed
		{"100.005", "100.01"},  // 0.005 rounds up → 0.01
		{"100.004", "100.00"},  // 0.004 rounds down → 0.00
		{"100.125", "100.13"},  // 0.125 rounds up → 0.13
		{"100.124", "100.12"},  // 0.124 rounds down → 0.12
	}

	for _, tt := range tests {
		// Arrange
		input := decimal.MustFromString(tt.input)
		expected := decimal.MustFromString(tt.expected)

		// Act
		result := roundToNearestCent(input)

		// Assert
		if result.Cmp(expected) != 0 {
			t.Errorf("roundToNearestCent(%s) = %s, want %s", tt.input, result.String(), tt.expected)
		}
	}
}
