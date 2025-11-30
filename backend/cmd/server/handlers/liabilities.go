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
	path := strings.TrimPrefix(r.URL.Path, "/liabilities/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		notFound(w)
		return
	}
	id := parts[0]

	// Special case: convert-to-property endpoint
	if len(parts) == 2 && parts[1] == "convert-to-property" {
		if r.Method != http.MethodPut {
			methodNotAllowed(w)
			return
		}
		h.convertToProperty(w, r, id)
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

func (h *LiabilityHandler) convertToProperty(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	updated, err := h.store.ConvertLiabilityToProperty(r.Context(), userID, id)
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

func (h *LiabilityHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	items, err := h.store.ListLiabilities(r.Context(), userID)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *LiabilityHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetLiability(r.Context(), userID, id)
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
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" || payload.Category == "" || payload.CurrentBalance == 0 {
		badRequest(w, errMissingFields("name, category, current_balance"))
		return
	}
	created, err := h.store.CreateLiability(r.Context(), userID, payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *LiabilityHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateLiability(r.Context(), userID, payload)
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
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteLiability(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
