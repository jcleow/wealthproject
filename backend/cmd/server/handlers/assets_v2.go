package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/asset"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// assetInput is the JSON-friendly input struct for asset update.
// Uses string for decimal values to avoid float64 precision loss.
type assetInput struct {
	ID             string  `json:"id"`
	ParentID       string  `json:"parentId"`
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	CurrentValue   string  `json:"currentValue"`
	GrowthRate     *string `json:"annualGrowthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	EndDate        *string `json:"endDate"`
	TerminalValue  *string `json:"terminalValue"`
	UpdateMode     string  `json:"updateMode,omitempty"`
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

// assetCreateInput is the JSON-friendly input struct for asset creation.
// Uses string for decimal values to avoid float64 precision loss.
type assetCreateInput struct {
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	CurrentValue   string  `json:"currentValue"`
	GrowthRate     *string `json:"annualGrowthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	Notes          string  `json:"notes"`
	StartDate      *string `json:"startDate"`
	EndDate        *string `json:"endDate"`
	TerminalValue  *string `json:"terminalValue"`
}

// POST /api/v2/assets
// HandleCreate creates a new asset.
// @Summary Create an asset (v2)
// @Description Creates a new non-cash asset for the authenticated user
// @Tags Assets V2
// @Accept json
// @Produce json
// @Param asset body assetCreateInput true "Asset data"
// @Success 200 {object} repo.NonCashAsset
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets [post]
func (h *AssetV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input assetCreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" || input.Category == "" {
		badRequest(w, errMissingFields("name, category"))
		return
	}

	// Parse decimal values from strings
	currentValue, err := decimal.NewFromString(input.CurrentValue)
	if err != nil {
		badRequest(w, err)
		return
	}

	var growthRate *decimal.Decimal
	if input.GrowthRate != nil && *input.GrowthRate != "" {
		gr, err := decimal.NewFromString(*input.GrowthRate)
		if err != nil {
			badRequest(w, err)
			return
		}
		growthRate = gr
	}

	// Parse dates
	var startDate time.Time
	if input.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = t
	} else {
		startDate = time.Now().UTC()
	}

	var endDate *time.Time
	if input.EndDate != nil {
		t, err := time.Parse(time.RFC3339, *input.EndDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		endDate = &t
	}

	// Parse terminal value if provided
	var terminalValue *decimal.Decimal
	if input.TerminalValue != nil && *input.TerminalValue != "" {
		tv, err := decimal.NewFromString(*input.TerminalValue)
		if err != nil {
			badRequest(w, err)
			return
		}
		terminalValue = tv
	}

	// Route cash_savings category to finance_cash_accounts table
	if input.Category == "cash_savings" {
		// Build cash account - use growth rate as interest rate
		interestRate := *decimal.Zero()
		if growthRate != nil {
			interestRate = *growthRate
		}

		accountType := "savings"

		ca := repo.CashAsset{
			Name:           input.Name,
			Category:       input.Category,
			Balance:        *currentValue,
			InterestRate:   interestRate,
			AccountType:    accountType,
			GrowthStrategy: input.GrowthStrategy,
			Notes:          input.Notes,
			StartDate:      startDate,
			EndDate:        endDate,
		}

		created, err := h.store.CreateCashAsset(r.Context(), userID, ca)
		if err != nil {
			log.Printf("cashAsset.Create error: %v", err)
			internalError(w, err)
			return
		}
		writeJSON(w, created)
		return
	}

	// Build repository asset for non-cash assets
	a := repo.NonCashAsset{
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   *currentValue,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		EndDate:        endDate,
		TerminalValue:  terminalValue,
	}
	if growthRate != nil {
		a.AnnualGrowthRate = *growthRate
	}

	created, err := h.store.CreateNonCashAsset(r.Context(), userID, a)
	if err != nil {
		log.Printf("asset.Create error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

// GET /api/v2/assets
// HandleList lists non-cash assets for the user.
// @Summary List assets (v2)
// @Description Returns paginated non-cash assets for the authenticated user
// @Tags Assets V2
// @Produce json
// @Param limit query int false "Max items to return (-1 for all)"
// @Param offset query int false "Number of items to skip"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets [get]
func (h *AssetV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	pagination := parsePaginationV2(r)
	result, err := h.store.ListNonCashAssets(r.Context(), repo.ListQuery{
		UserID:     userID,
		DateRange:  repo.DateRangeOptions{},
		Pagination: pagination,
	})
	if err != nil {
		log.Printf("asset.List error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// PUT /api/v2/assets/{id}
// HandleUpdate updates an asset with versioning.
// @Summary Update an asset (v2)
// @Description Updates an asset with versioning support
// @Tags Assets V2
// @Accept json
// @Produce json
// @Param id path string true "Asset ID"
// @Param asset body assetInput true "Asset data"
// @Success 200 {object} repo.NonCashAsset
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets/{id} [put]
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

	// Parse decimal values from strings
	currentValue, err := decimal.NewFromString(input.CurrentValue)
	if err != nil {
		badRequest(w, err)
		return
	}

	var growthRate *decimal.Decimal
	if input.GrowthRate != nil && *input.GrowthRate != "" {
		gr, err := decimal.NewFromString(*input.GrowthRate)
		if err != nil {
			badRequest(w, err)
			return
		}
		growthRate = gr
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

	// Parse endDate if provided
	var endDate *time.Time
	if input.EndDate != nil {
		t, err := time.Parse(time.RFC3339, *input.EndDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		endDate = &t
	}

	// Parse terminal value if provided
	var terminalValue *decimal.Decimal
	if input.TerminalValue != nil && *input.TerminalValue != "" {
		tv, err := decimal.NewFromString(*input.TerminalValue)
		if err != nil {
			badRequest(w, err)
			return
		}
		terminalValue = tv
	}

	// Build service input
	serviceInput := asset.UpdateInput{
		ID:             id,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   *currentValue,
		GrowthRate:     growthRate,
		GrowthStrategy: input.GrowthStrategy,
		Notes:          input.Notes,
		StartDate:      startDate,
		EndDate:        endDate,
		TerminalValue:  terminalValue,
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

// DELETE /api/v2/assets/{id}
// HandleDelete removes an asset.
// @ID deleteAsset
// @Summary Delete an asset (v2)
// @Description Deletes an asset and its descendant versions
// @Tags Assets V2
// @Param id path string true "Asset ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets/{id} [delete]
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

// POST /api/v2/assets/{id}/stop
// HandleStop schedules an asset end date.
// @Summary Stop an asset (v2)
// @Description Sets the endDate on an asset (soft delete)
// @Tags Assets V2
// @Accept json
// @Produce json
// @Param id path string true "Asset ID"
// @Param body body stopInput true "Stop input with endDate"
// @Success 200 {object} repo.NonCashAsset
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/assets/{id}/stop [post]
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
