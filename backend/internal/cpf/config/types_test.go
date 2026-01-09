package config

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

// dec is a helper to create decimal from string
func dec(s string) decimal.Decimal {
	return *decimal.MustFromString(s)
}

func TestRatePair_Total(t *testing.T) {
	tests := []struct {
		name     string
		pair     RatePair
		expected *decimal.Decimal
	}{
		{"Citizen under 55", RatePair{Employee: dec("0.20"), Employer: dec("0.17")}, decimal.MustFromString("0.37")},
		{"Citizen 55-60", RatePair{Employee: dec("0.15"), Employer: dec("0.145")}, decimal.MustFromString("0.295")},
		{"PR Year 1", RatePair{Employee: dec("0.05"), Employer: dec("0.04")}, decimal.MustFromString("0.09")},
		{"Zero rates", RatePair{Employee: dec("0"), Employer: dec("0")}, decimal.MustFromString("0")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.pair.Total()
			if result.Cmp(tt.expected) != 0 {
				t.Errorf("Expected total %s, got %s", tt.expected.String(), result.String())
			}
		})
	}
}

func TestGetContributionAgeBand(t *testing.T) {
	tests := []struct {
		age      int
		expected AgeBand
	}{
		{25, AgeBandUpTo35},  // Uses same rates as upTo55
		{55, AgeBandUpTo35},  // Still in ≤55 bracket
		{56, AgeBandAbove55To60},
		{60, AgeBandAbove55To60},
		{61, AgeBandAbove60To65},
		{65, AgeBandAbove60To65},
		{66, AgeBandAbove65To70},
		{70, AgeBandAbove65To70},
		{71, AgeBandAbove70},
		{85, AgeBandAbove70},
	}

	for _, tt := range tests {
		result := GetContributionAgeBand(tt.age)
		if result != tt.expected {
			t.Errorf("GetContributionAgeBand(%d) = %s, want %s", tt.age, result, tt.expected)
		}
	}
}

func TestGetAllocationAgeBand(t *testing.T) {
	tests := []struct {
		age      int
		expected AgeBand
	}{
		{25, AgeBandUpTo35},
		{35, AgeBandUpTo35},
		{36, AgeBandAbove35To45},
		{45, AgeBandAbove35To45},
		{46, AgeBandAbove45To50},
		{50, AgeBandAbove45To50},
		{51, AgeBandAbove50To55},
		{55, AgeBandAbove50To55},
		{56, AgeBandAbove55To60},
		{60, AgeBandAbove55To60},
		{61, AgeBandAbove60To65},
		{65, AgeBandAbove60To65},
		{66, AgeBandAbove65To70},
		{70, AgeBandAbove65To70},
		{71, AgeBandAbove70},
		{75, AgeBandAbove70},
	}

	for _, tt := range tests {
		result := GetAllocationAgeBand(tt.age)
		if result != tt.expected {
			t.Errorf("GetAllocationAgeBand(%d) = %s, want %s", tt.age, result, tt.expected)
		}
	}
}

