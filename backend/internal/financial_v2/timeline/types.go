package timeline_v2

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
)

type FinancialDataType string

// for later use
const (
	FinNonCashAsset FinancialDataType = "nonCashAsset"
	FinCashAsset    FinancialDataType = "cashAsset"
	FinLiabilities  FinancialDataType = "liabilities"
	FinIncome       FinancialDataType = "income"
	FinExpense      FinancialDataType = "expense"
)

type TimelineYearlySummary struct {
	Year          int             `json:"year"`
	AllYearsIndex int             `json:"allYearsIndex"`
	NetWorth      decimal.Decimal `json:"netWorth"`
}

type TimelineMonthlySummary struct {
	Month          int             `json:"month"`
	AllMonthsIndex int             `json:"allMonthsIndex"`
	NetWorth       decimal.Decimal `json:"netWorth"`
	// To add future stuff e.g Assets, CPF Balance, Liabilities, Net Cash etc

}

type TimelineAnnualChartResponse struct {
	Resolution  string                   `json:"resolution"`
	Years       []TimelineYearlySummary  `json:"years,omitempty"`
	Months      []TimelineMonthlySummary `json:"months,omitempty"`
	ScenarioIds []string                 `json:"scenarioIds"`
}

type Frequency string

const (
	FrequencyAnnual     Frequency = "annual"
	FrequencyMonthly    Frequency = "monthly"
	FrequencyWeekly     Frequency = "weekly"
	FrequencyBiweekly   Frequency = "biweekly"
	FrequencyQuarterly  Frequency = "quarterly"
	FrequencySemiannual Frequency = "semiannual"
)

type Store interface {
	ListNonCashAssets(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.NonCashAsset], error)
	ListCashAssets(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.CashAsset], error)
	ListLiabilities(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Liability], error)
	ListIncomes(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Income], error)
	ListExpenses(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Expense], error)
	GetCPFAccount(context.Context, string) (*repository.CPFAccount, error)
}

// ========== Timeline V2 Options ==========

// TimelineOptions configures the date range for timeline queries
type TimelineOptions struct {
	StartDate    time.Time // Start date (inclusive)
	EndDate      time.Time // End date (inclusive)
	InitialState bool      // If true, return base annualized amounts without date filtering
}

// ========== Timeline V2 Response Types ==========

// TimelineV2Response is the top-level response for the timeline v2 API
type TimelineV2Response struct {
	Months []MonthDetailResponse `json:"months"`
}

// MonthDetailResponse represents a single month in the timeline
type MonthDetailResponse struct {
	Year           int                      `json:"year"`
	Month          int                      `json:"month"`
	AllYearsIndex  int                      `json:"allYearsIndex"`
	AllMonthsIndex int                      `json:"allMonthsIndex"`
	NonCashAssets        []NonCashAssetResponse   `json:"nonCashAssets"`
	CashAssets           []CashAssetResponse      `json:"cashAssets"`
	CPFAssets            []CPFAssetResponse       `json:"cpfAssets"`
	Liabilities          []LiabilityResponse      `json:"liabilities"`
	Income               []IncomeResponse         `json:"income"`
	CPFContributions     []CPFContributionResponse `json:"cpfContributions"`
	Expenses             []ExpenseResponse        `json:"expenses"`
	// Savings breakdown
	NetSavings           decimal.Decimal          `json:"netSavings"`      // income - expenses (monthly)
	NetCash              decimal.Decimal          `json:"netCash"`         // income - expenses - employee CPF (monthly)
	NetInvestments       decimal.Decimal          `json:"netInvestments"`  // employee CPF contribution (monthly)
	// Other totals
	NetWorth             decimal.Decimal          `json:"netWorth"`
	AccumulatorAccountID string                   `json:"accumulatorAccountId"`
}

// NonCashAssetResponse represents a non-cash asset in the timeline response
type NonCashAssetResponse struct {
	ID           string          `json:"id"`
	ParentID     string          `json:"parentId"`
	Name         string          `json:"name"`
	Category     string          `json:"category"`
	Balance      decimal.Decimal `json:"balance"`
	AdjBalance   decimal.Decimal `json:"adjBalance"`
	ItemType     string          `json:"itemType"`
	StartDate    string          `json:"startDate"`
	CreatedYear  int             `json:"createdYear"`
	CreatedMonth int             `json:"createdMonth"`
}

