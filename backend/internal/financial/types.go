package financial

// AssetParams represents the required inputs to create an asset.
type AssetParams struct {
	Category         string   `json:"category"`
	Name             string   `json:"name"`
	CurrentValue     float64  `json:"currentValue"`
	AnnualGrowthRate *float64 `json:"annualGrowthRate,omitempty"`
	Notes            string   `json:"notes,omitempty"`
}

// UpdateAssetParams represents the inputs to update an existing asset.
// AssetID is preferred; LastAssetID is a fallback populated from session state.
type UpdateAssetParams struct {
	AssetID          string   `json:"assetId,omitempty"`
	LastAssetID      string   `json:"lastAssetId,omitempty"`
	AssetName        string   `json:"assetName,omitempty"`
	Name             string   `json:"name,omitempty"`
	CurrentValue     *float64 `json:"currentValue,omitempty"`
	AnnualGrowthRate *float64 `json:"annualGrowthRate,omitempty"`
	Notes            string   `json:"notes,omitempty"`
}

// LiabilityParams represents the required inputs to create a liability.
type LiabilityParams struct {
	Category       string   `json:"category"`
	Name           string   `json:"name"`
	CurrentBalance float64  `json:"currentBalance"`
	InterestRate   float64  `json:"interestRate"`
	MonthlyPayment *float64 `json:"monthlyPayment,omitempty"`
	MaturityDate   string   `json:"maturityDate,omitempty"`
	Notes          string   `json:"notes,omitempty"`
}

// UpdateLiabilityParams represents the inputs to update an existing liability.
// LiabilityID is preferred; LastLiabilityID is a fallback populated from session state.
type UpdateLiabilityParams struct {
	LiabilityID     string   `json:"liabilityId,omitempty"`
	LastLiabilityID string   `json:"lastLiabilityId,omitempty"`
	LiabilityName   string   `json:"liabilityName,omitempty"`
	Name            string   `json:"name,omitempty"`
	CurrentBalance  *float64 `json:"currentBalance,omitempty"`
	InterestRate    *float64 `json:"interestRate,omitempty"`
	MonthlyPayment  *float64 `json:"monthlyPayment,omitempty"`
	MaturityDate    string   `json:"maturityDate,omitempty"`
	Notes           string   `json:"notes,omitempty"`
}

