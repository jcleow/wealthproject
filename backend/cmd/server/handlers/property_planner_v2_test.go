package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockPropertyPlannerStore implements the minimum interface needed for testing
type mockPropertyPlannerStore struct {
	scenarios map[string]*repo.PropertyScenarioFull
	userID    string
}

func newMockPropertyPlannerStore() *mockPropertyPlannerStore {
	return &mockPropertyPlannerStore{
		scenarios: make(map[string]*repo.PropertyScenarioFull),
	}
}

// TestConvertCreateRequest tests the conversion of API request to repository input
func TestPropertyPlannerV2_ConvertCreateRequest(t *testing.T) {
	handler := NewPropertyPlannerV2Handler(nil) // Store not needed for conversion

	tests := []struct {
		name    string
		req     createScenarioRequest
		wantErr bool
	}{
		{
			name: "valid SG scenario with all fields",
			req: createScenarioRequest{
				Country: "SG",
				SGDetails: &createSGDetailsRequest{
					Name:             "Test HDB",
					PropertyType:     "hdb",
					PropertySubtype:  "resale",
					PropertyPrice:    "850000",
					LoanType:         "bank",
					BorrowerType:     "single",
					DownpaymentCpfOa: "100000",
					DownpaymentCash:  "70000",
					OtherDebt:        "500",
					Grants:           "0",
				},
				Fees: []createFeeRequest{
					{
						FeeContext: "purchase",
						FeeType:    "legal",
						Amount:     "3000",
						Currency:   "SGD",
						Frequency:  "one_time",
					},
				},
				GrowthPeriods: []createGrowthPeriodRequest{
					{
						StartYear:      2025,
						EndYear:        intPtr(2030),
						GrowthRate:     "3",
						GrowthStrategy: "annual_step",
					},
				},
				RatePeriods: []createRatePeriodRequest{
					{
						StartMonth:   "2025-01",
						TermYears:    25,
						FixedYears:   2,
						FixedRate:    "2.6",
						FloatingRate: "3.5",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "invalid decimal in property price",
			req: createScenarioRequest{
				Country: "SG",
				SGDetails: &createSGDetailsRequest{
					Name:          "Bad Price",
					PropertyType:  "hdb",
					PropertyPrice: "not-a-number",
					LoanType:      "hdb",
					BorrowerType:  "single",
				},
				RatePeriods: []createRatePeriodRequest{
					{
						StartMonth:   "2025-01",
						TermYears:    25,
						FixedRate:    "2.6",
						FloatingRate: "3.5",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "invalid decimal in fee amount",
			req: createScenarioRequest{
				Country: "SG",
				SGDetails: &createSGDetailsRequest{
					Name:          "Bad Fee",
					PropertyType:  "hdb",
					PropertyPrice: "800000",
					LoanType:      "hdb",
					BorrowerType:  "single",
				},
				Fees: []createFeeRequest{
					{
						FeeContext: "purchase",
						FeeType:    "legal",
						Amount:     "invalid",
						Currency:   "SGD",
						Frequency:  "one_time",
					},
				},
				RatePeriods: []createRatePeriodRequest{
					{
						StartMonth:   "2025-01",
						TermYears:    25,
						FixedRate:    "2.6",
						FloatingRate: "3.5",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "invalid decimal in growth rate",
			req: createScenarioRequest{
				Country: "SG",
				SGDetails: &createSGDetailsRequest{
					Name:          "Bad Growth",
					PropertyType:  "hdb",
					PropertyPrice: "800000",
					LoanType:      "hdb",
					BorrowerType:  "single",
				},
				GrowthPeriods: []createGrowthPeriodRequest{
					{
						StartYear:      2025,
						GrowthRate:     "abc",
						GrowthStrategy: "fixed",
					},
				},
				RatePeriods: []createRatePeriodRequest{
					{
						StartMonth:   "2025-01",
						TermYears:    25,
						FixedRate:    "2.6",
						FloatingRate: "3.5",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "invalid decimal in fixed rate",
			req: createScenarioRequest{
				Country: "SG",
				SGDetails: &createSGDetailsRequest{
					Name:          "Bad Rate",
					PropertyType:  "hdb",
					PropertyPrice: "800000",
					LoanType:      "hdb",
					BorrowerType:  "single",
				},
				RatePeriods: []createRatePeriodRequest{
					{
						StartMonth:   "2025-01",
						TermYears:    25,
						FixedRate:    "bad",
						FloatingRate: "3.5",
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := handler.convertCreateRequest(tt.req)

			if tt.wantErr {
				assert.Error(t, err, "convertCreateRequest should return error")
			} else {
				require.NoError(t, err, "convertCreateRequest should not return error")
				assert.Equal(t, tt.req.Country, result.Country)
				if tt.req.SGDetails != nil {
					assert.Equal(t, tt.req.SGDetails.Name, result.SGDetails.Name)
				}
			}
		})
	}
}

// TestComputeValues tests the computed values calculation
func TestPropertyPlannerV2_ComputeValues(t *testing.T) {
	handler := NewPropertyPlannerV2Handler(nil)

	tests := []struct {
		name           string
		scenario       *repo.PropertyScenarioFull
		expectComputed bool
		checkMonthly   bool
		checkBSD       bool
	}{
		{
			name: "standard HDB scenario",
			scenario: &repo.PropertyScenarioFull{
				SGDetails: &repo.PropertySGDetails{
					PropertyPrice:    *decimal.MustFromString("850000"),
					DownpaymentCpfOa: *decimal.MustFromString("100000"),
					DownpaymentCash:  *decimal.MustFromString("70000"),
					Grants:           *decimal.Zero(),
					Residency:        "singapore_citizen",
					PropertyCount:    0,
				},
				RatePeriods: []repo.LiabilityRatePeriod{
					{
						TermYears:    25,
						FixedYears:   2,
						FixedRate:    *decimal.MustFromString("2.6"),
						FloatingRate: *decimal.MustFromString("3.5"),
					},
				},
			},
			expectComputed: true,
			checkMonthly:   true,
			checkBSD:       true,
		},
		{
			name: "no SG details returns nil",
			scenario: &repo.PropertyScenarioFull{
				SGDetails:   nil,
				RatePeriods: []repo.LiabilityRatePeriod{},
			},
			expectComputed: false,
		},
		{
			name: "no rate periods returns nil",
			scenario: &repo.PropertyScenarioFull{
				SGDetails: &repo.PropertySGDetails{
					PropertyPrice: *decimal.MustFromString("850000"),
				},
				RatePeriods: []repo.LiabilityRatePeriod{},
			},
			expectComputed: false,
		},
		{
			name: "condo for PR has ABSD",
			scenario: &repo.PropertyScenarioFull{
				SGDetails: &repo.PropertySGDetails{
					PropertyPrice:    *decimal.MustFromString("1500000"),
					DownpaymentCpfOa: *decimal.MustFromString("200000"),
					DownpaymentCash:  *decimal.MustFromString("175000"),
					Grants:           *decimal.Zero(),
					Residency:        "permanent_resident",
					PropertyCount:    0, // First property
				},
				RatePeriods: []repo.LiabilityRatePeriod{
					{
						TermYears:    30,
						FixedYears:   3,
						FixedRate:    *decimal.MustFromString("3"),
						FloatingRate: *decimal.MustFromString("4"),
					},
				},
			},
			expectComputed: true,
			checkBSD:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.computeValues(tt.scenario)

			if !tt.expectComputed {
				assert.Nil(t, result, "computeValues should return nil")
				return
			}

			require.NotNil(t, result, "computeValues should return result")

			// Basic sanity checks
			assert.NotEmpty(t, result.LoanAmount, "LoanAmount should be set")
			assert.NotEmpty(t, result.MonthlyPayment, "MonthlyPayment should be set")
			assert.NotEmpty(t, result.TotalInterest, "TotalInterest should be set")
			assert.NotEmpty(t, result.TotalAmountPaid, "TotalAmountPaid should be set")
			assert.NotEmpty(t, result.BsdAmount, "BsdAmount should be set")
			assert.NotEmpty(t, result.TotalStampDuty, "TotalStampDuty should be set")
			assert.NotEmpty(t, result.TotalUpfrontCash, "TotalUpfrontCash should be set")

			if tt.checkMonthly {
				// Monthly payment should be reasonable (not zero, not negative)
				monthlyPayment, err := decimal.NewFromString(result.MonthlyPayment)
				require.NoError(t, err)
				assert.True(t, monthlyPayment.Cmp(decimal.Zero()) > 0, "MonthlyPayment should be positive")
			}

			if tt.checkBSD {
				// BSD should be positive for any property
				bsd, err := decimal.NewFromString(result.BsdAmount)
				require.NoError(t, err)
				assert.True(t, bsd.Cmp(decimal.Zero()) > 0, "BSD should be positive")
			}
		})
	}
}

// TestHandleCreate_ValidationErrors tests validation errors in the create handler
func TestPropertyPlannerV2_HandleCreate_ValidationErrors(t *testing.T) {
	// Can't test with nil store, but we can test request validation
	// This tests the JSON parsing and early validation
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "invalid JSON",
			body:       `{invalid json`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing ratePeriods",
			body:       `{"country":"SG","sgDetails":{"name":"Test","propertyType":"hdb","propertyPrice":"800000","loanType":"hdb","borrowerType":"single"}}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing sgDetails",
			body:       `{"country":"SG","ratePeriods":[{"startMonth":"2025-01","termYears":25,"fixedRate":"2.6","floatingRate":"3.5"}]}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock handler - the store won't be called for validation errors
			handler := NewPropertyPlannerV2Handler(nil)

			req := httptest.NewRequest(http.MethodPost, "/api/v2/property-planner/scenarios", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			// Add a mock user ID to context using middleware helper
			ctx := middleware.WithUserContext(req.Context(), middleware.UserContext{UserID: "test-user"})
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			handler.HandleCreate(rr, req)

			assert.Equal(t, tt.wantStatus, rr.Code, "Response status should match")
		})
	}
}

// TestScenarioResponse_JSONSerialization tests that responses serialize correctly
func TestPropertyPlannerV2_ScenarioResponse_JSONSerialization(t *testing.T) {
	response := scenarioResponse{
		Scenario: repo.PropertyScenario{
			ID:     "test-id-123",
			UserID: "user-456",
		},
		SGDetails: &repo.PropertySGDetails{
			ID:           "sg-details-789",
			Name:         "Test HDB",
			PropertyType: "hdb",
			Residency:    "singapore_citizen",
		},
		Fees:          []repo.PropertyFee{},
		GrowthPeriods: []repo.GrowthPeriod{},
		RatePeriods:   []repo.LiabilityRatePeriod{},
		Computed: &computedValues{
			LoanAmount:       "680000",
			MonthlyPayment:   "3084.95",
			TotalInterest:    "245485.79",
			TotalAmountPaid:  "925485.79",
			BsdAmount:        "20100.00",
			AbsdAmount:       "0",
			TotalStampDuty:   "20100.00",
			TotalUpfrontCash: "90100.00",
		},
	}

	jsonBytes, err := json.Marshal(response)
	require.NoError(t, err, "JSON marshaling should succeed")

	// Verify key fields are present
	var parsed map[string]interface{}
	err = json.Unmarshal(jsonBytes, &parsed)
	require.NoError(t, err)

	assert.Contains(t, parsed, "scenario")
	assert.Contains(t, parsed, "sgDetails")
	assert.Contains(t, parsed, "computed")

	computed := parsed["computed"].(map[string]interface{})
	assert.Equal(t, "680000", computed["loanAmount"])
	assert.Equal(t, "3084.95", computed["monthlyPayment"])
	assert.Equal(t, "20100.00", computed["bsdAmount"])
}

// TestCreateScenarioRequest_Parsing tests request parsing
func TestPropertyPlannerV2_CreateScenarioRequest_Parsing(t *testing.T) {
	jsonStr := `{
		"country": "SG",
		"sgDetails": {
			"name": "My HDB",
			"propertyType": "hdb",
			"propertySubtype": "resale",
			"propertyPrice": "850000",
			"loanType": "bank",
			"borrowerType": "single",
			"downpaymentCpfOa": "100000",
			"downpaymentCash": "70000",
			"otherDebt": "0",
			"grants": "0"
		},
		"fees": [
			{
				"feeContext": "purchase",
				"feeType": "legal",
				"amount": "3000",
				"currency": "SGD",
				"frequency": "one_time"
			}
		],
		"growthPeriods": [
			{
				"startYear": 2025,
				"endYear": 2030,
				"growthRate": "3",
				"growthStrategy": "annual_step"
			}
		],
		"ratePeriods": [
			{
				"startMonth": "2025-01",
				"termYears": 25,
				"fixedYears": 2,
				"fixedRate": "2.6",
				"floatingRate": "3.5"
			}
		]
	}`

	var req createScenarioRequest
	err := json.Unmarshal([]byte(jsonStr), &req)
	require.NoError(t, err, "JSON parsing should succeed")

	assert.Equal(t, "SG", req.Country)
	assert.NotNil(t, req.SGDetails)
	assert.Equal(t, "My HDB", req.SGDetails.Name)
	assert.Equal(t, "850000", req.SGDetails.PropertyPrice)
	assert.Len(t, req.Fees, 1)
	assert.Equal(t, "legal", req.Fees[0].FeeType)
	assert.Len(t, req.GrowthPeriods, 1)
	assert.Equal(t, 2025, req.GrowthPeriods[0].StartYear)
	assert.Len(t, req.RatePeriods, 1)
	assert.Equal(t, 25, req.RatePeriods[0].TermYears)
}

// Helper functions
func intPtr(i int) *int {
	return &i
}
