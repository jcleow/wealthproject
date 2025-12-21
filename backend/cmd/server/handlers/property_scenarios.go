package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// PropertyScenarioHandler serves property planner CRUD endpoints.
type PropertyScenarioHandler struct {
	store *repository.Store
}

func NewPropertyScenarioHandler(store *repository.Store) *PropertyScenarioHandler {
	return &PropertyScenarioHandler{store: store}
}

func (h *PropertyScenarioHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/property-planner/scenarios", h.handleCollection)
	router.HandleFunc("/property-planner/scenarios/", h.handleItem)
}

type propertyScenarioRequest struct {
	repository.PropertyScenario
	AssetID     string `json:"asset_id"`
	LiabilityID string `json:"liability_id"`
}

// GET|POST /api/v1/property-planner/scenarios
func (h *PropertyScenarioHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

// GET|PUT|DELETE /api/v1/property-planner/scenarios/{id}
func (h *PropertyScenarioHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/property-planner/scenarios/")
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

// GET /api/v1/property-planner/scenarios
func (h *PropertyScenarioHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	items, err := h.store.ListPropertyScenarios(r.Context(), userID)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, items)
}

// GET /api/v1/property-planner/scenarios/{id}
func (h *PropertyScenarioHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetPropertyScenario(r.Context(), userID, id)
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

// POST /api/v1/property-planner/scenarios
func (h *PropertyScenarioHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload propertyScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.PropertyType == "" || payload.Headline == "" || payload.PropertyPrice == 0 || payload.LoanAmount == 0 || payload.InterestRate == 0 || payload.LoanTenure == 0 {
		badRequest(w, errMissingFields("property_type, headline, property_price, loan_amount, interest_rate, loan_tenure"))
		return
	}
	created, err := h.store.CreatePropertyScenario(r.Context(), userID, payload.PropertyScenario)
	if err != nil {
		internalError(w, err)
		return
	}

	// If asset_id and liability_id provided, enforce property category and create link.
	if payload.AssetID != "" && payload.LiabilityID != "" {
		if _, err := h.store.ConvertAssetToProperty(r.Context(), userID, payload.AssetID); err != nil {
			if err == repository.ErrNotFound {
				notFound(w)
				return
			}
			internalError(w, err)
			return
		}
		if _, err := h.store.ConvertLiabilityToProperty(r.Context(), userID, payload.LiabilityID); err != nil {
			if err == repository.ErrNotFound {
				notFound(w)
				return
			}
			internalError(w, err)
			return
		}
		if _, err := h.store.CreateOrReplacePropertyLink(r.Context(), userID, repository.PropertyLink{
			PropertyScenarioID: created.ID,
			AssetID:            payload.AssetID,
			LiabilityID:        payload.LiabilityID,
		}); err != nil {
			internalError(w, err)
			return
		}
	} else if payload.AssetID != "" || payload.LiabilityID != "" {
		badRequest(w, errMissingFields("asset_id and liability_id must both be provided to link"))
		return
	}

	writeJSON(w, created)
}

// PUT /api/v1/property-planner/scenarios/{id}
func (h *PropertyScenarioHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.PropertyScenario
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdatePropertyScenario(r.Context(), userID, payload)
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

// DELETE /api/v1/property-planner/scenarios/{id}
func (h *PropertyScenarioHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeletePropertyScenario(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
