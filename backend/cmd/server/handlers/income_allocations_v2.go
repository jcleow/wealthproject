package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// IncomeAllocationV2Handler serves v2 income allocation endpoints using pgx.
type IncomeAllocationV2Handler struct {
	store *repo.Store
}

// NewIncomeAllocationV2Handler constructs a v2 handler.
func NewIncomeAllocationV2Handler(store *repo.Store) *IncomeAllocationV2Handler {
	return &IncomeAllocationV2Handler{store: store}
}

// incomeAllocationV2DTO is the JSON response structure.
type incomeAllocationV2DTO struct {
	ID                  string  `json:"id"`
	IncomeID            string  `json:"incomeId"`
	ParentID            string  `json:"parentId"`
	StartDate           string  `json:"startDate"`
	EndDate             *string `json:"endDate,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	AllocationType      string  `json:"allocationType"`
	AllocationValue     float64 `json:"allocationValue"`
	CreatedAt           string  `json:"createdAt"`
}

func toIncomeAllocationV2DTO(a repo.IncomeAllocation) incomeAllocationV2DTO {
	dto := incomeAllocationV2DTO{
		ID:                  a.ID,
		IncomeID:            a.IncomeID,
		ParentID:            a.ParentID,
		StartDate:           a.StartDate.Format("2006-01-02T15:04:05Z07:00"),
		TargetCashAccountID: a.TargetCashAccountID,
		TargetInvestmentID:  a.TargetInvestmentID,
		AllocationType:      a.AllocationType,
		AllocationValue:     a.AllocationValue.ToFloat64(),
		CreatedAt:           a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if a.EndDate != nil {
		endDateStr := a.EndDate.Format("2006-01-02T15:04:05Z07:00")
		dto.EndDate = &endDateStr
	}
	return dto
}

// HandleListAll handles GET /income-allocations - list all allocations for the user.
// Query params:
//   - targetType: "investment" or "cash_account" to filter by target type
func (h *IncomeAllocationV2Handler) HandleListAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	targetType := r.URL.Query().Get("targetType")

	allocations, err := h.store.ListAllIncomeAllocations(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	dtos := make([]incomeAllocationV2DTO, 0, len(allocations))
	for _, a := range allocations {
		// Filter by target type if specified
		if targetType == "investment" && a.TargetInvestmentID == nil {
			continue
		}
		if targetType == "cash_account" && a.TargetCashAccountID == nil {
			continue
		}

		dtos = append(dtos, toIncomeAllocationV2DTO(a))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

// HandleListByIncome handles GET /incomes/{incomeId}/allocations - list allocations for a specific income.
func (h *IncomeAllocationV2Handler) HandleListByIncome(w http.ResponseWriter, r *http.Request, incomeID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	allocations, err := h.store.ListIncomeAllocations(r.Context(), userID, incomeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	dtos := make([]incomeAllocationV2DTO, len(allocations))
	for i, a := range allocations {
		dtos[i] = toIncomeAllocationV2DTO(a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

// incomeAllocationCreateDTO is the JSON input structure for create/update.
type incomeAllocationCreateDTO struct {
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	AllocationType      string  `json:"allocationType"`
	AllocationValue     float64 `json:"allocationValue"`
}

// HandleCreate handles POST /incomes/{incomeId}/allocations - create a new allocation.
func (h *IncomeAllocationV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request, incomeID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input incomeAllocationCreateDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	// Validate: exactly one target must be set
	hasCashAccount := input.TargetCashAccountID != nil && *input.TargetCashAccountID != ""
	hasInvestment := input.TargetInvestmentID != nil && *input.TargetInvestmentID != ""
	if hasCashAccount == hasInvestment {
		writeError(w, http.StatusBadRequest, "bad_request", "exactly one of targetCashAccountId or targetInvestmentId must be provided")
		return
	}

	if input.AllocationType != "percentage" && input.AllocationType != "fixed" {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationType must be 'percentage' or 'fixed'")
		return
	}

	if input.AllocationValue <= 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationValue must be positive")
		return
	}

	if input.AllocationType == "percentage" && input.AllocationValue > 100 {
		writeError(w, http.StatusBadRequest, "bad_request", "percentage allocationValue must be between 0 and 100")
		return
	}

	allocation := repo.IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		AllocationType:      input.AllocationType,
		AllocationValue:     *decimal.MustFromFloat64(input.AllocationValue),
	}

	created, err := h.store.CreateIncomeAllocation(r.Context(), userID, allocation)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toIncomeAllocationV2DTO(*created))
}

// HandleUpdate handles PUT /incomes/{incomeId}/allocations/{allocId} - update an allocation.
func (h *IncomeAllocationV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input incomeAllocationCreateDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	// Validate: exactly one target must be set
	hasCashAccount := input.TargetCashAccountID != nil && *input.TargetCashAccountID != ""
	hasInvestment := input.TargetInvestmentID != nil && *input.TargetInvestmentID != ""
	if hasCashAccount == hasInvestment {
		writeError(w, http.StatusBadRequest, "bad_request", "exactly one of targetCashAccountId or targetInvestmentId must be provided")
		return
	}

	if input.AllocationType != "percentage" && input.AllocationType != "fixed" {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationType must be 'percentage' or 'fixed'")
		return
	}

	if input.AllocationValue <= 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationValue must be positive")
		return
	}

	if input.AllocationType == "percentage" && input.AllocationValue > 100 {
		writeError(w, http.StatusBadRequest, "bad_request", "percentage allocationValue must be between 0 and 100")
		return
	}

	allocation := repo.IncomeAllocation{
		ID:                  allocID,
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		AllocationType:      input.AllocationType,
		AllocationValue:     *decimal.MustFromFloat64(input.AllocationValue),
	}

	updated, err := h.store.UpdateIncomeAllocation(r.Context(), userID, allocation)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toIncomeAllocationV2DTO(*updated))
}

// HandleDelete handles DELETE /incomes/{incomeId}/allocations/{allocId} - delete an allocation.
func (h *IncomeAllocationV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteIncomeAllocation(r.Context(), userID, allocID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// stopAllocationDTO is the JSON input for stopping an allocation at a future date.
type stopAllocationDTO struct {
	EndDate string `json:"endDate"` // ISO 8601 format (e.g., "2031-03-31T23:59:59Z")
}

// HandleStop handles POST /incomes/{incomeId}/allocations/{allocId}/stop - set end_date.
// This "stops" an allocation at a future point without deleting the original record.
func (h *IncomeAllocationV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input stopAllocationDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	if input.EndDate == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "endDate is required")
		return
	}

	endDate, err := time.Parse(time.RFC3339, input.EndDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "endDate must be in ISO 8601 format (e.g., 2031-03-31T23:59:59Z)")
		return
	}

	updated, err := h.store.SetIncomeAllocationEndDate(r.Context(), userID, allocID, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "allocation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toIncomeAllocationV2DTO(*updated))
}
