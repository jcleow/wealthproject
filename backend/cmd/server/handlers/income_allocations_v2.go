package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// IncomeAllocationV2Handler serves v2 income allocation endpoints using pgx.
//
// NOTE: CPF allocations managed here are for VOLUNTARY transfers only (SRS, voluntary top-ups).
// Mandatory CPF contributions are computed dynamically in the timeline engine based on
// current CPF rates, age brackets, and wage ceilings - not stored as fund flow rules.
type IncomeAllocationV2Handler struct {
	store *repo.Store
}

// NewIncomeAllocationV2Handler constructs a v2 handler.
func NewIncomeAllocationV2Handler(store *repo.Store) *IncomeAllocationV2Handler {
	return &IncomeAllocationV2Handler{store: store}
}

// incomeAllocationV2DTO is the JSON response structure.
// Uses string for decimal values to avoid float64 precision loss.
type incomeAllocationV2DTO struct {
	ID                  string  `json:"id"`
	IncomeID            string  `json:"incomeId"`
	ParentID            string  `json:"parentId"`
	StartDate           string  `json:"startDate"`
	EndDate             *string `json:"endDate,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	TargetCpfAccountID  *string `json:"targetCpfAccountId,omitempty"`
	AllocationType      string  `json:"allocationType"`
	AllocationValue     string  `json:"allocationValue"`
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
		TargetCpfAccountID:  a.TargetCpfAccountID,
		AllocationType:      a.AllocationType,
		AllocationValue:     a.AllocationValue.String(),
		CreatedAt:           a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if a.EndDate != nil {
		endDateStr := a.EndDate.Format("2006-01-02T15:04:05Z07:00")
		dto.EndDate = &endDateStr
	}
	return dto
}

// GET /api/v2/income-allocations
// HandleListAll lists all income allocations for the user.
// Query params:
//   - targetType: "investment", "cash_account", or "cpf_account" to filter by target type
// @Summary List all income allocations (v2)
// @Description Returns all income allocations with optional target filtering
// @Tags Income Allocations V2
// @Produce json
// @Param targetType query string false "Filter by target type (investment|cash_account|cpf_account)"
// @Success 200 {array} incomeAllocationV2DTO
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/income-allocations [get]
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
		if targetType == "cpf_account" && a.TargetCpfAccountID == nil {
			continue
		}

		dtos = append(dtos, toIncomeAllocationV2DTO(a))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

// GET /api/v2/incomes/{incomeId}/allocations
// HandleListByIncome lists allocations for a specific income.
// @Summary List income allocations (v2)
// @Description Lists allocations for a specific income
// @Tags Income Allocations V2
// @Produce json
// @Param incomeId path string true "Income ID"
// @Success 200 {array} incomeAllocationV2DTO
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/incomes/{incomeId}/allocations [get]
func (h *IncomeAllocationV2Handler) HandleListByIncome(w http.ResponseWriter, r *http.Request, incomeID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Parse pagination from query params
	pagination := repo.PaginationParams{}
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			pagination.Limit = &limit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			pagination.Offset = &offset
		}
	}

	result, err := h.store.ListIncomeAllocations(r.Context(), userID, incomeID, pagination)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	dtos := make([]incomeAllocationV2DTO, len(result.Data))
	for i, a := range result.Data {
		dtos[i] = toIncomeAllocationV2DTO(a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

// incomeAllocationCreateDTO is the JSON input structure for create/update.
// Uses string for decimal values to avoid float64 precision loss.
type incomeAllocationCreateDTO struct {
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	TargetCpfAccountID  *string `json:"targetCpfAccountId,omitempty"`
	AllocationType      string  `json:"allocationType"`
	AllocationValue     string  `json:"allocationValue"`
}

// POST /api/v2/incomes/{incomeId}/allocations
// HandleCreate creates a new allocation.
// @Summary Create income allocation (v2)
// @Description Creates a new allocation for an income
// @Tags Income Allocations V2
// @Accept json
// @Produce json
// @Param incomeId path string true "Income ID"
// @Param allocation body incomeAllocationCreateDTO true "Allocation data"
// @Success 201 {object} incomeAllocationV2DTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/incomes/{incomeId}/allocations [post]
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
	hasCpfAccount := input.TargetCpfAccountID != nil && *input.TargetCpfAccountID != ""
	targetCount := 0
	if hasCashAccount {
		targetCount++
	}
	if hasInvestment {
		targetCount++
	}
	if hasCpfAccount {
		targetCount++
	}
	if targetCount != 1 {
		writeError(w, http.StatusBadRequest, "bad_request", "exactly one of targetCashAccountId, targetInvestmentId, or targetCpfAccountId must be provided")
		return
	}

	if input.AllocationType != "percentage" && input.AllocationType != "fixed" {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationType must be 'percentage' or 'fixed'")
		return
	}

	// Parse allocation value from string
	allocationValue, err := decimal.NewFromString(input.AllocationValue)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid allocationValue format")
		return
	}

	if allocationValue.IsNegative() || allocationValue.IsZero() {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationValue must be positive")
		return
	}

	if input.AllocationType == "percentage" {
		maxPercentage := decimal.MustFromString("100")
		if allocationValue.Cmp(maxPercentage) == 1 {
			writeError(w, http.StatusBadRequest, "bad_request", "percentage allocationValue must be between 0 and 100")
			return
		}
	}

	allocation := repo.IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		TargetCpfAccountID:  input.TargetCpfAccountID,
		AllocationType:      input.AllocationType,
		AllocationValue:     *allocationValue,
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

// PUT /api/v2/incomes/{incomeId}/allocations/{allocId}
// HandleUpdate updates an income allocation.
// @Summary Update income allocation (v2)
// @Description Updates an existing income allocation
// @Tags Income Allocations V2
// @Accept json
// @Produce json
// @Param incomeId path string true "Income ID"
// @Param allocId path string true "Allocation ID"
// @Param allocation body incomeAllocationCreateDTO true "Allocation data"
// @Success 200 {object} incomeAllocationV2DTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/incomes/{incomeId}/allocations/{allocId} [put]
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
	hasCpfAccount := input.TargetCpfAccountID != nil && *input.TargetCpfAccountID != ""
	targetCount := 0
	if hasCashAccount {
		targetCount++
	}
	if hasInvestment {
		targetCount++
	}
	if hasCpfAccount {
		targetCount++
	}
	if targetCount != 1 {
		writeError(w, http.StatusBadRequest, "bad_request", "exactly one of targetCashAccountId, targetInvestmentId, or targetCpfAccountId must be provided")
		return
	}

	if input.AllocationType != "percentage" && input.AllocationType != "fixed" {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationType must be 'percentage' or 'fixed'")
		return
	}

	// Parse allocation value from string
	allocationValue, err := decimal.NewFromString(input.AllocationValue)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid allocationValue format")
		return
	}

	if allocationValue.IsNegative() || allocationValue.IsZero() {
		writeError(w, http.StatusBadRequest, "bad_request", "allocationValue must be positive")
		return
	}

	if input.AllocationType == "percentage" && allocationValue.ToFloat64() > 100 {
		writeError(w, http.StatusBadRequest, "bad_request", "percentage allocationValue must be between 0 and 100")
		return
	}

	allocation := repo.IncomeAllocation{
		ID:                  allocID,
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		TargetCpfAccountID:  input.TargetCpfAccountID,
		AllocationType:      input.AllocationType,
		AllocationValue:     *allocationValue,
	}

	updated, err := h.store.UpdateIncomeAllocation(r.Context(), userID, allocation)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toIncomeAllocationV2DTO(*updated))
}

// DELETE /api/v2/incomes/{incomeId}/allocations/{allocId}
// HandleDelete deletes an income allocation.
// @Summary Delete income allocation (v2)
// @Description Deletes an income allocation version chain
// @Tags Income Allocations V2
// @Param incomeId path string true "Income ID"
// @Param allocId path string true "Allocation ID"
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/incomes/{incomeId}/allocations/{allocId} [delete]
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

// POST /api/v2/incomes/{incomeId}/allocations/{allocId}/stop
// HandleStop sets an end date for an allocation without deleting the record.
// This "stops" an allocation at a future point without deleting the original record.
// @Summary Stop income allocation (v2)
// @Description Sets an endDate on an allocation (soft delete)
// @Tags Income Allocations V2
// @Accept json
// @Produce json
// @Param incomeId path string true "Income ID"
// @Param allocId path string true "Allocation ID"
// @Param body body stopAllocationDTO true "Stop input with endDate"
// @Success 200 {object} incomeAllocationV2DTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/incomes/{incomeId}/allocations/{allocId}/stop [post]
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
