package handlers

import (
	"net/http"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// BulkDeleteV2Handler serves bulk delete endpoints for v2 API.
type BulkDeleteV2Handler struct {
	store *repo.Store
}

// NewBulkDeleteV2Handler creates a new v2 bulk delete handler.
func NewBulkDeleteV2Handler(store *repo.Store) *BulkDeleteV2Handler {
	return &BulkDeleteV2Handler{store: store}
}

// DELETE /api/v2/assets
// HandleDeleteAllAssets deletes all assets (non-cash) for the authenticated user.
// @Summary Delete all assets (v2)
// @Description Bulk deletes all non-cash assets for the authenticated user in a single query.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllAssets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllNonCashAssets(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v2/cash-accounts
// HandleDeleteAllCashAccounts deletes all cash accounts for the authenticated user.
// @Summary Delete all cash accounts (v2)
// @Description Bulk deletes all cash accounts for the authenticated user in a single query.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cash-accounts [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllCashAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllCashAssets(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v2/liabilities
// HandleDeleteAllLiabilities deletes all liabilities for the authenticated user.
// @Summary Delete all liabilities (v2)
// @Description Bulk deletes all liabilities for the authenticated user in a single query.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/liabilities [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllLiabilities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllLiabilities(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v2/cashflow/incomes
// HandleDeleteAllIncomes deletes all incomes for the authenticated user.
// @Summary Delete all incomes (v2)
// @Description Bulk deletes all incomes for the authenticated user in a single query.
// Also cascades to delete income allocations via FK constraint.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cashflow/incomes [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllIncomes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllIncomes(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v2/investments
// HandleDeleteAllInvestments deletes all investments for the authenticated user.
// @Summary Delete all investments (v2)
// @Description Bulk deletes all investments for the authenticated user in a single query.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/investments [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllInvestments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllInvestments(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/v2/cpf/accounts
// HandleDeleteAllCPFAccounts deletes all CPF accounts for the authenticated user.
// @Summary Delete all CPF accounts (v2)
// @Description Bulk deletes all CPF accounts for the authenticated user in a single query.
// @Tags Bulk Delete V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/accounts [delete]
func (h *BulkDeleteV2Handler) HandleDeleteAllCPFAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	_, err := h.store.DeleteAllCPFAccounts(r.Context(), userCtx.UserID)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
