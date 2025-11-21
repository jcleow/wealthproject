package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// LiabilityHandler serves liability CRUD endpoints.
type LiabilityHandler struct {
	store *repository.Store
}

func NewLiabilityHandler(store *repository.Store) *LiabilityHandler {
	return &LiabilityHandler{store: store}
}

func (h *LiabilityHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/liabilities", h.handleCollection)
	router.HandleFunc("/liabilities/", h.handleItem)
}

func (h *LiabilityHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *LiabilityHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/liabilities/")
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

func (h *LiabilityHandler) list(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ListLiabilities(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *LiabilityHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	item, err := h.store.GetLiability(r.Context(), id)
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

func (h *LiabilityHandler) create(w http.ResponseWriter, r *http.Request) {
	var payload repository.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" || payload.Category == "" || payload.CurrentBalance == 0 {
		badRequest(w, errMissingFields("name, category, current_balance"))
		return
	}
	created, err := h.store.CreateLiability(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *LiabilityHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	var payload repository.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateLiability(r.Context(), payload)
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

func (h *LiabilityHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.DeleteLiability(r.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