// CashAssetResponse represents a cash asset in the timeline response
type CashAssetResponse struct {
	ItemID        string          `json:"itemId"`
	Name          string          `json:"name"`
	Category      string          `json:"category"`
	Balance       decimal.Decimal `json:"balance"`
	AdjBalance    decimal.Decimal `json:"adjBalance"`
	ItemType      string          `json:"itemType"`
	CreatedYear   int             `json:"createdYear"`
	CreatedMonth  int             `json:"createdMonth"`
	IsAccumulator bool            `json:"isAccumulator"`
}

// CPFAssetResponse represents a CPF asset in the timeline response
type CPFAssetResponse struct {
	ID           string          `json:"id"`
	ParentID     string          `json:"parentId"`
	Name         string          `json:"name"`
	Category     string          `json:"category"`
	Balance      decimal.Decimal `json:"balance"`
	AdjBalance   decimal.Decimal `json:"adjBalance"`
	ItemType     string          `json:"itemType"`
	StartDate    string          `json:"startDate"`
	CreatedYear  int             `json:"createdYear"`
	CreatedMonth int             `json:"createdMonth"`
}

// LiabilityResponse represents a liability in the timeline response
type LiabilityResponse struct {
	ID            string          `json:"id"`
	ParentID      string          `json:"parentId"`
	Name          string          `json:"name"`
	Category      string          `json:"category"`
	AnnualAmt     decimal.Decimal `json:"annualAmt"`
	AdjAnnualAmt  decimal.Decimal `json:"adjAnnualAmt"`
	MonthlyAmt    decimal.Decimal `json:"monthlyAmt"`
	AdjMonthlyAmt decimal.Decimal `json:"adjMonthlyAmt"`
	SourceAmount  decimal.Decimal `json:"sourceAmount"`
	ItemType      string          `json:"itemType"`
	CreatedYear   int             `json:"createdYear"`
	CreatedMonth  int             `json:"createdMonth"`
}

// IncomeResponse represents an income entry in the timeline response
type IncomeResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Amount          decimal.Decimal `json:"amount"`
	AdjAmount       decimal.Decimal `json:"adjAmount"`
	SourceFrequency string          `json:"sourceFrequency"`
	ItemType        string          `json:"itemType"`
	CreatedYear     int             `json:"createdYear"`
	CreatedMonth    int             `json:"createdMonth"`
	GrowthRate      decimal.Decimal `json:"growthRate"`
	// CPF breakdown (populated when CPFApplicable is true)
	CPFApplicable  bool            `json:"cpfApplicable"`
	EmployeeCPF    decimal.Decimal `json:"employeeCpf"`
	EmployerCPF    decimal.Decimal `json:"employerCpf"`
	TotalCPF       decimal.Decimal `json:"totalCpf"`
	NetTakeHomePay decimal.Decimal `json:"netTakeHomePay"`
	// CPF allocation breakdown
	AllocationOA decimal.Decimal `json:"allocationOa"`
	AllocationSA decimal.Decimal `json:"allocationSa"`
	AllocationMA decimal.Decimal `json:"allocationMa"`
	AllocationRA decimal.Decimal `json:"allocationRa"`
}

// CPFContributionResponse represents a CPF contribution in the timeline response
type CPFContributionResponse struct {
	ID                   string          `json:"id"`
	ParentID             string          `json:"parentId"`
	Name                 string          `json:"name"`
	Category             string          `json:"category"`
	EmployeeContribution decimal.Decimal `json:"employeeContribution"`
	EmployerContribution decimal.Decimal `json:"employerContribution"`
	TotalContribution    decimal.Decimal `json:"totalContribution"`
	SourceFrequency      string          `json:"sourceFrequency"`
	ItemType             string          `json:"itemType"`
	CreatedYear          int             `json:"createdYear"`
	CreatedMonth         int             `json:"createdMonth"`
	AllocationOA         decimal.Decimal `json:"allocationOa"`
	AllocationSA         decimal.Decimal `json:"allocationSa"`
	AllocationMA         decimal.Decimal `json:"allocationMa"`
	AllocationRA         decimal.Decimal `json:"allocationRa"`
}

// ExpenseResponse represents an expense in the timeline response
type ExpenseResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Amount          decimal.Decimal `json:"amount"`
	AdjAmount       decimal.Decimal `json:"adjAmount"`
	SourceFrequency string          `json:"sourceFrequency"`
	ItemType        string          `json:"itemType"`
	CreatedYear     int             `json:"createdYear"`
	CreatedMonth    int             `json:"createdMonth"`
}
