package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial_v2/asset"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// assetInput is the JSON-friendly input struct for asset update.
type assetInput struct {
	ID             string   `json:"id"`
	ParentID       string   `json:"parentId"`
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	CurrentValue   float64  `json:"currentValue"`
	GrowthRate     *float64 `json:"annualGrowthRate"`
	GrowthStrategy string   `json:"growthStrategy"`
	Notes          string   `json:"notes"`
	StartDate      *string  `json:"startDate"`
	UpdateMode     string   `json:"updateMode,omitempty"`
}

// AssetV2Handler serves asset v2 endpoints.
type AssetV2Handler struct {
	store   *repo.Store
	service *asset.Service
}

// NewAssetV2Handler creates a new v2 asset handler.
func NewAssetV2Handler(store *repo.Store) *AssetV2Handler {
	return &AssetV2Handler{
		store:   store,
		service: asset.NewService(store),
	}
}

// HandleUpdate handles PUT /api/v2/assets/{id}
func (h *AssetV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input assetInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse startDate if provided
	var startDate *time.Time
	if input.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = &t
	}

	// Build service input
	serviceInput := asset.UpdateInput{
		ID:             id,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   input.CurrentValue,
		GrowthRate:     input.GrowthRate,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		UpdateMode:     input.UpdateMode,
	}

	// Delegate to service layer
	result, err := h.service.Update(r.Context(), userID, id, serviceInput)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("asset.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// HandleDelete handles DELETE /api/v2/assets/{id}
func (h *AssetV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.store.DeleteNonCashAsset(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("asset.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleStop handles POST /api/v2/assets/{id}/stop
func (h *AssetV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input stopInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	if input.EndDate == "" {
		badRequest(w, errMissingFields("endDate"))
		return
	}

	endDate, err := time.Parse(time.RFC3339, input.EndDate)
	if err != nil {
		badRequest(w, err)
		return
	}

	updated, err := h.store.StopNonCashAsset(r.Context(), userID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("asset.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
