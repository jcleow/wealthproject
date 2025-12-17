package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// InvestmentHandler serves investment CRUD endpoints.
type InvestmentHandler struct {
	store *repository.Store
}

func NewInvestmentHandler(store *repository.Store) *InvestmentHandler {
	return &InvestmentHandler{store: store}
}

func (h *InvestmentHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/investments", h.handleCollection)
	router.HandleFunc("/investments/", h.handleItem)
}

// GET|POST /api/v1/investments
func (h *InvestmentHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

// GET /api/v1/investments/{id}
func (h *InvestmentHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/investments/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		notFound(w)
		return
	}
	id := parts[0]

	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	// PUT and DELETE moved to v2 API with versioning and cascade stop support
	default:
		methodNotAllowed(w)
	}
}

// GET /api/v1/investments
func (h *InvestmentHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListInvestments(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// GET /api/v1/investments/{id}
func (h *InvestmentHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetInvestment(r.Context(), userID, id)
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

// POST /api/v1/investments
func (h *InvestmentHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.Investment
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Name == "" || payload.Category == "" || payload.CurrentValue == 0 {
		badRequest(w, errMissingFields("name, category, current_value"))
		return
	}
	created, err := h.store.CreateInvestment(r.Context(), userID, payload)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}
