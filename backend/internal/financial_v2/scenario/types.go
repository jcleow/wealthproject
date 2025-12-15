package scenario

import (
	"errors"
	"time"
)

// ErrNotFound indicates a scenario record was not found
var ErrNotFound = errors.New("scenario not found")

// ImpactKind constants
const (
	ImpactKindStart    = "start"
	ImpactKindStop     = "stop"
	ImpactKindDelta    = "delta"
	ImpactKindOverride = "override"
)

// Event represents a scenario event with typed FK impacts.
type Event struct {
	ID           string
	UserID       string
	Name         string
	Description  string
	OccursOn     time.Time
	DisplayIcon  string
	DisplayColor *string
	Tags         []string
	ScenarioID   *string
	IsIncluded   bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Impacts      []Impact
}

// Impact represents a financial impact with typed FK columns.
// Only one of the target FK fields will be non-nil per impact.
type Impact struct {
	ID         string
	EventID    string
	ImpactKind string
	Amount     int64
	Currency   string
	Cadence    string
	StartDate  time.Time
	EndDate    *time.Time
	Notes      string
	CreatedAt  time.Time

	// Typed FK columns (only one is non-nil per row)
	TargetAssetID       *string
	TargetLiabilityID   *string
	TargetIncomeID      *string
	TargetExpenseID     *string
	TargetCashAccountID *string
	TargetInvestmentID  *string
}

// TargetType returns the type of target this impact references.
func (i *Impact) TargetType() string {
	switch {
	case i.TargetAssetID != nil:
		return "asset"
	case i.TargetLiabilityID != nil:
		return "liability"
	case i.TargetIncomeID != nil:
		return "income"
	case i.TargetExpenseID != nil:
		return "expense"
	case i.TargetCashAccountID != nil:
		return "cash"
	case i.TargetInvestmentID != nil:
		return "investment"
	default:
		return ""
	}
}

// TargetID returns the target ID regardless of type.
func (i *Impact) TargetID() *string {
	switch {
	case i.TargetAssetID != nil:
		return i.TargetAssetID
	case i.TargetLiabilityID != nil:
		return i.TargetLiabilityID
	case i.TargetIncomeID != nil:
		return i.TargetIncomeID
	case i.TargetExpenseID != nil:
		return i.TargetExpenseID
	case i.TargetCashAccountID != nil:
		return i.TargetCashAccountID
	case i.TargetInvestmentID != nil:
		return i.TargetInvestmentID
	default:
		return nil
	}
}

// Filters controls list queries.
type Filters struct {
	IncludedOnly *bool
	Tags         []string
	Year         *int
	Search       string
	Limit        int
	Offset       int
}

// ExcludedTargets holds IDs of financial items from excluded scenarios.
type ExcludedTargets struct {
	AssetIDs       map[string]struct{}
	LiabilityIDs   map[string]struct{}
	IncomeIDs      map[string]struct{}
	ExpenseIDs     map[string]struct{}
	CashAccountIDs map[string]struct{}
	InvestmentIDs  map[string]struct{}
}

// ImpactContext holds pre-computed scenario impacts indexed by target ID for O(1) lookup
type ImpactContext struct {
	// Map of target item ID -> list of impacts affecting that item
	ImpactsByTarget map[string][]Impact
	// Map of event ID -> event (for updated_at tie-breaking in overrides)
	EventsByID map[string]*Event
}
