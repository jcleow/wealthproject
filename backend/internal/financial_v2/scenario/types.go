package scenario

import (
	"errors"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
)

// ErrNotFound indicates a scenario record was not found
var ErrNotFound = errors.New("scenario not found")

// ImpactKind constants define how a scenario impact modifies a financial item.
//
// ═══════════════════════════════════════════════════════════════════════════════
// UI VERB → IMPACT KIND MAPPING
// ═══════════════════════════════════════════════════════════════════════════════
//
// The frontend uses human-readable verbs that map to these constants:
//
//	┌────────────────┬────────────┬─────────────────────────────────────────────┐
//	│ UI Verb        │ ImpactKind │ Description                                 │
//	├────────────────┼────────────┼─────────────────────────────────────────────┤
//	│ "increases_by" │ delta      │ Add amount to current value (+$100k/month)  │
//	│ "decreases_by" │ delta      │ Subtract amount (stored as negative delta)  │
//	│ "becomes"      │ override   │ Replace value entirely (salary becomes $150k│
//	│ "starts_at"    │ start      │ Item begins existing with this value        │
//	│ "ends"         │ stop       │ Item stops existing (becomes $0)            │
//	└────────────────┴────────────┴─────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE & GROWTH BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// How each impact kind affects State persistence and subsequent growth:
//
//	┌────────────┬───────────┬───────────┬─────────────────────────────────────┐
//	│ ImpactKind │ Persisted │ Grows?    │ Behavior                            │
//	├────────────┼───────────┼───────────┼─────────────────────────────────────┤
//	│ delta      │ ✅ Yes    │ ✅ Yes    │ Accumulates: $25k→$125k→$225k→$325k │
//	│ override   │ ✅ Yes    │ ✅ Yes    │ Replaces base, then grows naturally │
//	│ start      │ ✅ Yes    │ ✅ Yes    │ Sets initial value, then grows      │
//	│ stop       │ ❌ No     │ N/A       │ Shows $0; if stop ends, base resumes│
//	└────────────┴───────────┴───────────┴─────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY ORDER (in ApplyImpactsToItem)
// ═══════════════════════════════════════════════════════════════════════════════
//
//  1. STOP:     If any stop impact applies → return $0 immediately
//  2. OVERRIDE: Find latest by event.UpdatedAt → replace base value
//  3. DELTA:    Apply ALL deltas cumulatively (they stack)
//
// Example with multiple impacts on same item:
//
//	impacts = [override $150k, delta +$5k, delta +$3k]
//	result  = $150k + $5k + $3k = $158k
//
// ═══════════════════════════════════════════════════════════════════════════════
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
	Amount     *decimal.Decimal // Amount for absolute delta/override impacts (nil for percentage deltas)
	Cadence    common.Frequency // Frequency for delta impacts (monthly/annually)
	CreatedAt  time.Time

	// Typed FK columns (only one is non-nil per row)
	// For all impact kinds (delta/override/stop/start), one of these must be set.
	// For start impacts, the target_*_id points to a newly created finance_* row.
	TargetAssetID       *string
	TargetLiabilityID   *string
	TargetIncomeID      *string
	TargetExpenseID     *string
	TargetCashAccountID *string
	TargetInvestmentID  *string

	// Derived from JOINed financial item (not stored in impact table)
	Name      string     // Name from the target financial item
	Currency  string     // Currency from the target financial item
	Frequency string     // Frequency from the target financial item (only for income/expense)
	StartDate time.Time  // Start date from the target financial item
	EndDate   *time.Time // End date from the target financial item
	Notes     string     // Notes from the target financial item

	// Advanced fields derived from financial item (for start impacts)
	Category       string   // Category from the target financial item
	GrowthRate     *float64 // Annual growth rate from the target financial item
	GrowthStrategy string   // Growth strategy from the target financial item (income/expense only)

	// Liability-specific fields derived from financial item (for start impacts)
	InterestRate   *float64 // APR % for liabilities
	MinimumPayment *int64   // Min payment for liabilities
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
