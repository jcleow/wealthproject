package medisave

import (
	"financial-chat-system/backend/internal/decimal"
	"testing"
)

func strPtr(s string) *string { return &s }

func TestGetAWL(t *testing.T) {
	tests := []struct {
		name     string
		age      int
		expected string
	}{
		{"age 30 (≤40)", 30, "300"},
		{"age 40 (boundary)", 40, "300"},
		{"age 41 (first step up)", 41, "600"},
		{"age 55 (mid range)", 55, "600"},
		{"age 70 (boundary)", 70, "600"},
		{"age 71 (second step up)", 71, "900"},
		{"age 85 (elderly)", 85, "900"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetAWL(tt.age)
			expected := decimal.MustFromString(tt.expected)
			if !result.EQ(expected) {
				t.Errorf("GetAWL(%d) = %s, want %s", tt.age, result.String(), tt.expected)
			}
		})
	}
}

func TestGetPayability(t *testing.T) {
	tests := []struct {
		name             string
		governmentScheme *string
		category         string
		expected         string
	}{
		{"MediShield Life", strPtr("medishield_life"), "hospitalization", PayabilityFull},
		{"CareShield Life", strPtr("careshield_life"), "disability", PayabilityFull},
		{"ElderShield", strPtr("eldershield"), "disability", PayabilityFull},
		{"DPS", strPtr("dps"), "life", PayabilityFull},
		{"ISP hospitalization", nil, "hospitalization", PayabilityPartial},
		{"ISP health", nil, "health", PayabilityPartial},
		{"Private life", nil, "life", PayabilityNone},
		{"Private CI", nil, "critical_illness", PayabilityNone},
		{"Private accident", nil, "accident", PayabilityNone},
		{"Unknown gov scheme", strPtr("unknown"), "life", PayabilityNone},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetPayability(tt.governmentScheme, tt.category)
			if result != tt.expected {
				t.Errorf("GetPayability(%v, %s) = %s, want %s", tt.governmentScheme, tt.category, result, tt.expected)
			}
		})
	}
}

func TestCPFAccountForScheme(t *testing.T) {
	tests := []struct {
		scheme   string
		expected string
	}{
		{"medishield_life", "MA"},
		{"careshield_life", "MA"},
		{"eldershield", "MA"},
		{"dps", "OA"},
	}

	for _, tt := range tests {
		t.Run(tt.scheme, func(t *testing.T) {
			result := CPFAccountForScheme(tt.scheme)
			if result != tt.expected {
				t.Errorf("CPFAccountForScheme(%s) = %s, want %s", tt.scheme, result, tt.expected)
			}
		})
	}
}

func TestCalculateMonthlySplit_PrivatePoliciesOnly(t *testing.T) {
	policies := []PolicyPremium{
		{
			ID:               "private-life",
			Category:         "life",
			PremiumAmount:    *decimal.MustFromString("100"),
			PremiumFrequency: "monthly",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// Private: full premium from cash, no CPF
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "100")
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "0")
	if len(result.CPFDeductions) != 0 {
		t.Errorf("expected 0 CPF deductions, got %d", len(result.CPFDeductions))
	}
}

