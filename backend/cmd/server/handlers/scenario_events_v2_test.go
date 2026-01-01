package handlers

import (
	"strconv"
	"testing"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
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

// TestBuildImpactV2_StartImpact_NoParentIDRequired ensures that start impacts
// do NOT require a parentId - they create new items, not modify existing ones.
func TestBuildImpactV2_StartImpact_NoParentIDRequired(t *testing.T) {
	tests := []struct {
		name       string
		dto        scenarioImpactV2DTO
		wantErr    bool
		errContains string
	}{
		{
			name: "start impact without parentId succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: "expense",
				// No ParentID - start impacts create new items
				Amount:    strAmount(50000),
				Currency:  "SGD",
				Cadence:   "one_time",
				StartDate: "2025-06",
				Name:      strPtr("Wedding Expenses"),
			},
			wantErr: false,
		},
		{
			name: "start impact with parentId should fail",
			dto: scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: "expense",
				ParentID:   strPtr("some-parent-id"), // Start impacts should NOT have parentId
				Amount:     strAmount(50000),
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
			},
			wantErr:     true,
			errContains: "start impacts should not have parentId (they create new items)",
		},
		{
			name: "start impact for income succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: "income",
				Amount:     strAmount(8000),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
				Name:       strPtr("New Job Salary"),
				PersonID:   strPtr("person-uuid-123"), // Required for income start impacts
			},
			wantErr: false,
		},
		{
			name: "start impact for asset succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: "asset",
				Amount:     strAmount(450000),
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
				Name:       strPtr("BTO Flat"),
			},
			wantErr: false,
		},
		{
			name: "start impact for liability succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind:     "start",
				TargetType:     "liability",
				Amount:         strAmount(350000),
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				Name:           strPtr("HDB Loan"),
				InterestRate:   floatPtr(2.6),
				MinimumPayment: int64Ptr(1500),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			impact, err := buildImpactV2(tt.dto)

			if tt.wantErr {
				if err == nil {
					t.Errorf("buildImpactV2() error = nil, want error containing %q", tt.errContains)
					return
				}
				if tt.errContains != "" && err.Error() != tt.errContains {
					t.Errorf("buildImpactV2() error = %q, want %q", err.Error(), tt.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("buildImpactV2() error = %v, want nil", err)
				return
			}

			// Verify the impact has targetType set correctly
			targetType := impact.TargetType()
			if targetType != tt.dto.TargetType {
				t.Errorf("buildImpactV2() TargetType = %q, want %q", targetType, tt.dto.TargetType)
			}
		})
	}
}

// TestBuildImpactV2_DeltaOverrideStop_RequireParentID ensures that
// delta, override, and stop impacts require a parentId to reference the existing item.
func TestBuildImpactV2_DeltaOverrideStop_RequireParentID(t *testing.T) {
	tests := []struct {
		name        string
		dto         scenarioImpactV2DTO
		wantErr     bool
		errContains string
	}{
		{
			name: "delta impact with valid parentId succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "delta",
				TargetType: "income",
				ParentID:   strPtr("income-uuid-123"),
				Amount:     strAmount(2000),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
			},
			wantErr: false,
		},
		{
			name: "delta impact without parentId fails",
			dto: scenarioImpactV2DTO{
				ImpactKind: "delta",
				TargetType: "income",
				// No ParentID
				Amount:    strAmount(2000),
				Currency:  "SGD",
				Cadence:   "monthly",
				StartDate: "2025-06",
			},
			wantErr:     true,
			errContains: "parentId is required for delta/override/stop impacts",
		},
		{
			name: "override impact with valid parentId succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "override",
				TargetType: "income",
				ParentID:   strPtr("income-uuid-456"),
				Amount:     strAmount(2000),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
			},
			wantErr: false,
		},
		{
			name: "override impact without parentId fails",
			dto: scenarioImpactV2DTO{
				ImpactKind: "override",
				TargetType: "income",
				Amount:     strAmount(2000),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
			},
			wantErr:     true,
			errContains: "parentId is required for delta/override/stop impacts",
		},
		{
			name: "stop impact with valid parentId succeeds",
			dto: scenarioImpactV2DTO{
				ImpactKind: "stop",
				TargetType: "expense",
				ParentID:   strPtr("expense-uuid-789"),
				Amount:     strAmount(0),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
			},
			wantErr: false,
		},
		{
			name: "stop impact without parentId fails",
			dto: scenarioImpactV2DTO{
				ImpactKind: "stop",
				TargetType: "expense",
				Amount:     strAmount(0),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
			},
			wantErr:     true,
			errContains: "parentId is required for delta/override/stop impacts",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			impact, err := buildImpactV2(tt.dto)

			if tt.wantErr {
				if err == nil {
					t.Errorf("buildImpactV2() error = nil, want error containing %q", tt.errContains)
					return
				}
				if tt.errContains != "" && err.Error() != tt.errContains {
					t.Errorf("buildImpactV2() error = %q, want %q", err.Error(), tt.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("buildImpactV2() error = %v, want nil", err)
				return
			}

			// Verify the impact has targetId (parentId) set correctly
			targetID := impact.TargetID()
			if targetID == nil || *targetID != *tt.dto.ParentID {
				t.Errorf("buildImpactV2() TargetID = %v, want %v", targetID, tt.dto.ParentID)
			}
		})
	}
}

