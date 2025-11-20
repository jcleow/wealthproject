package financial

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Client handles financial operations
type Client struct {
	// In a real implementation, this would connect to a financial data service
	// For now, we'll simulate operations
}

// NewClient creates a new financial client
func NewClient() *Client {
	return &Client{}
}

// CreateAsset creates a new financial asset
func (c *Client) CreateAsset(ctx context.Context, params map[string]interface{}) (*string, error) {
	// Validate required parameters
	name, ok := params["name"].(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("asset name is required")
	}

	assetType, ok := params["assetType"].(string)
	if !ok || assetType == "" {
		return nil, fmt.Errorf("asset type is required")
	}

	currentValue, ok := getNumericValue(params["currentValue"])
	if !ok || currentValue < 0 {
		return nil, fmt.Errorf("valid current value is required")
	}

	// Simulate asset creation
	assetID := uuid.New().String()

	// Log the operation
	fmt.Printf("Created asset: ID=%s, Name=%s, Type=%s, Value=%.2f\n",
		assetID, name, assetType, currentValue)

	// In a real implementation, this would:
	// 1. Validate all parameters
	// 2. Create the asset in the database
	// 3. Trigger any necessary calculations
	// 4. Return the created asset ID

	return &assetID, nil
}

// UpdateAsset updates an existing financial asset
func (c *Client) UpdateAsset(ctx context.Context, params map[string]interface{}) (*string, error) {
	// Get asset ID from params or use last asset ID
	assetID := ""
	if id, ok := params["assetId"].(string); ok {
		assetID = id
	} else if id, ok := params["lastAssetId"].(string); ok {
		assetID = id
	} else {
		return nil, fmt.Errorf("asset ID is required")
	}

	// Log the operation
	fmt.Printf("Updated asset: ID=%s\n", assetID)

	// In a real implementation, this would:
	// 1. Validate the asset exists
	// 2. Update only the provided fields
	// 3. Recalculate any affected metrics
	// 4. Return the updated asset ID

	return &assetID, nil
}

// CreateLiability creates a new financial liability
func (c *Client) CreateLiability(ctx context.Context, params map[string]interface{}) (*string, error) {
	// Validate required parameters
	name, ok := params["name"].(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("liability name is required")
	}

	liabilityType, ok := params["liabilityType"].(string)
	if !ok || liabilityType == "" {
		return nil, fmt.Errorf("liability type is required")
	}

	principalAmount, ok := getNumericValue(params["principalAmount"])
	if !ok || principalAmount < 0 {
		return nil, fmt.Errorf("valid principal amount is required")
	}

	// Simulate liability creation
	liabilityID := uuid.New().String()

	// Log the operation
	fmt.Printf("Created liability: ID=%s, Name=%s, Type=%s, Principal=%.2f\n",
		liabilityID, name, liabilityType, principalAmount)

	// In a real implementation, this would:
	// 1. Validate all parameters including interest rates, terms, etc.
	// 2. Create the liability in the database
	// 3. Calculate payment schedules if applicable
	// 4. Return the created liability ID

	return &liabilityID, nil
}

// UpdateLiability updates an existing financial liability
func (c *Client) UpdateLiability(ctx context.Context, params map[string]interface{}) (*string, error) {
	// Get liability ID from params or use last liability ID
	liabilityID := ""
	if id, ok := params["liabilityId"].(string); ok {
		liabilityID = id
	} else if id, ok := params["lastLiabilityId"].(string); ok {
		liabilityID = id
	} else {
		return nil, fmt.Errorf("liability ID is required")
	}

	// Log the operation
	fmt.Printf("Updated liability: ID=%s\n", liabilityID)

	// In a real implementation, this would:
	// 1. Validate the liability exists
	// 2. Update only the provided fields
	// 3. Recalculate payment schedules if needed
	// 4. Return the updated liability ID

	return &liabilityID, nil
}

