package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/investment"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// investmentV2Input is the JSON-friendly input struct for investment v2 update.
// Uses string for decimal values to avoid float64 precision loss.
type investmentV2Input struct {
	ID             string  `json:"id"`
	ParentID       string  `json:"parentId"`
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	CurrentValue   string  `json:"currentValue"`
	GrowthRate     *string `json:"growthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	UpdateMode     string  `json:"updateMode,omitempty"`
}

// InvestmentV2Handler serves investment v2 endpoints.
type InvestmentV2Handler struct {
	store   *repo.Store
	service *investment.Service
}

// NewInvestmentV2Handler creates a new v2 investment handler.
func NewInvestmentV2Handler(store *repo.Store) *InvestmentV2Handler {
	return &InvestmentV2Handler{
		store:   store,
		service: investment.NewService(store),
	}
}

// investmentCreateInput is the JSON-friendly input struct for investment creation.
// Uses string for decimal values to avoid float64 precision loss.
type investmentCreateInput struct {
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	CurrentValue   string  `json:"currentValue"`
	GrowthRate     *string `json:"annualGrowthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	EndDate        *string `json:"endDate"`
}

// POST /api/v2/investments
// HandleCreate creates a new investment.
// @Summary Create an investment (v2)
// @Description Creates a new investment for the authenticated user
// @Tags Investments V2
// @Accept json
// @Produce json
// @Param investment body investmentCreateInput true "Investment data"
// @Success 200 {object} repo.Investment
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments [post]
func (h *InvestmentV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input investmentCreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" || input.Category == "" {
		badRequest(w, errMissingFields("name, category"))
		return
	}

	// Parse decimal values from strings
	currentValue, err := decimal.NewFromString(input.CurrentValue)
	if err != nil {
		badRequest(w, err)
		return
	}

	var growthRate *decimal.Decimal
	if input.GrowthRate != nil && *input.GrowthRate != "" {
		gr, err := decimal.NewFromString(*input.GrowthRate)
		if err != nil {
			badRequest(w, err)
			return
		}
		growthRate = gr
	}

	// Parse dates
	var startDate time.Time
	if input.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = t
	} else {
		startDate = time.Now().UTC()
	}

	var endDate *time.Time
	if input.EndDate != nil {
		t, err := time.Parse(time.RFC3339, *input.EndDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		endDate = &t
	}

	// Build repository investment
	inv := repo.Investment{
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   *currentValue,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		EndDate:        endDate,
	}
	if growthRate != nil {
		inv.GrowthRate = *growthRate
	}

	created, err := h.store.CreateInvestment(r.Context(), userID, inv)
	if err != nil {
		log.Printf("investment.Create error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// GET /api/v2/investments
// HandleList lists investments for the user.
// @Summary List investments (v2)
// @Description Returns paginated investments for the authenticated user
// @Tags Investments V2
// @Produce json
// @Param limit query int false "Max items to return (-1 for all)"
// @Param offset query int false "Number of items to skip"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments [get]
func (h *InvestmentV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	pagination := parsePaginationV2(r)
	result, err := h.store.ListInvestments(r.Context(), userID, repo.DateRangeOptions{}, pagination)
	if err != nil {
		log.Printf("investment.List error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// PUT /api/v2/investments/{id}
// HandleUpdate updates an investment with versioning and cascading rules.
// @Summary Update an investment (v2)
// @Description Updates an investment with versioning support
// @Tags Investments V2
// @Accept json
// @Produce json
// @Param id path string true "Investment ID"
// @Param investment body investmentV2Input true "Investment data"
// @Success 200 {object} repo.Investment
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments/{id} [put]
func (h *InvestmentV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input investmentV2Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values from strings
	currentValue, err := decimal.NewFromString(input.CurrentValue)
	if err != nil {
		badRequest(w, err)
		return
	}

	var growthRate *decimal.Decimal
	if input.GrowthRate != nil && *input.GrowthRate != "" {
		gr, err := decimal.NewFromString(*input.GrowthRate)
		if err != nil {
			badRequest(w, err)
			return
		}
		growthRate = gr
	}

	// Parse startDate if provided
	var startDate *time.Time
	if input.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = &t
	}

	// Build service input
	serviceInput := investment.UpdateInput{
		ID:             id,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   *currentValue,
		GrowthRate:     growthRate,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		UpdateMode:     input.UpdateMode,
	}

	// Delegate to service layer
	result, err := h.service.Update(r.Context(), userID, id, serviceInput)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("investment.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// DELETE /api/v2/investments/{id}
// HandleDelete removes an investment.
// @Summary Delete an investment (v2)
// @Description Deletes an investment and its descendant versions
// @Tags Investments V2
// @Param id path string true "Investment ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments/{id} [delete]
func (h *InvestmentV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.store.DeleteInvestment(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("investment.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v2/investments/{id}/stop
// HandleStop sets an end date for an investment and cascades to income allocations.
// @Summary Stop an investment (v2)
// @Description Sets the endDate on an investment (soft delete) and cascades to allocations
// @Tags Investments V2
// @Accept json
// @Produce json
// @Param id path string true "Investment ID"
// @Param body body stopInput true "Stop input with endDate"
// @Success 200 {object} repo.Investment
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments/{id}/stop [post]
func (h *InvestmentV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input stopInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	if input.EndDate == "" {
		badRequest(w, errMissingFields("endDate"))
		return
	}

	endDate, err := time.Parse(time.RFC3339, input.EndDate)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Delegate to service which handles cascade stop
	updated, err := h.service.Stop(r.Context(), userID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("investment.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
