package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/cashaccount"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// cashAccountV2Input is the JSON-friendly input struct for cash account v2 update.
// Uses string for decimal values to avoid float64 precision loss.
type cashAccountV2Input struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Balance        string  `json:"balance"`
	InterestRate   *string `json:"interestRate"`
	BankName       string  `json:"bankName"`
	AccountType    string  `json:"accountType"`
	Notes          string  `json:"notes"`
	GrowthStrategy string  `json:"growthStrategy"`
	StartDate      *string `json:"startDate"`
	UpdateMode     string  `json:"updateMode,omitempty"`
}

// CashAccountV2Handler serves cash account v2 endpoints.
type CashAccountV2Handler struct {
	store   *repo.Store
	service *cashaccount.Service
}

// NewCashAccountV2Handler creates a new v2 cash account handler.
func NewCashAccountV2Handler(store *repo.Store) *CashAccountV2Handler {
	return &CashAccountV2Handler{
		store:   store,
		service: cashaccount.NewService(store),
	}
}

// PUT /api/v2/cash-accounts/{id}
// HandleUpdate updates a cash account with versioning.
func (h *CashAccountV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cashAccountV2Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values from strings
	balance, err := decimal.NewFromString(input.Balance)
	if err != nil {
		badRequest(w, err)
		return
	}

	var interestRate *decimal.Decimal
	if input.InterestRate != nil && *input.InterestRate != "" {
		ir, err := decimal.NewFromString(*input.InterestRate)
		if err != nil {
			badRequest(w, err)
			return
		}
		interestRate = ir
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
	serviceInput := cashaccount.UpdateInput{
		ID:             id,
		Name:           input.Name,
		Balance:        *balance,
		InterestRate:   interestRate,
		BankName:       input.BankName,
		AccountType:    input.AccountType,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
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
		log.Printf("cashaccount.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// DELETE /api/v2/cash-accounts/{id}
// HandleDelete removes a cash account.
func (h *CashAccountV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.service.Delete(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		if err == cashaccount.ErrCannotDeleteAccumulator {
			writeError(w, http.StatusBadRequest, "cannot_delete_accumulator", "Cannot delete cash accumulator account. Set balance to 0 instead.")
			return
		}
		log.Printf("cashaccount.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v2/cash-accounts/{id}/stop
// HandleStop sets an end date for a cash account and cascades to allocations.
func (h *CashAccountV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
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
		log.Printf("cashaccount.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
