package timeline

import (
	"context"
	"errors"

	"financial-chat-system/backend/internal/financial/repository"
)

// ItemType represents the category of financial item.
type ItemType string

const (
	ItemTypeAsset       ItemType = "asset"
	ItemTypeLiability   ItemType = "liability"
	ItemTypeIncome      ItemType = "income"
	ItemTypeExpense     ItemType = "expense"
	ItemTypeCashAccount ItemType = "cash_account"
)

// Frequency represents supported input cadence for annualization.
type Frequency string

const (
	FrequencyAnnual     Frequency = "annual"
	FrequencyMonthly    Frequency = "monthly"
	FrequencyWeekly     Frequency = "weekly"
	FrequencyBiweekly   Frequency = "biweekly"
	FrequencyQuarterly  Frequency = "quarterly"
	FrequencySemiannual Frequency = "semiannual"
	FrequencyOneTime    Frequency = "one_time" // Occurs exactly once, does not recur
)

// TimelineItem represents an item at a given year with metadata for UI rendering.
type TimelineItem struct {
	// ItemID is the stable logical identifier used for scenario matching (parent_id if present, else row id).
	ItemID string `json:"itemId"`
	// RowID is the concrete finance_* row id (for debugging/reference).
	RowID string `json:"rowId,omitempty"`
	// ParentID is the original/base item id when this row is a child; else same as RowID.
	ParentID        string               `json:"parentId,omitempty"`
	Name            string               `json:"name"`
	Category        string               `json:"category"`
	AmountAnnual    float64              `json:"amountAnnual"`
	AdjustedAnnual  float64              `json:"adjAnnualAmt"`
	AmountMonthly   float64              `json:"amountMonthly,omitempty"`   // Monthly amount (when resolution is monthly)
	AdjustedMonthly float64              `json:"adjMonthlyAmt,omitempty"`   // Adjusted monthly amount
	EventImpacts    []EventImpactSummary `json:"eventImpacts,omitempty"`
	SourceAmount    *float64             `json:"sourceAmount,omitempty"`
	SourceFrequency string               `json:"sourceFrequency,omitempty"`
	ItemType        ItemType             `json:"itemType"`
	CreatedYear     int                  `json:"createdYear"`
	CreatedMonth    int                  `json:"createdMonth,omitempty"` // Month when created (1-12)
	// GrowthRate is the per-item annual growth rate (percentage)
	GrowthRate float64 `json:"growthRate,omitempty"`
	// IsAccumulator indicates this is the designated cash account receiving net savings (cash accounts only)
	IsAccumulator bool `json:"isAccumulator,omitempty"`
}

// GrowthApplied captures which growth rates were used in a given year.
type GrowthApplied struct {
	Category      string  `json:"category"`
	AnnualRatePct float64 `json:"annualRatePct"`
}

// TimelineYear is a single year's view of the projection.
type TimelineYear struct {
	Year          int             `json:"year"`
	Assets        []TimelineItem  `json:"assets"`
	CashAccounts  []TimelineItem  `json:"cashAccounts"`  // Cash accounts from cash_accounts table
	Liabilities   []TimelineItem  `json:"liabilities"`
	Income        []TimelineItem  `json:"income"`
	Expenses      []TimelineItem  `json:"expenses"`
	NetCash       float64         `json:"netCash"`       // Income - Expenses (annual net savings)
	NetWorth      float64         `json:"netWorth"`      // Assets + CashAccounts - Liabilities
	HasOverrides  bool            `json:"hasOverrides"`
	GrowthApplied []GrowthApplied `json:"growthApplied"`

	// Cash accumulation tracking
	AnnualNetSavings     float64 `json:"annualNetSavings"`               // Income - Expenses for this year
	AccumulatedCashStart float64 `json:"accumulatedCashStart"`           // Cash balance at start of year
	AccumulatedCashEnd   float64 `json:"accumulatedCashEnd"`             // Cash balance at end of year (after interest)
	InterestEarned       float64 `json:"interestEarned"`                 // Interest earned this year on accumulator
	AccumulatorAccountID string  `json:"accumulatorAccountId,omitempty"` // ID of the accumulator cash account
}

// TimelineMonth is a single month's view of the projection (for monthly resolution).
type TimelineMonth struct {
	Year          int             `json:"year"`          // Calendar year (e.g., 2025)
	Month         int             `json:"month"`         // Month number (1-12)
	YearIndex     int             `json:"yearIndex"`     // 0-based year index
	MonthIndex    int             `json:"monthIndex"`    // 0-based global month index
	Assets        []TimelineItem  `json:"assets"`
	CashAccounts  []TimelineItem  `json:"cashAccounts"`
	Liabilities   []TimelineItem  `json:"liabilities"`
	Income        []TimelineItem  `json:"income"`
	Expenses      []TimelineItem  `json:"expenses"`
	NetCash       float64         `json:"netCash"`       // Monthly net savings
	NetWorth      float64         `json:"netWorth"`
	HasOverrides  bool            `json:"hasOverrides"`
	GrowthApplied []GrowthApplied `json:"growthApplied"`

	// Monthly cash accumulation tracking
	MonthlyNetSavings    float64 `json:"monthlyNetSavings,omitempty"`
	AccumulatedCashStart float64 `json:"accumulatedCashStart,omitempty"`
	AccumulatedCashEnd   float64 `json:"accumulatedCashEnd,omitempty"`
	InterestEarned       float64 `json:"interestEarned,omitempty"`
	AccumulatorAccountID string  `json:"accumulatorAccountId,omitempty"`
}

