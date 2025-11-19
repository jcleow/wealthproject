package financial

import (
	"encoding/json"
	"testing"

	"financial-chat-system/backend/internal/llm"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockFinancialClient for testing the preview service
type MockFinancialClient struct {
	mock.Mock
}

func (m *MockFinancialClient) CreateAsset(params map[string]interface{}) (*AssetResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*AssetResult), args.Error(1)
}

func (m *MockFinancialClient) UpdateAsset(assetID string, params map[string]interface{}) (*AssetResult, error) {
	args := m.Called(assetID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*AssetResult), args.Error(1)
}

func (m *MockFinancialClient) CreateLiability(params map[string]interface{}) (*LiabilityResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LiabilityResult), args.Error(1)
}

func (m *MockFinancialClient) UpdateLiability(liabilityID string, params map[string]interface{}) (*LiabilityResult, error) {
	args := m.Called(liabilityID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LiabilityResult), args.Error(1)
}

func (m *MockFinancialClient) CreatePropertyScenario(params map[string]interface{}) (*PropertyScenarioResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*PropertyScenarioResult), args.Error(1)
}

func setupPreviewServiceTest() (*ActionPreviewService, *MockFinancialClient) {
	mockClient := &MockFinancialClient{}
	service := &ActionPreviewService{
		client:     mockClient,
		calculator: NewFinancialCalculator(),
		validator:  NewParameterValidator(),
	}
	return service, mockClient
}

func TestActionPreviewService_GeneratePreview_CreateAsset(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCall := llm.ToolCall{
		ID:   "call_test123",
		Type: "function",
		Function: llm.FunctionCall{
			Name: "createAsset",
			Arguments: `{
				"name": "Emergency Fund",
				"category": "cash_savings",
				"currentValue": 25000,
				"annualGrowthRate": 0.02,
				"notes": "High-yield savings account for emergencies"
			}`,
		},
	}

	previews, err := service.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, previews, 1)

	preview := previews[0]

	// Verify basic properties
	assert.Equal(t, "call_test123", preview.CallID)
	assert.Equal(t, "createAsset", preview.ToolName)
	assert.Contains(t, preview.FriendlyDescription, "Emergency Fund")
	assert.Contains(t, preview.FriendlyDescription, "$25,000")

	// Verify parameters
	assert.Equal(t, "Emergency Fund", preview.Parameters["name"])
	assert.Equal(t, "cash_savings", preview.Parameters["category"])
	assert.Equal(t, 25000.0, preview.Parameters["currentValue"])

	// Verify impact estimate
	require.NotNil(t, preview.EstimatedImpact)
	assert.Equal(t, 25000.0, preview.EstimatedImpact.NetWorthChange)
	assert.Contains(t, preview.EstimatedImpact.Description, "increase")

	// Verify no warnings for valid asset
	assert.Empty(t, preview.Warnings)
}

func TestActionPreviewService_GeneratePreview_CreateLiability(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCall := llm.ToolCall{
		ID:   "call_test456",
		Type: "function",
		Function: llm.FunctionCall{
			Name: "createLiability",
			Arguments: `{
				"name": "Car Loan",
				"category": "car_loan",
				"currentBalance": 35000,
				"interestRate": 0.045,
				"monthlyPayment": 650,
				"maturityDate": "2028-12-01",
				"notes": "Honda Civic loan from bank"
			}`,
		},
	}

	previews, err := service.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, previews, 1)

	preview := previews[0]

	// Verify basic properties
	assert.Equal(t, "call_test456", preview.CallID)
	assert.Equal(t, "createLiability", preview.ToolName)
	assert.Contains(t, preview.FriendlyDescription, "Car Loan")
	assert.Contains(t, preview.FriendlyDescription, "$35,000")

	// Verify impact estimate (negative for liabilities)
	require.NotNil(t, preview.EstimatedImpact)
	assert.Equal(t, -35000.0, preview.EstimatedImpact.NetWorthChange)
	assert.Contains(t, preview.EstimatedImpact.Description, "decrease")

	// Should include monthly cost information
	require.NotNil(t, preview.EstimatedImpact.MonthlyChange)
	assert.Equal(t, -650.0, *preview.EstimatedImpact.MonthlyChange)
}