// PropertyScenarioParams represents the inputs to create a property scenario.
type PropertyScenarioParams struct {
	PropertyPrice float64 `json:"propertyPrice"`
	DownPayment   float64 `json:"downPayment"`
	LoanAmount    float64 `json:"loanAmount"`
	InterestRate  float64 `json:"interestRate"`
	LoanTenure    int     `json:"loanTenure"`
	PropertyType  string  `json:"propertyType"`
	Name          string  `json:"name,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}

// FinancialConstraintParams represents the inputs to validate MSR/TDSR-like constraints.
type FinancialConstraintParams struct {
	MonthlyPayment    float64 `json:"monthlyPayment"`
	MonthlyIncome     float64 `json:"monthlyIncome"`
	TotalDebtPayments float64 `json:"totalDebtPayments"`
}

// IncomeParams represents the inputs to create an income.
type IncomeParams struct {
	Source     string  `json:"source"`
	Amount     float64 `json:"amount"`
	Frequency  string  `json:"frequency"`
	StartDate  string  `json:"startDate,omitempty"`
	Category   string  `json:"category,omitempty"`
	Notes      string  `json:"notes,omitempty"`
	IncomeType string  `json:"incomeType,omitempty"` // salary, bonus, commission, rental, dividend, freelance, other
	WageType   string  `json:"wageType,omitempty"`   // ow (Ordinary Wages), aw (Additional Wages), null
}

// UpdateIncomeParams represents the inputs to update an income.
type UpdateIncomeParams struct {
	IncomeID     string   `json:"incomeId,omitempty"`
	LastIncomeID string   `json:"lastIncomeId,omitempty"`
	IncomeName   string   `json:"incomeName,omitempty"`
	Source       string   `json:"source,omitempty"`
	Amount       *float64 `json:"amount,omitempty"`
	Frequency    string   `json:"frequency,omitempty"`
	StartDate    string   `json:"startDate,omitempty"`
	Category     string   `json:"category,omitempty"`
	Notes        string   `json:"notes,omitempty"`
	IncomeType   string   `json:"incomeType,omitempty"` // salary, bonus, commission, rental, dividend, freelance, other
	WageType     string   `json:"wageType,omitempty"`   // ow (Ordinary Wages), aw (Additional Wages), null
}

// ExpenseParams represents the inputs to create an expense.
type ExpenseParams struct {
	Payee     string  `json:"payee"`
	Amount    float64 `json:"amount"`
	Frequency string  `json:"frequency"`
	Category  string  `json:"category,omitempty"`
	Notes     string  `json:"notes,omitempty"`
}

// UpdateExpenseParams represents the inputs to update an expense.
type UpdateExpenseParams struct {
	ExpenseID     string   `json:"expenseId,omitempty"`
	LastExpenseID string   `json:"lastExpenseId,omitempty"`
	ExpenseName   string   `json:"expenseName,omitempty"`
	Payee         string   `json:"payee,omitempty"`
	Amount        *float64 `json:"amount,omitempty"`
	Frequency     string   `json:"frequency,omitempty"`
	Category      string   `json:"category,omitempty"`
	Notes         string   `json:"notes,omitempty"`
}

// DeleteAssetParams represents the inputs to delete an asset.
type DeleteAssetParams struct {
	AssetID     string `json:"assetId,omitempty"`
	LastAssetID string `json:"lastAssetId,omitempty"`
	AssetName   string `json:"assetName,omitempty"`
}

// DeleteLiabilityParams represents the inputs to delete a liability.
type DeleteLiabilityParams struct {
	LiabilityID     string `json:"liabilityId,omitempty"`
	LastLiabilityID string `json:"lastLiabilityId,omitempty"`
	LiabilityName   string `json:"liabilityName,omitempty"`
}

// DeleteIncomeParams represents the inputs to delete an income.
type DeleteIncomeParams struct {
	IncomeID     string `json:"incomeId,omitempty"`
	LastIncomeID string `json:"lastIncomeId,omitempty"`
	IncomeName   string `json:"incomeName,omitempty"`
}

// DeleteExpenseParams represents the inputs to delete an expense.
type DeleteExpenseParams struct {
	ExpenseID     string `json:"expenseId,omitempty"`
	LastExpenseID string `json:"lastExpenseId,omitempty"`
	ExpenseName   string `json:"expenseName,omitempty"`
}

// ============================================
// SECTION: Analysis Params (Agent 3)
// ============================================

// GetNetWorthSummaryParams represents inputs for getNetWorthSummary tool.
type GetNetWorthSummaryParams struct {
	IncludeScenarios bool `json:"includeScenarios"`
	AsOfYear         int  `json:"asOfYear"`
}

// AnalyzeNetWorthTrendsParams represents inputs for analyzeNetWorthTrends tool.
type AnalyzeNetWorthTrendsParams struct {
	IncludeScenarios bool `json:"includeScenarios"`
	YearsToAnalyze   int  `json:"yearsToAnalyze"`
}

// CompareScenarioImpactParams represents inputs for compareScenarioImpact tool.
type CompareScenarioImpactParams struct {
	ScenarioID     string `json:"scenarioId,omitempty"`
	ScenarioName   string `json:"scenarioName,omitempty"`
	YearsToProject int    `json:"yearsToProject"`
}

// ProjectNetWorthAtYearParams represents inputs for projectNetWorthAtYear tool.
type ProjectNetWorthAtYearParams struct {
	TargetYear       int  `json:"targetYear,omitempty"`
	TargetAge        int  `json:"targetAge,omitempty"`
	IncludeScenarios bool `json:"includeScenarios"`
}

// IdentifyNetWorthLeversParams represents inputs for identifyNetWorthLevers tool.
type IdentifyNetWorthLeversParams struct {
	TopN     int    `json:"topN"`
	Category string `json:"category"`
}

// ============================================
// SECTION: Context Injection
// ============================================

// FinancialContext represents the user's complete financial snapshot for AI context
type FinancialContext struct {
	NetWorth    float64           `json:"netWorth"`
	Assets      []ContextItem     `json:"assets"`
	Liabilities []ContextItem     `json:"liabilities"`
	Income      []ContextItem     `json:"income"`
	Expenses    []ContextItem     `json:"expenses"`
	Scenarios   []ContextScenario `json:"scenarios"`
	Summary     FinancialSummary  `json:"summary"`
}

// ContextItem represents a single financial item for AI context
type ContextItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Notes    string  `json:"notes,omitempty"`
}

// ContextScenario represents a scenario for AI context
type ContextScenario struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsIncluded  bool   `json:"isIncluded"`
}

// FinancialSummary provides aggregated financial data
type FinancialSummary struct {
	TotalAssets      float64 `json:"totalAssets"`
	TotalLiabilities float64 `json:"totalLiabilities"`
	TotalCash        float64 `json:"totalCash"`
	MonthlyIncome    float64 `json:"monthlyIncome"`
	MonthlyExpenses  float64 `json:"monthlyExpenses"`
	MonthlySavings   float64 `json:"monthlySavings"`
	SavingsRate      float64 `json:"savingsRate"`
}

// ============================================
// SECTION: Scenario CRUD Params
// ============================================

// CreateScenarioEventParams represents the inputs to create a scenario event.
type CreateScenarioEventParams struct {
	Name           string                 `json:"name"`
	Description    string                 `json:"description,omitempty"`
	TargetYear     int                    `json:"targetYear"`
	TargetType     string                 `json:"targetType"`
	TargetID       string                 `json:"targetId,omitempty"`
	ImpactType     string                 `json:"impactType"`
	ImpactValue    *float64               `json:"impactValue,omitempty"`
	ImpactMetadata map[string]interface{} `json:"impactMetadata,omitempty"`
	IsIncluded     *bool                  `json:"isIncluded,omitempty"`
}

// StopFinancialItemParams represents the inputs to stop/pause an existing financial item in a scenario.
type StopFinancialItemParams struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	TargetYear  int    `json:"targetYear"`
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId"`
	IsIncluded  *bool  `json:"isIncluded,omitempty"`
}

