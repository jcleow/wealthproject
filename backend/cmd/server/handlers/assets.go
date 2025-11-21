package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// AssetHandler serves asset CRUD endpoints.
type AssetHandler struct {
	store *repository.Store
}

func NewAssetHandler(store *repository.Store) *AssetHandler {
	return &AssetHandler{store: store}
}

func (h *AssetHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/assets", h.handleCollection)
	router.HandleFunc("/assets/", h.handleItem)
}

func (h *AssetHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *AssetHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/assets/")
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

func (h *AssetHandler) list(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ListAssets(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *AssetHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	item, err := h.store.GetAsset(r.Context(), id)
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

func (h *AssetHandler) create(w http.ResponseWriter, r *http.Request) {
	var payload repository.Asset
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" || payload.Category == "" || payload.CurrentValue == 0 {
		badRequest(w, errMissingFields("name, category, current_value"))
		return
	}
	created, err := h.store.CreateAsset(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *AssetHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	var payload repository.Asset
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateAsset(r.Context(), payload)
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

func (h *AssetHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.DeleteAsset(r.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