func TestActionPreviewService_GeneratePreview_HighInterestWarning(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	// High-interest credit card debt
	toolCall := llm.ToolCall{
		ID:   "call_warning",
		Type: "function",
		Function: llm.FunctionCall{
			Name: "createLiability",
			Arguments: `{
				"name": "Credit Card Debt",
				"category": "credit_card",
				"currentBalance": 15000,
				"interestRate": 0.24,
				"monthlyPayment": 300
			}`,
		},
	}

	previews, err := service.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, previews, 1)

	preview := previews[0]

	// Should have warning for high interest rate
	assert.NotEmpty(t, preview.Warnings)

	highInterestWarning := false
	for _, warning := range preview.Warnings {
		if warning.Type == "high_interest_rate" {
			highInterestWarning = true
			assert.Contains(t, warning.Message, "24%")
			assert.Equal(t, "high", warning.Severity)
			break
		}
	}
	assert.True(t, highInterestWarning, "Should have high interest rate warning")
}

func TestActionPreviewService_GeneratePreview_PropertyScenario(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCall := llm.ToolCall{
		ID:   "call_property",
		Type: "function",
		Function: llm.FunctionCall{
			Name: "createPropertyScenario",
			Arguments: `{
				"propertyPrice": 800000,
				"downPayment": 160000,
				"loanAmount": 640000,
				"interestRate": 0.035,
				"loanTenure": 25,
				"propertyType": "condo_resale",
				"name": "2BR Condo in CBD"
			}`,
		},
	}

	previews, err := service.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, previews, 1)

	preview := previews[0]

	// Verify basic properties
	assert.Equal(t, "call_property", preview.CallID)
	assert.Equal(t, "createPropertyScenario", preview.ToolName)
	assert.Contains(t, preview.FriendlyDescription, "2BR Condo")
	assert.Contains(t, preview.FriendlyDescription, "$800,000")

	// Verify impact includes both asset and liability effects
	require.NotNil(t, preview.EstimatedImpact)
	// Net effect: +800k asset - 640k loan = +160k net worth (down payment)
	assert.Equal(t, 160000.0, preview.EstimatedImpact.NetWorthChange)

	// Should include monthly payment information
	require.NotNil(t, preview.EstimatedImpact.MonthlyChange)
	assert.Less(t, *preview.EstimatedImpact.MonthlyChange, 0.0) // Monthly mortgage payment
}

func TestActionPreviewService_GeneratePreview_UpdateAsset(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCall := llm.ToolCall{
		ID:   "call_update",
		Type: "function",
		Function: llm.FunctionCall{
			Name: "updateAsset",
			Arguments: `{
				"assetId": "existing_asset_123",
				"currentValue": 30000,
				"notes": "Updated value after market gains"
			}`,
		},
	}

	previews, err := service.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, previews, 1)

	preview := previews[0]

	// Verify basic properties
	assert.Equal(t, "call_update", preview.CallID)
	assert.Equal(t, "updateAsset", preview.ToolName)
	assert.Contains(t, preview.FriendlyDescription, "Update")
	assert.Contains(t, preview.FriendlyDescription, "$30,000")

	// Update operations show net change, but we can't calculate without original value
	// So impact might be nil or show the new value
	require.NotNil(t, preview.EstimatedImpact)
	assert.Contains(t, preview.EstimatedImpact.Description, "update")
}

