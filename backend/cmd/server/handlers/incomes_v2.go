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
	Source         string  `json:"source"`
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

// HandleUpdate handles PUT /api/v2/incomes/{id}
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
		Source:         input.Source,
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

// HandleDelete handles DELETE /api/v2/incomes/{id}
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

// HandleStop handles POST /api/v2/incomes/{id}/stop
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
