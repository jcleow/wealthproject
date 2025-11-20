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
func (c *Client) CreateAsset(ctx context.Context, params AssetParams) (*string, error) {
	if params.Name == "" {
		return nil, fmt.Errorf("asset name is required")
	}
	if params.Category == "" {
		return nil, fmt.Errorf("asset category is required")
	}
	if params.CurrentValue <= 0 {
		return nil, fmt.Errorf("valid current value is required")
	}

	assetID := uuid.New().String()

	fmt.Printf("Created asset: ID=%s, Name=%s, Category=%s, Value=%.2f\n",
		assetID, params.Name, params.Category, params.CurrentValue)

	return &assetID, nil
}

// UpdateAsset updates an existing financial asset
func (c *Client) UpdateAsset(ctx context.Context, params UpdateAssetParams) (*string, error) {
	assetID := params.AssetID
	if assetID == "" {
		assetID = params.LastAssetID
	}
	if assetID == "" {
		return nil, fmt.Errorf("asset ID is required")
	}

	fmt.Printf("Updated asset: ID=%s\n", assetID)
	return &assetID, nil
}

// CreateLiability creates a new financial liability
func (c *Client) CreateLiability(ctx context.Context, params LiabilityParams) (*string, error) {
	if params.Name == "" {
		return nil, fmt.Errorf("liability name is required")
	}
	if params.Category == "" {
		return nil, fmt.Errorf("liability category is required")
	}
	if params.CurrentBalance <= 0 {
		return nil, fmt.Errorf("valid current balance is required")
	}
	if params.InterestRate < 0 {
		return nil, fmt.Errorf("valid interest rate is required")
	}

	liabilityID := uuid.New().String()

	fmt.Printf("Created liability: ID=%s, Name=%s, Category=%s, Balance=%.2f, Rate=%.4f\n",
		liabilityID, params.Name, params.Category, params.CurrentBalance, params.InterestRate)

	return &liabilityID, nil
}

// UpdateLiability updates an existing financial liability
func (c *Client) UpdateLiability(ctx context.Context, params UpdateLiabilityParams) (*string, error) {
	liabilityID := params.LiabilityID
	if liabilityID == "" {
		liabilityID = params.LastLiabilityID
	}
	if liabilityID == "" {
		return nil, fmt.Errorf("liability ID is required")
	}

	fmt.Printf("Updated liability: ID=%s\n", liabilityID)
	return &liabilityID, nil
}

// CreatePropertyScenario creates a property investment scenario
func (c *Client) CreatePropertyScenario(ctx context.Context, params PropertyScenarioParams) (*string, error) {
	if params.PropertyPrice <= 0 {
		return nil, fmt.Errorf("property price must be greater than 0")
	}
	if params.DownPayment < 0 {
		return nil, fmt.Errorf("down payment must be zero or positive")
	}
	if params.LoanAmount <= 0 {
		return nil, fmt.Errorf("loan amount must be greater than 0")
	}
	if params.InterestRate <= 0 {
		return nil, fmt.Errorf("interest rate must be greater than 0")
	}
	if params.LoanTenure <= 0 {
		return nil, fmt.Errorf("loan tenure must be greater than 0")
	}
	if params.PropertyType == "" {
		return nil, fmt.Errorf("property type is required")
	}

	// Ensure the loan aligns with the price/down payment
	expectedLoan := params.PropertyPrice - params.DownPayment
	if expectedLoan > 0 && abs(expectedLoan-params.LoanAmount) > 1000 {
		return nil, fmt.Errorf("loan amount does not match property price minus down payment")
	}

	scenarioID := uuid.New().String()

	fmt.Printf(
		"Created property scenario: ID=%s, Name=%s, Price=%.2f, Down=%.2f, Loan=%.2f, Rate=%.3f, Tenure=%dy, Type=%s\n",
		scenarioID,
		params.Name,
		params.PropertyPrice,
		params.DownPayment,
		params.LoanAmount,
		params.InterestRate,
		params.LoanTenure,
		params.PropertyType,
	)

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
func (c *Client) RollbackAction(ctx context.Context, toolName string, entityID *string) error {
	if entityID == nil {
		return nil
	}

	fmt.Printf("Rolling back %s for entity %s\n", toolName, *entityID)
	return nil
}

// ValidateFinancialConstraints validates financial constraints like MSR and TDSR
func (c *Client) ValidateFinancialConstraints(ctx context.Context, params FinancialConstraintParams) ([]ValidationResult, error) {
	var results []ValidationResult

	if params.MonthlyIncome > 0 && params.MonthlyPayment > 0 {
		msr := params.MonthlyPayment / params.MonthlyIncome
		results = append(results, ValidationResult{
			Type:    "MSR",
			Value:   msr,
			Limit:   0.30,
			Passed:  msr <= 0.30,
			Message: fmt.Sprintf("MSR is %.1f%% (limit: 30%%)", msr*100),
		})
	}

	if params.MonthlyIncome > 0 && params.TotalDebtPayments > 0 {
		tdsr := params.TotalDebtPayments / params.MonthlyIncome
		results = append(results, ValidationResult{
			Type:    "TDSR",
			Value:   tdsr,
			Limit:   0.55,
			Passed:  tdsr <= 0.55,
			Message: fmt.Sprintf("TDSR is %.1f%% (limit: 55%%)", tdsr*100),
		})
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

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
