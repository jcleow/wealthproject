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
