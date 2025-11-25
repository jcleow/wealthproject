package timeline

import (
	"context"
	"errors"

	"financial-chat-system/backend/internal/financial/repository"
)

// ItemType represents the category of financial item.
type ItemType string

const (
	ItemTypeAsset     ItemType = "asset"
	ItemTypeLiability ItemType = "liability"
	ItemTypeIncome    ItemType = "income"
	ItemTypeExpense   ItemType = "expense"
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
)

// TimelineItem represents an item at a given year with metadata for UI rendering.
type TimelineItem struct {
	ItemID          string               `json:"item_id"`
	Name            string               `json:"name"`
	Category        string               `json:"category"`
	AmountAnnual    float64              `json:"amount_annual"`
	EventImpacts    []EventImpactSummary `json:"event_impacts,omitempty"`
	SourceAmount    *float64             `json:"source_amount,omitempty"`
	SourceFrequency string               `json:"source_frequency,omitempty"`
	ItemType        ItemType             `json:"item_type"`
	CreatedYear     int                  `json:"created_year"`
}

// GrowthApplied captures which growth rates were used in a given year.
type GrowthApplied struct {
	Category      string  `json:"category"`
	AnnualRatePct float64 `json:"annual_rate_pct"`
}

// TimelineYear is a single year's view of the projection.
type TimelineYear struct {
	Year          int             `json:"year"`
	Assets        []TimelineItem  `json:"assets"`
	Liabilities   []TimelineItem  `json:"liabilities"`
	Income        []TimelineItem  `json:"income"`
	Expenses      []TimelineItem  `json:"expenses"`
	NetCash       float64         `json:"net_cash"`
	NetWorth      float64         `json:"net_worth"`
	HasOverrides  bool            `json:"has_overrides"`
	GrowthApplied []GrowthApplied `json:"growth_applied"`
}

// TimelineResponse is the API shape returned to the client.
type TimelineResponse struct {
	Years   []TimelineYear `json:"years"`
	Version string         `json:"version"`
	// ScenariosApplied lists scenario IDs merged into this response (optional).
	ScenariosApplied []string `json:"scenarios_applied,omitempty"`
}

// EventImpactSummary annotates a row with scenario impact info.
type EventImpactSummary struct {
	EventID      string  `json:"event_id"`
	ImpactKind   string  `json:"impact_kind"`   // override|delta|start|stop
	AmountAnnual float64 `json:"amount_annual"` // annualized
	Cadence      string  `json:"cadence"`
	Notes        string  `json:"notes,omitempty"`
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

// Store defines the dependencies needed for timeline operations.
type Store interface {
	ListAssets(context.Context) ([]repository.Asset, error)
	ListLiabilities(context.Context) ([]repository.Liability, error)
	ListIncomes(context.Context) ([]repository.Income, error)
	ListExpenses(context.Context) ([]repository.Expense, error)

	CreateAsset(context.Context, repository.Asset) (repository.Asset, error)
	CreateLiability(context.Context, repository.Liability) (repository.Liability, error)
	CreateIncome(context.Context, repository.Income) (repository.Income, error)
	CreateExpense(context.Context, repository.Expense) (repository.Expense, error)

	GetGrowthConfigs(context.Context) ([]repository.GrowthConfig, error)
	UpsertGrowthConfigs(context.Context, []repository.GrowthConfig) error
}

// annualization factors
var freqFactors = map[Frequency]float64{
	FrequencyAnnual:     1,
	FrequencyMonthly:    12,
	FrequencyWeekly:     52,
	FrequencyBiweekly:   26,
	FrequencyQuarterly:  4,
	FrequencySemiannual: 2,
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
