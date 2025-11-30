package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

type propertyLinkStore interface {
	GetAsset(ctx context.Context, userID, id string) (repository.Asset, error)
	ConvertAssetToProperty(ctx context.Context, userID, id string) (repository.Asset, error)
	GetLiability(ctx context.Context, userID, id string) (repository.Liability, error)
	ConvertLiabilityToProperty(ctx context.Context, userID, id string) (repository.Liability, error)
	GetPropertyScenario(ctx context.Context, userID, id string) (repository.PropertyScenario, error)
	CreatePropertyScenario(ctx context.Context, userID string, ps repository.PropertyScenario) (repository.PropertyScenario, error)
	CreateOrReplacePropertyLink(ctx context.Context, userID string, link repository.PropertyLink) (repository.PropertyLink, error)
	UpdatePropertyLink(ctx context.Context, userID string, link repository.PropertyLink) (repository.PropertyLink, error)
	ListPropertyLinksByScenario(ctx context.Context, userID, scenarioID string) ([]repository.PropertyLink, error)
	ListPropertyLinksByAsset(ctx context.Context, userID, assetID string) ([]repository.PropertyLink, error)
	ListPropertyLinksByLiability(ctx context.Context, userID, liabilityID string) ([]repository.PropertyLink, error)
	ListAllPropertyLinks(ctx context.Context, userID string, pagination repository.PaginationParams) (repository.PaginatedResult[repository.PropertyLink], error)
}

// PropertyLinkHandler serves property link endpoints.
type PropertyLinkHandler struct {
	store propertyLinkStore
}

func NewPropertyLinkHandler(store propertyLinkStore) *PropertyLinkHandler {
	return &PropertyLinkHandler{store: store}
}

func (h *PropertyLinkHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/property-links", h.handleCollection)
	router.HandleFunc("/property-links/", h.handleItem)
}

type propertyLinkRequest struct {
	PropertyScenarioID string `json:"property_scenario_id"`
	AssetID            string `json:"asset_id"`
	LiabilityID        string `json:"liability_id"`
}

func (h *PropertyLinkHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.create(w, r)
	case http.MethodGet:
		h.list(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *PropertyLinkHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/property-links/")
	if id == "" {
		notFound(w)
		return
	}
	switch r.Method {
	case http.MethodPut:
		h.update(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

func (h *PropertyLinkHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload propertyLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.AssetID == "" || payload.LiabilityID == "" {
		badRequest(w, errMissingFields("asset_id, liability_id"))
		return
	}

	// Ensure asset/liability exist and are category property (convert if needed).
	if _, err := h.store.GetAsset(r.Context(), userID, payload.AssetID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	asset, err := h.store.ConvertAssetToProperty(r.Context(), userID, payload.AssetID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}

	if _, err := h.store.GetLiability(r.Context(), userID, payload.LiabilityID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	liability, err := h.store.ConvertLiabilityToProperty(r.Context(), userID, payload.LiabilityID)
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}

	// Create scenario if missing (stub default values).
	scenarioID := payload.PropertyScenarioID
	var scenario repository.PropertyScenario
	if scenarioID == "" {
		newScenario := repository.PropertyScenario{
			PropertyType:  "property",
			Headline:      "Property scenario",
			Subheadline:   "",
			LastRefreshed: "",
			PropertyPrice: 0,
			DownPayment:   0,
			LoanAmount:    0,
			InterestRate:  0,
			LoanTenure:    0,
			Notes:         "",
			Amortization:  map[string]interface{}{},
			Snapshot:      map[string]interface{}{},
			Timeline:      map[string]interface{}{},
			Milestones:    map[string]interface{}{},
			Insights:      map[string]interface{}{},
		}
		createdScenario, err := h.store.CreatePropertyScenario(r.Context(), userID, newScenario)
		if err != nil {
			internalError(w)
			return
		}
		scenario = createdScenario
		scenarioID = createdScenario.ID
	} else {
		existing, err := h.store.GetPropertyScenario(r.Context(), userID, scenarioID)
		if err != nil {
			if err == repository.ErrNotFound {
				notFound(w)
				return
			}
			internalError(w)
			return
		}
		scenario = existing
	}

	link, err := h.store.CreateOrReplacePropertyLink(r.Context(), userID, repository.PropertyLink{
		PropertyScenarioID: scenarioID,
		AssetID:            asset.ID,
		LiabilityID:        liability.ID,
	})
	if err != nil {
		// For now, still return 200 on conflict; only treat unexpected errors as 500.
		// If this error is not a uniqueness conflict, surface it.
		writeJSON(w, struct {
			Link     repository.PropertyLink     `json:"property_link"`
			Scenario repository.PropertyScenario `json:"property_scenario"`
		}{
			Link:     repository.PropertyLink{},
			Scenario: scenario,
		})
		return
	}

	writeJSON(w, struct {
		Link     repository.PropertyLink     `json:"property_link"`
		Scenario repository.PropertyScenario `json:"property_scenario"`
	}{
		Link:     link,
		Scenario: scenario,
	})
}

func (h *PropertyLinkHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload propertyLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.PropertyScenarioID == "" || payload.AssetID == "" || payload.LiabilityID == "" {
		badRequest(w, errMissingFields("property_scenario_id, asset_id, liability_id"))
		return
	}

	// Ensure existence and categories.
	if _, err := h.store.ConvertAssetToProperty(r.Context(), userID, payload.AssetID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	if _, err := h.store.ConvertLiabilityToProperty(r.Context(), userID, payload.LiabilityID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}

	if _, err := h.store.GetPropertyScenario(r.Context(), userID, payload.PropertyScenarioID); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}

	link, err := h.store.UpdatePropertyLink(r.Context(), userID, repository.PropertyLink{
		ID:                 id,
		PropertyScenarioID: payload.PropertyScenarioID,
		AssetID:            payload.AssetID,
		LiabilityID:        payload.LiabilityID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	writeJSON(w, link)
}

func (h *PropertyLinkHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	scenarioID := r.URL.Query().Get("property_scenario_id")
	assetID := r.URL.Query().Get("asset_id")
	liabilityID := r.URL.Query().Get("liability_id")

	switch {
	case scenarioID != "":
		links, err := h.store.ListPropertyLinksByScenario(r.Context(), userID, scenarioID)
		if err != nil {
			internalError(w)
			return
		}
		writeJSON(w, links)
	case assetID != "":
		links, err := h.store.ListPropertyLinksByAsset(r.Context(), userID, assetID)
		if err != nil {
			internalError(w)
			return
		}
		writeJSON(w, links)
	case liabilityID != "":
		links, err := h.store.ListPropertyLinksByLiability(r.Context(), userID, liabilityID)
		if err != nil {
			internalError(w)
			return
		}
		writeJSON(w, links)
	default:
		// No filter provided - return all links for the user with pagination
		pagination := parsePagination(r)
		result, err := h.store.ListAllPropertyLinks(r.Context(), userID, pagination)
		if err != nil {
			internalError(w)
			return
		}
		writeJSON(w, result)
	}
}
