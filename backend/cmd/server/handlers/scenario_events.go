package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/middleware"
)

type scenarioEventStore interface {
	CreateScenarioEvent(rctx context.Context, ev repository.ScenarioEvent) (repository.ScenarioEvent, error)
	GetScenarioEvent(rctx context.Context, userID, eventID string) (repository.ScenarioEvent, error)
	ListScenarioEvents(rctx context.Context, userID string, filters repository.ScenarioFilters) ([]repository.ScenarioEvent, int, error)
	UpdateScenarioEvent(rctx context.Context, ev repository.ScenarioEvent) (repository.ScenarioEvent, error)
	DeleteScenarioEvent(rctx context.Context, userID, eventID string) error
	ToggleScenarioIncluded(rctx context.Context, userID, eventID string, included bool) error
}

// ScenarioEventHandler serves scenario event endpoints.
type ScenarioEventHandler struct {
	store scenarioEventStore
}

// NewScenarioEventHandler constructs a handler.
func NewScenarioEventHandler(store scenarioEventStore) *ScenarioEventHandler {
	return &ScenarioEventHandler{store: store}
}

// RegisterRoutes wires routes using http.ServeMux style.
func (h *ScenarioEventHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/scenario-events", h.handleCollection)
	mux.HandleFunc("/scenario-events/", h.handleItem)
}

type scenarioImpactRequest struct {
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	ImpactKind string `json:"impact_kind"`
	Amount     int64  `json:"amount"`
	Currency   string `json:"currency"`
	Cadence    string `json:"cadence"`
	StartMonth string `json:"start_month"`
	EndMonth   string `json:"end_month"`
	Notes      string `json:"notes"`
}

type scenarioEventRequest struct {
	Name         string                  `json:"name"`
	Description  string                  `json:"description"`
	OccursOn     string                  `json:"occurs_on"`
	DisplayIcon  string                  `json:"display_icon"`
	DisplayColor string                  `json:"display_color"`
	Tags         []string                `json:"tags"`
	ScenarioID   string                  `json:"scenario_id"`
	IsIncluded   *bool                   `json:"is_included"`
	Impacts      []scenarioImpactRequest `json:"impacts"`
}

func (h *ScenarioEventHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.create(w, r)
	case http.MethodGet:
		h.list(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *ScenarioEventHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/scenario-events/")
	if path == "" {
		notFound(w)
		return
	}
	if strings.HasSuffix(path, "/toggle") {
		id := strings.TrimSuffix(path, "/toggle")
		switch r.Method {
		case http.MethodPatch:
			h.toggle(w, r, id)
		default:
			methodNotAllowed(w)
		}
		return
	}

	id := path
	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	case http.MethodPut:
		h.update(w, r, id)
	case http.MethodDelete:
		h.delete(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (h *ScenarioEventHandler) create(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}

	var payload scenarioEventRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	ev, err := buildScenarioEvent(userCtx.UserID, payload)
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.store.CreateScenarioEvent(r.Context(), ev)
	if err != nil {
		log.Printf("scenario create failed: %v", err)
		internalError(w)
		return
	}
	writeSuccess(w, created)
}

func (h *ScenarioEventHandler) list(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("page_size"), 20)
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	page := parseIntDefault(r.URL.Query().Get("page"), 1)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var year *int
	if y := strings.TrimSpace(r.URL.Query().Get("year")); y != "" {
		if val, err := strconv.Atoi(y); err == nil {
			year = &val
		}
	}

	var included *bool
	if inc := strings.TrimSpace(r.URL.Query().Get("included")); inc != "" {
		val := strings.ToLower(inc) == "true"
		included = &val
	}

	tags := []string{}
	if t := strings.TrimSpace(r.URL.Query().Get("tags")); t != "" {
		for _, tag := range strings.Split(t, ",") {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				tags = append(tags, tag)
			}
		}
	}

	filters := repository.ScenarioFilters{
		IncludedOnly: included,
		Tags:         tags,
		Year:         year,
		Search:       strings.TrimSpace(r.URL.Query().Get("q")),
		Limit:        limit,
		Offset:       offset,
	}

	events, total, err := h.store.ListScenarioEvents(r.Context(), userCtx.UserID, filters)
	if err != nil {
		log.Printf("scenario list failed: %v", err)
		internalError(w)
		return
	}

	resp := map[string]interface{}{
		"items":     events,
		"total":     total,
		"page":      page,
		"page_size": limit,
	}
	writeSuccess(w, resp)
}

