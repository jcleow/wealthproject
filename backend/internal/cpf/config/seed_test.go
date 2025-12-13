package config

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

func TestConfig2024(t *testing.T) {
	cfg := Config2024()

	// Verify year and dates
	if cfg.Year != 2024 {
		t.Errorf("Expected year 2024, got %d", cfg.Year)
	}
	if cfg.EffectiveFrom != time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC) {
		t.Errorf("Expected effective from 2024-01-01, got %v", cfg.EffectiveFrom)
	}
	if cfg.EffectiveTo == nil || *cfg.EffectiveTo != time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC) {
		t.Errorf("Expected effective to 2025-01-01, got %v", cfg.EffectiveTo)
	}

	// Verify 2024 OW ceiling ($6,800)
	if cfg.Config.OWCeiling != 6800 {
		t.Errorf("Expected 2024 OW ceiling $6,800, got $%d", cfg.Config.OWCeiling)
	}

	// Verify annual ceiling
	if cfg.Config.AnnualCeiling != 102000 {
		t.Errorf("Expected annual ceiling $102,000, got $%d", cfg.Config.AnnualCeiling)
	}

	// Verify 2024 retirement sums
	if cfg.Config.RetirementSums.BRS != 102900 {
		t.Errorf("Expected 2024 BRS $102,900, got $%d", cfg.Config.RetirementSums.BRS)
	}
	if cfg.Config.RetirementSums.FRS != 205800 {
		t.Errorf("Expected 2024 FRS $205,800, got $%d", cfg.Config.RetirementSums.FRS)
	}
	if cfg.Config.RetirementSums.ERS != 308700 {
		t.Errorf("Expected 2024 ERS $308,700, got $%d", cfg.Config.RetirementSums.ERS)
	}

	// Verify 2024 BHS
	if cfg.Config.BHS != 68500 {
		t.Errorf("Expected 2024 BHS $68,500, got $%d", cfg.Config.BHS)
	}
}

func TestConfig2025(t *testing.T) {
	cfg := Config2025()

	// Verify year and dates
	if cfg.Year != 2025 {
		t.Errorf("Expected year 2025, got %d", cfg.Year)
	}
	if cfg.EffectiveFrom != time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC) {
		t.Errorf("Expected effective from 2025-01-01, got %v", cfg.EffectiveFrom)
	}
	if cfg.EffectiveTo != nil {
		t.Errorf("Expected effective to nil for current config, got %v", cfg.EffectiveTo)
	}

	// Verify 2025 OW ceiling (increased to $7,400)
	if cfg.Config.OWCeiling != 7400 {
		t.Errorf("Expected 2025 OW ceiling $7,400, got $%d", cfg.Config.OWCeiling)
	}

	// Verify annual ceiling
	if cfg.Config.AnnualCeiling != 102000 {
		t.Errorf("Expected annual ceiling $102,000, got $%d", cfg.Config.AnnualCeiling)
	}

	// Verify 2025 retirement sums
	if cfg.Config.RetirementSums.BRS != 106500 {
		t.Errorf("Expected 2025 BRS $106,500, got $%d", cfg.Config.RetirementSums.BRS)
	}
	if cfg.Config.RetirementSums.FRS != 213000 {
		t.Errorf("Expected 2025 FRS $213,000, got $%d", cfg.Config.RetirementSums.FRS)
	}
	if cfg.Config.RetirementSums.ERS != 426000 {
		t.Errorf("Expected 2025 ERS $426,000, got $%d", cfg.Config.RetirementSums.ERS)
	}

	// Verify 2025 BHS
	if cfg.Config.BHS != 71500 {
		t.Errorf("Expected 2025 BHS $71,500, got $%d", cfg.Config.BHS)
	}
}

