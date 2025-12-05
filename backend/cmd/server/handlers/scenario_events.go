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
// @Summary List or create scenario events
// @Description List all scenario events or create a new one
// @Tags Scenario Events
// @Accept json
// @Produce json
// @Param body body scenarioEventInput false "New scenario event"
// @Success 200 {array} repository.ScenarioEvent
// @Success 201 {object} repository.ScenarioEvent
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /scenario-events [get]
// @Router /scenario-events [post]
func (h *ScenarioEventHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/scenario-events", h.handleCollection)
	mux.HandleFunc("/scenario-events/", h.handleItem)
}

// Input structs that tolerate both camelCase (preferred) and legacy snake_case.
type scenarioImpactInput struct {
	TargetType      string  `json:"targetType"`
	TargetTypeSnake string  `json:"target_type"`
	TargetID        *string `json:"targetId"`
	TargetIDSnake   *string `json:"target_id"`
	ImpactKind      string  `json:"impactKind"`
	ImpactKindSnake string  `json:"impact_kind"`
	Amount          int64   `json:"amount"`
	Currency        string  `json:"currency"`
	Cadence         string  `json:"cadence"`
	StartMonth      string  `json:"startMonth"`
	StartMonthSnake string  `json:"start_month"`
	EndMonth        *string `json:"endMonth"`
	EndMonthSnake   *string `json:"end_month"`
	Notes           *string `json:"notes"`
}

type scenarioEventInput struct {
	ID                string                `json:"id"`
	Name              string                `json:"name"`
	Description       *string               `json:"description"`
	OccursOn          string                `json:"occursOn"`
	OccursOnSnake     string                `json:"occurs_on"`
	DisplayIcon       string                `json:"displayIcon"`
	DisplayIconSnake  string                `json:"display_icon"`
	DisplayColor      string                `json:"displayColor"`
	DisplayColorSnake string                `json:"display_color"`
	Tags              []string              `json:"tags"`
	ScenarioID        *string               `json:"scenarioId"`
	ScenarioIDSnake   *string               `json:"scenario_id"`
	IsIncluded        *bool                 `json:"isIncluded"`
	IsIncludedSnake   *bool                 `json:"is_included"`
	Impacts           []scenarioImpactInput `json:"impacts"`
}

func normalizeImpactInput(in scenarioImpactInput) scenarioImpactDTO {
	targetType := in.TargetType
	if targetType == "" {
		targetType = in.TargetTypeSnake
	}
	impactKind := in.ImpactKind
	if impactKind == "" {
		impactKind = in.ImpactKindSnake
	}
	start := in.StartMonth
	if start == "" {
		start = in.StartMonthSnake
	}
	end := in.EndMonth
	if end == nil && in.EndMonthSnake != nil {
		end = in.EndMonthSnake
	}
	targetID := in.TargetID
	if targetID == nil && in.TargetIDSnake != nil {
		targetID = in.TargetIDSnake
	}
	return scenarioImpactDTO{
		TargetType: targetType,
		TargetID:   targetID,
		ImpactKind: impactKind,
		Amount:     in.Amount,
		Currency:   in.Currency,
		Cadence:    in.Cadence,
		StartMonth: start,
		EndMonth:   end,
		Notes:      in.Notes,
	}
}

func normalizeEventInput(in scenarioEventInput) scenarioEventDTO {
	occursOn := in.OccursOn
	if occursOn == "" {
		occursOn = in.OccursOnSnake
	}
	displayIcon := in.DisplayIcon
	if displayIcon == "" {
		displayIcon = in.DisplayIconSnake
	}
	displayColor := in.DisplayColor
	if displayColor == "" {
		displayColor = in.DisplayColorSnake
	}
	scenarioID := in.ScenarioID
	if scenarioID == nil && in.ScenarioIDSnake != nil {
		scenarioID = in.ScenarioIDSnake
	}
	isIncluded := false
	if in.IsIncluded != nil {
		isIncluded = *in.IsIncluded
	} else if in.IsIncludedSnake != nil {
		isIncluded = *in.IsIncludedSnake
	} else {
		isIncluded = true
	}

	var impacts []scenarioImpactDTO
	if len(in.Impacts) > 0 {
		impacts = make([]scenarioImpactDTO, 0, len(in.Impacts))
		for _, imp := range in.Impacts {
			impacts = append(impacts, normalizeImpactInput(imp))
		}
	}

	return scenarioEventDTO{
		ID:           in.ID,
		Name:         in.Name,
		Description:  in.Description,
		OccursOn:     occursOn,
		DisplayIcon:  displayIcon,
		DisplayColor: displayColor,
		Tags:         in.Tags,
		ScenarioID:   scenarioID,
		IsIncluded:   isIncluded,
		Impacts:      impacts,
	}
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

	var payload scenarioEventInput
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	dto := normalizeEventInput(payload)
	ev, err := buildScenarioEvent(userCtx.UserID, dto)
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
	writeSuccess(w, toScenarioEventDTO(created))
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

	items := make([]scenarioEventDTO, 0, len(events))
	for _, ev := range events {
		items = append(items, toScenarioEventDTO(ev))
	}

	resp := map[string]interface{}{
		"items":     items,
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
	writeSuccess(w, toScenarioEventDTO(ev))
}

func (h *ScenarioEventHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	var payload scenarioEventInput
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	dto := normalizeEventInput(payload)
	ev, err := buildScenarioEvent(userCtx.UserID, dto)
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
	writeSuccess(w, toScenarioEventDTO(updated))
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
		IsIncluded      *bool `json:"isIncluded"`
		IsIncludedSnake *bool `json:"is_included"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	val := true
	if payload.IsIncluded != nil {
		val = *payload.IsIncluded
	} else if payload.IsIncludedSnake != nil {
		val = *payload.IsIncludedSnake
	}
	if err := h.store.ToggleScenarioIncluded(r.Context(), userCtx.UserID, id, val); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario toggle failed: %v", err)
		internalError(w)
		return
	}
	writeSuccess(w, map[string]bool{"isIncluded": val})
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
	// Accept RFC3339, YYYY-MM-DD, or YYYY-MM, but normalize to the first of month at UTC midnight
	// so it always passes the month-start DB constraint regardless of client timezone.
	candidates := []string{time.RFC3339, "2006-01-02", "2006-01"}
	for _, layout := range candidates {
		if t, err := time.Parse(layout, val); err == nil {
			tUTC := t.In(time.UTC)
			return time.Date(tUTC.Year(), tUTC.Month(), 1, 0, 0, 0, 0, time.UTC), nil
		}
	}
	return time.Time{}, errors.New("unsupported month format")
}
