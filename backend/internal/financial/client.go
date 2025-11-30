package financial

import (
	"context"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/middleware"
)

// Client handles financial operations backed by repository storage.
type Client struct {
	store *repository.Store
}

// NewClient creates a new financial client
func NewClient(store *repository.Store) *Client {
	return &Client{store: store}
}

// getUserIDFromContext extracts userID from context
func getUserIDFromContext(ctx context.Context) string {
	return middleware.GetUserContext(ctx).UserID
}

// CreateAsset creates a new financial asset
func (c *Client) CreateAsset(ctx context.Context, params AssetParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	if params.Name == "" {
		return nil, fmt.Errorf("asset name is required")
	}
	if params.Category == "" {
		return nil, fmt.Errorf("asset category is required")
	}
	if params.CurrentValue <= 0 {
		return nil, fmt.Errorf("valid current value is required")
	}

	created, err := c.store.CreateAsset(ctx, userID, repository.Asset{
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
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	assetID, err := c.resolveAssetID(ctx, userID, params.AssetID, params.LastAssetID, params.AssetName, params.Name)
	if err != nil {
		return nil, err
	}

	current, err := c.store.GetAsset(ctx, userID, assetID)
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

	updated, err := c.store.UpdateAsset(ctx, userID, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
}

// DeleteAsset deletes an existing financial asset
func (c *Client) DeleteAsset(ctx context.Context, params DeleteAssetParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	assetID, err := c.resolveAssetID(ctx, userID, params.AssetID, params.LastAssetID, params.AssetName, "")
	if err != nil {
		return nil, err
	}

	if err := c.store.DeleteAsset(ctx, userID, assetID); err != nil {
		return nil, err
	}
	return &assetID, nil
}

// CreateLiability creates a new financial liability
func (c *Client) CreateLiability(ctx context.Context, params LiabilityParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
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

	created, err := c.store.CreateLiability(ctx, userID, repository.Liability{
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
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	liabilityID, err := c.resolveLiabilityID(ctx, userID, params.LiabilityID, params.LastLiabilityID, params.LiabilityName, params.Name)
	if err != nil {
		return nil, err
	}

	current, err := c.store.GetLiability(ctx, userID, liabilityID)
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

	updated, err := c.store.UpdateLiability(ctx, userID, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
}

// DeleteLiability deletes an existing financial liability
func (c *Client) DeleteLiability(ctx context.Context, params DeleteLiabilityParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	liabilityID, err := c.resolveLiabilityID(ctx, userID, params.LiabilityID, params.LastLiabilityID, params.LiabilityName, "")
	if err != nil {
		return nil, err
	}

	if err := c.store.DeleteLiability(ctx, userID, liabilityID); err != nil {
		return nil, err
	}
	return &liabilityID, nil
}

// CreateIncome creates a new income entry
func (c *Client) CreateIncome(ctx context.Context, params IncomeParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	if params.Source == "" {
		return nil, fmt.Errorf("income source is required")
	}
	if params.Amount <= 0 {
		return nil, fmt.Errorf("valid income amount is required")
	}
	if params.Frequency == "" {
		return nil, fmt.Errorf("income frequency is required")
	}

	var startDate *time.Time
	if params.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", params.StartDate)
		if err == nil {
			startDate = &parsed
		}
	}

	created, err := c.store.CreateIncome(ctx, userID, repository.Income{
		Source:    params.Source,
		Amount:    params.Amount,
		Frequency: params.Frequency,
		StartDate: startDate,
		Category:  params.Category,
		Notes:     params.Notes,
	})
	if err != nil {
		return nil, err
	}
	return &created.ID, nil
}

// UpdateIncome updates an existing income entry
func (c *Client) UpdateIncome(ctx context.Context, params UpdateIncomeParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	incomeID, err := c.resolveIncomeID(ctx, userID, params.IncomeID, params.LastIncomeID, params.IncomeName, params.Source)
	if err != nil {
		return nil, err
	}

	current, err := c.store.GetIncome(ctx, userID, incomeID)
	if err != nil {
		return nil, err
	}

	if params.Source != "" {
		current.Source = params.Source
	}
	if params.Amount != nil {
		current.Amount = *params.Amount
	}
	if params.Frequency != "" {
		current.Frequency = params.Frequency
	}
	if params.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", params.StartDate); err == nil {
			current.StartDate = &parsed
		}
	}
	if params.Category != "" {
		current.Category = params.Category
	}
	if params.Notes != "" {
		current.Notes = params.Notes
	}

	updated, err := c.store.UpdateIncome(ctx, userID, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
}

// DeleteIncome deletes an existing income
func (c *Client) DeleteIncome(ctx context.Context, params DeleteIncomeParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	incomeID, err := c.resolveIncomeID(ctx, userID, params.IncomeID, params.LastIncomeID, params.IncomeName, "")
	if err != nil {
		return nil, err
	}

	if err := c.store.DeleteIncome(ctx, userID, incomeID); err != nil {
		return nil, err
	}
	return &incomeID, nil
}

// CreateExpense creates a new expense entry
func (c *Client) CreateExpense(ctx context.Context, params ExpenseParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	if params.Payee == "" {
		return nil, fmt.Errorf("expense payee is required")
	}
	if params.Amount <= 0 {
		return nil, fmt.Errorf("valid expense amount is required")
	}
	if params.Frequency == "" {
		return nil, fmt.Errorf("expense frequency is required")
	}

	created, err := c.store.CreateExpense(ctx, userID, repository.Expense{
		Payee:     params.Payee,
		Amount:    params.Amount,
		Frequency: params.Frequency,
		Category:  params.Category,
		Notes:     params.Notes,
	})
	if err != nil {
		return nil, err
	}
	return &created.ID, nil
}

// UpdateExpense updates an existing expense entry
func (c *Client) UpdateExpense(ctx context.Context, params UpdateExpenseParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	expenseID, err := c.resolveExpenseID(ctx, userID, params.ExpenseID, params.LastExpenseID, params.ExpenseName, params.Payee)
	if err != nil {
		return nil, err
	}

	current, err := c.store.GetExpense(ctx, userID, expenseID)
	if err != nil {
		return nil, err
	}

	if params.Payee != "" {
		current.Payee = params.Payee
	}
	if params.Amount != nil {
		current.Amount = *params.Amount
	}
	if params.Frequency != "" {
		current.Frequency = params.Frequency
	}
	if params.Category != "" {
		current.Category = params.Category
	}
	if params.Notes != "" {
		current.Notes = params.Notes
	}

	updated, err := c.store.UpdateExpense(ctx, userID, current)
	if err != nil {
		return nil, err
	}
	return &updated.ID, nil
}

// DeleteExpense deletes an existing expense
func (c *Client) DeleteExpense(ctx context.Context, params DeleteExpenseParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	expenseID, err := c.resolveExpenseID(ctx, userID, params.ExpenseID, params.LastExpenseID, params.ExpenseName, "")
	if err != nil {
		return nil, err
	}

	if err := c.store.DeleteExpense(ctx, userID, expenseID); err != nil {
		return nil, err
	}
	return &expenseID, nil
}

func (c *Client) resolveAssetID(ctx context.Context, userID, explicit, last, byName, fallbackName string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if last != "" {
		return last, nil
	}
	name := strings.TrimSpace(byName)
	if name == "" {
		name = strings.TrimSpace(fallbackName)
	}
	if name == "" {
		return "", fmt.Errorf("asset ID is required")
	}

	assets, err := c.store.ListAllAssets(ctx, userID)
	if err != nil {
		return "", err
	}
	if id, suggestions := matchName(assets, name, func(a repository.Asset) (string, string) {
		return a.ID, a.Name
	}); id != "" {
		return id, nil
	} else if len(suggestions) > 0 {
		return "", fmt.Errorf("asset '%s' not found. Did you mean: %s?", name, strings.Join(suggestions, ", "))
	}
	return "", fmt.Errorf("asset '%s' not found. Please specify the exact asset name.", name)
}

func (c *Client) resolveLiabilityID(ctx context.Context, userID, explicit, last, byName, fallbackName string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if last != "" {
		return last, nil
	}
	name := strings.TrimSpace(byName)
	if name == "" {
		name = strings.TrimSpace(fallbackName)
	}
	if name == "" {
		return "", fmt.Errorf("liability ID is required")
	}

	liabilities, err := c.store.ListAllLiabilities(ctx, userID)
	if err != nil {
		return "", err
	}
	if id, suggestions := matchName(liabilities, name, func(l repository.Liability) (string, string) {
		return l.ID, l.Name
	}); id != "" {
		return id, nil
	} else if len(suggestions) > 0 {
		return "", fmt.Errorf("liability '%s' not found. Did you mean: %s?", name, strings.Join(suggestions, ", "))
	}
	return "", fmt.Errorf("liability '%s' not found. Please specify the exact liability name.", name)
}

func (c *Client) resolveIncomeID(ctx context.Context, userID, explicit, last, byName, fallbackName string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if last != "" {
		return last, nil
	}
	name := strings.TrimSpace(byName)
	if name == "" {
		name = strings.TrimSpace(fallbackName)
	}
	if name == "" {
		return "", fmt.Errorf("income ID is required")
	}

	incomes, err := c.store.ListAllIncomes(ctx, userID)
	if err != nil {
		return "", err
	}
	if id, suggestions := matchName(incomes, name, func(inc repository.Income) (string, string) {
		return inc.ID, inc.Source
	}); id != "" {
		return id, nil
	} else if len(suggestions) > 0 {
		return "", fmt.Errorf("income '%s' not found. Did you mean: %s?", name, strings.Join(suggestions, ", "))
	}
	return "", fmt.Errorf("income '%s' not found. Please specify the exact income name.", name)
}

func (c *Client) resolveExpenseID(ctx context.Context, userID, explicit, last, byName, fallbackName string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if last != "" {
		return last, nil
	}
	name := strings.TrimSpace(byName)
	if name == "" {
		name = strings.TrimSpace(fallbackName)
	}
	if name == "" {
		return "", fmt.Errorf("expense ID is required")
	}

	expenses, err := c.store.ListAllExpenses(ctx, userID)
	if err != nil {
		return "", err
	}
	if id, suggestions := matchName(expenses, name, func(ex repository.Expense) (string, string) {
		return ex.ID, ex.Payee
	}); id != "" {
		return id, nil
	} else if len(suggestions) > 0 {
		return "", fmt.Errorf("expense '%s' not found. Did you mean: %s?", name, strings.Join(suggestions, ", "))
	}
	return "", fmt.Errorf("expense '%s' not found. Please specify the exact expense name.", name)
}

// matchName attempts fuzzy matching by exact, contains, and prefix to tolerate slight name differences.
func matchName[T any](items []T, target string, get func(T) (string, string)) (string, []string) {
	normTarget := strings.ToLower(strings.TrimSpace(target))
	if normTarget == "" {
		return "", nil
	}

	type candidate struct {
		id    string
		score int
	}
	best := candidate{}

	for _, item := range items {
		id, name := get(item)
		normName := strings.ToLower(strings.TrimSpace(name))
		if normName == "" {
			continue
		}

		score := 0
		switch {
		case normName == normTarget:
			score = 3
		case strings.Contains(normName, normTarget) || strings.Contains(normTarget, normName):
			score = 2
		default:
			// prefix/close match heuristic
			if strings.HasPrefix(normName, normTarget) || strings.HasPrefix(normTarget, normName) {
				score = 1
			}
		}

		if score > best.score {
			best = candidate{id: id, score: score}
		}
	}

	suggestions := make([]string, 0, len(items))
	for _, item := range items {
		_, name := get(item)
		if name = strings.TrimSpace(name); name != "" {
			suggestions = append(suggestions, name)
		}
	}
	if best.score > 0 {
		return best.id, suggestions
	}
	return "", suggestions
}

// CreatePropertyScenario creates a property investment scenario
func (c *Client) CreatePropertyScenario(ctx context.Context, params PropertyScenarioParams) (*string, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("user context required")
	}
	if params.PropertyPrice <= 0 {
		return nil, fmt.Errorf("property price must be greater than 0")
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

	// If down payment missing, leave as-is (0) and allow optional; caller may fill.

	assetName := params.Name
	if strings.TrimSpace(assetName) == "" {
		assetName = "Property Asset"
	}
	liabilityName := params.Name
	if strings.TrimSpace(liabilityName) == "" {
		liabilityName = "Property Loan"
	} else {
		liabilityName = liabilityName + " Loan"
	}
	assetID, err := c.upsertPropertyAsset(ctx, userID, assetName, params.PropertyPrice)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert property asset: %w", err)
	}
	liabilityID, err := c.upsertPropertyLiability(ctx, userID, liabilityName, params.LoanAmount, params.InterestRate, params.LoanTenure)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert property liability: %w", err)
	}

	headline := params.Name
	if headline == "" {
		headline = "Property Scenario"
	}
	subheadline := fmt.Sprintf("%s | %.0f price, %.0f down, %.0f loan @ %.2f%%", params.PropertyType, params.PropertyPrice, params.DownPayment, params.LoanAmount, params.InterestRate*100)
	created, err := c.store.CreatePropertyScenario(ctx, userID, repository.PropertyScenario{
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

	_, _ = c.store.CreateOrReplacePropertyLink(ctx, userID, repository.PropertyLink{
		PropertyScenarioID: created.ID,
		AssetID:            assetID,
		LiabilityID:        liabilityID,
	})

	// Create linked mortgage expense (monthly) tied to liability in notes; ignore errors to keep main flow.
	if params.LoanAmount > 0 && params.InterestRate > 0 && params.LoanTenure > 0 {
		calculator := NewFinancialCalculator()
		monthly := calculator.CalculateMonthlyPayment(params.LoanAmount, params.InterestRate, params.LoanTenure)
		if monthly > 0 {
			_, _ = c.store.CreateExpense(ctx, userID, repository.Expense{
				Payee:     "Mortgage Payment",
				Amount:    monthly,
				Frequency: "monthly",
				Category:  "housing_mortgage",
				Notes:     fmt.Sprintf("liability:%s", liabilityID),
			})
		}
	}

	return &created.ID, nil
}

func (c *Client) upsertPropertyAsset(ctx context.Context, userID, name string, value float64) (string, error) {
	const category = "property"
	if a, err := c.store.GetAssetByNameAndCategory(ctx, userID, name, category); err == nil {
		return a.ID, nil
	}
	created, err := c.store.CreateAsset(ctx, userID, repository.Asset{
		Name:             name,
		Category:         category,
		CurrentValue:     value,
		AnnualGrowthRate: 0,
		Notes:            "",
	})
	if err != nil {
		return "", err
	}
	return created.ID, nil
}

func (c *Client) upsertPropertyLiability(ctx context.Context, userID, name string, balance float64, rate float64, tenureYears int) (string, error) {
	const category = "property"
	if li, err := c.store.GetLiabilityByNameAndCategory(ctx, userID, name, category); err == nil {
		return li.ID, nil
	}
	monthly := 0.0
	if tenureYears > 0 {
		months := float64(tenureYears * 12)
		if months > 0 {
			monthly = balance / months
		}
	}
	created, err := c.store.CreateLiability(ctx, userID, repository.Liability{
		Name:            name,
		Category:        category,
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  monthly,
		Notes:           "",
	})
	if err != nil {
		return "", err
	}
	return created.ID, nil
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
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return fmt.Errorf("user context required for rollback")
	}

	switch toolName {
	case "createAsset":
		return c.store.DeleteAsset(ctx, userID, *entityID)
	case "createLiability":
		return c.store.DeleteLiability(ctx, userID, *entityID)
	case "createPropertyScenario":
		return c.store.DeletePropertyScenario(ctx, userID, *entityID)
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
