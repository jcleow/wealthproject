package timeline_v2

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
)

type FinancialDataType string

// for later use
const (
	FinNonCashAsset FinancialDataType = "nonCashAsset"
	FinCashAsset    FinancialDataType = "cashAsset"
	FinInvestment   FinancialDataType = "investment"
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

// Frequency is an alias to common.Frequency for backward compatibility
type Frequency = common.Frequency

const (
	FrequencyAnnual     = common.FrequencyAnnual
	FrequencyMonthly    = common.FrequencyMonthly
	FrequencyWeekly     = common.FrequencyWeekly
	FrequencyBiweekly   = common.FrequencyBiweekly
	FrequencyQuarterly  = common.FrequencyQuarterly
	FrequencySemiannual = common.FrequencySemiannual
)

type Store interface {
	ListNonCashAssets(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.NonCashAsset], error)
	ListInvestments(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Investment], error)
	ListCashAssets(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.CashAsset], error)
	ListLiabilities(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Liability], error)
	ListIncomes(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Income], error)
	ListExpenses(context.Context, string, repository.DateRangeOptions, repository.PaginationParams) (repository.PaginatedResult[repository.Expense], error)
	GetCPFAccount(context.Context, string) (*repository.CPFAccount, error)
	ListAllIncomeAllocations(context.Context, string) ([]repository.IncomeAllocation, error)
	// GetExcludedScenarioTargetIDs returns IDs of financial items created by excluded scenarios
	GetExcludedScenarioTargetIDs(context.Context, string) (repository.ExcludedTargets, error)
	// ListIncludedScenarioEvents returns scenario events where is_included=true with their impacts
	ListIncludedScenarioEvents(context.Context, string) ([]repository.ScenarioEvent, error)
}

// ScenarioStore provides scenario-specific operations
type ScenarioStore interface {
	// GetExcludedTargetIDs returns IDs of financial items created by excluded scenarios
	GetExcludedTargetIDs(context.Context, string) (scenario.ExcludedTargets, error)
	// ListIncludedEvents returns scenario events where is_included=true with their impacts
	ListIncludedEvents(context.Context, string) ([]scenario.Event, error)
}

// ========== Timeline V2 Options ==========

// TimelineOptions configures the date range for timeline queries
type TimelineOptions struct {
	StartDate        time.Time // Start date (inclusive)
	EndDate          time.Time // End date (inclusive)
	InitialState     bool      // If true, return base annualized amounts without date filtering
	IncludeScenarios bool      // If true, apply scenario impacts to eventAdjBalance/eventAdjAmount
}

// ========== Timeline V2 Response Types ==========

// AppliedImpact represents a scenario impact that was applied to an item
type AppliedImpact struct {
	EventID       string          `json:"eventId"`
	AmountAnnual  decimal.Decimal `json:"amountAnnual"`
	AmountMonthly decimal.Decimal `json:"amountMonthly"`
	ImpactKind    string          `json:"impactKind"` // delta, override, start, stop
	Notes         string          `json:"notes,omitempty"`
}

// TimelineV2Response is the top-level response for the timeline v2 API
type TimelineV2Response struct {
	Months []MonthDetailResponse `json:"months"`
}

// MonthDetailResponse represents a single month in the timeline
type MonthDetailResponse struct {
	Year             int                       `json:"year"`
	Month            int                       `json:"month"`
	AllYearsIndex    int                       `json:"allYearsIndex"`
	AllMonthsIndex   int                       `json:"allMonthsIndex"`
	NonCashAssets    []NonCashAssetResponse    `json:"nonCashAssets"`
	Investments      []InvestmentResponse      `json:"investments"`
	CashAssets       []CashAssetResponse       `json:"cashAssets"`
	CPFAssets        []CPFAssetResponse        `json:"cpfAssets"`
	Liabilities      []LiabilityResponse       `json:"liabilities"`
	Income            []IncomeResponse           `json:"income"`
	CPFContributions  []CPFContributionResponse  `json:"cpfContributions"`
	Expenses          []ExpenseResponse          `json:"expenses"`
	IncomeAllocations []IncomeAllocationResponse `json:"incomeAllocations"`
	// Savings breakdown
	NetSavings     decimal.Decimal `json:"netSavings"`     // income - employee CPF - expenses (monthly)
	NetCash        decimal.Decimal `json:"netCash"`        // income - employee CPF - expenses - investments (monthly)
	NetInvestments decimal.Decimal `json:"netInvestments"` // employee CPF contribution (monthly)
	// Other totals
	NetWorth             decimal.Decimal `json:"netWorth"`
	AccumulatorAccountID string          `json:"accumulatorAccountId"`
}

