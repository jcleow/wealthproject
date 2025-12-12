package timeline_v2

import (
	"context"
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
	Year      int             `json:"year"`
	YearIndex int             `json:"yearIndex"`
	NetWorth  decimal.Decimal `json:"netWorth"`
}

type TimelineMonthlySummary struct {
	Month      int             `json:"month"`
	MonthIndex int             `json:"monthIndex"`
	NetWorth   decimal.Decimal `json:"netWorth"`
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

// TimelineOptions configures which months to return in the timeline response
type TimelineOptions struct {
	RelativeStartMonth int // 0-indexed start month relative to base year (inclusive), default 0
	RelativeEndMonth   int // 0-indexed end month relative to base year (exclusive), default 420 (35 years), 0 means no limit
}

// ========== Timeline V2 Response Types ==========

// TimelineV2Response is the top-level response for the timeline v2 API
type TimelineV2Response struct {
	Months []MonthDetailResponse `json:"months"`
}

// MonthDetailResponse represents a single month in the timeline
type MonthDetailResponse struct {
	Year                 int                      `json:"year"`
	Month                int                      `json:"month"`
	YearIndex            int                      `json:"yearIndex"`
	MonthIndex           int                      `json:"monthIndex"`
	NonCashAssets        []NonCashAssetResponse   `json:"nonCashAssets"`
	CashAssets           []CashAssetResponse      `json:"cashAssets"`
	CPFAssets            []CPFAssetResponse       `json:"cpfAssets"`
	Liabilities          []LiabilityResponse      `json:"liabilities"`
	Income               []IncomeResponse         `json:"income"`
	CPFContributions     []CPFContributionResponse `json:"cpfContributions"`
	Expenses             []ExpenseResponse        `json:"expenses"`
	NetCash              decimal.Decimal          `json:"netCash"`
	NetWorth             decimal.Decimal          `json:"netWorth"`
	NetSavings           decimal.Decimal          `json:"netSavings"`
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
}

// CPFContributionResponse represents a CPF contribution in the timeline response
type CPFContributionResponse struct {
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
