package timeline_v2

import (
	"context"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial/repository"
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
	ListNonCashAssets(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
	ListCashAssets(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
	ListLiabilities(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
	ListIncomes(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
	ListExpenses(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
}