// StartFinancialItemParams represents the inputs to create a new financial item in a scenario.
type StartFinancialItemParams struct {
	Name         string  `json:"name"`
	Description  string  `json:"description,omitempty"`
	TargetYear   int     `json:"targetYear"`
	TargetType   string  `json:"targetType"`
	ImpactValue  float64 `json:"impactValue"`
	ItemName     string  `json:"itemName,omitempty"`     // Name for the created item
	ItemCategory string  `json:"itemCategory,omitempty"` // Category for the created item
	IsIncluded   *bool   `json:"isIncluded,omitempty"`
}

// ModifyFinancialItemParams represents the inputs to modify an existing financial item's value in a scenario.
type ModifyFinancialItemParams struct {
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	TargetYear  int     `json:"targetYear"`
	TargetType  string  `json:"targetType"`
	TargetID    string  `json:"targetId"`
	ImpactType  string  `json:"impactType"` // "delta" or "override"
	ImpactValue float64 `json:"impactValue"`
	IsIncluded  *bool   `json:"isIncluded,omitempty"`
}

// UpdateScenarioEventParams represents the inputs to update an existing scenario event.
type UpdateScenarioEventParams struct {
	ScenarioID   string   `json:"scenarioId,omitempty"`
	ScenarioName string   `json:"scenarioName,omitempty"`
	Name         string   `json:"name,omitempty"`
	Description  string   `json:"description,omitempty"`
	TargetYear   *int     `json:"targetYear,omitempty"`
	ImpactValue  *float64 `json:"impactValue,omitempty"`
	IsIncluded   *bool    `json:"isIncluded,omitempty"`
}

// DeleteScenarioEventParams represents the inputs to delete a scenario event.
type DeleteScenarioEventParams struct {
	ScenarioID   string `json:"scenarioId,omitempty"`
	ScenarioName string `json:"scenarioName,omitempty"`
}

// ListScenarioEventsParams represents the inputs to list scenario events.
type ListScenarioEventsParams struct {
	IncludeDisabled bool   `json:"includeDisabled,omitempty"`
	TargetType      string `json:"targetType,omitempty"`
}

// ToggleScenarioIncludedParams represents the inputs to toggle a scenario's included status.
type ToggleScenarioIncludedParams struct {
	ScenarioID   string `json:"scenarioId,omitempty"`
	ScenarioName string `json:"scenarioName,omitempty"`
	IsIncluded   bool   `json:"isIncluded"`
}
