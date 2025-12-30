package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/income"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// incomeV2Input is the JSON-friendly input struct for income v2 update.
// Uses string for decimal values to avoid float64 precision loss.
type incomeV2Input struct {
	ID             string  `json:"id"`
	ParentID       string  `json:"parentId"`
	Name           string  `json:"name"`
	Earner         string  `json:"earner"`
	Category       string  `json:"category"`
	Amount         string  `json:"amount"`
	Frequency      string  `json:"frequency"`
	GrowthRate     *string `json:"growthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	UpdateMode     string  `json:"updateMode,omitempty"`
}

// IncomeV2Handler serves income v2 endpoints.
type IncomeV2Handler struct {
	store   *repo.Store
	service *income.Service
}

// NewIncomeV2Handler creates a new v2 income handler.
func NewIncomeV2Handler(store *repo.Store) *IncomeV2Handler {
	return &IncomeV2Handler{
		store:   store,
		service: income.NewService(store),
	}
}

// incomeV2CreateInput is the JSON-friendly input struct for income v2 create.
// Uses string for decimal values to avoid float64 precision loss.
type incomeV2CreateInput struct {
	Name           string  `json:"name"`
	Earner         string  `json:"earner"`
	Category       string  `json:"category"`
	Amount         string  `json:"amount"`
	Frequency      string  `json:"frequency"`
	GrowthRate     *string `json:"growthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	EndDate        *string `json:"endDate"`
	CPFWageType    string  `json:"cpfWageType"`
}

// POST /api/v2/cashflow/incomes
// HandleCreate creates a new income.
// @Summary Create an income (v2)
// @Description Creates a new income for the authenticated user
// @Tags Incomes V2
// @Accept json
// @Produce json
// @Param income body incomeV2CreateInput true "Income data"
// @Success 200 {object} repo.Income
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes [post]
func (h *IncomeV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input incomeV2CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" || input.Amount == "" || input.Frequency == "" || input.Category == "" {
		badRequest(w, errMissingFields("name, amount, frequency, category"))
		return
	}

	// Parse decimal values from strings
	amount, err := decimal.NewFromString(input.Amount)
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

	// Build repository income
	inc := repo.Income{
		Name:           input.Name,
		Earner:         input.Earner,
		Category:       input.Category,
		Amount:         *amount,
		Frequency:      input.Frequency,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		EndDate:        endDate,
		CPFWageType:    input.CPFWageType,
	}
	if growthRate != nil {
		inc.GrowthRate = *growthRate
	}

	created, err := h.store.CreateIncome(r.Context(), userID, inc)
	if err != nil {
		log.Printf("income.Create error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// GET /api/v2/cashflow/incomes
// HandleList lists incomes for the user.
// @Summary List incomes (v2)
// @Description Returns paginated incomes for the authenticated user
// @Tags Incomes V2
// @Produce json
// @Param limit query int false "Max items to return (-1 for all)"
// @Param offset query int false "Number of items to skip"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes [get]
func (h *IncomeV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	pagination := parsePaginationV2(r)
	result, err := h.store.ListIncomes(r.Context(), repo.ListQuery{
		UserID:     userID,
		DateRange:  repo.DateRangeOptions{},
		Pagination: pagination,
	})
	if err != nil {
		log.Printf("income.List error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// PUT /api/v2/cashflow/incomes/{id}
// HandleUpdate applies a versioned update to an income.
// @Summary Update an income (v2)
// @Description Updates an income with versioning support
// @Tags Incomes V2
// @Accept json
// @Produce json
// @Param id path string true "Income ID"
// @Param income body incomeV2Input true "Income data"
// @Success 200 {object} repo.Income
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes/{id} [put]
func (h *IncomeV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input incomeV2Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values from strings
	amount, err := decimal.NewFromString(input.Amount)
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
	serviceInput := income.UpdateInput{
		ID:             id,
		Name:           input.Name,
		Earner:         input.Earner,
		Category:       input.Category,
		Amount:         *amount,
		Frequency:      input.Frequency,
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
		log.Printf("income.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// DELETE /api/v2/cashflow/incomes/{id}
// HandleDelete removes an income and its children.
// @Summary Delete an income (v2)
// @Description Deletes an income and all descendant versions
// @Tags Incomes V2
// @Param id path string true "Income ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes/{id} [delete]
func (h *IncomeV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.store.DeleteIncome(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("income.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v2/cashflow/incomes/{id}/stop
// HandleStop schedules the end date for an income.
// @Summary Stop an income (v2)
// @Description Sets the endDate on an income (soft delete)
// @Tags Incomes V2
// @Accept json
// @Produce json
// @Param id path string true "Income ID"
// @Param body body stopInput true "Stop input with endDate"
// @Success 200 {object} repo.Income
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes/{id}/stop [post]
func (h *IncomeV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
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

	updated, err := h.store.StopIncome(r.Context(), userID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("income.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
