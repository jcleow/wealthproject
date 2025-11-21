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
	Source    string  `json:"source"`
	Amount    float64 `json:"amount"`
	Frequency string  `json:"frequency"`
	StartDate string  `json:"startDate,omitempty"`
	Category  string  `json:"category,omitempty"`
	Notes     string  `json:"notes,omitempty"`
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
