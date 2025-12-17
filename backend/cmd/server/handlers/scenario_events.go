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
// @Security SessionID
// @Security AuthToken
// @Router /v1/scenario-events [get]
// @Router /v1/scenario-events [post]
func (h *ScenarioEventHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/scenario-events", h.handleCollection)
	mux.HandleFunc("/scenario-events/", h.handleItem)
}

type scenarioImpactInput struct {
	TargetType string  `json:"targetType"`
	TargetID   *string `json:"targetId"`
	ImpactKind string  `json:"impactKind"`
	Amount     int64   `json:"amount"`
	Currency   string  `json:"currency"`
	Cadence    string  `json:"cadence"`
	StartDate  string  `json:"startDate"`
	EndDate    *string `json:"endDate"`
	Notes      *string `json:"notes"`
}

type scenarioEventInput struct {
	ID           string                `json:"id"`
	Name         string                `json:"name"`
	Description  *string               `json:"description"`
	OccursOn     string                `json:"occursOn"`
	DisplayIcon  string                `json:"displayIcon"`
	DisplayColor string                `json:"displayColor"`
	Tags         []string              `json:"tags"`
	ScenarioID   *string               `json:"scenarioId"`
	IsIncluded   *bool                 `json:"isIncluded"`
	Impacts      []scenarioImpactInput `json:"impacts"`
}

func toImpactDTO(in scenarioImpactInput) scenarioImpactDTO {
	return scenarioImpactDTO{
		TargetType: in.TargetType,
		TargetID:   in.TargetID,
		ImpactKind: in.ImpactKind,
		Amount:     in.Amount,
		Currency:   in.Currency,
		Cadence:    in.Cadence,
		StartDate:  in.StartDate,
		EndDate:    in.EndDate,
		Notes:      in.Notes,
	}
}

func toEventDTO(in scenarioEventInput) scenarioEventDTO {
	isIncluded := true
	if in.IsIncluded != nil {
		isIncluded = *in.IsIncluded
	}

	var impacts []scenarioImpactDTO
	if len(in.Impacts) > 0 {
		impacts = make([]scenarioImpactDTO, 0, len(in.Impacts))
		for _, imp := range in.Impacts {
			impacts = append(impacts, toImpactDTO(imp))
		}
	}

	return scenarioEventDTO{
		ID:           in.ID,
		Name:         in.Name,
		Description:  in.Description,
		OccursOn:     in.OccursOn,
		DisplayIcon:  in.DisplayIcon,
		DisplayColor: in.DisplayColor,
		Tags:         in.Tags,
		ScenarioID:   in.ScenarioID,
		IsIncluded:   isIncluded,
		Impacts:      impacts,
	}
}

// GET|POST /api/v1/scenario-events
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

// GET|PUT|DELETE /api/v1/scenario-events/{id}
// PATCH /api/v1/scenario-events/{id}/toggle
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

// POST /api/v1/scenario-events
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

	dto := toEventDTO(payload)
	ev, err := buildScenarioEvent(userCtx.UserID, dto)
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.store.CreateScenarioEvent(r.Context(), ev)
	if err != nil {
		log.Printf("scenario create failed: %v", err)
		internalError(w, err)
		return
	}
	writeSuccess(w, toScenarioEventDTO(created))
}

// GET /api/v1/scenario-events
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
		internalError(w, err)
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

// GET /api/v1/scenario-events/{id}
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
		internalError(w, err)
		return
	}
	writeSuccess(w, toScenarioEventDTO(ev))
}

// PUT /api/v1/scenario-events/{id}
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
	dto := toEventDTO(payload)
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
		internalError(w, err)
		return
	}
	writeSuccess(w, toScenarioEventDTO(updated))
}

// DELETE /api/v1/scenario-events/{id}
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
		internalError(w, err)
		return
	}
	writeSuccess(w, map[string]string{"status": "deleted"})
}

// PATCH /api/v1/scenario-events/{id}/toggle
func (h *ScenarioEventHandler) toggle(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	var payload struct {
		IsIncluded *bool `json:"isIncluded"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	val := true
	if payload.IsIncluded != nil {
		val = *payload.IsIncluded
	}
	if err := h.store.ToggleScenarioIncluded(r.Context(), userCtx.UserID, id, val); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario toggle failed: %v", err)
		internalError(w, err)
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