func TestActionPreviewService_GeneratePreview_MultipleActions(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCalls := []llm.ToolCall{
		{
			ID:   "call_asset",
			Type: "function",
			Function: llm.FunctionCall{
				Name: "createAsset",
				Arguments: `{
					"name": "Investment Portfolio",
					"category": "stocks_portfolio",
					"currentValue": 50000
				}`,
			},
		},
		{
			ID:   "call_liability",
			Type: "function",
			Function: llm.FunctionCall{
				Name: "createLiability",
				Arguments: `{
					"name": "Personal Loan",
					"category": "personal_loan",
					"currentBalance": 20000,
					"interestRate": 0.08,
					"monthlyPayment": 500
				}`,
			},
		},
	}

	previews, err := service.GeneratePreview(toolCalls)
	require.NoError(t, err)
	require.Len(t, previews, 2)

	// Verify both actions are processed
	assetPreview := previews[0]
	liabilityPreview := previews[1]

	assert.Equal(t, "call_asset", assetPreview.CallID)
	assert.Equal(t, "createAsset", assetPreview.ToolName)
	assert.Equal(t, 50000.0, assetPreview.EstimatedImpact.NetWorthChange)

	assert.Equal(t, "call_liability", liabilityPreview.CallID)
	assert.Equal(t, "createLiability", liabilityPreview.ToolName)
	assert.Equal(t, -20000.0, liabilityPreview.EstimatedImpact.NetWorthChange)

	// Check for dependencies (none in this case)
	assert.Empty(t, assetPreview.Dependencies)
	assert.Empty(t, liabilityPreview.Dependencies)
}

func TestActionPreviewService_GeneratePreview_InvalidArguments(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	tests := []struct {
		name        string
		toolCall    llm.ToolCall
		expectError bool
		errorMsg    string
	}{
		{
			name: "invalid JSON arguments",
			toolCall: llm.ToolCall{
				ID:   "call_invalid",
				Type: "function",
				Function: llm.FunctionCall{
					Name:      "createAsset",
					Arguments: `{"name": "Test", "invalid_json}`, // Malformed JSON
				},
			},
			expectError: true,
			errorMsg:    "invalid arguments",
		},
		{
			name: "unsupported tool",
			toolCall: llm.ToolCall{
				ID:   "call_unsupported",
				Type: "function",
				Function: llm.FunctionCall{
					Name:      "unsupportedTool",
					Arguments: `{"param": "value"}`,
				},
			},
			expectError: true,
			errorMsg:    "unsupported tool",
		},
		{
			name: "missing required parameters",
			toolCall: llm.ToolCall{
				ID:   "call_missing",
				Type: "function",
				Function: llm.FunctionCall{
					Name:      "createAsset",
					Arguments: `{"name": "Test Asset"}`, // Missing required currentValue
				},
			},
			expectError: true,
			errorMsg:    "missing required parameter",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			previews, err := service.GeneratePreview([]llm.ToolCall{tt.toolCall})

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, previews)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, previews)
			}
		})
	}
}

func TestActionPreviewService_ValidateActionParameters(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	tests := []struct {
		name        string
		toolCall    llm.ToolCall
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid asset parameters",
			toolCall: llm.ToolCall{
				Function: llm.FunctionCall{
					Name: "createAsset",
					Arguments: `{
						"name": "Valid Asset",
						"category": "cash_savings",
						"currentValue": 10000
					}`,
				},
			},
			expectError: false,
		},
		{
			name: "negative asset value",
			toolCall: llm.ToolCall{
				Function: llm.FunctionCall{
					Name: "createAsset",
					Arguments: `{
						"name": "Invalid Asset",
						"category": "cash_savings",
						"currentValue": -5000
					}`,
				},
			},
			expectError: true,
			errorMsg:    "current value cannot be negative",
		},
		{
			name: "invalid interest rate",
			toolCall: llm.ToolCall{
				Function: llm.FunctionCall{
					Name: "createLiability",
					Arguments: `{
						"name": "Invalid Loan",
						"category": "personal_loan",
						"currentBalance": 10000,
						"interestRate": 1.5
					}`,
				},
			},
			expectError: true,
			errorMsg:    "interest rate cannot exceed 100%",
		},
		{
			name: "property scenario validation",
			toolCall: llm.ToolCall{
				Function: llm.FunctionCall{
					Name: "createPropertyScenario",
					Arguments: `{
						"propertyPrice": 500000,
						"downPayment": 100000,
						"loanAmount": 500000,
						"interestRate": 0.03,
						"loanTenure": 25,
						"propertyType": "hdb_resale"
					}`,
				},
			},
			expectError: true,
			errorMsg:    "loan amount plus down payment exceeds property price",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateActionParameters(tt.toolCall)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestActionPreviewService_EstimateImpact_AssetCalculations(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	tests := []struct {
		name                string
		arguments          string
		expectedNetWorth   float64
		expectedMonthly    *float64
		expectError        bool
	}{
		{
			name: "simple cash asset",
			arguments: `{
				"name": "Savings",
				"category": "cash_savings",
				"currentValue": 15000
			}`,
			expectedNetWorth: 15000,
			expectedMonthly:  nil, // Cash doesn't generate monthly income
		},
		{
			name: "investment with growth",
			arguments: `{
				"name": "Stock Portfolio",
				"category": "stocks_portfolio",
				"currentValue": 100000,
				"annualGrowthRate": 0.07
			}`,
			expectedNetWorth: 100000,
			// Monthly growth: 100000 * 0.07 / 12 = ~583.33
			expectedMonthly: func() *float64 { v := 583.33; return &v }(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			toolCall := llm.ToolCall{
				Function: llm.FunctionCall{
					Name:      "createAsset",
					Arguments: tt.arguments,
				},
			}

			impact, err := service.EstimateImpact(toolCall)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, impact)
			} else {
				require.NoError(t, err)
				require.NotNil(t, impact)

				assert.Equal(t, tt.expectedNetWorth, impact.NetWorthChange)

				if tt.expectedMonthly != nil {
					require.NotNil(t, impact.MonthlyChange)
					assert.InDelta(t, *tt.expectedMonthly, *impact.MonthlyChange, 1.0) // Allow 1.0 tolerance
				} else {
					assert.Nil(t, impact.MonthlyChange)
				}
			}
		})
	}
}

