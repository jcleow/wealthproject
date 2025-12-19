package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
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
	ImpactKind string           `json:"impactKind"`
	Amount     int64            `json:"amount"`
	Currency   string           `json:"currency"`
	Cadence    common.Frequency `json:"cadence"`
	StartDate  string           `json:"startDate"`
	EndDate    *string          `json:"endDate,omitempty"`
	Notes      *string          `json:"notes,omitempty"`

	// Typed target IDs (only one should be set per impact)
	TargetAssetID       *string `json:"targetAssetId,omitempty"`
	TargetLiabilityID   *string `json:"targetLiabilityId,omitempty"`
	TargetIncomeID      *string `json:"targetIncomeId,omitempty"`
	TargetExpenseID     *string `json:"targetExpenseId,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`

	// Computed field for convenience (read-only in response)
	TargetType string  `json:"targetType,omitempty"`
	TargetID   *string `json:"targetId,omitempty"`
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
	targetID := imp.TargetID()
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
		TargetID:            targetID,
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

	// Debug log the incoming payload
	for i, imp := range payload.Impacts {
		log.Printf("scenario v2 update: impact[%d] targetIncomeId=%v targetType=%s targetId=%v",
			i, imp.TargetIncomeID, imp.TargetType, imp.TargetID)
	}

	ev, err := buildScenarioEventV2(userCtx.UserID, payload)
	if err != nil {
		badRequest(w, err)
		return
	}
	ev.ID = id

	// Debug log the built impacts
	for i, imp := range ev.Impacts {
		log.Printf("scenario v2 update: built impact[%d] TargetIncomeID=%v TargetType=%s",
			i, imp.TargetIncomeID, imp.TargetType())
	}

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

type impactTarget struct {
	targetType string
	targetID   string
}

func resolveImpactTarget(in scenarioImpactV2DTO) (impactTarget, error) {
	typedTargets := make([]impactTarget, 0, 1)

	addTypedTarget := func(val *string, targetType string) {
		if t := scenario.NonEmptyPtr(val); t != nil {
			typedTargets = append(typedTargets, impactTarget{
				targetType: targetType,
				targetID:   strings.TrimSpace(*t),
			})
		}
	}

	addTypedTarget(in.TargetAssetID, "asset")
	addTypedTarget(in.TargetLiabilityID, "liability")
	addTypedTarget(in.TargetIncomeID, "income")
	addTypedTarget(in.TargetExpenseID, "expense")
	addTypedTarget(in.TargetCashAccountID, "cash")
	addTypedTarget(in.TargetInvestmentID, "investment")

	if len(typedTargets) > 1 {
		return impactTarget{}, scenario.ErrInvalidTargetCount
	}
	if len(typedTargets) == 1 {
		if !scenario.IsValidTargetType(typedTargets[0].targetType) {
			return impactTarget{}, scenario.ErrInvalidTargetType
		}
		return typedTargets[0], nil
	}

	targetID := scenario.NonEmptyPtr(in.TargetID)
	targetType := strings.ToLower(strings.TrimSpace(in.TargetType))
	if targetID == nil || targetType == "" {
		return impactTarget{}, scenario.ErrInvalidTargetCount
	}
	if !scenario.IsValidTargetType(targetType) {
		return impactTarget{}, scenario.ErrInvalidTargetType
	}

	return impactTarget{
		targetType: targetType,
		targetID:   strings.TrimSpace(*targetID),
	}, nil
}

func buildImpactsV2FromDTO(reqs []scenarioImpactV2DTO) ([]repo.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return nil, errors.New("scenario event must have at least one impact")
	}

	impacts := make([]repo.ScenarioImpact, 0, len(reqs))
	for _, in := range reqs {
		impact, err := buildImpactV2(in)
		if err != nil {
			return nil, err
		}
		impacts = append(impacts, impact)
	}

	return impacts, nil
}

func buildImpactV2(in scenarioImpactV2DTO) (repo.ScenarioImpact, error) {
	ik, cad, err := normalizeImpactKindAndCadence(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	start, end, err := parseImpactDates(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	target, err := resolveImpactTarget(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	impact := repo.ScenarioImpact{
		ImpactKind: ik,
		Amount:     in.Amount,
		Currency:   strings.ToUpper(strings.TrimSpace(in.Currency)),
		Cadence:    cad,
		StartDate:  start,
		EndDate:    end,
		Notes:      strings.TrimSpace(scenario.PtrOrEmpty(in.Notes)),
	}

	return impactWithTarget(impact, target)
}

func normalizeImpactKindAndCadence(in scenarioImpactV2DTO) (string, common.Frequency, error) {
	ik, err := scenario.NormalizeImpactKind(in.ImpactKind)
	if err != nil {
		return "", "", err
	}
	cad, err := scenario.NormalizeCadence(in.Cadence)
	if err != nil {
		return "", "", err
	}
	// Validate cadence is appropriate for the impact kind
	// Delta impacts require monthly/annual (recurring), others are implicitly one-time
	if err := scenario.ValidateCadenceForImpactKind(ik, cad); err != nil {
		return "", "", err
	}
	return ik, cad, nil
}

func parseImpactDates(in scenarioImpactV2DTO) (time.Time, *time.Time, error) {
	if strings.TrimSpace(in.StartDate) == "" {
		return time.Time{}, nil, scenario.ErrMissingStartDate
	}

	start, err := scenario.ParseMonthStart(in.StartDate)
	if err != nil {
		return time.Time{}, nil, scenario.ErrInvalidStartDate
	}

	endDateStr := scenario.PtrOrEmpty(in.EndDate)
	if strings.TrimSpace(endDateStr) == "" {
		log.Printf("parseImpactDates: startDate=%s endDate=nil (empty)", in.StartDate)
		return start, nil, nil
	}

	val, err := scenario.ParseMonthStart(endDateStr)
	if err != nil {
		return time.Time{}, nil, scenario.ErrInvalidEndDate
	}
	log.Printf("parseImpactDates: startDate=%s (%v) endDate=%s (%v) before=%v",
		in.StartDate, start, endDateStr, val, val.Before(start))
	if val.Before(start) {
		return time.Time{}, nil, scenario.ErrEndDateBeforeStart
	}
	return start, &val, nil
}

func assignImpactTarget(impact *repo.ScenarioImpact, target impactTarget) error {
	id := target.targetID

	switch target.targetType {
	case "asset":
		impact.TargetAssetID = &id
	case "liability":
		impact.TargetLiabilityID = &id
	case "income":
		impact.TargetIncomeID = &id
	case "expense":
		impact.TargetExpenseID = &id
	case "cash":
		impact.TargetCashAccountID = &id
	case "investment":
		impact.TargetInvestmentID = &id
	default:
		return scenario.ErrInvalidTargetType
	}

	return nil
}

func impactWithTarget(impact repo.ScenarioImpact, target impactTarget) (repo.ScenarioImpact, error) {
	if err := assignImpactTarget(&impact, target); err != nil {
		return repo.ScenarioImpact{}, err
	}
	return impact, nil
}

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
