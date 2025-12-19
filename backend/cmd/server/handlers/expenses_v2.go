package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial_v2/expense"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// expenseV2Input is the JSON-friendly input struct for expense v2 update.
// Uses string for decimal values to avoid float64 precision loss.
type expenseV2Input struct {
	ID                string  `json:"id"`
	ParentID          string  `json:"parentId"`
	Name             string  `json:"name"`
	Amount            string  `json:"amount"`
	Frequency         string  `json:"frequency"`
	Category          string  `json:"category"`
	GrowthRate        *string `json:"growthRate"`
	GrowthStrategy    string  `json:"growthStrategy"`
	Notes             string  `json:"notes"`
	SourceLiabilityID *string `json:"sourceLiabilityId"`
	StartDate         *string `json:"startDate"`
	UpdateMode        string  `json:"updateMode,omitempty"`
}

// ExpenseV2Handler serves expense endpoints for v2 API.
type ExpenseV2Handler struct {
	store   *repo.Store
	service *expense.Service
}

// NewExpenseV2Handler creates a new v2 expense handler.
func NewExpenseV2Handler(store *repo.Store) *ExpenseV2Handler {
	return &ExpenseV2Handler{
		store:   store,
		service: expense.NewService(store),
	}
}

// GET /api/v2/cashflow/expenses
// HandleList lists expenses for the user.
// @Summary List expenses (v2)
// @Description Returns expenses grouped into regularExpenses and debtRepayments
// @Tags Expenses V2
// @Produce json
// @Param limit query int false "Max items to return (-1 for all)"
// @Param offset query int false "Number of items to skip"
// @Success 200 {object} repo.GroupedExpenses
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses [get]
func (h *ExpenseV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	pagination := parsePaginationV2(r)
	result, err := h.store.ListExpensesGrouped(r.Context(), userID, pagination)
	if err != nil {
		log.Printf("expense.List error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// expenseCreateInput is the JSON input for creating an expense
type expenseCreateInput struct {
	Name             string  `json:"name"`
	Amount            string  `json:"amount"`
	Frequency         string  `json:"frequency"`
	Category          string  `json:"category"`
	GrowthRate        *string `json:"growthRate"`
	GrowthStrategy    string  `json:"growthStrategy"`
	Notes             string  `json:"notes"`
	SourceLiabilityID *string `json:"sourceLiabilityId"`
	StartDate         *string `json:"startDate"`
	EndDate           *string `json:"endDate"`
	ParentID          *string `json:"parentId"`
}

// POST /api/v2/cashflow/expenses
// HandleCreate creates a new expense.
// @Summary Create an expense (v2)
// @Description Creates a new expense
// @Tags Expenses V2
// @Accept json
// @Produce json
// @Param expense body expenseCreateInput true "Expense data"
// @Success 200 {object} repo.Expense
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses [post]
func (h *ExpenseV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input expenseCreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.service.CreateFromParams(r.Context(), userID, expense.CreateParams{
		Name:             input.Name,
		Amount:            input.Amount,
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthRate:        input.GrowthRate,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
		StartDate:         input.StartDate,
		EndDate:           input.EndDate,
		ParentID:          input.ParentID,
	})
	if err != nil {
		if expense.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		log.Printf("expense.Create error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// DELETE /api/v2/cashflow/expenses
// HandleDeleteAll deletes all expenses for the authenticated user.
// @Summary Delete all expenses (v2)
// @Description Bulk deletes all expenses for the authenticated user in a single query.
// @Tags Expenses V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses [delete]
func (h *ExpenseV2Handler) HandleDeleteAll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllExpenses(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PUT /api/v2/cashflow/expenses/{id}
// HandleUpdate updates an expense with versioning support.
// @Summary Update an expense (v2)
// @Description Updates an expense with versioning support
// @Tags Expenses V2
// @Accept json
// @Produce json
// @Param id path string true "Expense ID"
// @Param expense body expenseV2Input true "Expense data"
// @Success 200 {object} repo.Expense
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses/{id} [put]
func (h *ExpenseV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input expenseV2Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	result, err := h.service.UpdateFromParams(r.Context(), userID, id, expense.UpdateParams{
		Name:             input.Name,
		Amount:            input.Amount,
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthRate:        input.GrowthRate,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
		StartDate:         input.StartDate,
		UpdateMode:        input.UpdateMode,
	})
	if err != nil {
		if expense.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("expense.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// DELETE /api/v2/cashflow/expenses/{id}
// HandleDelete deletes an expense and descendants.
// @Summary Delete an expense (v2)
// @Description Deletes an expense and all its descendant versions
// @Tags Expenses V2
// @Param id path string true "Expense ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses/{id} [delete]
func (h *ExpenseV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.store.DeleteExpense(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("expense.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v2/cashflow/expenses/{id}/stop
// HandleStop sets the end_date on an expense.
// @Summary Stop an expense (v2)
// @Description Sets the end_date on an expense (soft delete)
// @Tags Expenses V2
// @Accept json
// @Produce json
// @Param id path string true "Expense ID"
// @Param body body stopInput true "Stop input with endDate"
// @Success 200 {object} repo.Expense
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/expenses/{id}/stop [post]
func (h *ExpenseV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
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

	updated, err := h.store.StopExpense(r.Context(), userID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("expense.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
