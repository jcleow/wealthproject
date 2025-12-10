package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// CashAccountHandler serves cash account CRUD endpoints.
type CashAccountHandler struct {
	store *repository.Store
}

func NewCashAccountHandler(store *repository.Store) *CashAccountHandler {
	return &CashAccountHandler{store: store}
}

func (h *CashAccountHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cash-accounts", h.handleCollection)
	router.HandleFunc("/cash-accounts/", h.handleItem)
}

func (h *CashAccountHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *CashAccountHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/cash-accounts/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		notFound(w)
		return
	}
	id := parts[0]

	// Special case: set-accumulator endpoint
	if len(parts) == 2 && parts[1] == "set-accumulator" {
		if r.Method != http.MethodPut {
			methodNotAllowed(w)
			return
		}
		h.setAccumulator(w, r, id)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	case http.MethodPut:
		h.update(w, r, id)
	case http.MethodDelete:
		h.delete(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (h *CashAccountHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	items, err := h.store.ListCashAccounts(r.Context(), userID)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *CashAccountHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetCashAccount(r.Context(), userID, id)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	writeJSON(w, item)
}

func (h *CashAccountHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.CashAccount
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" {
		badRequest(w, errMissingFields("name"))
		return
	}
	payload.UserID = userID
	created, err := h.store.CreateCashAccount(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

func (h *CashAccountHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.CashAccount
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	payload.UserID = userID
	updated, err := h.store.UpdateCashAccount(r.Context(), payload)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	writeJSON(w, updated)
}

func (h *CashAccountHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Check if this is the accumulator account
	account, err := h.store.GetCashAccount(r.Context(), userID, id)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}

	// Prevent deletion of accumulator account
	if account.IsAccumulator {
		writeError(w, http.StatusBadRequest, "cannot_delete_accumulator", "Cannot delete cash accumulator account. Set balance to 0 instead.")
		return
	}

	if err := h.store.DeleteCashAccount(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CashAccountHandler) setAccumulator(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.SetAccumulatorAccount(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
