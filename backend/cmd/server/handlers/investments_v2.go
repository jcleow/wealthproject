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

// HandleUpdate handles PUT /api/v2/investments/{id}
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

// HandleDelete handles DELETE /api/v2/investments/{id}
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

// HandleStop handles POST /api/v2/investments/{id}/stop
// This will cascade stop to any income allocations targeting this investment.
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
