package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// ExpenseHandler serves expense CRUD endpoints.
type ExpenseHandler struct {
	store *repository.Store
}

func NewExpenseHandler(store *repository.Store) *ExpenseHandler {
	return &ExpenseHandler{store: store}
}

func (h *ExpenseHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cashflow/expenses", h.handleCollection)
	router.HandleFunc("/cashflow/expenses/", h.handleItem)
}

func (h *ExpenseHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *ExpenseHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/expenses/")
	if id == "" {
		notFound(w)
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

func (h *ExpenseHandler) list(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ListExpenses(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *ExpenseHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	item, err := h.store.GetExpense(r.Context(), id)
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

func (h *ExpenseHandler) create(w http.ResponseWriter, r *http.Request) {
	var payload repository.Expense
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Payee == "" || payload.Amount == 0 || payload.Frequency == "" || payload.Category == "" {
		badRequest(w, errMissingFields("payee, amount, frequency, category"))
		return
	}
	created, err := h.store.CreateExpense(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *ExpenseHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	var payload repository.Expense
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateExpense(r.Context(), payload)
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

func (h *ExpenseHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.DeleteExpense(r.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
