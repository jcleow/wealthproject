package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// Allocation type constants
const (
	AllocationTypePercentage = "percentage"
	AllocationTypeFixed      = "fixed"
)

// incomeInput is the JSON-friendly input struct for income creation/update.
type incomeInput struct {
	ID             string   `json:"id"`
	ParentID       string   `json:"parentId"`
	Source         string   `json:"source"`
	Amount         float64  `json:"amount"`
	Frequency      string   `json:"frequency"`
	StartDate      *string  `json:"startDate"`
	EndDate        *string  `json:"endDate"`
	Category       string   `json:"category"`
	GrowthRate     *float64 `json:"growthRate"`
	GrowthStrategy string   `json:"growthStrategy"`
	Notes          string   `json:"notes"`
	CPFWageType    string   `json:"cpfWageType"`
}

func (i incomeInput) toIncome() repository.Income {
	inc := repository.Income{
		ID:             i.ID,
		ParentID:       i.ParentID,
		Name:           i.Source,
		Amount:         i.Amount,
		Frequency:      i.Frequency,
		Category:       i.Category,
		GrowthStrategy: i.GrowthStrategy,
		Notes:          i.Notes,
	}
	inc.CPFWageType = strings.ToLower(strings.TrimSpace(i.CPFWageType))
	if i.StartDate != nil {
		if t, err := time.Parse(time.RFC3339, *i.StartDate); err == nil {
			inc.StartDate = t
		}
	} else {
		inc.StartDate = time.Now()
	}
	if i.EndDate != nil {
		if t, err := time.Parse(time.RFC3339, *i.EndDate); err == nil {
			inc.EndDate = &t
		}
	}
	if i.GrowthRate != nil {
		inc.GrowthRate = *i.GrowthRate
	}
	return inc
}

func (i *incomeInput) normalizeCPFFields() (string, error) {
	cpfWageType := strings.ToLower(strings.TrimSpace(i.CPFWageType))
	if cpfWageType != "" && cpfWageType != "ow" && cpfWageType != "aw" {
		return cpfWageType, fmt.Errorf("cpfWageType must be 'ow' or 'aw'")
	}
	return cpfWageType, nil
}

// IncomeHandler serves income CRUD endpoints.
type IncomeHandler struct {
	store *repository.Store
}

func NewIncomeHandler(store *repository.Store) *IncomeHandler {
	return &IncomeHandler{store: store}
}

func (h *IncomeHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cashflow/incomes", h.handleCollection)
	router.HandleFunc("/cashflow/incomes/", h.handleItem)
}

