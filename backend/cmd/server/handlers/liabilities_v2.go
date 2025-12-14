package handlers

import (
	"encoding/json"
	"net/http"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// LiabilityV2Handler serves liability CRUD endpoints for v2 API.
type LiabilityV2Handler struct {
	store *repo.Store
}

// NewLiabilityV2Handler creates a new v2 liability handler.
func NewLiabilityV2Handler(store *repo.Store) *LiabilityV2Handler {
	return &LiabilityV2Handler{store: store}
}

// HandleCreate creates a new liability and auto-creates a linked expense.
// @Summary Create a liability (v2)
// @Description Creates a new liability. If minimumPayment > 0, automatically creates a linked expense for debt repayment.
// @Tags Liabilities V2
// @Accept json
// @Produce json
// @Param liability body repo.Liability true "Liability to create"
// @Success 201 {object} repo.Liability
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/liabilities [post]
func (h *LiabilityV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	userCtx := middleware.GetUserContext(r.Context())

	var payload repo.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	if payload.Name == "" || payload.Category == "" {
		badRequest(w, errMissingFields("name, category"))
		return
	}

	created, err := h.store.CreateLiability(r.Context(), userCtx.UserID, payload)
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}