func TestCalculateMonthlySplit_GovernmentScheme_MediShield(t *testing.T) {
	policies := []PolicyPremium{
		{
			ID:               "medishield",
			Category:         "hospitalization",
			GovernmentScheme: strPtr("medishield_life"),
			PremiumAmount:    *decimal.MustFromString("300"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// MediShield Life $300/yr = $25/mo, fully from MA
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "25")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "0")
	if len(result.CPFDeductions) != 1 {
		t.Fatalf("expected 1 CPF deduction, got %d", len(result.CPFDeductions))
	}
	assertDecimalEqual(t, "CPFDeduction amount", result.CPFDeductions[0].Amount, "25")
	if result.CPFDeductions[0].CPFAccount != "MA" {
		t.Errorf("expected MA, got %s", result.CPFDeductions[0].CPFAccount)
	}
}

func TestCalculateMonthlySplit_GovernmentScheme_DPS(t *testing.T) {
	policies := []PolicyPremium{
		{
			ID:               "dps",
			Category:         "life",
			GovernmentScheme: strPtr("dps"),
			PremiumAmount:    *decimal.MustFromString("96"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// DPS $96/yr = $8/mo, fully from OA
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "8")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "0")
	if len(result.CPFDeductions) != 1 {
		t.Fatalf("expected 1 CPF deduction, got %d", len(result.CPFDeductions))
	}
	if result.CPFDeductions[0].CPFAccount != "OA" {
		t.Errorf("expected OA, got %s", result.CPFDeductions[0].CPFAccount)
	}
}

func TestCalculateMonthlySplit_ISP_WithinAWL(t *testing.T) {
	// Age 35 → AWL = $300/yr = $25/mo
	// ISP premium $200/yr = $16.67/mo → fully within AWL
	policies := []PolicyPremium{
		{
			ID:               "isp-basic",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("200"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// $200/12 = $16.67/mo, fully within AWL ($25/mo)
	monthlyPremium := decimal.MustFromString("200").Div(decimal.NewFromInt64(12, 0))
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, monthlyPremium.String())
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "0")
}

func TestCalculateMonthlySplit_ISP_ExceedsAWL(t *testing.T) {
	// Age 35 → AWL = $300/yr = $25/mo
	// ISP premium $600/yr = $50/mo → exceeds AWL
	policies := []PolicyPremium{
		{
			ID:               "isp-premium",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("600"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// $600/12 = $50/mo; AWL = $25/mo
	// MediSave: $25, Cash: $25
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "25")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "25")
}

func TestCalculateMonthlySplit_AWL_SharedAcrossISPs(t *testing.T) {
	// Age 35 → AWL = $300/yr = $25/mo
	// Two ISPs: $360/yr ($30/mo) + $240/yr ($20/mo)
	// First ISP consumes $25/mo of AWL, second ISP gets $0 remaining
	policies := []PolicyPremium{
		{
			ID:               "isp-1",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("360"),
			PremiumFrequency: "annual",
		},
		{
			ID:               "isp-2",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("240"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	// Total premium: ($360+$240)/12 = $50/mo
	// AWL = $25/mo, shared across both ISPs
	// ISP-1 gets min($30, $25) = $25 from MA, $5 from cash
	// ISP-2 gets min($20, $0) = $0 from MA, $20 from cash
	// Total: CPF=$25, Cash=$25
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "25")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "25")

	// Should have exactly 1 CPF deduction (ISP-2 gets $0 MA so no deduction)
	if len(result.CPFDeductions) != 1 {
		t.Fatalf("expected 1 CPF deduction (ISP-2 gets $0), got %d", len(result.CPFDeductions))
	}
	if result.CPFDeductions[0].PolicyID != "isp-1" {
		t.Errorf("expected ISP-1 to get the AWL, got %s", result.CPFDeductions[0].PolicyID)
	}
}

func TestCalculateMonthlySplit_MixedPortfolio(t *testing.T) {
	// Age 55 → AWL = $600/yr = $50/mo
	// Mixed: MediShield ($300/yr) + ISP ($800/yr) + Private Life ($1200/yr)
	policies := []PolicyPremium{
		{
			ID:               "medishield",
			Category:         "hospitalization",
			GovernmentScheme: strPtr("medishield_life"),
			PremiumAmount:    *decimal.MustFromString("300"),
			PremiumFrequency: "annual",
		},
		{
			ID:               "isp",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("800"),
			PremiumFrequency: "annual",
		},
		{
			ID:               "private-life",
			Category:         "life",
			PremiumAmount:    *decimal.MustFromString("1200"),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 55)

	// MediShield: $300/12 = $25/mo → fully from MA
	// ISP: $800/12 ≈ $66.67/mo; AWL = $50/mo → MA=$50, Cash≈$16.67
	// Private: $1200/12 = $100/mo → fully from cash
	// Total CPF: $25 + $50 = $75
	// Total Cash: $16.67 + $100 = $116.67

	expectedCPF := decimal.MustFromString("300").Div(decimal.NewFromInt64(12, 0)).Add(
		decimal.MustFromString("600").Div(decimal.NewFromInt64(12, 0)),
	)
	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, expectedCPF.String())

	// CPF deductions: 2 (MediShield MA + ISP MA)
	if len(result.CPFDeductions) != 2 {
		t.Fatalf("expected 2 CPF deductions, got %d", len(result.CPFDeductions))
	}
}

func TestCalculateMonthlySplit_ZeroPremium(t *testing.T) {
	policies := []PolicyPremium{
		{
			ID:               "free-policy",
			Category:         "hospitalization",
			GovernmentScheme: strPtr("medishield_life"),
			PremiumAmount:    *decimal.Zero(),
			PremiumFrequency: "annual",
		},
	}

	result := CalculateMonthlySplit(policies, 35)

	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "0")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "0")
	if len(result.CPFDeductions) != 0 {
		t.Errorf("expected 0 CPF deductions for zero premium, got %d", len(result.CPFDeductions))
	}
}

func TestCalculateMonthlySplit_EmptyPolicies(t *testing.T) {
	result := CalculateMonthlySplit([]PolicyPremium{}, 35)

	assertDecimalEqual(t, "TotalCPF", result.TotalCPF, "0")
	assertDecimalEqual(t, "TotalCash", result.TotalCash, "0")
	if len(result.CPFDeductions) != 0 {
		t.Errorf("expected 0 CPF deductions, got %d", len(result.CPFDeductions))
	}
}

func TestCalculateMonthlySplit_AWLStepsUpWithAge(t *testing.T) {
	// Same ISP premium, different ages → different AWL → different splits
	policies := []PolicyPremium{
		{
			ID:               "isp",
			Category:         "hospitalization",
			PremiumAmount:    *decimal.MustFromString("1200"),
			PremiumFrequency: "annual",
		},
	}

	// Age 40: AWL=$300/yr=$25/mo, premium=$100/mo → MA=$25, Cash=$75
	result40 := CalculateMonthlySplit(policies, 40)
	assertDecimalEqual(t, "Age40 TotalCPF", result40.TotalCPF, "25")
	assertDecimalEqual(t, "Age40 TotalCash", result40.TotalCash, "75")

	// Age 41: AWL=$600/yr=$50/mo, premium=$100/mo → MA=$50, Cash=$50
	result41 := CalculateMonthlySplit(policies, 41)
	assertDecimalEqual(t, "Age41 TotalCPF", result41.TotalCPF, "50")
	assertDecimalEqual(t, "Age41 TotalCash", result41.TotalCash, "50")

	// Age 71: AWL=$900/yr=$75/mo, premium=$100/mo → MA=$75, Cash=$25
	result71 := CalculateMonthlySplit(policies, 71)
	assertDecimalEqual(t, "Age71 TotalCPF", result71.TotalCPF, "75")
	assertDecimalEqual(t, "Age71 TotalCash", result71.TotalCash, "25")
}

// assertDecimalEqual is a test helper that compares decimal values with tolerance
// for rounding differences in division (e.g., 300/12 = 24.999... vs 25)
func assertDecimalEqual(t *testing.T, label string, got *decimal.Decimal, expectedStr string) {
	t.Helper()
	expected := decimal.MustFromString(expectedStr)
	// Allow tolerance of 0.01 for rounding in division
	diff := got.Sub(expected).Abs()
	tolerance := decimal.MustFromString("0.01")
	if diff.GT(tolerance) {
		t.Errorf("%s: got %s, want %s (diff: %s)", label, got.String(), expectedStr, diff.String())
	}
}
