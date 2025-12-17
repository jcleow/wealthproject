package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/liability"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// liabilityInput is the JSON-friendly input struct for liability update.
// Uses string for decimal values to avoid float64 precision loss.
type liabilityInput struct {
	ID                string  `json:"id"`
	ParentID          string  `json:"parentId"`
	Name              string  `json:"name"`
	Category          string  `json:"category"`
	CurrentBalance    string  `json:"currentBalance"`
	InterestRateAPR   *string `json:"interestRateApr"`
	MinimumPayment    *string `json:"minimumPayment"`
	GrowthStrategy    string  `json:"growthStrategy"`
	RepaymentStrategy string  `json:"repaymentStrategy"`
	Notes             string  `json:"notes"`
	StartDate         *string `json:"startDate"`
	UpdateMode        string  `json:"updateMode,omitempty"`
}

// LiabilityV2Handler serves liability CRUD endpoints for v2 API.
type LiabilityV2Handler struct {
	store   *repo.Store
	service *liability.Service
}

// NewLiabilityV2Handler creates a new v2 liability handler.
func NewLiabilityV2Handler(store *repo.Store) *LiabilityV2Handler {
	return &LiabilityV2Handler{
		store:   store,
		service: liability.NewService(store),
	}
}

// liabilityCreateInput is the JSON input for creating a liability
type liabilityCreateInput struct {
	Name              string  `json:"name"`
	Category          string  `json:"category"`
	CurrentBalance    string  `json:"currentBalance"`
	InterestRateAPR   *string `json:"interestRateApr"`
	MinimumPayment    *string `json:"minimumPayment"`
	GrowthStrategy    string  `json:"growthStrategy"`
	RepaymentStrategy string  `json:"repaymentStrategy"`
	Notes             string  `json:"notes"`
	StartDate         *string `json:"startDate"`
	EndDate           *string `json:"endDate"`
}

// POST /api/v2/liabilities
// HandleCreate creates a new liability and auto-creates a linked expense.
// @Summary Create a liability (v2)
// @Description Creates a new liability. If minimumPayment > 0, automatically creates a linked expense for debt repayment.
// @Tags Liabilities V2
// @Accept json
// @Produce json
// @Param liability body liabilityCreateInput true "Liability to create"
// @Success 201 {object} repo.Liability
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/liabilities [post]
func (h *LiabilityV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	var input liabilityCreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" || input.Category == "" {
		badRequest(w, errMissingFields("name, category"))
		return
	}

	// Parse decimal values
	var currentBalance decimal.Decimal
	if input.CurrentBalance != "" {
		cb, err := decimal.NewFromString(input.CurrentBalance)
		if err != nil {
			badRequest(w, err)
			return
		}
		currentBalance = *cb
	}

	var interestRateAPR *decimal.Decimal
	if input.InterestRateAPR != nil && *input.InterestRateAPR != "" {
		ir, err := decimal.NewFromString(*input.InterestRateAPR)
		if err != nil {
			badRequest(w, err)
			return
		}
		interestRateAPR = ir
	}

	var minimumPayment *decimal.Decimal
	if input.MinimumPayment != nil && *input.MinimumPayment != "" {
		mp, err := decimal.NewFromString(*input.MinimumPayment)
		if err != nil {
			badRequest(w, err)
			return
		}
		minimumPayment = mp
	}

	var startDate *time.Time
	if input.StartDate != nil && *input.StartDate != "" {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = &t
	}

	var endDate *time.Time
	if input.EndDate != nil && *input.EndDate != "" {
		t, err := time.Parse(time.RFC3339, *input.EndDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		endDate = &t
	}

	// Build service input and delegate to service layer
	serviceInput := liability.CreateInput{
		Name:              input.Name,
		Category:          input.Category,
		CurrentBalance:    currentBalance,
		InterestRateAPR:   interestRateAPR,
		MinimumPayment:    minimumPayment,
		GrowthStrategy:    input.GrowthStrategy,
		RepaymentStrategy: input.RepaymentStrategy,
		Notes:             input.Notes,
		StartDate:         startDate,
		EndDate:           endDate,
	}

	created, err := h.service.Create(r.Context(), userCtx.UserID, serviceInput)
	if err != nil {
		log.Printf("liability.Create error: %v", err)
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

// PUT /api/v2/liabilities/{id}
// HandleUpdate updates a liability with versioning.
func (h *LiabilityV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())

	var input liabilityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values from strings
	currentBalance, err := decimal.NewFromString(input.CurrentBalance)
	if err != nil {
		badRequest(w, err)
		return
	}

	var interestRateAPR *decimal.Decimal
	if input.InterestRateAPR != nil && *input.InterestRateAPR != "" {
		ir, err := decimal.NewFromString(*input.InterestRateAPR)
		if err != nil {
			badRequest(w, err)
			return
		}
		interestRateAPR = ir
	}

	var minimumPayment *decimal.Decimal
	if input.MinimumPayment != nil && *input.MinimumPayment != "" {
		mp, err := decimal.NewFromString(*input.MinimumPayment)
		if err != nil {
			badRequest(w, err)
			return
		}
		minimumPayment = mp
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
	serviceInput := liability.UpdateInput{
		ID:                id,
		Name:              input.Name,
		Category:          input.Category,
		CurrentBalance:    *currentBalance,
		InterestRateAPR:   interestRateAPR,
		MinimumPayment:    minimumPayment,
		GrowthStrategy:    input.GrowthStrategy,
		RepaymentStrategy: input.RepaymentStrategy,
		Notes:             input.Notes,
		StartDate:         startDate,
		UpdateMode:        input.UpdateMode,
	}

	// Delegate to service layer
	result, err := h.service.Update(r.Context(), userCtx.UserID, id, serviceInput)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("liability.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// DELETE /api/v2/liabilities/{id}
// HandleDelete removes a liability.
func (h *LiabilityV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())

	if err := h.store.DeleteLiability(r.Context(), userCtx.UserID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("liability.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v2/liabilities/{id}/stop
// HandleStop sets an end date for a liability.
func (h *LiabilityV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
	userCtx := middleware.GetUserContext(r.Context())

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

	updated, err := h.store.StopLiability(r.Context(), userCtx.UserID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("liability.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