// NonCashAssetResponse represents a non-cash asset in the timeline response
type NonCashAssetResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Balance         decimal.Decimal `json:"balance"`
	EventAdjBalance decimal.Decimal `json:"eventAdjBalance"`
	ItemType        string          `json:"itemType"`
	StartDate       string          `json:"startDate"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
	EventImpacts    []AppliedImpact `json:"eventImpacts,omitempty"`
}

// InvestmentResponse keeps investments separate from non-cash assets
type InvestmentResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Balance         decimal.Decimal `json:"balance"`
	EventAdjBalance decimal.Decimal `json:"eventAdjBalance"`
	GrowthRate      decimal.Decimal `json:"growthRate"`
	ItemType        string          `json:"itemType"`
	StartDate       string          `json:"startDate"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
	EventImpacts    []AppliedImpact `json:"eventImpacts,omitempty"`
}

// CashAssetResponse represents a cash asset in the timeline response
type CashAssetResponse struct {
	ItemID          string          `json:"itemId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Balance         decimal.Decimal `json:"balance"`
	EventAdjBalance decimal.Decimal `json:"eventAdjBalance"`
	ItemType        string          `json:"itemType"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
	IsAccumulator   bool            `json:"isAccumulator"`
	EventImpacts    []AppliedImpact `json:"eventImpacts,omitempty"`
}

// CPFAssetResponse represents a CPF asset in the timeline response
type CPFAssetResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Balance         decimal.Decimal `json:"balance"`
	EventAdjBalance decimal.Decimal `json:"eventAdjBalance"`
	ItemType        string          `json:"itemType"`
	StartDate       string          `json:"startDate"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
}

// LiabilityResponse represents a liability in the timeline response
type LiabilityResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Balance         decimal.Decimal `json:"balance"`         // Point-in-time balance
	EventAdjBalance decimal.Decimal `json:"eventAdjBalance"` // Adjusted balance with scenario events
	SourceAmount    decimal.Decimal `json:"sourceAmount"`
	ItemType        string          `json:"itemType"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
	EventImpacts    []AppliedImpact `json:"eventImpacts,omitempty"`
}

// IncomeResponse represents an income entry in the timeline response
type IncomeResponse struct {
	ID              string          `json:"id"`
	ParentID        string          `json:"parentId"`
	Name            string          `json:"name"`
	Category        string          `json:"category"`
	Amount          decimal.Decimal `json:"amount"`
	EventAdjAmount  decimal.Decimal `json:"eventAdjAmount"`
	SourceFrequency string          `json:"sourceFrequency"`
	ItemType        string          `json:"itemType"`
	StartYear       int             `json:"startYear"`
	StartMonth      int             `json:"startMonth"`
	GrowthRate      decimal.Decimal `json:"growthRate"`
	EmployeeCPF     decimal.Decimal `json:"employeeCpf"`
	EmployerCPF     decimal.Decimal `json:"employerCpf"`
	TotalCPF        decimal.Decimal `json:"totalCpf"`
	NetTakeHomePay  decimal.Decimal `json:"netTakeHomePay"`
	// CPF allocation breakdown
	AllocationOA decimal.Decimal `json:"allocationOa"`
	AllocationSA decimal.Decimal `json:"allocationSa"`
	AllocationMA decimal.Decimal `json:"allocationMa"`
	AllocationRA decimal.Decimal `json:"allocationRa"`
	EventImpacts []AppliedImpact `json:"eventImpacts,omitempty"`
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
	StartYear            int             `json:"startYear"`
	StartMonth           int             `json:"startMonth"`
	AllocationOA         decimal.Decimal `json:"allocationOa"`
	AllocationSA         decimal.Decimal `json:"allocationSa"`
	AllocationMA         decimal.Decimal `json:"allocationMa"`
	AllocationRA         decimal.Decimal `json:"allocationRa"`
}

// ExpenseResponse represents an expense in the timeline response
type ExpenseResponse struct {
	ID                string          `json:"id"`
	ParentID          string          `json:"parentId"`
	Name              string          `json:"name"`
	Category          string          `json:"category"`
	Amount            decimal.Decimal `json:"amount"`
	EventAdjAmount    decimal.Decimal `json:"eventAdjAmount"`
	SourceFrequency   string          `json:"sourceFrequency"`
	ItemType          string          `json:"itemType"`
	StartYear         int             `json:"startYear"`
	StartMonth        int             `json:"startMonth"`
	SourceLiabilityID *string         `json:"sourceLiabilityId,omitempty"` // Link to liability this expense pays down
	EventImpacts      []AppliedImpact `json:"eventImpacts,omitempty"`
}

// IncomeAllocationResponse represents an income allocation in the timeline response
type IncomeAllocationResponse struct {
	ID                  string          `json:"id"`
	IncomeID            string          `json:"incomeId"`
	ParentID            string          `json:"parentId"`
	StartDate           string          `json:"startDate"`
	EndDate             *string         `json:"endDate,omitempty"`
	TargetCashAccountID *string         `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string         `json:"targetInvestmentId,omitempty"`
	AllocationType      string          `json:"allocationType"`
	AllocationValue     decimal.Decimal `json:"allocationValue"`
}
