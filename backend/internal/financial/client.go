package financial

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/timeline"
	"financial-chat-system/backend/internal/middleware"
)

// Client handles financial operations backed by repository storage.
type Client struct {
	store           *repository.Store
	timelineService *timeline.Service
}

// NewClient creates a new financial client
func NewClient(store *repository.Store) *Client {
	return &Client{store: store}
}

// NewClientWithTimeline creates a new financial client with timeline service for analysis
func NewClientWithTimeline(store *repository.Store, ts *timeline.Service) *Client {
	return &Client{store: store, timelineService: ts}
}

// SetTimelineService sets the timeline service (for dependency injection)
func (c *Client) SetTimelineService(ts *timeline.Service) {
	c.timelineService = ts
}

// ensureCashAccumulator ensures a cash accumulator account exists for the user.
// If one doesn't exist, it creates a default one. This is called whenever financial
// items are created to ensure timeline can be displayed.
func (c *Client) ensureCashAccumulator(ctx context.Context, userID string) error {
	// Check if accumulator already exists
	_, err := c.store.GetAccumulatorAccount(ctx, userID)
	if err == nil {
		// Accumulator exists, nothing to do
		return nil
	}

	// Create default cash accumulator account
	_, err = c.store.CreateCashAccount(ctx, repository.CashAccount{
		UserID:        userID,
		Name:          "Cash",
		Balance:       0,
		InterestRate:  1.5,
		IsAccumulator: true,
		StartYear:     time.Now().Year(),
	})
	if err != nil {
		return fmt.Errorf("failed to create cash accumulator: %w", err)
	}

	return nil
}

