package financial

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// Client handles financial operations backed by repository storage.
type Client struct {
	store *repository.Store
}

// NewClient creates a new financial client
func NewClient(store *repository.Store) *Client {
	return &Client{store: store}
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

	created, err := c.store.CreateAsset(ctx, repository.Asset{
		Name:             params.Name,
		Category:         params.Category,
		CurrentValue:     params.CurrentValue,
		AnnualGrowthRate: derefFloat(params.AnnualGrowthRate),
		Notes:            params.Notes,
	})
	if err != nil {
		return nil, err
	}
	return &created.ID, nil
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

	current, err := c.store.GetAsset(ctx, assetID)
	if err != nil {
		return nil, err
	}

	if params.Name != "" {
		current.Name = params.Name
	}
	if params.CurrentValue != nil {
		current.CurrentValue = *params.CurrentValue
	}
	if params.AnnualGrowthRate != nil {
		current.AnnualGrowthRate = *params.AnnualGrowthRate
	}
	if params.Notes != "" {
		current.Notes = params.Notes
	}

	updated, err := c.store.UpdateAsset(ctx, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
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

	created, err := c.store.CreateLiability(ctx, repository.Liability{
		Name:            params.Name,
		Category:        params.Category,
		CurrentBalance:  params.CurrentBalance,
		InterestRateAPR: params.InterestRate,
		MinimumPayment:  derefFloat(params.MonthlyPayment),
		Notes:           params.Notes,
	})
	if err != nil {
		return nil, err
	}
	return &created.ID, nil
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

	current, err := c.store.GetLiability(ctx, liabilityID)
	if err != nil {
		return nil, err
	}

	if params.Name != "" {
		current.Name = params.Name
	}
	if params.CurrentBalance != nil {
		current.CurrentBalance = *params.CurrentBalance
	}
	if params.InterestRate != nil {
		current.InterestRateAPR = *params.InterestRate
	}
	if params.MonthlyPayment != nil {
		current.MinimumPayment = *params.MonthlyPayment
	}
	if params.Notes != "" {
		current.Notes = params.Notes
	}

	updated, err := c.store.UpdateLiability(ctx, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
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

	headline := params.Name
	if headline == "" {
		headline = "Property Scenario"
	}
	subheadline := fmt.Sprintf("%s | %.0f price, %.0f down, %.0f loan @ %.2f%%", params.PropertyType, params.PropertyPrice, params.DownPayment, params.LoanAmount, params.InterestRate*100)
	created, err := c.store.CreatePropertyScenario(ctx, repository.PropertyScenario{
		PropertyType:  params.PropertyType,
		Headline:      headline,
		Subheadline:   subheadline,
		LastRefreshed: time.Now().Format(time.RFC3339),
		PropertyPrice: params.PropertyPrice,
		DownPayment:   params.DownPayment,
		LoanAmount:    params.LoanAmount,
		InterestRate:  params.InterestRate,
		LoanTenure:    params.LoanTenure,
		Notes:         params.Notes,
		Amortization:  map[string]interface{}{},
		Snapshot:      map[string]interface{}{},
		Timeline:      map[string]interface{}{},
		Milestones:    map[string]interface{}{},
		Insights:      map[string]interface{}{},
	})
	if err != nil {
		return nil, err
	}

	return &created.ID, nil
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
	if entityID == nil || c.store == nil {
		return nil
	}

	switch toolName {
	case "createAsset":
		return c.store.DeleteAsset(ctx, *entityID)
	case "createLiability":
		return c.store.DeleteLiability(ctx, *entityID)
	case "createPropertyScenario":
		return c.store.DeletePropertyScenario(ctx, *entityID)
	default:
		return nil
	}
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

func derefFloat(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}