func (h *ScenarioEventHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	ev, err := h.store.GetScenarioEvent(r.Context(), userCtx.UserID, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	writeSuccess(w, ev)
}

func (h *ScenarioEventHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	var payload scenarioEventRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	ev, err := buildScenarioEvent(userCtx.UserID, payload)
	if err != nil {
		badRequest(w, err)
		return
	}
	ev.ID = id

	updated, err := h.store.UpdateScenarioEvent(r.Context(), ev)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario update failed: %v", err)
		internalError(w)
		return
	}
	writeSuccess(w, updated)
}

func (h *ScenarioEventHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	if err := h.store.DeleteScenarioEvent(r.Context(), userCtx.UserID, id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario delete failed: %v", err)
		internalError(w)
		return
	}
	writeSuccess(w, map[string]string{"status": "deleted"})
}

func (h *ScenarioEventHandler) toggle(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	var payload struct {
		IsIncluded bool `json:"is_included"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if err := h.store.ToggleScenarioIncluded(r.Context(), userCtx.UserID, id, payload.IsIncluded); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario toggle failed: %v", err)
		internalError(w)
		return
	}
	writeSuccess(w, map[string]bool{"is_included": payload.IsIncluded})
}

func buildScenarioEvent(userID string, req scenarioEventRequest) (repository.ScenarioEvent, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.DisplayIcon) == "" || strings.TrimSpace(req.OccursOn) == "" {
		return repository.ScenarioEvent{}, errMissingFields("name, occurs_on, display_icon")
	}
	occursOn, err := parseDateOrMonth(req.OccursOn)
	if err != nil {
		return repository.ScenarioEvent{}, errors.New("invalid occurs_on; expected YYYY-MM-DD or YYYY-MM")
	}
	isIncluded := true
	if req.IsIncluded != nil {
		isIncluded = *req.IsIncluded
	}
	impacts, err := buildImpacts(req.Impacts)
	if err != nil {
		return repository.ScenarioEvent{}, err
	}
	color := strings.TrimSpace(req.DisplayColor)
	if color == "" {
		color = "#0ea5e9" // default to ensure persistence and non-nil color
	}
	ev := repository.ScenarioEvent{
		UserID:      userID,
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		OccursOn:    occursOn,
		DisplayIcon: strings.TrimSpace(req.DisplayIcon),
		DisplayColor: func() *string {
			c := color
			return &c
		}(),
		Tags:        req.Tags,
		IsIncluded:  isIncluded,
		Impacts:     impacts,
	}
	if strings.TrimSpace(req.ScenarioID) != "" {
		val := strings.TrimSpace(req.ScenarioID)
		ev.ScenarioID = &val
	}
	return ev, nil
}

func buildImpacts(reqs []scenarioImpactRequest) ([]repository.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return []repository.ScenarioImpact{}, nil
	}
	var impacts []repository.ScenarioImpact
	startStopWindows := map[string][]window{}
	overrideWindows := map[string][]window{}

	for _, in := range reqs {
		tt := strings.ToLower(strings.TrimSpace(in.TargetType))
		if !inSet(tt, []string{"asset", "liability", "income", "expense"}) {
			return nil, errors.New("invalid target_type")
		}
		ik := strings.ToLower(strings.TrimSpace(in.ImpactKind))
		if !inSet(ik, []string{"delta", "override", "start", "stop"}) {
			return nil, errors.New("invalid impact_kind")
		}
		cad := strings.ToLower(strings.TrimSpace(in.Cadence))
		if !inSet(cad, []string{"one_time", "monthly", "annual"}) {
			return nil, errors.New("invalid cadence")
		}
		start, err := parseMonthStart(in.StartMonth)
		if err != nil {
			return nil, errors.New("invalid start_month; expected YYYY-MM or month-start timestamp")
		}
		var end *time.Time
		if strings.TrimSpace(in.EndMonth) != "" {
			val, err := parseMonthStart(in.EndMonth)
			if err != nil {
				return nil, errors.New("invalid end_month; expected YYYY-MM or month-start timestamp")
			}
			if val.Before(start) {
				return nil, errors.New("end_month must be >= start_month")
			}
			end = &val
		}

		if ik == "stop" && in.Amount != 0 {
			return nil, errors.New("stop impacts must have amount 0")
		}
		if ik != "stop" && in.Amount == 0 {
			return nil, errors.New("non-stop impacts must have non-zero amount")
		}

		targetID := strings.TrimSpace(in.TargetID)
		key := tt + "|" + targetID

		// Overlap checks
		w := window{start: start, end: end}
		if ik == "start" || ik == "stop" {
			if overlapsExisting(startStopWindows[key], w) {
				return nil, errors.New("overlapping start/stop windows for same target")
			}
			startStopWindows[key] = append(startStopWindows[key], w)
		}
		if ik == "override" {
			if overlapsExisting(overrideWindows[key], w) {
				return nil, errors.New("overlapping overrides for same target")
			}
			overrideWindows[key] = append(overrideWindows[key], w)
		}

		var tidPtr *string
		if targetID != "" {
			tidPtr = &targetID
		}
		impacts = append(impacts, repository.ScenarioImpact{
			TargetType: tt,
			TargetID:   tidPtr,
			ImpactKind: ik,
			Amount:     in.Amount,
			Currency:   strings.ToUpper(strings.TrimSpace(in.Currency)),
			Cadence:    cad,
			StartMonth: start,
			EndMonth:   end,
			Notes:      strings.TrimSpace(in.Notes),
		})
	}
	return impacts, nil
}

type window struct {
	start time.Time
	end   *time.Time
}

func overlapsExisting(existing []window, candidate window) bool {
	for _, w := range existing {
		cEnd := candidate.end
		wEnd := w.end
		cStart := candidate.start
		wStart := w.start

		// Normalize nil end as far future
		cEndTime := time.Date(9999, 12, 1, 0, 0, 0, 0, time.UTC)
		if cEnd != nil {
			cEndTime = *cEnd
		}
		wEndTime := time.Date(9999, 12, 1, 0, 0, 0, 0, time.UTC)
		if wEnd != nil {
			wEndTime = *wEnd
		}

		if (cStart.Before(wEndTime) && wStart.Before(cEndTime)) || cStart.Equal(wStart) {
			return true
		}
	}
	return false
}

func parseIntDefault(val string, def int) int {
	i, err := strconv.Atoi(strings.TrimSpace(val))
	if err != nil {
		return def
	}
	return i
}

func inSet(value string, allowed []string) bool {
	for _, v := range allowed {
		if value == v {
			return true
		}
	}
	return false
}

func parseDateOrMonth(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		return time.Time{}, errors.New("empty date")
	}
	// Full date
	if t, err := time.Parse("2006-01-02", val); err == nil {
		return t, nil
	}
	// Year-month -> first day
	if len(val) == len("2006-01") {
		if t, err := time.Parse("2006-01", val); err == nil {
			return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
		}
	}
	return time.Time{}, errors.New("unsupported date format")
}

func parseMonthStart(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		return time.Time{}, errors.New("empty month")
	}
	// RFC3339 timestamp
	if t, err := time.Parse(time.RFC3339, val); err == nil {
		return t, nil
	}
	// YYYY-MM-DD
	if t, err := time.Parse("2006-01-02", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	// YYYY-MM
	if t, err := time.Parse("2006-01", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, errors.New("unsupported month format")
}