func TestConfigInterestRates(t *testing.T) {
	cfg := Config2025()

	expected025 := decimal.MustFromString("0.025")
	expected04 := decimal.MustFromString("0.04")
	expected01 := decimal.MustFromString("0.01")
	expected02 := decimal.MustFromString("0.02")

	// Verify base interest rates
	if cfg.Config.InterestRates.OA.Cmp(expected025) != 0 {
		t.Errorf("Expected OA rate 2.5%%, got %s", cfg.Config.InterestRates.OA.String())
	}
	if cfg.Config.InterestRates.SA.Cmp(expected04) != 0 {
		t.Errorf("Expected SA rate 4%%, got %s", cfg.Config.InterestRates.SA.String())
	}
	if cfg.Config.InterestRates.MA.Cmp(expected04) != 0 {
		t.Errorf("Expected MA rate 4%%, got %s", cfg.Config.InterestRates.MA.String())
	}
	if cfg.Config.InterestRates.RA.Cmp(expected04) != 0 {
		t.Errorf("Expected RA rate 4%%, got %s", cfg.Config.InterestRates.RA.String())
	}

	// Verify extra interest rates
	if cfg.Config.InterestRates.Extra1PctFirst60k.Cmp(expected01) != 0 {
		t.Errorf("Expected extra 1%% for first $60k, got %s", cfg.Config.InterestRates.Extra1PctFirst60k.String())
	}
	if cfg.Config.InterestRates.Extra2PctFirst30kAbove55.Cmp(expected02) != 0 {
		t.Errorf("Expected extra 2%% for first $30k (55+), got %s", cfg.Config.InterestRates.Extra2PctFirst30kAbove55.String())
	}
}

func TestConfigContributionRates(t *testing.T) {
	cfg := Config2025()

	expected020 := decimal.MustFromString("0.20")
	expected017 := decimal.MustFromString("0.17")
	expected037 := decimal.MustFromString("0.37")
	expected005 := decimal.MustFromString("0.05")
	expected004 := decimal.MustFromString("0.04")
	expected015 := decimal.MustFromString("0.15")
	expected009 := decimal.MustFromString("0.09")

	// Verify citizen/PR3+ under 55 rates
	citizen := cfg.Config.ContributionRates.CitizenAndPR3Plus.UpTo55
	if citizen.Employee.Cmp(expected020) != 0 {
		t.Errorf("Expected citizen employee rate 20%%, got %s", citizen.Employee.String())
	}
	if citizen.Employer.Cmp(expected017) != 0 {
		t.Errorf("Expected citizen employer rate 17%%, got %s", citizen.Employer.String())
	}
	if citizen.Total().Cmp(expected037) != 0 {
		t.Errorf("Expected total rate 37%%, got %s", citizen.Total().String())
	}

	// Verify PR Year 1 rates (same for all ages)
	pr1 := cfg.Config.ContributionRates.PRYear1.UpTo55
	if pr1.Employee.Cmp(expected005) != 0 {
		t.Errorf("Expected PR Year 1 employee rate 5%%, got %s", pr1.Employee.String())
	}
	if pr1.Employer.Cmp(expected004) != 0 {
		t.Errorf("Expected PR Year 1 employer rate 4%%, got %s", pr1.Employer.String())
	}

	// Verify PR Year 1 is same across age bands
	pr1_56 := cfg.Config.ContributionRates.PRYear1.Above55To60
	if pr1_56.Employee.Cmp(&pr1.Employee) != 0 || pr1_56.Employer.Cmp(&pr1.Employer) != 0 {
		t.Errorf("Expected PR Year 1 rates to be same across age bands")
	}

	// Verify PR Year 2 rates
	pr2 := cfg.Config.ContributionRates.PRYear2.UpTo55
	if pr2.Employee.Cmp(expected015) != 0 {
		t.Errorf("Expected PR Year 2 employee rate 15%%, got %s", pr2.Employee.String())
	}
	if pr2.Employer.Cmp(expected009) != 0 {
		t.Errorf("Expected PR Year 2 employer rate 9%%, got %s", pr2.Employer.String())
	}
}

