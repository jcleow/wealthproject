package handlers

import (
	"testing"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
)

// Type alias for shorter test code
type ScenarioImpact = repo.ScenarioImpact

// TestBuildImpactV2_StartImpact_RequiresTargetID ensures that start impacts
// require a pre-existing targetId and cannot use placeholder values like "pending".
// This prevents the bug where the backend would auto-create finance rows with
// generic names like "Scenario Item".
func TestBuildImpactV2_StartImpact_RequiresTargetID(t *testing.T) {
	tests := []struct {
		name      string
		dto       scenarioImpactV2DTO
		wantErr   error
		wantErrNil bool
	}{
		{
			name: "start impact with valid targetId succeeds",
			dto: scenarioImpactV2DTO{
				TargetType:     "expense",
				TargetID:       strPtr("valid-uuid-123"),
				ImpactKind:     "start",
				Amount:         50000,
				Currency:       "SGD",
				Cadence:        "one_time",
				StartDate:      "2025-06",
				TargetExpenseID: strPtr("valid-uuid-123"),
			},
			wantErrNil: true,
		},
		{
			name: "start impact without targetId fails",
			dto: scenarioImpactV2DTO{
				TargetType: "expense",
				// No TargetID, no TargetExpenseId
				ImpactKind: "start",
				Amount:     50000,
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
			},
			wantErr: scenario.ErrInvalidTargetCount,
		},
		{
			name: "start impact with empty targetId fails",
			dto: scenarioImpactV2DTO{
				TargetType: "expense",
				TargetID:   strPtr(""),
				ImpactKind: "start",
				Amount:     50000,
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
			},
			wantErr: scenario.ErrInvalidTargetCount,
		},
		{
			name: "start impact with whitespace-only targetId fails",
			dto: scenarioImpactV2DTO{
				TargetType: "expense",
				TargetID:   strPtr("   "),
				ImpactKind: "start",
				Amount:     50000,
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
			},
			wantErr: scenario.ErrInvalidTargetCount,
		},
		{
			name: "delta impact with valid targetId succeeds",
			dto: scenarioImpactV2DTO{
				TargetType:     "expense",
				TargetID:       strPtr("valid-uuid-123"),
				ImpactKind:     "delta",
				Amount:         500,
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				TargetExpenseID: strPtr("valid-uuid-123"),
			},
			wantErrNil: true,
		},
		{
			name: "override impact with valid targetId succeeds",
			dto: scenarioImpactV2DTO{
				TargetType:     "income",
				TargetID:       strPtr("valid-uuid-456"),
				ImpactKind:     "override",
				Amount:         2000,
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				TargetIncomeID: strPtr("valid-uuid-456"),
			},
			wantErrNil: true,
		},
		{
			name: "stop impact with valid targetId succeeds",
			dto: scenarioImpactV2DTO{
				TargetType:     "expense",
				TargetID:       strPtr("valid-uuid-789"),
				ImpactKind:     "stop",
				Amount:         0,
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				TargetExpenseID: strPtr("valid-uuid-789"),
			},
			wantErrNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			impact, err := buildImpactV2(tt.dto)

			if tt.wantErrNil {
				if err != nil {
					t.Errorf("buildImpactV2() error = %v, want nil", err)
					return
				}
				// Verify the impact has a valid target
				targetID := impact.TargetID()
				if targetID == nil || *targetID == "" {
					t.Errorf("buildImpactV2() returned impact with nil/empty targetId")
				}
			} else {
				if err == nil {
					t.Errorf("buildImpactV2() error = nil, want %v", tt.wantErr)
					return
				}
				if err != tt.wantErr {
					t.Errorf("buildImpactV2() error = %v, want %v", err, tt.wantErr)
				}
			}
		})
	}
}

// TestBuildImpactV2_NeverCreatesPlaceholderTargetID ensures that the "pending"
// placeholder bug cannot resurface. The buildImpactV2 function should never
// set a targetId to "pending" or any other placeholder value.
func TestBuildImpactV2_NeverCreatesPlaceholderTargetID(t *testing.T) {
	// This DTO has only targetType but no targetId - should fail, not use "pending"
	dto := scenarioImpactV2DTO{
		TargetType: "expense",
		ImpactKind: "start",
		Amount:     50000,
		Currency:   "SGD",
		Cadence:    "one_time",
		StartDate:  "2025-06",
	}

	impact, err := buildImpactV2(dto)

	// Should error because no targetId provided
	if err == nil {
		// If no error, check that it didn't use "pending" as a placeholder
		targetID := impact.TargetID()
		if targetID != nil && *targetID == "pending" {
			t.Errorf("buildImpactV2() used 'pending' as placeholder targetId - this is a regression!")
		}
		t.Errorf("buildImpactV2() should have returned error for start impact without targetId")
	}
}

