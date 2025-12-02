package scenario

import (
	"context"
	"errors"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// Service merges scenario impacts into baseline financial data.
type Service struct {
	store ScenarioStore
}

// NewService constructs a scenario service.
func NewService(store ScenarioStore) *Service {
	return &Service{store: store}
}

// ScenarioStore defines repository needs.
type ScenarioStore interface {
	ListScenarioEvents(ctx context.Context, userID string, filters repository.ScenarioFilters) ([]repository.ScenarioEvent, int, error)
}

// Row represents a baseline financial row we can annotate/adjust.
type Row struct {
	ID           string                      `json:"id"`
	Type         string                      `json:"type"` // asset|liability|income|expense
	AmountAnnual float64                     `json:"amount_annual"`
	EventImpacts []repository.ScenarioImpact `json:"event_impacts,omitempty"`
}

// ApplyRequest inputs for merging scenarios.
type ApplyRequest struct {
	UserID      string
	Year        int      // relative timeline year (0 = current year)
	BaseYear    int      // calendar year that corresponds to Year=0
	Rows        []Row
	SelectedIDs []string // optional: limit to these scenario IDs; if empty, use all included
}

// startStopInfo tracks when an item starts or stops with month-level precision for proration.
type startStopInfo struct {
	isStop bool      // true = stop impact, false = start impact
	month  time.Time // the month when the start/stop occurs
}

// Apply merges included scenarios into baseline rows for a given year.
// Ordering: start/stop -> override -> delta. Cross-scenario overrides: latest updated_at wins.
// Amounts are prorated based on which month in the year the start/stop occurs.
func (s *Service) Apply(ctx context.Context, req ApplyRequest) ([]Row, error) {
	if req.UserID == "" {
		return nil, errors.New("user_id required")
	}
	// Year 0 is valid (current/base year) - only reject negative years
	if req.Year < 0 {
		return nil, errors.New("year must be >= 0")
	}

	events, _, err := s.store.ListScenarioEvents(ctx, req.UserID, repository.ScenarioFilters{
		IncludedOnly: boolPtr(true),
	})
	if err != nil {
		return nil, err
	}

	if len(req.SelectedIDs) > 0 {
		allowed := make(map[string]struct{}, len(req.SelectedIDs))
		for _, id := range req.SelectedIDs {
			allowed[id] = struct{}{}
		}
		filtered := events[:0]
		for _, ev := range events {
			if _, ok := allowed[ev.ID]; ok {
				filtered = append(filtered, ev)
			}
		}
		events = filtered
	}

	// Convert relative year to calendar year for date comparison.
	calendarYear := req.BaseYear + req.Year

	// Build per-entity impacts for this year.
	type key struct {
		t  string
		id string
	}
	// Track start/stop with month-level precision for proration
	startStops := map[key]startStopInfo{}
	overrides := map[key]overrideChoice{} // latest updated_at wins
	deltas := map[key]deltaInfo{}
	impactRefs := map[key][]repository.ScenarioImpact{}

	for _, ev := range events {
		for _, imp := range ev.Impacts {
			if imp.TargetID == nil {
				continue
			}
			if !appliesToYear(imp, calendarYear) {
				continue
			}
			k := key{t: imp.TargetType, id: *imp.TargetID}
			switch imp.ImpactKind {
			case "start":
				startStops[k] = startStopInfo{isStop: false, month: imp.StartMonth}
			case "stop":
				startStops[k] = startStopInfo{isStop: true, month: imp.StartMonth}
			case "override":
				win, ok := overrides[k]
				if !ok || ev.UpdatedAt.After(win.updatedAt) {
					overrides[k] = overrideChoice{
						amount:    annualize(imp),
						updatedAt: ev.UpdatedAt,
						month:     imp.StartMonth,
					}
				}
				impactRefs[k] = append(impactRefs[k], imp)
			case "delta":
				existing := deltas[k]
				existing.amount += annualizeWithProration(imp, calendarYear)
				existing.month = imp.StartMonth
				deltas[k] = existing
				impactRefs[k] = append(impactRefs[k], imp)
			}
		}
	}

	out := make([]Row, 0, len(req.Rows))
	for _, row := range req.Rows {
		k := key{t: row.Type, id: row.ID}
		amount := row.AmountAnnual

		// Apply start/stop with proration
		if info, ok := startStops[k]; ok {
			if info.isStop {
				// Item stops this year - prorate based on active months
				proration := calculateStopProration(info.month, calendarYear)
				amount *= proration
			} else {
				// Item starts this year - prorate based on remaining months
				proration := calculateStartProration(info.month, calendarYear)
				amount *= proration
			}
		}

		// Apply override with proration - blend original and new amounts
		if ov, ok := overrides[k]; ok {
			// Calculate what fraction of the year is AFTER the override
			afterProration := calculateStartProration(ov.month, calendarYear)
			// The fraction BEFORE the override
			beforeProration := 1.0 - afterProration
			// Blend: original amount for months before, new amount for months after
			amount = (amount * beforeProration) + (ov.amount * afterProration)
		}

		// Apply delta (already prorated in annualizeWithProration)
		if delta, ok := deltas[k]; ok {
			amount += delta.amount
		}

		row.AmountAnnual = amount
		if refs, ok := impactRefs[k]; ok {
			row.EventImpacts = refs
		}
		out = append(out, row)
	}
	return out, nil
}

// deltaInfo tracks delta amount with timing info
type deltaInfo struct {
	amount float64
	month  time.Time
}

type overrideChoice struct {
	amount    float64
	updatedAt time.Time
	month     time.Time
}

func appliesToYear(imp repository.ScenarioImpact, calendarYear int) bool {
	startYear := imp.StartMonth.Year()
	if calendarYear < startYear {
		return false
	}
	if imp.EndMonth != nil && calendarYear > imp.EndMonth.Year() {
		return false
	}
	if imp.Cadence == "one_time" && startYear != calendarYear {
		return false
	}
	return true
}

func annualize(imp repository.ScenarioImpact) float64 {
	switch strings.ToLower(imp.Cadence) {
	case "one_time":
		return float64(imp.Amount)
	case "monthly":
		return float64(imp.Amount) * 12
	case "annual":
		return float64(imp.Amount)
	default:
		return float64(imp.Amount)
	}
}

// annualizeWithProration annualizes the impact amount with month-level proration.
// For impacts that start mid-year, only the remaining months are counted.
func annualizeWithProration(imp repository.ScenarioImpact, calendarYear int) float64 {
	base := annualize(imp)
	proration := calculateStartProration(imp.StartMonth, calendarYear)
	return base * proration
}

// calculateStopProration returns the fraction of the year that was active before a stop.
// A stop in month M means months 1 through M-1 were active.
// Example: Stop in December (month 12) = 11/12 active
// Example: Stop in January (month 1) = 0/12 active (stopped at start of year)
func calculateStopProration(stopMonth time.Time, calendarYear int) float64 {
	stopYear := stopMonth.Year()

	// If stop is in a future year, full year is active
	if stopYear > calendarYear {
		return 1.0
	}

	// If stop was in a previous year, no activity this year
	if stopYear < calendarYear {
		return 0.0
	}

	// Stop is in this calendar year - prorate based on month
	month := int(stopMonth.Month())
	// Stop at month M means active for months 1 to M-1
	activeMonths := month - 1
	if activeMonths < 0 {
		activeMonths = 0
	}
	return float64(activeMonths) / 12.0
}

// calculateStartProration returns the fraction of the year that is active after a start.
// A start in month M means months M through 12 are active.
// Example: Start in January (month 1) = 12/12 active
// Example: Start in April (month 4) = 9/12 active
// Example: Start in December (month 12) = 1/12 active
func calculateStartProration(startMonth time.Time, calendarYear int) float64 {
	startYear := startMonth.Year()

	// If start was in a previous year, full year is active
	if startYear < calendarYear {
		return 1.0
	}

	// If start is in a future year, no activity this year
	if startYear > calendarYear {
		return 0.0
	}

	// Start is in this calendar year - prorate based on month
	month := int(startMonth.Month())
	// Start at month M means active for months M to 12
	activeMonths := 13 - month
	if activeMonths > 12 {
		activeMonths = 12
	}
	if activeMonths < 0 {
		activeMonths = 0
	}
	return float64(activeMonths) / 12.0
}

func boolPtr(b bool) *bool { return &b }
