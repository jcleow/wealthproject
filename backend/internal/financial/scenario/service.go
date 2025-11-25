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
	Year        int
	Rows        []Row
	SelectedIDs []string // optional: limit to these scenario IDs; if empty, use all included
}

// Apply merges included scenarios into baseline rows for a given year.
// Ordering: start/stop -> override -> delta. Cross-scenario overrides: latest updated_at wins.
func (s *Service) Apply(ctx context.Context, req ApplyRequest) ([]Row, error) {
	if req.UserID == "" {
		return nil, errors.New("user_id required")
	}
	if req.Year == 0 {
		return nil, errors.New("year required")
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

	// Build per-entity impacts for this year.
	type key struct {
		t  string
		id string
	}
	startStop := map[key]bool{}           // false means stopped
	overrides := map[key]overrideChoice{} // latest updated_at wins
	deltas := map[key]float64{}
	impactRefs := map[key][]repository.ScenarioImpact{}

	for _, ev := range events {
		for _, imp := range ev.Impacts {
			if imp.TargetID == nil {
				continue
			}
			if !appliesToYear(imp, req.Year) {
				continue
			}
			k := key{t: imp.TargetType, id: *imp.TargetID}
			switch imp.ImpactKind {
			case "start":
				startStop[k] = true
			case "stop":
				startStop[k] = false
			case "override":
				win, ok := overrides[k]
				if !ok || ev.UpdatedAt.After(win.updatedAt) {
					overrides[k] = overrideChoice{amount: annualize(imp), updatedAt: ev.UpdatedAt}
				}
				impactRefs[k] = append(impactRefs[k], imp)
			case "delta":
				deltas[k] += annualize(imp)
				impactRefs[k] = append(impactRefs[k], imp)
			}
		}
	}

	out := make([]Row, 0, len(req.Rows))
	for _, row := range req.Rows {
		k := key{t: row.Type, id: row.ID}
		amount := row.AmountAnnual
		if stopped, ok := startStop[k]; ok && !stopped {
			amount = 0
		}
		if ov, ok := overrides[k]; ok {
			amount = ov.amount
		}
		if delta, ok := deltas[k]; ok {
			amount += delta
		}
		row.AmountAnnual = amount
		if refs, ok := impactRefs[k]; ok {
			row.EventImpacts = refs
		}
		out = append(out, row)
	}
	return out, nil
}

type overrideChoice struct {
	amount    float64
	updatedAt time.Time
}

func appliesToYear(imp repository.ScenarioImpact, year int) bool {
	startYear := imp.StartMonth.Year()
	if year < startYear {
		return false
	}
	if imp.EndMonth != nil && year > imp.EndMonth.Year() {
		return false
	}
	if imp.Cadence == "one_time" && startYear != year {
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

func boolPtr(b bool) *bool { return &b }