// TimelineResponse is the API shape returned to the client.
type TimelineResponse struct {
	Resolution string          `json:"resolution"`               // "yearly" or "monthly"
	Years      []TimelineYear  `json:"years,omitempty"`
	Months     []TimelineMonth `json:"months,omitempty"`
	Version    string          `json:"version"`
	// ScenariosApplied lists scenario IDs merged into this response (optional).
	ScenariosApplied []string `json:"scenariosApplied,omitempty"`
}

// EventImpactSummary annotates a row with scenario impact info.
type EventImpactSummary struct {
	EventID       string  `json:"eventId"`
	ImpactKind    string  `json:"impactKind"`   // override|delta|start|stop
	AmountAnnual  float64 `json:"amountAnnual"` // annualized
	AmountMonthly float64 `json:"amountMonthly,omitempty"`
	Cadence       string  `json:"cadence"`
	Notes         string  `json:"notes,omitempty"`
}

// EditRequest represents a user edit or new item creation for a given year.
type EditRequest struct {
	ItemID     *string   `json:"itemId,omitempty"`
	Name       *string   `json:"name,omitempty"`
	ItemType   ItemType  `json:"itemType"`
	Category   string    `json:"category"`
	Amount     float64   `json:"amount"`
	Frequency  Frequency `json:"frequency"`
	SourceYear int       `json:"-"`
}

// TimelineOptions specifies options for building a timeline.
// Use this struct to configure timeline generation behavior including
// resolution (yearly/monthly) and scenario application.
type TimelineOptions struct {
	// Resolution overrides the user's preferred resolution setting.
	// Valid values: "yearly", "monthly", "" (empty = use user preference)
	Resolution string

	// IncludeScenarios applies scenario impacts to the timeline if true.
	IncludeScenarios bool

	// SelectedIDs limits scenario application to specific scenario IDs.
	// If empty and IncludeScenarios is true, all user's scenarios are applied.
	SelectedIDs []string
}

// Store defines the dependencies needed for timeline operations.
type Store interface {
	ListAllAssets(context.Context, string, repository.DateRangeOptions) ([]repository.Asset, error)
	ListAllLiabilities(context.Context, string, repository.DateRangeOptions) ([]repository.Liability, error)
	ListAllIncomes(context.Context, string, repository.DateRangeOptions) ([]repository.Income, error)
	ListAllExpenses(context.Context, string, repository.DateRangeOptions) ([]repository.Expense, error)

	CreateAsset(context.Context, string, repository.Asset) (repository.Asset, error)
	CreateLiability(context.Context, string, repository.Liability) (repository.Liability, error)
	CreateIncome(context.Context, string, repository.Income) (repository.Income, error)
	CreateExpense(context.Context, string, repository.Expense) (repository.Expense, error)

	DeleteAsset(context.Context, string, string) error
	DeleteLiability(context.Context, string, string) error
	DeleteIncome(context.Context, string, string) error
	DeleteExpense(context.Context, string, string) error

	GetGrowthConfigs(context.Context, string) ([]repository.GrowthConfig, error)
	UpsertGrowthConfigs(context.Context, string, []repository.GrowthConfig) error

	// User settings operations
	GetUserSettings(context.Context, string) (repository.UserSettings, error)
	UpsertUserSettings(context.Context, string, repository.UserSettings) (repository.UserSettings, error)

	// Cash account operations
	ListCashAccounts(context.Context, string, repository.DateRangeOptions) ([]repository.CashAccount, error)
	GetAccumulatorAccount(context.Context, string) (repository.CashAccount, error)
	CreateCashAccount(context.Context, repository.CashAccount) (repository.CashAccount, error)
	SetAccumulatorAccount(context.Context, string, string) error
}

// annualization factors
var freqFactors = map[Frequency]float64{
	FrequencyAnnual:     1,
	FrequencyMonthly:    12,
	FrequencyWeekly:     52,
	FrequencyBiweekly:   26,
	FrequencyQuarterly:  4,
	FrequencySemiannual: 2,
	FrequencyOneTime:    1, // One-time: amount is the total, occurs once
}

var (
	errUnsupportedFrequency = errors.New("unsupported frequency")
)

// Annualize converts a value with a given frequency into an annual amount.
func Annualize(amount float64, freq Frequency) (float64, error) {
	factor, ok := freqFactors[freq]
	if !ok {
		return 0, errUnsupportedFrequency
	}
	return amount * factor, nil
}

// ConvertToMonthly converts a value with a given frequency into a monthly amount.
// For one_time frequency, returns the full amount (it occurs once in a specific month).
func ConvertToMonthly(amount float64, freq Frequency) (float64, error) {
	switch freq {
	case FrequencyAnnual:
		return amount / 12, nil
	case FrequencyMonthly:
		return amount, nil
	case FrequencyWeekly:
		return amount * 52 / 12, nil
	case FrequencyBiweekly:
		return amount * 26 / 12, nil
	case FrequencyQuarterly:
		return amount * 4 / 12, nil
	case FrequencySemiannual:
		return amount * 2 / 12, nil
	case FrequencyOneTime:
		return amount, nil // Full amount in the month it occurs
	default:
		return 0, errUnsupportedFrequency
	}
}
