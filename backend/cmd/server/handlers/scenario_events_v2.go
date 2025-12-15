package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
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
	ImpactKind string  `json:"impactKind"`
	Amount     int64   `json:"amount"`
	Currency   string  `json:"currency"`
	Cadence    string  `json:"cadence"`
	StartDate  string  `json:"startDate"`
	EndDate    *string `json:"endDate,omitempty"`
	Notes      *string `json:"notes,omitempty"`

	// Typed target IDs (only one should be set per impact)
	TargetAssetID       *string `json:"targetAssetId,omitempty"`
	TargetLiabilityID   *string `json:"targetLiabilityId,omitempty"`
	TargetIncomeID      *string `json:"targetIncomeId,omitempty"`
	TargetExpenseID     *string `json:"targetExpenseId,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`

	// Computed field for convenience (read-only in response)
	TargetType string `json:"targetType,omitempty"`
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

func toScenarioImpactV2DTO(imp repo.ScenarioImpact) scenarioImpactV2DTO {
	var end *string
	if imp.EndDate != nil {
		val := imp.EndDate.Format(time.DateOnly)
		end = &val
	}
	var notes *string
	if strings.TrimSpace(imp.Notes) != "" {
		val := imp.Notes
		notes = &val
	}
	return scenarioImpactV2DTO{
		ImpactKind:          imp.ImpactKind,
		Amount:              imp.Amount,
		Currency:            imp.Currency,
		Cadence:             imp.Cadence,
		StartDate:           imp.StartDate.Format(time.DateOnly),
		EndDate:             end,
		Notes:               notes,
		TargetAssetID:       imp.TargetAssetID,
		TargetLiabilityID:   imp.TargetLiabilityID,
		TargetIncomeID:      imp.TargetIncomeID,
		TargetExpenseID:     imp.TargetExpenseID,
		TargetCashAccountID: imp.TargetCashAccountID,
		TargetInvestmentID:  imp.TargetInvestmentID,
		TargetType:          imp.TargetType(),
	}
}

func toScenarioEventV2DTO(ev repo.ScenarioEvent) scenarioEventV2DTO {
	displayColor := ""
	if ev.DisplayColor != nil {
		displayColor = *ev.DisplayColor
	}
	dto := scenarioEventV2DTO{
		ID:           ev.ID,
		Name:         ev.Name,
		Description:  ptrOrNil(ev.Description),
		OccursOn:     ev.OccursOn.Format(time.DateOnly),
		DisplayIcon:  ev.DisplayIcon,
		DisplayColor: displayColor,
		Tags:         ev.Tags,
		ScenarioID:   ev.ScenarioID,
		IsIncluded:   ev.IsIncluded,
	}
	if len(ev.Impacts) > 0 {
		dto.Impacts = make([]scenarioImpactV2DTO, 0, len(ev.Impacts))
		for _, imp := range ev.Impacts {
			dto.Impacts = append(dto.Impacts, toScenarioImpactV2DTO(imp))
		}
	}
	return dto
}

// --- Handler Methods ---

// HandleCreate creates a new scenario event
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

// HandleList lists scenario events
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

// HandleGet gets a single scenario event
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

// HandleUpdate updates a scenario event
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

// HandleDelete deletes a scenario event
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

// HandleToggle toggles the included status
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

// --- Helper Functions ---

