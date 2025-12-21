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

// GET|POST /api/v1/assets
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

// GET /api/v1/assets/{id}
// PUT /api/v1/assets/{id}/convert-to-property
func (h *AssetHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/assets/")
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
	// PUT and DELETE moved to v2 API with versioning support
	default:
		methodNotAllowed(w)
	}
}

// PUT /api/v1/assets/{id}/convert-to-property
func (h *AssetHandler) convertToProperty(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	updated, err := h.store.ConvertAssetToProperty(r.Context(), userID, id)
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

// GET /api/v1/assets
func (h *AssetHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListAssets(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// GET /api/v1/assets/{id}
func (h *AssetHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetAsset(r.Context(), userID, id)
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

// POST /api/v1/assets
func (h *AssetHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.Asset
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" || payload.Category == "" || payload.CurrentValue == 0 {
		badRequest(w, errMissingFields("name, category, current_value"))
		return
	}
	created, err := h.store.CreateAsset(r.Context(), userID, payload)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// update and delete methods moved to v2 API (assets_v2.go) with versioning support