func TestConfigData_GetContributionRates(t *testing.T) {
	cfg := &ConfigData{
		ContributionRates: ContributionRateTable{
			CitizenAndPR3Plus: AgeBasedContributionRates{
				UpTo55:      RatePair{Employee: dec("0.20"), Employer: dec("0.17")},
				Above55To60: RatePair{Employee: dec("0.15"), Employer: dec("0.145")},
				Above60To65: RatePair{Employee: dec("0.095"), Employer: dec("0.11")},
				Above65To70: RatePair{Employee: dec("0.075"), Employer: dec("0.09")},
				Above70:     RatePair{Employee: dec("0.05"), Employer: dec("0.075")},
			},
			PRYear1: AgeBasedContributionRates{
				UpTo55:      RatePair{Employee: dec("0.05"), Employer: dec("0.04")},
				Above55To60: RatePair{Employee: dec("0.05"), Employer: dec("0.04")},
				Above60To65: RatePair{Employee: dec("0.05"), Employer: dec("0.04")},
				Above65To70: RatePair{Employee: dec("0.05"), Employer: dec("0.04")},
				Above70:     RatePair{Employee: dec("0.05"), Employer: dec("0.04")},
			},
			PRYear2: AgeBasedContributionRates{
				UpTo55:      RatePair{Employee: dec("0.15"), Employer: dec("0.09")},
				Above55To60: RatePair{Employee: dec("0.125"), Employer: dec("0.09")},
				Above60To65: RatePair{Employee: dec("0.075"), Employer: dec("0.085")},
				Above65To70: RatePair{Employee: dec("0.05"), Employer: dec("0.065")},
				Above70:     RatePair{Employee: dec("0.05"), Employer: dec("0.065")},
			},
		},
	}

	tests := []struct {
		name             string
		residency        ResidencyStatus
		age              int
		expectedEmployee *decimal.Decimal
		expectedEmployer *decimal.Decimal
	}{
		// Citizen rates
		{"Citizen age 30", ResidencyCitizen, 30, decimal.MustFromString("0.20"), decimal.MustFromString("0.17")},
		{"Citizen age 55", ResidencyCitizen, 55, decimal.MustFromString("0.20"), decimal.MustFromString("0.17")},
		{"Citizen age 56", ResidencyCitizen, 56, decimal.MustFromString("0.15"), decimal.MustFromString("0.145")},
		{"Citizen age 61", ResidencyCitizen, 61, decimal.MustFromString("0.095"), decimal.MustFromString("0.11")},
		{"Citizen age 66", ResidencyCitizen, 66, decimal.MustFromString("0.075"), decimal.MustFromString("0.09")},
		{"Citizen age 71", ResidencyCitizen, 71, decimal.MustFromString("0.05"), decimal.MustFromString("0.075")},

		// PR Year 3+ should use same rates as citizen
		{"PR3+ age 30", ResidencyPRYear3Plus, 30, decimal.MustFromString("0.20"), decimal.MustFromString("0.17")},

		// PR Year 1 - flat rate for all ages
		{"PR Year 1 age 30", ResidencyPRYear1, 30, decimal.MustFromString("0.05"), decimal.MustFromString("0.04")},
		{"PR Year 1 age 71", ResidencyPRYear1, 71, decimal.MustFromString("0.05"), decimal.MustFromString("0.04")},

		// PR Year 2 - graduated rates
		{"PR Year 2 age 30", ResidencyPRYear2, 30, decimal.MustFromString("0.15"), decimal.MustFromString("0.09")},
		{"PR Year 2 age 56", ResidencyPRYear2, 56, decimal.MustFromString("0.125"), decimal.MustFromString("0.09")},
		{"PR Year 2 age 61", ResidencyPRYear2, 61, decimal.MustFromString("0.075"), decimal.MustFromString("0.085")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rates := cfg.GetContributionRates(tt.residency, tt.age)
			if rates.Employee.Cmp(tt.expectedEmployee) != 0 {
				t.Errorf("Expected employee rate %s, got %s", tt.expectedEmployee.String(), rates.Employee.String())
			}
			if rates.Employer.Cmp(tt.expectedEmployer) != 0 {
				t.Errorf("Expected employer rate %s, got %s", tt.expectedEmployer.String(), rates.Employer.String())
			}
		})
	}
}

