package handlers

import (
	"strconv"
	"testing"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
)

// decAmount creates a *decimal.Decimal for model-level tests
func decAmount(v int64) *decimal.Decimal {
	return decimal.NewFromInt64(v, 0)
}

// strAmount creates a *string for DTO-level tests (frontend sends amount as string)
func strAmount(v int64) *string {
	s := strconv.FormatInt(v, 10)
	return &s
}

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
				Amount:         strAmount(50000),
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
				Amount:     strAmount(50000),
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
				Amount:     strAmount(50000),
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
				Amount:     strAmount(50000),
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
				Amount:         strAmount(500),
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
				Amount:         strAmount(2000),
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
				Amount:         strAmount(0),
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
		Amount:     strAmount(50000),
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
		Amount:            strAmount(10000),
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
		Amount:            decAmount(15000),
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

// TestBuildImpactsV2FromDTO_UpdateScenarioWithModifiedImpacts tests that
// when updating a scenario event, impacts can be modified (amount, category, etc.)
// and the buildImpactsV2FromDTO function correctly processes them.
func TestBuildImpactsV2FromDTO_UpdateScenarioWithModifiedImpacts(t *testing.T) {
	tests := []struct {
		name       string
		dtos       []scenarioImpactV2DTO
		wantCount  int
		wantErr    bool
		errMessage string
	}{
		{
			name: "update single impact with new amount",
			dtos: []scenarioImpactV2DTO{
				{
					TargetType:      "expense",
					TargetID:        strPtr("expense-uuid-123"),
					TargetExpenseID: strPtr("expense-uuid-123"),
					ImpactKind:      "start",
					Amount:          strAmount(75000), // Updated from 50000
					Currency:        "SGD",
					Cadence:         "monthly",
					StartDate:       "2025-06",
					Category:        strPtr("housing"),
				},
			},
			wantCount: 1,
			wantErr:   false,
		},
		{
			name: "update multiple impacts",
			dtos: []scenarioImpactV2DTO{
				{
					TargetType:      "income",
					TargetID:        strPtr("income-uuid-1"),
					TargetIncomeID:  strPtr("income-uuid-1"),
					ImpactKind:      "delta",
					Amount:          strAmount(1000),
					Currency:        "SGD",
					Cadence:         "monthly",
					StartDate:       "2025-06",
				},
				{
					TargetType:      "expense",
					TargetID:        strPtr("expense-uuid-2"),
					TargetExpenseID: strPtr("expense-uuid-2"),
					ImpactKind:      "override",
					Amount:          strAmount(2000),
					Currency:        "SGD",
					Cadence:         "monthly",
					StartDate:       "2025-06",
				},
			},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "add new impact during update",
			dtos: []scenarioImpactV2DTO{
				{
					TargetType:     "asset",
					TargetID:       strPtr("asset-uuid-new"),
					TargetAssetID:  strPtr("asset-uuid-new"),
					ImpactKind:     "start",
					Amount:         strAmount(100000),
					Currency:       "SGD",
					Cadence:        "one_time",
					StartDate:      "2025-07",
					Category:       strPtr("real_estate"),
					GrowthRate:     floatPtr(3.5),
				},
			},
			wantCount: 1,
			wantErr:   false,
		},
		{
			name: "update with liability impact including interest rate and min payment",
			dtos: []scenarioImpactV2DTO{
				{
					TargetType:        "liability",
					TargetID:          strPtr("liability-uuid-123"),
					TargetLiabilityID: strPtr("liability-uuid-123"),
					ImpactKind:        "start",
					Amount:            strAmount(20000),
					Currency:          "SGD",
					Cadence:           "monthly",
					StartDate:         "2025-06",
					Category:          strPtr("credit_card"),
					InterestRate:      floatPtr(18.5),
					MinimumPayment:    int64Ptr(300),
				},
			},
			wantCount: 1,
			wantErr:   false,
		},
		{
			name: "reject duplicate targets in same update",
			dtos: []scenarioImpactV2DTO{
				{
					TargetType:      "expense",
					TargetID:        strPtr("expense-uuid-same"),
					TargetExpenseID: strPtr("expense-uuid-same"),
					ImpactKind:      "delta",
					Amount:          strAmount(100),
					Currency:        "SGD",
					Cadence:         "monthly",
					StartDate:       "2025-06",
				},
				{
					TargetType:      "expense",
					TargetID:        strPtr("expense-uuid-same"), // Duplicate target
					TargetExpenseID: strPtr("expense-uuid-same"),
					ImpactKind:      "override",
					Amount:          strAmount(200),
					Currency:        "SGD",
					Cadence:         "monthly",
					StartDate:       "2025-06",
				},
			},
			wantCount:  0,
			wantErr:    true,
			errMessage: "only one impact per financial item is allowed per event",
		},
		{
			name:       "reject empty impacts array",
			dtos:       []scenarioImpactV2DTO{},
			wantCount:  0,
			wantErr:    true,
			errMessage: "scenario event must have at least one impact",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			impacts, err := buildImpactsV2FromDTO(tt.dtos)

			if tt.wantErr {
				if err == nil {
					t.Errorf("buildImpactsV2FromDTO() error = nil, want error containing %q", tt.errMessage)
					return
				}
				if tt.errMessage != "" && err.Error() != tt.errMessage {
					t.Errorf("buildImpactsV2FromDTO() error = %q, want %q", err.Error(), tt.errMessage)
				}
				return
			}

			if err != nil {
				t.Errorf("buildImpactsV2FromDTO() error = %v, want nil", err)
				return
			}

			if len(impacts) != tt.wantCount {
				t.Errorf("buildImpactsV2FromDTO() returned %d impacts, want %d", len(impacts), tt.wantCount)
			}
		})
	}
}

