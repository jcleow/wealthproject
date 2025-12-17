package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

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

// GET|POST /api/v1/liabilities
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

// GET /api/v1/liabilities/{id}
// PUT /api/v1/liabilities/{id}/convert-to-property
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
	// PUT and DELETE moved to v2 API with versioning support
	default:
		methodNotAllowed(w)
	}
}

// PUT /api/v1/liabilities/{id}/convert-to-property
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
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}

// GET /api/v1/liabilities
func (h *LiabilityHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListLiabilities(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// GET /api/v1/liabilities/{id}
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
		internalError(w, err)
		return
	}
	writeJSON(w, item)
}

// POST /api/v1/liabilities
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
		internalError(w, err)
		return
	}

	if created.MinimumPayment > 0 {
		// If no repayment expense exists for this liability, auto-create one.
		if _, err := h.store.GetExpenseBySourceLiability(r.Context(), userID, created.ID); err != nil {
			if err != repository.ErrNotFound {
				internalError(w, err)
				return
			}

			monthStart := created.StartDate
			if monthStart.IsZero() {
				monthStart = time.Now().UTC()
			}
			monthStart = time.Date(monthStart.Year(), monthStart.Month(), 1, 0, 0, 0, 0, monthStart.Location())
			expense := repository.Expense{
				Payee:             created.Name,
				Amount:            created.MinimumPayment,
				Frequency:         "monthly",
				StartDate:         monthStart,
				EndDate:           created.EndDate,
				Category:          "Debt Payment",
				GrowthRate:        0,
				GrowthStrategy:    "annual_step",
				Notes:             fmt.Sprintf("Auto-generated payment for %s", created.Name),
				SourceLiabilityID: &created.ID,
			}

			if _, err := h.store.CreateExpense(r.Context(), userID, expense); err != nil {
				internalError(w, err)
				return
			}
		}
	}

	writeJSON(w, created)
}

// update and delete methods moved to v2 API (liabilities_v2.go) with versioning support