func buildScenarioEventV2(userID string, dto scenarioEventV2DTO) (repo.ScenarioEvent, error) {
	if strings.TrimSpace(dto.Name) == "" || strings.TrimSpace(dto.DisplayIcon) == "" || strings.TrimSpace(dto.OccursOn) == "" {
		return repo.ScenarioEvent{}, errMissingFields("name, occursOn, displayIcon")
	}
	occursOn, err := scenario.ParseDateOrMonth(dto.OccursOn)
	if err != nil {
		return repo.ScenarioEvent{}, errors.New("invalid occursOn; expected YYYY-MM-DD or YYYY-MM")
	}
	impacts, err := buildImpactsV2FromDTO(dto.Impacts)
	if err != nil {
		return repo.ScenarioEvent{}, err
	}
	color := strings.TrimSpace(dto.DisplayColor)
	if color == "" {
		color = "#0ea5e9"
	}
	ev := repo.ScenarioEvent{
		UserID:      userID,
		Name:        strings.TrimSpace(dto.Name),
		Description: strings.TrimSpace(scenario.PtrOrEmpty(dto.Description)),
		OccursOn:    occursOn,
		DisplayIcon: strings.TrimSpace(dto.DisplayIcon),
		DisplayColor: func() *string {
			c := color
			return &c
		}(),
		Tags:       dto.Tags,
		IsIncluded: dto.IsIncluded,
		Impacts:    impacts,
	}
	if dto.ScenarioID != nil && strings.TrimSpace(*dto.ScenarioID) != "" {
		val := strings.TrimSpace(*dto.ScenarioID)
		ev.ScenarioID = &val
	}
	return ev, nil
}

func buildImpactsV2FromDTO(reqs []scenarioImpactV2DTO) ([]repo.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return []repo.ScenarioImpact{}, nil
	}
	var impacts []repo.ScenarioImpact

	for _, in := range reqs {
		ik, err := scenario.NormalizeImpactKind(in.ImpactKind)
		if err != nil {
			return nil, err
		}
		cad, err := scenario.NormalizeCadence(in.Cadence)
		if err != nil {
			return nil, err
		}

		if strings.TrimSpace(in.StartDate) == "" {
			return nil, scenario.ErrMissingStartDate
		}
		start, err := scenario.ParseMonthStart(in.StartDate)
		if err != nil {
			return nil, scenario.ErrInvalidStartDate
		}
		var end *time.Time
		if strings.TrimSpace(scenario.PtrOrEmpty(in.EndDate)) != "" {
			val, err := scenario.ParseMonthStart(scenario.PtrOrEmpty(in.EndDate))
			if err != nil {
				return nil, scenario.ErrInvalidEndDate
			}
			end = &val
		}

		// Validate exactly one target is set
		targetCount := 0
		if in.TargetAssetID != nil && *in.TargetAssetID != "" {
			targetCount++
		}
		if in.TargetLiabilityID != nil && *in.TargetLiabilityID != "" {
			targetCount++
		}
		if in.TargetIncomeID != nil && *in.TargetIncomeID != "" {
			targetCount++
		}
		if in.TargetExpenseID != nil && *in.TargetExpenseID != "" {
			targetCount++
		}
		if in.TargetCashAccountID != nil && *in.TargetCashAccountID != "" {
			targetCount++
		}
		if in.TargetInvestmentID != nil && *in.TargetInvestmentID != "" {
			targetCount++
		}
		if targetCount != 1 {
			return nil, scenario.ErrInvalidTargetCount
		}

		impact := repo.ScenarioImpact{
			ImpactKind:          ik,
			Amount:              in.Amount,
			Currency:            strings.ToUpper(strings.TrimSpace(in.Currency)),
			Cadence:             cad,
			StartDate:           start,
			EndDate:             end,
			Notes:               strings.TrimSpace(scenario.PtrOrEmpty(in.Notes)),
			TargetAssetID:       scenario.NonEmptyPtr(in.TargetAssetID),
			TargetLiabilityID:   scenario.NonEmptyPtr(in.TargetLiabilityID),
			TargetIncomeID:      scenario.NonEmptyPtr(in.TargetIncomeID),
			TargetExpenseID:     scenario.NonEmptyPtr(in.TargetExpenseID),
			TargetCashAccountID: scenario.NonEmptyPtr(in.TargetCashAccountID),
			TargetInvestmentID:  scenario.NonEmptyPtr(in.TargetInvestmentID),
		}

		impacts = append(impacts, impact)
	}

	return impacts, nil
}