func TestActionPreviewService_EstimateImpact_LiabilityCalculations(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	toolCall := llm.ToolCall{
		Function: llm.FunctionCall{
			Name: "createLiability",
			Arguments: `{
				"name": "Car Loan",
				"category": "car_loan",
				"currentBalance": 25000,
				"interestRate": 0.05,
				"monthlyPayment": 450
			}`,
		},
	}

	impact, err := service.EstimateImpact(toolCall)
	require.NoError(t, err)
	require.NotNil(t, impact)

	// Liability decreases net worth
	assert.Equal(t, -25000.0, impact.NetWorthChange)

	// Monthly payment decreases cash flow
	require.NotNil(t, impact.MonthlyChange)
	assert.Equal(t, -450.0, *impact.MonthlyChange)

	assert.Contains(t, impact.Description, "decrease")
	assert.Contains(t, impact.Description, "Car Loan")
}

func TestActionPreviewService_GenerateFriendlyDescription(t *testing.T) {
	service, _ := setupPreviewServiceTest()

	tests := []struct {
		name        string
		toolName    string
		params      map[string]interface{}
		expectedMsg string
	}{
		{
			name:     "create asset description",
			toolName: "createAsset",
			params: map[string]interface{}{
				"name":         "Emergency Fund",
				"category":     "cash_savings",
				"currentValue": 20000.0,
			},
			expectedMsg: "Create a new cash savings asset 'Emergency Fund' worth $20,000",
		},
		{
			name:     "create liability description",
			toolName: "createLiability",
			params: map[string]interface{}{
				"name":           "Home Loan",
				"category":       "mortgage",
				"currentBalance": 450000.0,
				"monthlyPayment": 2500.0,
			},
			expectedMsg: "Create a new mortgage liability 'Home Loan' with $450,000 balance and $2,500 monthly payment",
		},
		{
			name:     "property scenario description",
			toolName: "createPropertyScenario",
			params: map[string]interface{}{
				"name":          "Downtown Condo",
				"propertyPrice": 750000.0,
				"downPayment":   150000.0,
				"loanAmount":    600000.0,
			},
			expectedMsg: "Analyze property scenario 'Downtown Condo' - $750,000 purchase with $150,000 down payment",
		},
		{
			name:     "update asset description",
			toolName: "updateAsset",
			params: map[string]interface{}{
				"assetId":      "asset_123",
				"currentValue": 35000.0,
			},
			expectedMsg: "Update existing asset to $35,000 value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			description := service.generateFriendlyDescription(tt.toolName, tt.params)
			assert.Contains(t, description, tt.expectedMsg)
		})
	}
}