package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"financial-chat-system/backend/internal/common"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// ScenarioEventV2Handler serves v2 scenario event endpoints with typed FK columns.
type ScenarioEventV2Handler struct {
	store *repo.Store
}

// NewScenarioEventV2Handler constructs a v2 handler.
func NewScenarioEventV2Handler(store *repo.Store) *ScenarioEventV2Handler {
	return &ScenarioEventV2Handler{store: store}
}

// --- V2 DTOs with typed target fields ---

type scenarioImpactV2DTO struct {
	ImpactKind string           `json:"impactKind"`          // Required: start, delta, override, stop
	TargetType string           `json:"targetType"`          // Required: asset, liability, income, expense, cash, investment
	ParentID   *string          `json:"parentId,omitempty"`  // Required for delta/override/stop (ID of existing item to modify)
	Amount     *string          `json:"amount,omitempty"`    // Amount as string (e.g., "5000"), converted to decimal internally
	Cadence    common.Frequency `json:"cadence,omitempty"`   // Frequency for delta impacts (stored in DB)
	Currency   string           `json:"currency,omitempty"`  // Currency (derived field for response)
	StartDate  string           `json:"startDate,omitempty"` // Start date for the item
	EndDate    *string          `json:"endDate,omitempty"`   // End date for the item
	Name       *string          `json:"name,omitempty"`      // Name for start impacts (creates new item with this name)
	Frequency  *string          `json:"frequency,omitempty"` // Frequency for income/expense items
	Notes      *string          `json:"notes,omitempty"`     // Notes for the financial item
	DeltaType  *string          `json:"deltaType,omitempty"` // 'absolute' or 'percentage' - only for delta impacts

	// Advanced fields for start impacts - used to configure the created financial item
	Category       *string  `json:"category,omitempty"`       // Category for the created financial item
	GrowthRate     *float64 `json:"growthRate,omitempty"`     // Growth rate (%) - applied based on growth strategy
	GrowthStrategy *string  `json:"growthStrategy,omitempty"` // How growth is applied (none, annual_step, compound)

	// Liability-specific fields for start impacts
	InterestRate   *float64 `json:"interestRate,omitempty"`   // APR % for liabilities
	MinimumPayment *int64   `json:"minimumPayment,omitempty"` // Min payment for liabilities
}

type scenarioEventV2DTO struct {
	ID           string                `json:"id,omitempty"`
	Name         string                `json:"name"`
	Description  *string               `json:"description,omitempty"`
	OccursOn     string                `json:"occursOn"`
	DisplayIcon  string                `json:"displayIcon"`
	DisplayColor string                `json:"displayColor"`
	Tags         []string              `json:"tags"`
	ScenarioID   *string               `json:"scenarioId,omitempty"`
	IsIncluded   bool                  `json:"isIncluded"`
	Impacts      []scenarioImpactV2DTO `json:"impacts"`
}

// --- Handler Methods ---