// TestBuildImpactV2_LiabilityStartImpact_WithInterestRateAndMinPayment tests that
// liability start impacts correctly pass through interestRate and minimumPayment fields.
func TestBuildImpactV2_LiabilityStartImpact_WithInterestRateAndMinPayment(t *testing.T) {
	interestRate := 5.5
	minPayment := int64(500)

	dto := scenarioImpactV2DTO{
		ImpactKind:     "start",
		TargetType:     "liability",
		Amount:         strAmount(10000),
		Currency:       "SGD",
		Cadence:        "monthly",
		StartDate:      "2025-06",
		Name:           strPtr("Car Loan"),
		Category:       strPtr("debt"),
		InterestRate:   &interestRate,
		MinimumPayment: &minPayment,
	}

	impact, err := buildImpactV2(dto)
	if err != nil {
		t.Fatalf("buildImpactV2() error = %v, want nil", err)
	}

	// Verify target type
	if impact.TargetType() != "liability" {
		t.Errorf("buildImpactV2() TargetType = %v, want liability", impact.TargetType())
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

	// Verify parentId is set from TargetLiabilityID
	if dto.ParentID == nil || *dto.ParentID != "liability-456" {
		t.Errorf("toScenarioImpactV2DTO() ParentID = %v, want liability-456", dto.ParentID)
	}
}

// TestBuildImpactsV2FromDTO_ValidatesDuplicateParentIDs tests that
// multiple impacts targeting the same parent are rejected.
func TestBuildImpactsV2FromDTO_ValidatesDuplicateParentIDs(t *testing.T) {
	tests := []struct {
		name       string
		dtos       []scenarioImpactV2DTO
		wantCount  int
		wantErr    bool
		errMessage string
	}{
		{
			name: "multiple start impacts allowed (no parentId)",
			dtos: []scenarioImpactV2DTO{
				{
					ImpactKind: "start",
					TargetType: "expense",
					Amount:     strAmount(50000),
					Currency:   "SGD",
					Cadence:    "one_time",
					StartDate:  "2025-06",
					Name:       strPtr("Wedding"),
				},
				{
					ImpactKind: "start",
					TargetType: "expense",
					Amount:     strAmount(30000),
					Currency:   "SGD",
					Cadence:    "one_time",
					StartDate:  "2025-06",
					Name:       strPtr("Honeymoon"),
				},
			},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "reject duplicate parentIds in same event",
			dtos: []scenarioImpactV2DTO{
				{
					ImpactKind: "delta",
					TargetType: "expense",
					ParentID:   strPtr("expense-uuid-same"),
					Amount:     strAmount(100),
					Currency:   "SGD",
					Cadence:    "monthly",
					StartDate:  "2025-06",
				},
				{
					ImpactKind: "override",
					TargetType: "expense",
					ParentID:   strPtr("expense-uuid-same"), // Duplicate parent
					Amount:     strAmount(200),
					Currency:   "SGD",
					Cadence:    "monthly",
					StartDate:  "2025-06",
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

// TestBuildImpactV2_AdvancedFields tests that advanced fields are correctly passed through.
func TestBuildImpactV2_AdvancedFields(t *testing.T) {
	growthRate := 5.0

	tests := []struct {
		name        string
		dto         scenarioImpactV2DTO
		checkImpact func(t *testing.T, imp ScenarioImpact)
	}{
		{
			name: "income with growth rate and strategy",
			dto: scenarioImpactV2DTO{
				ImpactKind:     "start",
				TargetType:     "income",
				Amount:         strAmount(5000),
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-06",
				Name:           strPtr("Salary"),
				Category:       strPtr("salary"),
				GrowthRate:     &growthRate,
				GrowthStrategy: strPtr("annual_step"),
				PersonID:       strPtr("person-uuid-123"), // Required for income start impacts
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
				ImpactKind: "start",
				TargetType: "expense",
				Amount:     strAmount(3000),
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
				Name:       strPtr("Entertainment"),
				Category:   strPtr("entertainment"),
			},
			checkImpact: func(t *testing.T, imp ScenarioImpact) {
				if imp.Category != "entertainment" {
					t.Errorf("Category = %q, want %q", imp.Category, "entertainment")
				}
			},
		},
		{
			name: "asset with growth rate",
			dto: scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: "asset",
				Amount:     strAmount(500000),
				Currency:   "SGD",
				Cadence:    "one_time",
				StartDate:  "2025-06",
				Name:       strPtr("Property"),
				Category:   strPtr("real_estate"),
				GrowthRate: &growthRate,
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
// to DTOs and back without losing information.
func TestToScenarioImpactV2DTO_RoundTrip(t *testing.T) {
	interestRate := 8.5
	minPayment := int64(150)
	growthRate := 4.0

	original := ScenarioImpact{
		EventID:           "event-123",
		ImpactKind:        "delta",
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
	if dto.ImpactKind != "delta" {
		t.Errorf("DTO ImpactKind = %q, want %q", dto.ImpactKind, "delta")
	}
	if dto.Amount == nil || *dto.Amount != "25000" {
		t.Errorf("DTO Amount = %v, want %q", dto.Amount, "25000")
	}
	if dto.TargetType != "liability" {
		t.Errorf("DTO TargetType = %q, want %q", dto.TargetType, "liability")
	}
	if dto.ParentID == nil || *dto.ParentID != "liability-789" {
		t.Errorf("DTO ParentID = %v, want liability-789", dto.ParentID)
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

// TestBuildScenarioEventV2_WithMixedImpacts tests that buildScenarioEventV2
// correctly builds an event with both start and non-start impacts.
func TestBuildScenarioEventV2_WithMixedImpacts(t *testing.T) {
	userID := "user-123"

	dto := scenarioEventV2DTO{
		ID:           "event-456",
		Name:         "Career Change",
		Description:  strPtr("New job with higher salary"),
		OccursOn:     "2025-07-01",
		DisplayIcon:  "briefcase",
		DisplayColor: "#10b981",
		Tags:         []string{"career", "income"},
		IsIncluded:   true,
		Impacts: []scenarioImpactV2DTO{
			{
				ImpactKind:     "start",
				TargetType:     "income",
				Amount:         strAmount(8000),
				Currency:       "SGD",
				Cadence:        "monthly",
				StartDate:      "2025-07",
				Name:           strPtr("New Job Salary"),
				Category:       strPtr("salary"),
				GrowthRate:     floatPtr(3.0),
				GrowthStrategy: strPtr("annual_step"),
				PersonID:       strPtr("person-uuid-123"), // Required for income start impacts
			},
			{
				ImpactKind: "stop",
				TargetType: "expense",
				ParentID:   strPtr("expense-uuid-commute"),
				Amount:     strAmount(0),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-07",
			},
		},
	}

	event, err := buildScenarioEventV2(userID, dto)
	if err != nil {
		t.Fatalf("buildScenarioEventV2() error = %v", err)
	}

	// Verify event metadata
	if event.Name != "Career Change" {
		t.Errorf("Event Name = %q, want %q", event.Name, "Career Change")
	}
	if event.UserID != userID {
		t.Errorf("Event UserID = %q, want %q", event.UserID, userID)
	}

	// Verify impacts count
	if len(event.Impacts) != 2 {
		t.Fatalf("Event has %d impacts, want 2", len(event.Impacts))
	}

	// Verify first impact (start income - should have empty string for targetId marker)
	if event.Impacts[0].ImpactKind != "start" {
		t.Errorf("Impact[0] ImpactKind = %q, want %q", event.Impacts[0].ImpactKind, "start")
	}
	if event.Impacts[0].TargetType() != "income" {
		t.Errorf("Impact[0] TargetType = %q, want %q", event.Impacts[0].TargetType(), "income")
	}
	if event.Impacts[0].Amount == nil || event.Impacts[0].Amount.Cmp(decAmount(8000)) != 0 {
		t.Errorf("Impact[0] Amount = %v, want 8000", event.Impacts[0].Amount)
	}

	// Verify second impact (stop expense - should have parentId)
	if event.Impacts[1].ImpactKind != "stop" {
		t.Errorf("Impact[1] ImpactKind = %q, want %q", event.Impacts[1].ImpactKind, "stop")
	}
	if event.Impacts[1].TargetExpenseID == nil || *event.Impacts[1].TargetExpenseID != "expense-uuid-commute" {
		t.Errorf("Impact[1] TargetExpenseID = %v, want expense-uuid-commute", event.Impacts[1].TargetExpenseID)
	}
}

// TestBuildImpactV2_TargetTypeValidation tests that invalid target types are rejected.
func TestBuildImpactV2_TargetTypeValidation(t *testing.T) {
	tests := []struct {
		name       string
		targetType string
		wantErr    bool
	}{
		{"valid asset", "asset", false},
		{"valid liability", "liability", false},
		{"valid income", "income", false},
		{"valid expense", "expense", false},
		{"valid cash", "cash", false},
		{"valid investment", "investment", false},
		{"invalid type", "invalid", true},
		{"empty type", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dto := scenarioImpactV2DTO{
				ImpactKind: "start",
				TargetType: tt.targetType,
				Amount:     strAmount(1000),
				Currency:   "SGD",
				Cadence:    "monthly",
				StartDate:  "2025-06",
				Name:       strPtr("Test Item"),
			}

			// Income start impacts require PersonID
			if tt.targetType == "income" {
				dto.PersonID = strPtr("person-uuid-123")
			}

			_, err := buildImpactV2(dto)

			if tt.wantErr && err == nil {
				t.Errorf("buildImpactV2() error = nil, want error")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("buildImpactV2() error = %v, want nil", err)
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