// CreatePropertyScenario creates a property investment scenario
func (c *Client) CreatePropertyScenario(ctx context.Context, params map[string]interface{}) (*string, error) {
	// Validate required parameters
	propertyName, ok := params["propertyName"].(string)
	if !ok || propertyName == "" {
		return nil, fmt.Errorf("property name is required")
	}

	purchasePrice, ok := getNumericValue(params["purchasePrice"])
	if !ok || purchasePrice <= 0 {
		return nil, fmt.Errorf("valid purchase price is required")
	}

	// Get optional parameters with defaults
	downPaymentPercent, _ := getNumericValue(params["downPaymentPercent"])
	if downPaymentPercent == 0 {
		downPaymentPercent = 20 // Default 20% down payment
	}

	// Simulate scenario creation
	scenarioID := uuid.New().String()

	// Calculate derived values
	downPayment := purchasePrice * (downPaymentPercent / 100)
	loanAmount := purchasePrice - downPayment

	// Log the operation
	fmt.Printf("Created property scenario: ID=%s, Property=%s, Price=%.2f, Down=%.2f, Loan=%.2f\n",
		scenarioID, propertyName, purchasePrice, downPayment, loanAmount)

	// In a real implementation, this would:
	// 1. Create both the asset (property) and liability (mortgage)
	// 2. Link them together in a scenario
	// 3. Calculate all financial implications (MSR, TDSR, etc.)
	// 4. Return the scenario ID

	return &scenarioID, nil
}

// CalculateNetWorth calculates the current net worth
func (c *Client) CalculateNetWorth(ctx context.Context, userID string) (float64, error) {
	// In a real implementation, this would:
	// 1. Sum all asset values
	// 2. Sum all liability balances
	// 3. Return assets - liabilities

	// Simulated calculation
	return 500000.00, nil
}

// GetFinancialSummary retrieves a financial summary for a user
func (c *Client) GetFinancialSummary(ctx context.Context, userID string) (map[string]interface{}, error) {
	// Simulated summary
	summary := map[string]interface{}{
		"net_worth":         500000.00,
		"total_assets":      750000.00,
		"total_liabilities": 250000.00,
		"monthly_income":    8000.00,
		"monthly_expenses":  5000.00,
		"savings_rate":      0.375,
		"last_updated":      time.Now().Format(time.RFC3339),
	}

	return summary, nil
}

// RollbackAction performs a best-effort rollback for a previously executed action.
// In this simulated client we simply log the rollback attempt.
func (c *Client) RollbackAction(ctx context.Context, toolName string, entityID *string, params map[string]interface{}) error {
	if entityID == nil {
		return nil
	}

	fmt.Printf("Rolling back %s for entity %s\n", toolName, *entityID)
	return nil
}

// ValidateFinancialConstraints validates financial constraints like MSR and TDSR
func (c *Client) ValidateFinancialConstraints(ctx context.Context, params map[string]interface{}) ([]ValidationResult, error) {
	var results []ValidationResult

	// Simulate MSR check (Mortgage Servicing Ratio - 30% of income)
	if monthlyPayment, ok := getNumericValue(params["monthlyPayment"]); ok {
		if monthlyIncome, ok := getNumericValue(params["monthlyIncome"]); ok && monthlyIncome > 0 {
			msr := monthlyPayment / monthlyIncome
			results = append(results, ValidationResult{
				Type:    "MSR",
				Value:   msr,
				Limit:   0.30,
				Passed:  msr <= 0.30,
				Message: fmt.Sprintf("MSR is %.1f%% (limit: 30%%)", msr*100),
			})
		}
	}

	// Simulate TDSR check (Total Debt Servicing Ratio - 55% of income)
	if totalDebtPayments, ok := getNumericValue(params["totalDebtPayments"]); ok {
		if monthlyIncome, ok := getNumericValue(params["monthlyIncome"]); ok && monthlyIncome > 0 {
			tdsr := totalDebtPayments / monthlyIncome
			results = append(results, ValidationResult{
				Type:    "TDSR",
				Value:   tdsr,
				Limit:   0.55,
				Passed:  tdsr <= 0.55,
				Message: fmt.Sprintf("TDSR is %.1f%% (limit: 55%%)", tdsr*100),
			})
		}
	}

	return results, nil
}

// ValidationResult represents a financial constraint validation result
type ValidationResult struct {
	Type    string  `json:"type"`
	Value   float64 `json:"value"`
	Limit   float64 `json:"limit"`
	Passed  bool    `json:"passed"`
	Message string  `json:"message"`
}

// Helper function to extract numeric values from interface{}
func getNumericValue(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	default:
		return 0, false
	}
}