// GET|POST /api/v1/cashflow/incomes
func (h *IncomeHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

// GET /api/v1/cashflow/incomes/{id}
// GET|PUT|DELETE /api/v1/cashflow/incomes/{id}/allocations[/ {allocId}]
func (h *IncomeHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/cashflow/incomes/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		notFound(w)
		return
	}
	incomeID := parts[0]

	// Check for nested allocations routes: /cashflow/incomes/:id/allocations[/:allocId]
	if len(parts) >= 2 && parts[1] == "allocations" {
		if len(parts) == 2 {
			// /cashflow/incomes/:id/allocations
			h.handleAllocationsCollection(w, r, incomeID)
		} else if len(parts) == 3 {
			// /cashflow/incomes/:id/allocations/:allocId
			h.handleAllocationItem(w, r, incomeID, parts[2])
		} else {
			notFound(w)
		}
		return
	}

	// Standard income item operations
	if len(parts) != 1 {
		notFound(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.get(w, r, incomeID)
	// PUT and DELETE moved to v2 API with versioning support
	default:
		methodNotAllowed(w)
	}
}

// GET /api/v1/cashflow/incomes
func (h *IncomeHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListIncomes(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// GET /api/v1/cashflow/incomes/{id}
func (h *IncomeHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetIncome(r.Context(), userID, id)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	writeJSON(w, item)
}

// POST /api/v1/cashflow/incomes
func (h *IncomeHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input incomeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	cpfWageType, err := input.normalizeCPFFields()
	if err != nil {
		badRequest(w, err)
		return
	}
	input.CPFWageType = cpfWageType
	if input.Source == "" || input.Amount == 0 || input.Frequency == "" || input.Category == "" {
		badRequest(w, errMissingFields("source, amount, frequency, category"))
		return
	}
	created, err := h.store.CreateIncome(r.Context(), userID, input.toIncome())
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// ----- Income Allocation handlers -----

// allocationInput is the JSON-friendly input struct for allocation creation/update.
type allocationInput struct {
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	AllocationType      string  `json:"allocationType"` // 'percentage' or 'fixed'
	AllocationValue     float64 `json:"allocationValue"`
}

// GET|POST /api/v1/cashflow/incomes/{incomeId}/allocations
func (h *IncomeHandler) handleAllocationsCollection(w http.ResponseWriter, r *http.Request, incomeID string) {
	switch r.Method {
	case http.MethodGet:
		h.listAllocations(w, r, incomeID)
	case http.MethodPost:
		h.createAllocation(w, r, incomeID)
	default:
		methodNotAllowed(w)
	}
}

// GET|PUT|DELETE /api/v1/cashflow/incomes/{incomeId}/allocations/{allocId}
func (h *IncomeHandler) handleAllocationItem(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	switch r.Method {
	case http.MethodGet:
		h.getAllocation(w, r, incomeID, allocID)
	case http.MethodPut:
		h.updateAllocation(w, r, incomeID, allocID)
	case http.MethodDelete:
		h.deleteAllocation(w, r, incomeID, allocID)
	default:
		methodNotAllowed(w)
	}
}

// GET /api/v1/cashflow/incomes/{incomeId}/allocations
func (h *IncomeHandler) listAllocations(w http.ResponseWriter, r *http.Request, incomeID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	allocations, err := h.store.ListIncomeAllocations(r.Context(), userID, incomeID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	writeJSON(w, allocations)
}

// POST /api/v1/cashflow/incomes/{incomeId}/allocations
func (h *IncomeHandler) createAllocation(w http.ResponseWriter, r *http.Request, incomeID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input allocationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Validate: exactly one target must be set
	hasCashAccount := input.TargetCashAccountID != nil && *input.TargetCashAccountID != ""
	hasInvestment := input.TargetInvestmentID != nil && *input.TargetInvestmentID != ""
	if hasCashAccount == hasInvestment {
		badRequest(w, fmt.Errorf("exactly one of targetCashAccountId or targetInvestmentId must be provided"))
		return
	}

	// Validate allocation type
	if input.AllocationType != AllocationTypePercentage && input.AllocationType != AllocationTypeFixed {
		badRequest(w, fmt.Errorf("allocationType must be '%s' or '%s'", AllocationTypePercentage, AllocationTypeFixed))
		return
	}

	// Validate allocation value
	if input.AllocationValue <= 0 {
		badRequest(w, fmt.Errorf("allocationValue must be positive"))
		return
	}
	if input.AllocationType == AllocationTypePercentage && input.AllocationValue > 100 {
		badRequest(w, fmt.Errorf("percentage allocationValue must be between 0 and 100"))
		return
	}

	allocation := repository.IncomeAllocation{
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		AllocationType:      input.AllocationType,
		AllocationValue:     input.AllocationValue,
	}

	created, err := h.store.CreateIncomeAllocation(r.Context(), userID, allocation)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

// GET /api/v1/cashflow/incomes/{incomeId}/allocations/{allocId}
func (h *IncomeHandler) getAllocation(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	allocation, err := h.store.GetIncomeAllocation(r.Context(), userID, allocID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	if allocation.IncomeID != incomeID {
		notFound(w)
		return
	}
	writeJSON(w, allocation)
}

// PUT /api/v1/cashflow/incomes/{incomeId}/allocations/{allocId}
func (h *IncomeHandler) updateAllocation(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input allocationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Validate: exactly one target must be set
	hasCashAccount := input.TargetCashAccountID != nil && *input.TargetCashAccountID != ""
	hasInvestment := input.TargetInvestmentID != nil && *input.TargetInvestmentID != ""
	if hasCashAccount == hasInvestment {
		badRequest(w, fmt.Errorf("exactly one of targetCashAccountId or targetInvestmentId must be provided"))
		return
	}

	// Validate allocation type
	if input.AllocationType != AllocationTypePercentage && input.AllocationType != AllocationTypeFixed {
		badRequest(w, fmt.Errorf("allocationType must be '%s' or '%s'", AllocationTypePercentage, AllocationTypeFixed))
		return
	}

	// Validate allocation value
	if input.AllocationValue <= 0 {
		badRequest(w, fmt.Errorf("allocationValue must be positive"))
		return
	}
	if input.AllocationType == AllocationTypePercentage && input.AllocationValue > 100 {
		badRequest(w, fmt.Errorf("percentage allocationValue must be between 0 and 100"))
		return
	}

	existing, err := h.store.GetIncomeAllocation(r.Context(), userID, allocID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	if existing.IncomeID != incomeID {
		notFound(w)
		return
	}

	allocation := repository.IncomeAllocation{
		ID:                  allocID,
		IncomeID:            incomeID,
		TargetCashAccountID: input.TargetCashAccountID,
		TargetInvestmentID:  input.TargetInvestmentID,
		AllocationType:      input.AllocationType,
		AllocationValue:     input.AllocationValue,
	}

	updated, err := h.store.UpdateIncomeAllocation(r.Context(), userID, allocation)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}

// DELETE /api/v1/cashflow/incomes/{incomeId}/allocations/{allocId}
func (h *IncomeHandler) deleteAllocation(w http.ResponseWriter, r *http.Request, incomeID, allocID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	allocation, err := h.store.GetIncomeAllocation(r.Context(), userID, allocID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	if allocation.IncomeID != incomeID {
		notFound(w)
		return
	}
	if err := h.store.DeleteIncomeAllocation(r.Context(), userID, allocID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