// TestBuildImpactV2_LiabilityStartImpact_WithInterestRateAndMinPayment tests that
// liability start impacts correctly pass through interestRate and minimumPayment fields.
func TestBuildImpactV2_LiabilityStartImpact_WithInterestRateAndMinPayment(t *testing.T) {
	interestRate := 5.5
	minPayment := int64(500)

	dto := scenarioImpactV2DTO{
		TargetType:        "liability",
		TargetLiabilityID: strPtr("liability-uuid-123"),
		TargetID:          strPtr("liability-uuid-123"),
		ImpactKind:        "start",
		Amount:            10000,
		Currency:          "SGD",
		Cadence:           "monthly",
		StartDate:         "2025-06",
		Category:          strPtr("debt"),
		InterestRate:      &interestRate,
		MinimumPayment:    &minPayment,
	}

	impact, err := buildImpactV2(dto)
	if err != nil {
		t.Fatalf("buildImpactV2() error = %v, want nil", err)
	}

	// Verify target ID
	if impact.TargetLiabilityID == nil || *impact.TargetLiabilityID != "liability-uuid-123" {
		t.Errorf("buildImpactV2() TargetLiabilityID = %v, want liability-uuid-123", impact.TargetLiabilityID)
	}

	// Verify interest rate is passed through
	if impact.InterestRate == nil {
		t.Errorf("buildImpactV2() InterestRate = nil, want %v", interestRate)
	} else if *impact.InterestRate != interestRate {
		t.Errorf("buildImpactV2() InterestRate = %v, want %v", *impact.InterestRate, interestRate)
	}

	// Verify minimum payment is passed through
	if impact.MinimumPayment == nil {
		t.Errorf("buildImpactV2() MinimumPayment = nil, want %v", minPayment)
	} else if *impact.MinimumPayment != minPayment {
		t.Errorf("buildImpactV2() MinimumPayment = %v, want %v", *impact.MinimumPayment, minPayment)
	}

	// Verify category is passed through
	if impact.Category != "debt" {
		t.Errorf("buildImpactV2() Category = %v, want debt", impact.Category)
	}
}

// TestToScenarioImpactV2DTO_LiabilityFields tests that the DTO converter
// correctly includes interestRate and minimumPayment for liability impacts.
func TestToScenarioImpactV2DTO_LiabilityFields(t *testing.T) {
	interestRate := 7.25
	minPayment := int64(250)

	impact := ScenarioImpact{
		EventID:           "event-123",
		ImpactKind:        "start",
		Amount:            15000,
		Cadence:           "monthly",
		TargetLiabilityID: strPtr("liability-456"),
		Name:              "Credit Card",
		Currency:          "SGD",
		Category:          "credit_card",
		InterestRate:      &interestRate,
		MinimumPayment:    &minPayment,
	}

	dto := toScenarioImpactV2DTO(impact)

	// Verify interest rate
	if dto.InterestRate == nil {
		t.Errorf("toScenarioImpactV2DTO() InterestRate = nil, want %v", interestRate)
	} else if *dto.InterestRate != interestRate {
		t.Errorf("toScenarioImpactV2DTO() InterestRate = %v, want %v", *dto.InterestRate, interestRate)
	}

	// Verify minimum payment
	if dto.MinimumPayment == nil {
		t.Errorf("toScenarioImpactV2DTO() MinimumPayment = nil, want %v", minPayment)
	} else if *dto.MinimumPayment != minPayment {
		t.Errorf("toScenarioImpactV2DTO() MinimumPayment = %v, want %v", *dto.MinimumPayment, minPayment)
	}

	// Verify target type is liability
	if dto.TargetType != "liability" {
		t.Errorf("toScenarioImpactV2DTO() TargetType = %v, want liability", dto.TargetType)
	}
}

func strPtr(s string) *string {
	return &s
}