// POST /api/v2/scenario-events
// HandleCreate creates a new scenario event.
// @Summary Create scenario event (v2)
// @Description Create a new scenario event with typed FK impacts
// @Tags Scenario Events V2
// @Accept json
// @Produce json
// @Param body body scenarioEventV2DTO true "Scenario event"
// @Success 201 {object} scenarioEventV2DTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events [post]
func (h *ScenarioEventV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}

	var payload scenarioEventV2DTO
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	ev, err := buildScenarioEventV2(userCtx.UserID, payload)
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.store.CreateScenarioEventV2(r.Context(), ev)
	if err != nil {
		log.Printf("scenario v2 create failed: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, toScenarioEventV2DTO(created))
}

// GET /api/v2/scenario-events
// HandleList lists scenario events.
// @Summary List scenario events (v2)
// @Description List all scenario events with pagination and filtering
// @Tags Scenario Events V2
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Param year query int false "Filter by year"
// @Param included query bool false "Filter by included status"
// @Param tags query string false "Filter by tags (comma-separated)"
// @Param q query string false "Search query"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events [get]
func (h *ScenarioEventV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
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

	filters := repo.ScenarioFilters{
		IncludedOnly: included,
		Tags:         tags,
		Year:         year,
		Search:       strings.TrimSpace(r.URL.Query().Get("q")),
		Limit:        limit,
		Offset:       offset,
	}

	events, total, err := h.store.ListScenarioEventsV2(r.Context(), userCtx.UserID, filters)
	if err != nil {
		log.Printf("scenario v2 list failed: %v", err)
		internalError(w, err)
		return
	}

	items := make([]scenarioEventV2DTO, 0, len(events))
	for _, ev := range events {
		items = append(items, toScenarioEventV2DTO(ev))
	}

	resp := map[string]interface{}{
		"items":     items,
		"total":     total,
		"page":      page,
		"page_size": limit,
	}
	writeJSON(w, resp)
}

// GET /api/v2/scenario-events/{id}
// HandleGet gets a single scenario event.
// @Summary Get scenario event (v2)
// @Description Get a scenario event by ID
// @Tags Scenario Events V2
// @Produce json
// @Param id path string true "Event ID"
// @Success 200 {object} scenarioEventV2DTO
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events/{id} [get]
func (h *ScenarioEventV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	ev, err := h.store.GetScenarioEventV2(r.Context(), userCtx.UserID, id)
	if err != nil {
		if errors.Is(err, repo.ErrScenarioNotFound) {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	writeJSON(w, toScenarioEventV2DTO(ev))
}

// PUT /api/v2/scenario-events/{id}
// HandleUpdate updates a scenario event.
// @Summary Update scenario event (v2)
// @Description Update a scenario event by ID
// @Tags Scenario Events V2
// @Accept json
// @Produce json
// @Param id path string true "Event ID"
// @Param body body scenarioEventV2DTO true "Scenario event"
// @Success 200 {object} scenarioEventV2DTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events/{id} [put]
func (h *ScenarioEventV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	var payload scenarioEventV2DTO
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	ev, err := buildScenarioEventV2(userCtx.UserID, payload)
	if err != nil {
		badRequest(w, err)
		return
	}
	ev.ID = id

	updated, err := h.store.UpdateScenarioEventV2(r.Context(), ev)
	if err != nil {
		if errors.Is(err, repo.ErrScenarioNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario v2 update failed: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, toScenarioEventV2DTO(updated))
}

// DELETE /api/v2/scenario-events/{id}
// HandleDelete deletes a scenario event.
// @Summary Delete scenario event (v2)
// @Description Delete a scenario event by ID
// @Tags Scenario Events V2
// @Param id path string true "Event ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events/{id} [delete]
func (h *ScenarioEventV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())
	if userCtx.UserID == "" {
		badRequest(w, errors.New("missing user context"))
		return
	}
	if err := h.store.DeleteScenarioEventV2(r.Context(), userCtx.UserID, id); err != nil {
		if errors.Is(err, repo.ErrScenarioNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario v2 delete failed: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, map[string]string{"status": "deleted"})
}

// PATCH /api/v2/scenario-events/{id}/toggle
// HandleToggle toggles the included status.
// @Summary Toggle scenario included status (v2)
// @Description Toggle whether a scenario is included in projections
// @Tags Scenario Events V2
// @Accept json
// @Produce json
// @Param id path string true "Event ID"
// @Param body body map[string]bool true "Toggle payload"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/scenario-events/{id}/toggle [patch]
func (h *ScenarioEventV2Handler) HandleToggle(w http.ResponseWriter, r *http.Request, id string) {
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
	if err := h.store.ToggleScenarioIncludedV2(r.Context(), userCtx.UserID, id, val); err != nil {
		if errors.Is(err, repo.ErrScenarioNotFound) {
			notFound(w)
			return
		}
		log.Printf("scenario v2 toggle failed: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, map[string]bool{"isIncluded": val})
}

// --- Helper Functions (generic utilities only) ---

func ptrOrNil(s string) *string {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func parseIntDefault(s string, defaultVal int) int {
	if strings.TrimSpace(s) == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
