package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

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

func (h *IncomeHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/incomes/")
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

func (h *IncomeHandler) list(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ListIncomes(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *IncomeHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	item, err := h.store.GetIncome(r.Context(), id)
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

func (h *IncomeHandler) create(w http.ResponseWriter, r *http.Request) {
	var payload repository.Income
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Source == "" || payload.Amount == 0 || payload.Frequency == "" || payload.Category == "" {
		badRequest(w, errMissingFields("source, amount, frequency, category"))
		return
	}
	created, err := h.store.CreateIncome(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *IncomeHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	var payload repository.Income
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateIncome(r.Context(), payload)
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

func (h *IncomeHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.DeleteIncome(r.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
