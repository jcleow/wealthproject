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

func (h *PropertyScenarioHandler) list(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.ListPropertyScenarios(r.Context())
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, items)
}

func (h *PropertyScenarioHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	item, err := h.store.GetPropertyScenario(r.Context(), id)
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

func (h *PropertyScenarioHandler) create(w http.ResponseWriter, r *http.Request) {
	var payload repository.PropertyScenario
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.PropertyType == "" || payload.Headline == "" || payload.PropertyPrice == 0 || payload.DownPayment == 0 || payload.LoanAmount == 0 || payload.InterestRate == 0 || payload.LoanTenure == 0 {
		badRequest(w, errMissingFields("property_type, headline, property_price, down_payment, loan_amount, interest_rate, loan_tenure"))
		return
	}
	created, err := h.store.CreatePropertyScenario(r.Context(), payload)
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, created)
}

func (h *PropertyScenarioHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	var payload repository.PropertyScenario
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdatePropertyScenario(r.Context(), payload)
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

func (h *PropertyScenarioHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.store.DeletePropertyScenario(r.Context(), id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
