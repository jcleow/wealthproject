package config

import (
	"testing"
)

func TestRatePair_Total(t *testing.T) {
	tests := []struct {
		name     string
		pair     RatePair
		expected float64
	}{
		{"Citizen under 55", RatePair{Employee: 0.20, Employer: 0.17}, 0.37},
		{"Citizen 55-60", RatePair{Employee: 0.15, Employer: 0.145}, 0.295},
		{"PR Year 1", RatePair{Employee: 0.05, Employer: 0.04}, 0.09},
		{"Zero rates", RatePair{Employee: 0, Employer: 0}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.pair.Total()
			if result != tt.expected {
				t.Errorf("Expected total %.4f, got %.4f", tt.expected, result)
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
		{66, AgeBandAbove65},
		{75, AgeBandAbove65},
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
				UpTo55:      RatePair{Employee: 0.20, Employer: 0.17},
				Above55To60: RatePair{Employee: 0.15, Employer: 0.145},
				Above60To65: RatePair{Employee: 0.095, Employer: 0.11},
				Above65To70: RatePair{Employee: 0.075, Employer: 0.09},
				Above70:     RatePair{Employee: 0.05, Employer: 0.075},
			},
			PRYear1: AgeBasedContributionRates{
				UpTo55:      RatePair{Employee: 0.05, Employer: 0.04},
				Above55To60: RatePair{Employee: 0.05, Employer: 0.04},
				Above60To65: RatePair{Employee: 0.05, Employer: 0.04},
				Above65To70: RatePair{Employee: 0.05, Employer: 0.04},
				Above70:     RatePair{Employee: 0.05, Employer: 0.04},
			},
			PRYear2: AgeBasedContributionRates{
				UpTo55:      RatePair{Employee: 0.15, Employer: 0.09},
				Above55To60: RatePair{Employee: 0.125, Employer: 0.09},
				Above60To65: RatePair{Employee: 0.075, Employer: 0.085},
				Above65To70: RatePair{Employee: 0.05, Employer: 0.065},
				Above70:     RatePair{Employee: 0.05, Employer: 0.065},
			},
		},
	}

	tests := []struct {
		name             string
		residency        ResidencyStatus
		age              int
		expectedEmployee float64
		expectedEmployer float64
	}{
		// Citizen rates
		{"Citizen age 30", ResidencyCitizen, 30, 0.20, 0.17},
		{"Citizen age 55", ResidencyCitizen, 55, 0.20, 0.17},
		{"Citizen age 56", ResidencyCitizen, 56, 0.15, 0.145},
		{"Citizen age 61", ResidencyCitizen, 61, 0.095, 0.11},
		{"Citizen age 66", ResidencyCitizen, 66, 0.075, 0.09},
		{"Citizen age 71", ResidencyCitizen, 71, 0.05, 0.075},

		// PR Year 3+ should use same rates as citizen
		{"PR3+ age 30", ResidencyPRYear3Plus, 30, 0.20, 0.17},

		// PR Year 1 - flat rate for all ages
		{"PR Year 1 age 30", ResidencyPRYear1, 30, 0.05, 0.04},
		{"PR Year 1 age 71", ResidencyPRYear1, 71, 0.05, 0.04},

		// PR Year 2 - graduated rates
		{"PR Year 2 age 30", ResidencyPRYear2, 30, 0.15, 0.09},
		{"PR Year 2 age 56", ResidencyPRYear2, 56, 0.125, 0.09},
		{"PR Year 2 age 61", ResidencyPRYear2, 61, 0.075, 0.085},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rates := cfg.GetContributionRates(tt.residency, tt.age)
			if rates.Employee != tt.expectedEmployee {
				t.Errorf("Expected employee rate %.4f, got %.4f", tt.expectedEmployee, rates.Employee)
			}
			if rates.Employer != tt.expectedEmployer {
				t.Errorf("Expected employer rate %.4f, got %.4f", tt.expectedEmployer, rates.Employer)
			}
		})
	}
}

func TestConfigData_GetAllocationRates(t *testing.T) {
	cfg := &ConfigData{
		AllocationRates: AllocationRateTable{
			UpTo35:      AllocationRates{OA: 0.6217, SA: 0.1621, MA: 0.2162},
			Above35To45: AllocationRates{OA: 0.5676, SA: 0.1892, MA: 0.2432},
			Above45To50: AllocationRates{OA: 0.5135, SA: 0.2162, MA: 0.2703},
			Above50To55: AllocationRates{OA: 0.4054, SA: 0.3108, MA: 0.2838},
			Above55To60: AllocationRates{OA: 0.4068, SA: 0.1186, MA: 0.3559, RA: 0.1186},
			Above60To65: AllocationRates{OA: 0.1707, SA: 0.1220, MA: 0.5122, RA: 0.1951},
			Above65:     AllocationRates{OA: 0.0800, SA: 0.0800, MA: 0.5200, RA: 0.3200},
		},
	}

	tests := []struct {
		age        int
		expectedOA float64
		expectedRA float64
	}{
		{30, 0.6217, 0},       // ≤35
		{40, 0.5676, 0},       // 35-45
		{48, 0.5135, 0},       // 45-50
		{52, 0.4054, 0},       // 50-55
		{58, 0.4068, 0.1186},  // 55-60 (RA starts)
		{62, 0.1707, 0.1951},  // 60-65
		{70, 0.0800, 0.3200},  // >65
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			rates := cfg.GetAllocationRates(tt.age)
			if rates.OA != tt.expectedOA {
				t.Errorf("Age %d: expected OA %.4f, got %.4f", tt.age, tt.expectedOA, rates.OA)
			}
			if rates.RA != tt.expectedRA {
				t.Errorf("Age %d: expected RA %.4f, got %.4f", tt.age, tt.expectedRA, rates.RA)
			}
		})
	}
}

func TestAllocationRates_SumToOne(t *testing.T) {
	// Test that allocation rates sum to approximately 1.0 for each age band
	cfg := &ConfigData{
		AllocationRates: AllocationRateTable{
			UpTo35:      AllocationRates{OA: 0.6217, SA: 0.1621, MA: 0.2162},
			Above35To45: AllocationRates{OA: 0.5676, SA: 0.1892, MA: 0.2432},
			Above45To50: AllocationRates{OA: 0.5135, SA: 0.2162, MA: 0.2703},
			Above50To55: AllocationRates{OA: 0.4054, SA: 0.3108, MA: 0.2838},
			Above55To60: AllocationRates{OA: 0.4068, SA: 0.1186, MA: 0.3559, RA: 0.1186},
			Above60To65: AllocationRates{OA: 0.1707, SA: 0.1220, MA: 0.5122, RA: 0.1951},
			Above65:     AllocationRates{OA: 0.0800, SA: 0.0800, MA: 0.5200, RA: 0.3200},
		},
	}

	ages := []int{30, 40, 48, 52, 58, 62, 70}
	for _, age := range ages {
		rates := cfg.GetAllocationRates(age)
		sum := rates.OA + rates.SA + rates.MA + rates.RA

		// Allow small tolerance for floating point
		if sum < 0.999 || sum > 1.001 {
			t.Errorf("Age %d: allocation rates sum to %.4f, expected ~1.0", age, sum)
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
