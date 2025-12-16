package handlers

import (
	"net/http"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// ExpenseV2Handler serves expense endpoints for v2 API.
type ExpenseV2Handler struct {
	store *repo.Store
}

// NewExpenseV2Handler creates a new v2 expense handler.
func NewExpenseV2Handler(store *repo.Store) *ExpenseV2Handler {
	return &ExpenseV2Handler{store: store}
}

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

	deleted, err := h.store.DeleteAllExpenses(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	// Log for debugging
	if deleted > 0 {
		// Could add structured logging here
	}

	w.WriteHeader(http.StatusNoContent)
}