// TestBuildImpactV2_UpdatePreservesAdvancedFields verifies that when updating
// an impact, all advanced fields (category, growthRate, growthStrategy, etc.)
// are correctly preserved in the built impact.
func TestBuildImpactV2_UpdatePreservesAdvancedFields(t *testing.T) {
	growthRate := 5.0
	interestRate := 12.5
	minPayment := int64(200)

	tests := []struct {
		name           string
		dto            scenarioImpactV2DTO
		checkImpact    func(t *testing.T, imp ScenarioImpact)
	}{
		{
			name: "income with growth rate and strategy",
			dto: scenarioImpactV2DTO{
				TargetType:     "income",
				TargetID:       strPtr("income-uuid"),
				TargetIncomeID: strPtr("income-uuid"),
				ImpactKind:     "start",
				Amount:         strAmount(5000),
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				Category:       strPtr("salary"),
				GrowthRate:     &growthRate,
				GrowthStrategy: strPtr("annual_step"),
			},
			checkImpact: func(t *testing.T, imp ScenarioImpact) {
				if imp.Category != "salary" {
					t.Errorf("Category = %q, want %q", imp.Category, "salary")
				}
				if imp.GrowthRate == nil || *imp.GrowthRate != growthRate {
					t.Errorf("GrowthRate = %v, want %v", imp.GrowthRate, growthRate)
				}
				if imp.GrowthStrategy != "annual_step" {
					t.Errorf("GrowthStrategy = %q, want %q", imp.GrowthStrategy, "annual_step")
				}
			},
		},
		{
			name: "expense with category only",
			dto: scenarioImpactV2DTO{
				TargetType:      "expense",
				TargetID:        strPtr("expense-uuid"),
				TargetExpenseID: strPtr("expense-uuid"),
				ImpactKind:      "start",
				Amount:          strAmount(3000),
				Currency:        "SGD",
				Cadence:         "one_time",
				StartDate:       "2025-06",
				Category:        strPtr("entertainment"),
			},
			checkImpact: func(t *testing.T, imp ScenarioImpact) {
				if imp.Category != "entertainment" {
					t.Errorf("Category = %q, want %q", imp.Category, "entertainment")
				}
			},
		},
		{
			name: "liability with interest rate and min payment",
			dto: scenarioImpactV2DTO{
				TargetType:        "liability",
				TargetID:          strPtr("liability-uuid"),
				TargetLiabilityID: strPtr("liability-uuid"),
				ImpactKind:        "start",
				Amount:            strAmount(15000),
				Currency:          "SGD",
				Cadence:           "monthly",
				StartDate:         "2025-06",
				Category:          strPtr("mortgage"),
				InterestRate:      &interestRate,
				MinimumPayment:    &minPayment,
			},
			checkImpact: func(t *testing.T, imp ScenarioImpact) {
				if imp.Category != "mortgage" {
					t.Errorf("Category = %q, want %q", imp.Category, "mortgage")
				}
				if imp.InterestRate == nil || *imp.InterestRate != interestRate {
					t.Errorf("InterestRate = %v, want %v", imp.InterestRate, interestRate)
				}
				if imp.MinimumPayment == nil || *imp.MinimumPayment != minPayment {
					t.Errorf("MinimumPayment = %v, want %v", imp.MinimumPayment, minPayment)
				}
			},
		},
		{
			name: "asset with growth rate",
			dto: scenarioImpactV2DTO{
				TargetType:    "asset",
				TargetID:      strPtr("asset-uuid"),
				TargetAssetID: strPtr("asset-uuid"),
				ImpactKind:    "start",
				Amount:        strAmount(500000),
				Currency:      "SGD",
				Cadence:       "one_time",
				StartDate:     "2025-06",
				Category:      strPtr("real_estate"),
				GrowthRate:    &growthRate,
			},
			checkImpact: func(t *testing.T, imp ScenarioImpact) {
				if imp.Category != "real_estate" {
					t.Errorf("Category = %q, want %q", imp.Category, "real_estate")
				}
				if imp.GrowthRate == nil || *imp.GrowthRate != growthRate {
					t.Errorf("GrowthRate = %v, want %v", imp.GrowthRate, growthRate)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			impact, err := buildImpactV2(tt.dto)
			if err != nil {
				t.Fatalf("buildImpactV2() error = %v", err)
			}
			tt.checkImpact(t, impact)
		})
	}
}

// TestToScenarioImpactV2DTO_RoundTrip tests that impacts can be converted
// to DTOs and back without losing information. This is critical for updates.
func TestToScenarioImpactV2DTO_RoundTrip(t *testing.T) {
	interestRate := 8.5
	minPayment := int64(150)
	growthRate := 4.0

	original := ScenarioImpact{
		EventID:           "event-123",
		ImpactKind:        "start",
		Amount:            decAmount(25000),
		Cadence:           "monthly",
		TargetLiabilityID: strPtr("liability-789"),
		Name:              "Home Loan",
		Currency:          "SGD",
		Category:          "mortgage",
		InterestRate:      &interestRate,
		MinimumPayment:    &minPayment,
		GrowthRate:        &growthRate,
	}

	// Convert to DTO
	dto := toScenarioImpactV2DTO(original)

	// Verify DTO fields
	if dto.ImpactKind != "start" {
		t.Errorf("DTO ImpactKind = %q, want %q", dto.ImpactKind, "start")
	}
	if dto.Amount == nil || *dto.Amount != "25000" {
		t.Errorf("DTO Amount = %v, want %q", dto.Amount, "25000")
	}
	if dto.TargetType != "liability" {
		t.Errorf("DTO TargetType = %q, want %q", dto.TargetType, "liability")
	}
	if dto.TargetLiabilityID == nil || *dto.TargetLiabilityID != "liability-789" {
		t.Errorf("DTO TargetLiabilityID = %v, want liability-789", dto.TargetLiabilityID)
	}
	if dto.Category == nil || *dto.Category != "mortgage" {
		t.Errorf("DTO Category = %v, want mortgage", dto.Category)
	}
	if dto.InterestRate == nil || *dto.InterestRate != interestRate {
		t.Errorf("DTO InterestRate = %v, want %v", dto.InterestRate, interestRate)
	}
	if dto.MinimumPayment == nil || *dto.MinimumPayment != minPayment {
		t.Errorf("DTO MinimumPayment = %v, want %v", dto.MinimumPayment, minPayment)
	}

	// Now build impact from DTO (simulating an update request)
	rebuilt, err := buildImpactV2(dto)
	if err != nil {
		t.Fatalf("buildImpactV2() error = %v", err)
	}

	// Verify rebuilt impact preserves key fields
	if rebuilt.ImpactKind != original.ImpactKind {
		t.Errorf("Rebuilt ImpactKind = %q, want %q", rebuilt.ImpactKind, original.ImpactKind)
	}
	if rebuilt.Amount == nil || original.Amount == nil || rebuilt.Amount.Cmp(original.Amount) != 0 {
		t.Errorf("Rebuilt Amount = %v, want %v", rebuilt.Amount, original.Amount)
	}
	if rebuilt.TargetLiabilityID == nil || *rebuilt.TargetLiabilityID != *original.TargetLiabilityID {
		t.Errorf("Rebuilt TargetLiabilityID = %v, want %v", rebuilt.TargetLiabilityID, original.TargetLiabilityID)
	}
	if rebuilt.Category != original.Category {
		t.Errorf("Rebuilt Category = %q, want %q", rebuilt.Category, original.Category)
	}
	if rebuilt.InterestRate == nil || *rebuilt.InterestRate != *original.InterestRate {
		t.Errorf("Rebuilt InterestRate = %v, want %v", rebuilt.InterestRate, original.InterestRate)
	}
	if rebuilt.MinimumPayment == nil || *rebuilt.MinimumPayment != *original.MinimumPayment {
		t.Errorf("Rebuilt MinimumPayment = %v, want %v", rebuilt.MinimumPayment, original.MinimumPayment)
	}
}

// TestBuildScenarioEventV2_UpdateWithImpacts tests that buildScenarioEventV2
// correctly builds an event with impacts for update operations.
func TestBuildScenarioEventV2_UpdateWithImpacts(t *testing.T) {
	userID := "user-123"

	dto := scenarioEventV2DTO{
		ID:           "event-456",
		Name:         "Updated Career Change",
		Description:  strPtr("Updated description"),
		OccursOn:     "2025-07-01",
		DisplayIcon:  "briefcase",
		DisplayColor: "#10b981",
		Tags:         []string{"career", "income"},
		IsIncluded:   true,
		Impacts: []scenarioImpactV2DTO{
			{
				TargetType:     "income",
				TargetID:       strPtr("income-uuid-1"),
				TargetIncomeID: strPtr("income-uuid-1"),
				ImpactKind:     "start",
				Amount:         strAmount(8000),
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-07",
				Category:       strPtr("salary"),
				GrowthRate:     floatPtr(3.0),
				GrowthStrategy: strPtr("annual_step"),
			},
			{
				TargetType:      "expense",
				TargetID:        strPtr("expense-uuid-2"),
				TargetExpenseID: strPtr("expense-uuid-2"),
				ImpactKind:      "stop",
				Amount:          strAmount(0),
				Currency:        "SGD",
				Cadence:         "monthly",
				StartDate:       "2025-07",
			},
		},
	}

	event, err := buildScenarioEventV2(userID, dto)
	if err != nil {
		t.Fatalf("buildScenarioEventV2() error = %v", err)
	}

	// Verify event metadata
	if event.Name != "Updated Career Change" {
		t.Errorf("Event Name = %q, want %q", event.Name, "Updated Career Change")
	}
	if event.UserID != userID {
		t.Errorf("Event UserID = %q, want %q", event.UserID, userID)
	}

	// Verify impacts count
	if len(event.Impacts) != 2 {
		t.Fatalf("Event has %d impacts, want 2", len(event.Impacts))
	}

	// Verify first impact (start income)
	if event.Impacts[0].ImpactKind != "start" {
		t.Errorf("Impact[0] ImpactKind = %q, want %q", event.Impacts[0].ImpactKind, "start")
	}
	if event.Impacts[0].TargetIncomeID == nil || *event.Impacts[0].TargetIncomeID != "income-uuid-1" {
		t.Errorf("Impact[0] TargetIncomeID = %v, want income-uuid-1", event.Impacts[0].TargetIncomeID)
	}
	if event.Impacts[0].Amount == nil || event.Impacts[0].Amount.Cmp(decAmount(8000)) != 0 {
		t.Errorf("Impact[0] Amount = %v, want 8000", event.Impacts[0].Amount)
	}

	// Verify second impact (stop expense)
	if event.Impacts[1].ImpactKind != "stop" {
		t.Errorf("Impact[1] ImpactKind = %q, want %q", event.Impacts[1].ImpactKind, "stop")
	}
	if event.Impacts[1].TargetExpenseID == nil || *event.Impacts[1].TargetExpenseID != "expense-uuid-2" {
		t.Errorf("Impact[1] TargetExpenseID = %v, want expense-uuid-2", event.Impacts[1].TargetExpenseID)
	}
}

// TestBuildImpactV2_AllImpactKinds tests that all impact kinds can be built
// during an update operation.
func TestBuildImpactV2_AllImpactKinds(t *testing.T) {
	tests := []struct {
		name       string
		impactKind string
		amount     int64
		wantKind   string
	}{
		{
			name:       "delta impact",
			impactKind: "delta",
			amount:     500,
			wantKind:   "delta",
		},
		{
			name:       "override impact",
			impactKind: "override",
			amount:     3000,
			wantKind:   "override",
		},
		{
			name:       "start impact",
			impactKind: "start",
			amount:     10000,
			wantKind:   "start",
		},
		{
			name:       "stop impact",
			impactKind: "stop",
			amount:     0,
			wantKind:   "stop",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dto := scenarioImpactV2DTO{
				TargetType:      "expense",
				TargetID:        strPtr("expense-uuid"),
				TargetExpenseID: strPtr("expense-uuid"),
				ImpactKind:      tt.impactKind,
				Amount:          strAmount(tt.amount),
				Currency:        "SGD",
				Cadence:         "monthly",
				StartDate:       "2025-06",
			}

			impact, err := buildImpactV2(dto)
			if err != nil {
				t.Fatalf("buildImpactV2() error = %v", err)
			}

			if impact.ImpactKind != tt.wantKind {
				t.Errorf("ImpactKind = %q, want %q", impact.ImpactKind, tt.wantKind)
			}
			if impact.Amount == nil || impact.Amount.Cmp(decAmount(tt.amount)) != 0 {
				t.Errorf("Amount = %v, want %v", impact.Amount, tt.amount)
			}
		})
	}
}

func strPtr(s string) *string {
	return &s
}

func floatPtr(f float64) *float64 {
	return &f
}

func int64Ptr(i int64) *int64 {
	return &i
}