func TestConfigData_GetAllocationRates(t *testing.T) {
	cfg := &ConfigData{
		AllocationRates: AllocationRateTable{
			UpTo35:      AllocationRates{OA: dec("0.6217"), SA: dec("0.1621"), MA: dec("0.2162"), RA: dec("0")},
			Above35To45: AllocationRates{OA: dec("0.5676"), SA: dec("0.1892"), MA: dec("0.2432"), RA: dec("0")},
			Above45To50: AllocationRates{OA: dec("0.5135"), SA: dec("0.2162"), MA: dec("0.2703"), RA: dec("0")},
			Above50To55: AllocationRates{OA: dec("0.4054"), SA: dec("0.3108"), MA: dec("0.2838"), RA: dec("0")},
			Above55To60: AllocationRates{OA: dec("0.4068"), SA: dec("0.1186"), MA: dec("0.3559"), RA: dec("0.1186")},
			Above60To65: AllocationRates{OA: dec("0.1707"), SA: dec("0.1220"), MA: dec("0.5122"), RA: dec("0.1951")},
			Above65To70: AllocationRates{OA: dec("0.0800"), SA: dec("0.0800"), MA: dec("0.5200"), RA: dec("0.3200")},
			Above70:     AllocationRates{OA: dec("0.0800"), SA: dec("0.0800"), MA: dec("0.5200"), RA: dec("0.3200")},
		},
	}

	tests := []struct {
		age        int
		expectedOA *decimal.Decimal
		expectedRA *decimal.Decimal
	}{
		{30, decimal.MustFromString("0.6217"), decimal.MustFromString("0")},       // ≤35
		{40, decimal.MustFromString("0.5676"), decimal.MustFromString("0")},       // 35-45
		{48, decimal.MustFromString("0.5135"), decimal.MustFromString("0")},       // 45-50
		{52, decimal.MustFromString("0.4054"), decimal.MustFromString("0")},       // 50-55
		{58, decimal.MustFromString("0.4068"), decimal.MustFromString("0.1186")},  // 55-60 (RA starts)
		{62, decimal.MustFromString("0.1707"), decimal.MustFromString("0.1951")},  // 60-65
		{68, decimal.MustFromString("0.0800"), decimal.MustFromString("0.3200")},  // 65-70
		{75, decimal.MustFromString("0.0800"), decimal.MustFromString("0.3200")},  // >70
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			rates := cfg.GetAllocationRates(tt.age)
			if rates.OA.Cmp(tt.expectedOA) != 0 {
				t.Errorf("Age %d: expected OA %s, got %s", tt.age, tt.expectedOA.String(), rates.OA.String())
			}
			if rates.RA.Cmp(tt.expectedRA) != 0 {
				t.Errorf("Age %d: expected RA %s, got %s", tt.age, tt.expectedRA.String(), rates.RA.String())
			}
		})
	}
}

func TestAllocationRates_SumToOne(t *testing.T) {
	// Test that allocation rates sum to approximately 1.0 for each age band
	cfg := &ConfigData{
		AllocationRates: AllocationRateTable{
			UpTo35:      AllocationRates{OA: dec("0.6217"), SA: dec("0.1621"), MA: dec("0.2162"), RA: dec("0")},
			Above35To45: AllocationRates{OA: dec("0.5676"), SA: dec("0.1892"), MA: dec("0.2432"), RA: dec("0")},
			Above45To50: AllocationRates{OA: dec("0.5135"), SA: dec("0.2162"), MA: dec("0.2703"), RA: dec("0")},
			Above50To55: AllocationRates{OA: dec("0.4054"), SA: dec("0.3108"), MA: dec("0.2838"), RA: dec("0")},
			Above55To60: AllocationRates{OA: dec("0.4068"), SA: dec("0.1186"), MA: dec("0.3559"), RA: dec("0.1186")},
			Above60To65: AllocationRates{OA: dec("0.1707"), SA: dec("0.1220"), MA: dec("0.5122"), RA: dec("0.1951")},
			Above65To70: AllocationRates{OA: dec("0.0800"), SA: dec("0.0800"), MA: dec("0.5200"), RA: dec("0.3200")},
			Above70:     AllocationRates{OA: dec("0.0800"), SA: dec("0.0800"), MA: dec("0.5200"), RA: dec("0.3200")},
		},
	}

	ages := []int{30, 40, 48, 52, 58, 62, 68, 75}
	one := decimal.MustFromString("1")
	tolerance := decimal.MustFromString("0.001")

	for _, age := range ages {
		rates := cfg.GetAllocationRates(age)
		sum := decimal.Zero().Add(&rates.OA).Add(&rates.SA).Add(&rates.MA).Add(&rates.RA)

		diff := sum.Sub(one)
		if diff.Abs().Cmp(tolerance) > 0 {
			t.Errorf("Age %d: allocation rates sum to %s, expected ~1.0", age, sum.String())
		}
	}
}

func TestResidencyStatusConstants(t *testing.T) {
	// Verify constants match expected string values
	if ResidencyCitizen != "citizen" {
		t.Errorf("ResidencyCitizen should be 'citizen', got '%s'", ResidencyCitizen)
	}
	if ResidencyPRYear1 != "pr_year_1" {
		t.Errorf("ResidencyPRYear1 should be 'pr_year_1', got '%s'", ResidencyPRYear1)
	}
	if ResidencyPRYear2 != "pr_year_2" {
		t.Errorf("ResidencyPRYear2 should be 'pr_year_2', got '%s'", ResidencyPRYear2)
	}
	if ResidencyPRYear3Plus != "pr_year_3_plus" {
		t.Errorf("ResidencyPRYear3Plus should be 'pr_year_3_plus', got '%s'", ResidencyPRYear3Plus)
	}
}