func TestConfigAllocationRates(t *testing.T) {
	cfg := Config2025()

	// Verify allocation for under 35
	alloc := cfg.Config.AllocationRates.UpTo35
	sum := decimal.Zero().Add(&alloc.OA).Add(&alloc.SA).Add(&alloc.MA).Add(&alloc.RA)

	one := decimal.MustFromString("1")
	tolerance := decimal.MustFromString("0.001")
	diff := sum.Sub(one)
	if diff.Abs().Cmp(tolerance) > 0 {
		t.Errorf("Allocation rates for ≤35 should sum to 1, got %s", sum.String())
	}

	// OA should be highest for young workers
	if alloc.OA.Cmp(&alloc.SA) <= 0 || alloc.OA.Cmp(&alloc.MA) <= 0 {
		t.Errorf("Expected OA to be highest allocation for ≤35, got OA=%s, SA=%s, MA=%s",
			alloc.OA.String(), alloc.SA.String(), alloc.MA.String())
	}

	// RA should be 0 for under 55
	zero := decimal.MustFromString("0")
	if alloc.RA.Cmp(zero) != 0 {
		t.Errorf("Expected RA allocation 0 for ≤35, got %s", alloc.RA.String())
	}

	// Verify RA starts after 55
	alloc55 := cfg.Config.AllocationRates.Above55To60
	if alloc55.RA.Cmp(zero) == 0 {
		t.Errorf("Expected non-zero RA allocation for 55-60")
	}

	// Verify MA increases with age (healthcare needs)
	alloc65 := cfg.Config.AllocationRates.Above65
	if alloc65.MA.Cmp(&alloc.MA) <= 0 {
		t.Errorf("Expected MA to increase with age, got MA(≤35)=%s, MA(>65)=%s",
			alloc.MA.String(), alloc65.MA.String())
	}
}

func TestOWCeilingChange2024To2025(t *testing.T) {
	cfg2024 := Config2024()
	cfg2025 := Config2025()

	// Verify OW ceiling increased from 2024 to 2025
	if cfg2025.Config.OWCeiling <= cfg2024.Config.OWCeiling {
		t.Errorf("Expected 2025 OW ceiling ($%d) > 2024 OW ceiling ($%d)",
			cfg2025.Config.OWCeiling, cfg2024.Config.OWCeiling)
	}

	// Verify exact values
	if cfg2024.Config.OWCeiling != 6800 {
		t.Errorf("Expected 2024 OW ceiling $6,800, got $%d", cfg2024.Config.OWCeiling)
	}
	if cfg2025.Config.OWCeiling != 7400 {
		t.Errorf("Expected 2025 OW ceiling $7,400, got $%d", cfg2025.Config.OWCeiling)
	}
}

func TestRetirementSumsIncrease2024To2025(t *testing.T) {
	cfg2024 := Config2024()
	cfg2025 := Config2025()

	// BRS should increase year over year
	if cfg2025.Config.RetirementSums.BRS <= cfg2024.Config.RetirementSums.BRS {
		t.Errorf("Expected 2025 BRS > 2024 BRS")
	}

	// FRS should be 2x BRS
	expectedFRS := cfg2025.Config.RetirementSums.BRS * 2
	if cfg2025.Config.RetirementSums.FRS != expectedFRS {
		t.Errorf("Expected FRS ($%d) to be 2x BRS ($%d), got $%d",
			cfg2025.Config.RetirementSums.FRS,
			cfg2025.Config.RetirementSums.BRS,
			expectedFRS)
	}

	// ERS should be 4x BRS (2x FRS) in 2025
	// Note: ERS formula changed to 4x BRS from 2025
	expectedERS := cfg2025.Config.RetirementSums.BRS * 4
	if cfg2025.Config.RetirementSums.ERS != expectedERS {
		t.Errorf("Expected ERS ($%d) to be 4x BRS ($%d), got $%d",
			cfg2025.Config.RetirementSums.ERS,
			cfg2025.Config.RetirementSums.BRS,
			expectedERS)
	}
}

func TestBHSIncrease2024To2025(t *testing.T) {
	cfg2024 := Config2024()
	cfg2025 := Config2025()

	// BHS should increase year over year
	if cfg2025.Config.BHS <= cfg2024.Config.BHS {
		t.Errorf("Expected 2025 BHS ($%d) > 2024 BHS ($%d)",
			cfg2025.Config.BHS, cfg2024.Config.BHS)
	}
}

func TestPtrHelper(t *testing.T) {
	tm := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	result := ptr(tm)

	if result == nil {
		t.Fatal("Expected non-nil pointer")
	}
	if *result != tm {
		t.Errorf("Expected %v, got %v", tm, *result)
	}
}