// GetAutoExecuteTools returns whether the user has auto-execute tools enabled
func (c *Client) GetAutoExecuteTools(ctx context.Context, userID string) bool {
	if c.timelineService == nil {
		return false
	}
	// Create a context with the userID for the timeline service
	userCtx := context.WithValue(ctx, "userID", userID)
	settings, err := c.timelineService.GetUserSettings(userCtx)
	if err != nil {
		return false
	}
	return settings.AutoExecuteTools
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

	// Ensure cash accumulator exists for timeline display
	if err := c.ensureCashAccumulator(ctx, userID); err != nil {
		return nil, err
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

	// Ensure cash accumulator exists for timeline display
	if err := c.ensureCashAccumulator(ctx, userID); err != nil {
		return nil, err
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

	startDate := time.Now()
	if params.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", params.StartDate)
		if err == nil {
			startDate = parsed
		}
	}

	// Ensure cash accumulator exists for timeline display
	if err := c.ensureCashAccumulator(ctx, userID); err != nil {
		return nil, err
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
			current.StartDate = parsed
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

	// Ensure cash accumulator exists for timeline display
	if err := c.ensureCashAccumulator(ctx, userID); err != nil {
		return nil, err
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

	assets, err := c.store.ListAllAssets(ctx, userID, repository.DateRangeOptions{})
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

	liabilities, err := c.store.ListAllLiabilities(ctx, userID, repository.DateRangeOptions{})
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

	incomes, err := c.store.ListAllIncomes(ctx, userID, repository.DateRangeOptions{})
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

	expenses, err := c.store.ListAllExpenses(ctx, userID, repository.DateRangeOptions{})
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

// ============================================
// SECTION: Analysis (Agent 3)
// ============================================

// CalculateNetWorth calculates the current net worth from actual data
func (c *Client) CalculateNetWorth(ctx context.Context, userID string) (float64, error) {
	// Fetch all assets
	assets, err := c.store.ListAssets(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return 0, err
	}

	// Fetch all liabilities
	liabilities, err := c.store.ListLiabilities(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return 0, err
	}

	// Fetch cash accounts
	cashAccounts, err := c.store.ListCashAccounts(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return 0, err
	}

	// Sum assets
	var totalAssets float64
	for _, asset := range assets.Data {
		totalAssets += asset.CurrentValue
	}

	// Sum cash accounts
	var totalCash float64
	for _, ca := range cashAccounts {
		totalCash += ca.Balance
	}

	// Sum liabilities
	var totalLiabilities float64
	for _, liability := range liabilities.Data {
		totalLiabilities += liability.CurrentBalance
	}

	return totalAssets + totalCash - totalLiabilities, nil
}

// ============================================
// SECTION: Context Injection
// ============================================

// GetFinancialContext returns the user's complete financial snapshot for AI context injection
func (c *Client) GetFinancialContext(ctx context.Context, userID string) (*FinancialContext, error) {
	// Fetch all assets
	assets, err := c.store.ListAssets(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch assets: %w", err)
	}

	// Fetch all liabilities
	liabilities, err := c.store.ListLiabilities(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch liabilities: %w", err)
	}

	// Fetch all incomes
	incomes, err := c.store.ListIncomes(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch incomes: %w", err)
	}

	// Fetch all expenses
	expenses, err := c.store.ListExpenses(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch expenses: %w", err)
	}

	// Fetch cash accounts
	cashAccounts, err := c.store.ListCashAccounts(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch cash accounts: %w", err)
	}

	// Fetch scenarios
	scenarios, _, err := c.store.ListScenarioEvents(ctx, userID, repository.ScenarioFilters{Limit: 100})
	if err != nil {
		// Non-fatal - continue without scenarios
		scenarios = []repository.ScenarioEvent{}
	}

	// Build context items
	contextAssets := make([]ContextItem, 0, len(assets.Data))
	var totalAssets float64
	for _, a := range assets.Data {
		contextAssets = append(contextAssets, ContextItem{
			ID:       a.ID,
			Name:     a.Name,
			Category: a.Category,
			Amount:   a.CurrentValue,
			Notes:    a.Notes,
		})
		totalAssets += a.CurrentValue
	}

	// Add cash accounts to assets
	var totalCash float64
	for _, ca := range cashAccounts {
		contextAssets = append(contextAssets, ContextItem{
			ID:       ca.ID,
			Name:     ca.Name,
			Category: "cash",
			Amount:   ca.Balance,
		})
		totalCash += ca.Balance
	}

	contextLiabilities := make([]ContextItem, 0, len(liabilities.Data))
	var totalLiabilities float64
	for _, l := range liabilities.Data {
		contextLiabilities = append(contextLiabilities, ContextItem{
			ID:       l.ID,
			Name:     l.Name,
			Category: l.Category,
			Amount:   l.CurrentBalance,
			Notes:    l.Notes,
		})
		totalLiabilities += l.CurrentBalance
	}

	contextIncome := make([]ContextItem, 0, len(incomes.Data))
	var monthlyIncome float64
	for _, i := range incomes.Data {
		monthly := annualToMonthly(i.Amount, i.Frequency)
		contextIncome = append(contextIncome, ContextItem{
			ID:       i.ID,
			Name:     i.Source,
			Category: i.Category,
			Amount:   monthly,
			Notes:    i.Notes,
		})
		monthlyIncome += monthly
	}

	contextExpenses := make([]ContextItem, 0, len(expenses.Data))
	var monthlyExpenses float64
	for _, e := range expenses.Data {
		monthly := annualToMonthly(e.Amount, e.Frequency)
		contextExpenses = append(contextExpenses, ContextItem{
			ID:       e.ID,
			Name:     e.Payee,
			Category: e.Category,
			Amount:   monthly,
			Notes:    e.Notes,
		})
		monthlyExpenses += monthly
	}

	contextScenarios := make([]ContextScenario, 0, len(scenarios))
	for _, s := range scenarios {
		contextScenarios = append(contextScenarios, ContextScenario{
			ID:          s.ID,
			Name:        s.Name,
			Description: s.Description,
			IsIncluded:  s.IsIncluded,
		})
	}

	// Calculate summary
	netWorth := totalAssets + totalCash - totalLiabilities
	monthlySavings := monthlyIncome - monthlyExpenses
	savingsRate := 0.0
	if monthlyIncome > 0 {
		savingsRate = (monthlySavings / monthlyIncome) * 100
	}

	return &FinancialContext{
		NetWorth:    netWorth,
		Assets:      contextAssets,
		Liabilities: contextLiabilities,
		Income:      contextIncome,
		Expenses:    contextExpenses,
		Scenarios:   contextScenarios,
		Summary: FinancialSummary{
			TotalAssets:      totalAssets + totalCash,
			TotalLiabilities: totalLiabilities,
			TotalCash:        totalCash,
			MonthlyIncome:    monthlyIncome,
			MonthlyExpenses:  monthlyExpenses,
			MonthlySavings:   monthlySavings,
			SavingsRate:      savingsRate,
		},
	}, nil
}

// FormatContextForPrompt formats the financial context as a text block for the system prompt
func (c *Client) FormatContextForPrompt(ctx *FinancialContext) string {
	var sb strings.Builder

	sb.WriteString("## YOUR FINANCIAL DATA\n\n")
	sb.WriteString(fmt.Sprintf("**Current Net Worth:** $%.0f\n\n", ctx.NetWorth))

	// Assets
	if len(ctx.Assets) > 0 {
		sb.WriteString("**Assets:**\n")
		for _, a := range ctx.Assets {
			sb.WriteString(fmt.Sprintf("- %s (ID: %s): $%.0f [%s]\n", a.Name, a.ID, a.Amount, a.Category))
		}
		sb.WriteString("\n")
	}

	// Liabilities
	if len(ctx.Liabilities) > 0 {
		sb.WriteString("**Liabilities:**\n")
		for _, l := range ctx.Liabilities {
			sb.WriteString(fmt.Sprintf("- %s (ID: %s): $%.0f [%s]\n", l.Name, l.ID, l.Amount, l.Category))
		}
		sb.WriteString("\n")
	}

	// Income
	if len(ctx.Income) > 0 {
		sb.WriteString("**Monthly Income:**\n")
		for _, i := range ctx.Income {
			sb.WriteString(fmt.Sprintf("- %s (ID: %s): $%.0f/month [%s]\n", i.Name, i.ID, i.Amount, i.Category))
		}
		sb.WriteString("\n")
	}

	// Expenses
	if len(ctx.Expenses) > 0 {
		sb.WriteString("**Monthly Expenses:**\n")
		for _, e := range ctx.Expenses {
			sb.WriteString(fmt.Sprintf("- %s (ID: %s): $%.0f/month [%s]\n", e.Name, e.ID, e.Amount, e.Category))
		}
		sb.WriteString("\n")
	}

	// Scenarios
	if len(ctx.Scenarios) > 0 {
		sb.WriteString("**Existing Scenarios:**\n")
		for _, s := range ctx.Scenarios {
			status := "inactive"
			if s.IsIncluded {
				status = "active"
			}
			sb.WriteString(fmt.Sprintf("- %s (ID: %s): %s [%s]\n", s.Name, s.ID, s.Description, status))
		}
		sb.WriteString("\n")
	}

	// Summary
	sb.WriteString("**Summary:**\n")
	sb.WriteString(fmt.Sprintf("- Total Assets: $%.0f\n", ctx.Summary.TotalAssets))
	sb.WriteString(fmt.Sprintf("- Total Liabilities: $%.0f\n", ctx.Summary.TotalLiabilities))
	sb.WriteString(fmt.Sprintf("- Monthly Income: $%.0f\n", ctx.Summary.MonthlyIncome))
	sb.WriteString(fmt.Sprintf("- Monthly Expenses: $%.0f\n", ctx.Summary.MonthlyExpenses))
	sb.WriteString(fmt.Sprintf("- Monthly Savings: $%.0f (%.1f%% rate)\n", ctx.Summary.MonthlySavings, ctx.Summary.SavingsRate))

	return sb.String()
}

// GetNetWorthSummary returns a formatted net worth summary for AI responses
func (c *Client) GetNetWorthSummary(ctx context.Context, userID string, params GetNetWorthSummaryParams) (*string, error) {
	// Fetch all financial data
	assets, err := c.store.ListAssets(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch assets: %w", err)
	}

	liabilities, err := c.store.ListLiabilities(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch liabilities: %w", err)
	}

	incomes, err := c.store.ListIncomes(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch incomes: %w", err)
	}

	expenses, err := c.store.ListExpenses(ctx, userID, repository.PaginationParams{Limit: -1})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch expenses: %w", err)
	}

	cashAccounts, err := c.store.ListCashAccounts(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch cash accounts: %w", err)
	}

	// Calculate totals
	var totalAssets, totalLiabilities, totalCash float64
	assetsByCategory := make(map[string]float64)
	liabilitiesByCategory := make(map[string]float64)

	for _, a := range assets.Data {
		totalAssets += a.CurrentValue
		assetsByCategory[a.Category] += a.CurrentValue
	}

	for _, ca := range cashAccounts {
		totalCash += ca.Balance
	}

	for _, l := range liabilities.Data {
		totalLiabilities += l.CurrentBalance
		liabilitiesByCategory[l.Category] += l.CurrentBalance
	}

	// Calculate monthly income/expenses
	var monthlyIncome, monthlyExpenses float64
	for _, i := range incomes.Data {
		monthlyIncome += annualToMonthly(i.Amount, i.Frequency)
	}
	for _, e := range expenses.Data {
		monthlyExpenses += annualToMonthly(e.Amount, e.Frequency)
	}

	netWorth := totalAssets + totalCash - totalLiabilities
	monthlySavings := monthlyIncome - monthlyExpenses
	savingsRate := 0.0
	if monthlyIncome > 0 {
		savingsRate = (monthlySavings / monthlyIncome) * 100
	}

	// Build formatted response
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Your current net worth is **$%s**.\n\n", formatMoney(netWorth)))

	sb.WriteString("**Assets Breakdown:**\n")
	for cat, val := range assetsByCategory {
		sb.WriteString(fmt.Sprintf("- %s: $%s\n", cat, formatMoney(val)))
	}
	if totalCash > 0 {
		sb.WriteString(fmt.Sprintf("- Cash Accounts: $%s\n", formatMoney(totalCash)))
	}
	sb.WriteString(fmt.Sprintf("- **Total Assets: $%s**\n\n", formatMoney(totalAssets+totalCash)))

	sb.WriteString("**Liabilities Breakdown:**\n")
	for cat, val := range liabilitiesByCategory {
		sb.WriteString(fmt.Sprintf("- %s: $%s\n", cat, formatMoney(val)))
	}
	sb.WriteString(fmt.Sprintf("- **Total Liabilities: $%s**\n\n", formatMoney(totalLiabilities)))

	sb.WriteString("**Monthly Cash Flow:**\n")
	sb.WriteString(fmt.Sprintf("- Income: $%s/month\n", formatMoney(monthlyIncome)))
	sb.WriteString(fmt.Sprintf("- Expenses: $%s/month\n", formatMoney(monthlyExpenses)))
	sb.WriteString(fmt.Sprintf("- Savings: $%s/month (%.1f%% rate)\n", formatMoney(monthlySavings), savingsRate))

	result := sb.String()
	return &result, nil
}

// AnalyzeNetWorthTrends analyzes net worth growth over the planning horizon
func (c *Client) AnalyzeNetWorthTrends(ctx context.Context, userID string, params AnalyzeNetWorthTrendsParams) (*string, error) {
	if c.timelineService == nil {
		return nil, fmt.Errorf("timeline service not available")
	}

	yearsToAnalyze := params.YearsToAnalyze
	if yearsToAnalyze <= 0 {
		yearsToAnalyze = 30
	}

	// Get timeline
	tl, err := c.timelineService.GetTimeline(ctx, timeline.TimelineOptions{
		IncludeScenarios: params.IncludeScenarios,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get timeline: %w", err)
	}

	if len(tl.Years) == 0 {
		result := "No timeline data available for analysis."
		return &result, nil
	}

	// Extract key data points
	var sb strings.Builder
	sb.WriteString("**Net Worth Trajectory:**\n\n")

	keyYears := []int{0, 5, 10, 15, 20, 25, 30}
	for _, y := range keyYears {
		if y < len(tl.Years) && y <= yearsToAnalyze {
			sb.WriteString(fmt.Sprintf("- Year %d: $%s\n", y, formatMoney(tl.Years[y].NetWorth)))
		}
	}

	// Calculate growth rate
	if len(tl.Years) > 1 {
		startNW := tl.Years[0].NetWorth
		endYear := min(yearsToAnalyze, len(tl.Years)-1)
		endNW := tl.Years[endYear].NetWorth

		if startNW > 0 && endNW > startNW {
			cagr := (math.Pow(endNW/startNW, 1.0/float64(endYear)) - 1) * 100
			sb.WriteString(fmt.Sprintf("\n**Average Annual Growth Rate:** %.1f%%\n", cagr))
		}
	}

	// Find milestones
	milestones := []float64{100000, 250000, 500000, 1000000, 2000000, 5000000}
	sb.WriteString("\n**Projected Milestones:**\n")
	for _, milestone := range milestones {
		for i, year := range tl.Years {
			if i > yearsToAnalyze {
				break
			}
			if year.NetWorth >= milestone {
				sb.WriteString(fmt.Sprintf("- $%s reached in Year %d\n", formatMoney(milestone), i))
				break
			}
		}
	}

	result := sb.String()
	return &result, nil
}

// CompareScenarioImpact compares net worth with and without a specific scenario
func (c *Client) CompareScenarioImpact(ctx context.Context, userID string, params CompareScenarioImpactParams) (*string, error) {
	if c.timelineService == nil {
		return nil, fmt.Errorf("timeline service not available")
	}

	yearsToProject := params.YearsToProject
	if yearsToProject <= 0 {
		yearsToProject = 10
	}

	// Resolve scenario ID
	scenarioID := params.ScenarioID
	scenarioName := params.ScenarioName
	if scenarioID == "" && scenarioName != "" {
		// Look up by name
		events, _, err := c.store.ListScenarioEvents(ctx, userID, repository.ScenarioFilters{})
		if err == nil {
			for _, e := range events {
				if strings.EqualFold(e.Name, scenarioName) {
					scenarioID = e.ID
					scenarioName = e.Name
					break
				}
			}
		}
	}

	if scenarioID == "" {
		result := "Could not find the specified scenario. Please provide a valid scenario ID or name."
		return &result, nil
	}

	// Get baseline timeline (without scenario)
	baselineTL, err := c.timelineService.GetTimeline(ctx, timeline.TimelineOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get baseline timeline: %w", err)
	}

	// Get timeline with scenario
	withScenarioTL, err := c.timelineService.GetTimeline(ctx, timeline.TimelineOptions{
		IncludeScenarios: true,
		SelectedIDs:      []string{scenarioID},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get scenario timeline: %w", err)
	}

	targetYear := min(yearsToProject, min(len(baselineTL.Years)-1, len(withScenarioTL.Years)-1))
	if targetYear < 0 {
		result := "Insufficient timeline data for comparison."
		return &result, nil
	}

	baselineNW := baselineTL.Years[targetYear].NetWorth
	scenarioNW := withScenarioTL.Years[targetYear].NetWorth
	difference := scenarioNW - baselineNW

	var sb strings.Builder
	if scenarioName != "" {
		sb.WriteString(fmt.Sprintf("**Impact of \"%s\" Scenario:**\n\n", scenarioName))
	} else {
		sb.WriteString("**Scenario Impact Analysis:**\n\n")
	}

	sb.WriteString(fmt.Sprintf("After %d years:\n", targetYear))
	sb.WriteString(fmt.Sprintf("- Without scenario: $%s\n", formatMoney(baselineNW)))
	sb.WriteString(fmt.Sprintf("- With scenario: $%s\n", formatMoney(scenarioNW)))

	if difference >= 0 {
		sb.WriteString(fmt.Sprintf("\n**Net Impact: +$%s** (positive)\n", formatMoney(difference)))
	} else {
		sb.WriteString(fmt.Sprintf("\n**Net Impact: -$%s** (negative)\n", formatMoney(-difference)))
	}

	result := sb.String()
	return &result, nil
}

// ProjectNetWorthAtYear projects net worth at a specific future year
func (c *Client) ProjectNetWorthAtYear(ctx context.Context, userID string, params ProjectNetWorthAtYearParams) (*string, error) {
	if c.timelineService == nil {
		return nil, fmt.Errorf("timeline service not available")
	}

	targetYear := params.TargetYear

	// Convert age to year if provided
	if params.TargetAge > 0 && targetYear == 0 {
		settings, err := c.store.GetUserSettings(ctx, userID)
		if err == nil && settings.StartingAge > 0 {
			targetYear = params.TargetAge - settings.StartingAge
		} else {
			// Default assumption: user is 30
			targetYear = params.TargetAge - 30
		}
	}

	if targetYear < 0 {
		targetYear = 0
	}
	if targetYear > 30 {
		targetYear = 30
	}

	// Get timeline
	tl, err := c.timelineService.GetTimeline(ctx, timeline.TimelineOptions{
		IncludeScenarios: params.IncludeScenarios,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get timeline: %w", err)
	}

	if targetYear >= len(tl.Years) {
		result := fmt.Sprintf("Timeline data not available for year %d.", targetYear)
		return &result, nil
	}

	year := tl.Years[targetYear]

	var sb strings.Builder
	if params.TargetAge > 0 {
		sb.WriteString(fmt.Sprintf("**Projected Net Worth at Age %d (Year %d):**\n\n", params.TargetAge, targetYear))
	} else {
		sb.WriteString(fmt.Sprintf("**Projected Net Worth at Year %d:**\n\n", targetYear))
	}

	sb.WriteString(fmt.Sprintf("Net Worth: **$%s**\n\n", formatMoney(year.NetWorth)))
	sb.WriteString("Breakdown:\n")

	// Sum assets
	var totalAssets float64
	for _, a := range year.Assets {
		totalAssets += a.AdjustedAnnual
	}
	for _, ca := range year.CashAccounts {
		totalAssets += ca.AdjustedAnnual
	}
	sb.WriteString(fmt.Sprintf("- Total Assets: $%s\n", formatMoney(totalAssets)))

	// Sum liabilities
	var totalLiabilities float64
	for _, l := range year.Liabilities {
		totalLiabilities += l.AdjustedAnnual
	}
	sb.WriteString(fmt.Sprintf("- Total Liabilities: $%s\n", formatMoney(totalLiabilities)))

	sb.WriteString(fmt.Sprintf("- Annual Net Cash Flow: $%s\n", formatMoney(year.NetCash)))

	result := sb.String()
	return &result, nil
}

// IdentifyNetWorthLevers identifies factors with biggest impact on net worth
func (c *Client) IdentifyNetWorthLevers(ctx context.Context, userID string, params IdentifyNetWorthLeversParams) (*string, error) {
	topN := params.TopN
	if topN <= 0 {
		topN = 5
	}

	category := params.Category
	if category == "" {
		category = "all"
	}

	type lever struct {
		Type         string
		Name         string
		AnnualImpact float64
		Description  string
	}

	var levers []lever

	// Fetch data based on category filter
	if category == "all" || category == "income" {
		incomes, _ := c.store.ListIncomes(ctx, userID, repository.PaginationParams{Limit: -1})
		for _, i := range incomes.Data {
			annual := toAnnual(i.Amount, i.Frequency)
			levers = append(levers, lever{
				Type:         "income",
				Name:         i.Source,
				AnnualImpact: annual,
				Description:  fmt.Sprintf("+$%s/year income", formatMoney(annual)),
			})
		}
	}

	if category == "all" || category == "expenses" {
		expenses, _ := c.store.ListExpenses(ctx, userID, repository.PaginationParams{Limit: -1})
		for _, e := range expenses.Data {
			annual := toAnnual(e.Amount, e.Frequency)
			levers = append(levers, lever{
				Type:         "expense",
				Name:         e.Payee,
				AnnualImpact: -annual,
				Description:  fmt.Sprintf("-$%s/year expense", formatMoney(annual)),
			})
		}
	}

	if category == "all" || category == "assets" {
		assets, _ := c.store.ListAssets(ctx, userID, repository.PaginationParams{Limit: -1})
		for _, a := range assets.Data {
			growthImpact := a.CurrentValue * (a.AnnualGrowthRate / 100)
			levers = append(levers, lever{
				Type:         "asset",
				Name:         a.Name,
				AnnualImpact: growthImpact,
				Description:  fmt.Sprintf("$%s growing at %.1f%%/year", formatMoney(a.CurrentValue), a.AnnualGrowthRate),
			})
		}
	}

	if category == "all" || category == "liabilities" {
		liabilities, _ := c.store.ListLiabilities(ctx, userID, repository.PaginationParams{Limit: -1})
		for _, l := range liabilities.Data {
			interestCost := l.CurrentBalance * (l.InterestRateAPR / 100)
			levers = append(levers, lever{
				Type:         "liability",
				Name:         l.Name,
				AnnualImpact: -interestCost,
				Description:  fmt.Sprintf("$%s balance at %.1f%% interest", formatMoney(l.CurrentBalance), l.InterestRateAPR),
			})
		}
	}

	// Sort by absolute impact (descending)
	sort.Slice(levers, func(i, j int) bool {
		return math.Abs(levers[i].AnnualImpact) > math.Abs(levers[j].AnnualImpact)
	})

	// Take top N
	if len(levers) > topN {
		levers = levers[:topN]
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("**Top %d Net Worth Levers", len(levers)))
	if category != "all" {
		sb.WriteString(fmt.Sprintf(" (%s)", category))
	}
	sb.WriteString(":**\n\n")

	for i, l := range levers {
		impact := "positive"
		if l.AnnualImpact < 0 {
			impact = "negative"
		}
		sb.WriteString(fmt.Sprintf("%d. **%s** (%s)\n", i+1, l.Name, l.Type))
		sb.WriteString(fmt.Sprintf("   - %s\n", l.Description))
		sb.WriteString(fmt.Sprintf("   - Annual impact: $%s (%s)\n\n", formatMoney(math.Abs(l.AnnualImpact)), impact))
	}

	result := sb.String()
	return &result, nil
}

// Helper functions for analysis methods

func formatMoney(amount float64) string {
	if amount < 0 {
		return fmt.Sprintf("-%.0f", -amount)
	}
	return fmt.Sprintf("%.0f", amount)
}

func annualToMonthly(amount float64, frequency string) float64 {
	switch strings.ToLower(frequency) {
	case "monthly":
		return amount
	case "annual", "yearly":
		return amount / 12
	case "weekly":
		return amount * 52 / 12
	case "biweekly":
		return amount * 26 / 12
	case "quarterly":
		return amount * 4 / 12
	default:
		return amount / 12 // assume annual
	}
}

func toAnnual(amount float64, frequency string) float64 {
	switch strings.ToLower(frequency) {
	case "monthly":
		return amount * 12
	case "annual", "yearly":
		return amount
	case "weekly":
		return amount * 52
	case "biweekly":
		return amount * 26
	case "quarterly":
		return amount * 4
	default:
		return amount // assume annual
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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

// ============================================
// SECTION: Scenario CRUD Methods
// ============================================

// CreateScenarioEvent creates a new what-if scenario event.
func (c *Client) CreateScenarioEvent(ctx context.Context, params CreateScenarioEventParams) (*string, error) {
	userID, ok := ctx.Value("userID").(string)
	if !ok || userID == "" {
		return nil, fmt.Errorf("user ID not found in context")
	}

	// Convert target year to actual date
	baseYear := time.Now().Year()
	occursOn := time.Date(baseYear+params.TargetYear, 1, 1, 0, 0, 0, 0, time.UTC)

	// Determine icon and color based on target type
	displayIcon := "sparkles" // default
	displayColor := "#0ea5e9" // default blue
	switch params.TargetType {
	case "income":
		displayIcon = "wallet"
		displayColor = "#22c55e" // green
	case "expense":
		displayIcon = "credit-card"
		displayColor = "#ef4444" // red
	case "asset":
		displayIcon = "landmark"
		displayColor = "#3b82f6" // blue
	case "liability":
		displayIcon = "banknote"
		displayColor = "#f97316" // orange
	}

	// Build the scenario event
	ev := repository.ScenarioEvent{
		UserID:       userID,
		Name:         params.Name,
		Description:  params.Description,
		OccursOn:     occursOn,
		DisplayIcon:  displayIcon,
		DisplayColor: &displayColor,
		IsIncluded:   true,
	}
	if params.IsIncluded != nil {
		ev.IsIncluded = *params.IsIncluded
	}

	// Build impact if provided
	if params.ImpactValue != nil || params.ImpactType == "stop" {
		impact := repository.ScenarioImpact{
			TargetType: params.TargetType,
			ImpactKind: params.ImpactType,
			Currency:   "SGD",
			Cadence:    "one_time",
			StartMonth: occursOn,
		}

		// For "start" impacts, we need to create the financial item first
		if params.ImpactType == "start" && params.TargetID == "" && params.ImpactValue != nil {
			createdID, err := c.createFinancialItemForScenario(ctx, userID, params)
			if err != nil {
				return nil, fmt.Errorf("failed to create financial item for scenario: %w", err)
			}
			impact.TargetID = &createdID
		} else if params.TargetID != "" {
			impact.TargetID = &params.TargetID
		} else {
			return nil, fmt.Errorf("target_id is required for impact type '%s'", params.ImpactType)
		}

		if params.ImpactValue != nil {
			impact.Amount = int64(*params.ImpactValue * 100) // Convert to cents
		}
		ev.Impacts = []repository.ScenarioImpact{impact}
	}

	created, err := c.store.CreateScenarioEvent(ctx, ev)
	if err != nil {
		return nil, fmt.Errorf("failed to create scenario event: %w", err)
	}

	return &created.ID, nil
}

// createFinancialItemForScenario creates a new financial item for a "start" scenario impact.
// This ensures the scenario impact has a valid target_id to reference.
func (c *Client) createFinancialItemForScenario(ctx context.Context, userID string, params CreateScenarioEventParams) (string, error) {
	if params.ImpactValue == nil {
		return "", fmt.Errorf("impact value is required for creating a new financial item")
	}

	itemName := params.Name // Use scenario name as the item name
	if itemName == "" {
		itemName = fmt.Sprintf("Scenario Item (%s)", params.TargetType)
	}

	switch params.TargetType {
	case "asset":
		created, err := c.store.CreateAsset(ctx, userID, repository.Asset{
			Category:     "other_asset",
			Name:         itemName,
			CurrentValue: *params.ImpactValue,
			Notes:        fmt.Sprintf("Created for scenario: %s", params.Name),
		})
		if err != nil {
			return "", fmt.Errorf("failed to create asset: %w", err)
		}
		return created.ID, nil

	case "liability":
		created, err := c.store.CreateLiability(ctx, userID, repository.Liability{
			Category:       "other_debt",
			Name:           itemName,
			CurrentBalance: *params.ImpactValue,
			Notes:          fmt.Sprintf("Created for scenario: %s", params.Name),
		})
		if err != nil {
			return "", fmt.Errorf("failed to create liability: %w", err)
		}
		return created.ID, nil

	case "income":
		created, err := c.store.CreateIncome(ctx, userID, repository.Income{
			Source:    itemName,
			Amount:    *params.ImpactValue,
			Frequency: "monthly",
			Notes:     fmt.Sprintf("Created for scenario: %s", params.Name),
		})
		if err != nil {
			return "", fmt.Errorf("failed to create income: %w", err)
		}
		return created.ID, nil

	case "expense":
		created, err := c.store.CreateExpense(ctx, userID, repository.Expense{
			Payee:     itemName,
			Amount:    *params.ImpactValue,
			Frequency: "monthly",
			Notes:     fmt.Sprintf("Created for scenario: %s", params.Name),
		})
		if err != nil {
			return "", fmt.Errorf("failed to create expense: %w", err)
		}
		return created.ID, nil

	default:
		return "", fmt.Errorf("unsupported target type: %s", params.TargetType)
	}
}

// StopFinancialItem creates a scenario event that stops an existing financial item.
func (c *Client) StopFinancialItem(ctx context.Context, params StopFinancialItemParams) (*string, error) {
	// Convert to CreateScenarioEventParams and delegate
	return c.CreateScenarioEvent(ctx, CreateScenarioEventParams{
		Name:        params.Name,
		Description: params.Description,
		TargetYear:  params.TargetYear,
		TargetType:  params.TargetType,
		TargetID:    params.TargetID,
		ImpactType:  "stop",
		IsIncluded:  params.IsIncluded,
	})
}

// StartFinancialItem creates a scenario event that starts a new financial item.
func (c *Client) StartFinancialItem(ctx context.Context, params StartFinancialItemParams) (*string, error) {
	// Convert to CreateScenarioEventParams and delegate
	return c.CreateScenarioEvent(ctx, CreateScenarioEventParams{
		Name:        params.Name,
		Description: params.Description,
		TargetYear:  params.TargetYear,
		TargetType:  params.TargetType,
		ImpactType:  "start",
		ImpactValue: &params.ImpactValue,
		IsIncluded:  params.IsIncluded,
	})
}

// ModifyFinancialItem creates a scenario event that modifies an existing financial item.
func (c *Client) ModifyFinancialItem(ctx context.Context, params ModifyFinancialItemParams) (*string, error) {
	// Convert to CreateScenarioEventParams and delegate
	return c.CreateScenarioEvent(ctx, CreateScenarioEventParams{
		Name:        params.Name,
		Description: params.Description,
		TargetYear:  params.TargetYear,
		TargetType:  params.TargetType,
		TargetID:    params.TargetID,
		ImpactType:  params.ImpactType,
		ImpactValue: &params.ImpactValue,
		IsIncluded:  params.IsIncluded,
	})
}

// UpdateScenarioEvent updates an existing scenario event.
func (c *Client) UpdateScenarioEvent(ctx context.Context, params UpdateScenarioEventParams) (*string, error) {
	userID, ok := ctx.Value("userID").(string)
	if !ok || userID == "" {
		return nil, fmt.Errorf("user ID not found in context")
	}

	scenarioID, err := c.resolveScenarioID(ctx, userID, params.ScenarioID, params.ScenarioName)
	if err != nil {
		return nil, err
	}

	// Fetch current event
	current, err := c.store.GetScenarioEvent(ctx, userID, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch scenario event: %w", err)
	}

	// Apply updates
	if params.Name != "" {
		current.Name = params.Name
	}
	if params.Description != "" {
		current.Description = params.Description
	}
	if params.TargetYear != nil {
		baseYear := time.Now().Year()
		current.OccursOn = time.Date(baseYear+*params.TargetYear, 1, 1, 0, 0, 0, 0, time.UTC)
	}
	if params.IsIncluded != nil {
		current.IsIncluded = *params.IsIncluded
	}
	if params.ImpactValue != nil && len(current.Impacts) > 0 {
		current.Impacts[0].Amount = int64(*params.ImpactValue * 100)
	}

	updated, err := c.store.UpdateScenarioEvent(ctx, current)
	if err != nil {
		return nil, fmt.Errorf("failed to update scenario event: %w", err)
	}

	return &updated.ID, nil
}

// DeleteScenarioEvent deletes a scenario event.
func (c *Client) DeleteScenarioEvent(ctx context.Context, params DeleteScenarioEventParams) (*string, error) {
	userID, ok := ctx.Value("userID").(string)
	if !ok || userID == "" {
		return nil, fmt.Errorf("user ID not found in context")
	}

	scenarioID, err := c.resolveScenarioID(ctx, userID, params.ScenarioID, params.ScenarioName)
	if err != nil {
		return nil, err
	}

	if err := c.store.DeleteScenarioEvent(ctx, userID, scenarioID); err != nil {
		return nil, fmt.Errorf("failed to delete scenario event: %w", err)
	}

	return &scenarioID, nil
}

// ListScenarioEvents lists all scenario events for the user.
func (c *Client) ListScenarioEvents(ctx context.Context, userID string, params ListScenarioEventsParams) (*string, error) {
	filters := repository.ScenarioFilters{
		Limit:  100,
		Offset: 0,
	}

	if !params.IncludeDisabled {
		included := true
		filters.IncludedOnly = &included
	}

	events, _, err := c.store.ListScenarioEvents(ctx, userID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list scenario events: %w", err)
	}

	if len(events) == 0 {
		result := "No scenarios found."
		return &result, nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Found %d scenarios:\n\n", len(events)))

	for i, ev := range events {
		status := "✅ Active"
		if !ev.IsIncluded {
			status = "⏸️ Disabled"
		}

		sb.WriteString(fmt.Sprintf("%d. **%s** [%s]\n", i+1, ev.Name, status))
		sb.WriteString(fmt.Sprintf("   ID: %s\n", ev.ID))
		sb.WriteString(fmt.Sprintf("   Year: %d\n", ev.OccursOn.Year()))
		if ev.Description != "" {
			sb.WriteString(fmt.Sprintf("   Description: %s\n", ev.Description))
		}
		if len(ev.Impacts) > 0 {
			imp := ev.Impacts[0]
			value := float64(imp.Amount) / 100
			sb.WriteString(fmt.Sprintf("   Impact: %s on %s ($%.2f)\n", imp.ImpactKind, imp.TargetType, value))
		}
		sb.WriteString("\n")
	}

	result := sb.String()
	return &result, nil
}

// ToggleScenarioIncluded toggles whether a scenario is included in projections.
func (c *Client) ToggleScenarioIncluded(ctx context.Context, params ToggleScenarioIncludedParams) (*string, error) {
	userID, ok := ctx.Value("userID").(string)
	if !ok || userID == "" {
		return nil, fmt.Errorf("user ID not found in context")
	}

	scenarioID, err := c.resolveScenarioID(ctx, userID, params.ScenarioID, params.ScenarioName)
	if err != nil {
		return nil, err
	}

	if err := c.store.ToggleScenarioIncluded(ctx, userID, scenarioID, params.IsIncluded); err != nil {
		return nil, fmt.Errorf("failed to toggle scenario: %w", err)
	}

	return &scenarioID, nil
}

// resolveScenarioID resolves a scenario ID from explicit ID or name.
func (c *Client) resolveScenarioID(ctx context.Context, userID, explicitID, byName string) (string, error) {
	if explicitID != "" {
		return explicitID, nil
	}

	if byName == "" {
		return "", fmt.Errorf("scenario ID or name is required")
	}

	// Search by name
	filters := repository.ScenarioFilters{
		Search: byName,
		Limit:  10,
	}
	events, _, err := c.store.ListScenarioEvents(ctx, userID, filters)
	if err != nil {
		return "", fmt.Errorf("failed to search scenarios: %w", err)
	}

	// Find exact or closest match
	byName = strings.ToLower(byName)
	for _, ev := range events {
		if strings.ToLower(ev.Name) == byName {
			return ev.ID, nil
		}
	}
	// Return first match if any
	if len(events) > 0 {
		return events[0].ID, nil
	}

	return "", fmt.Errorf("scenario '%s' not found", byName)
}
