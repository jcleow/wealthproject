package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// incomeInput is the JSON-friendly input struct for income creation/update.
type incomeInput struct {
	ID             string   `json:"id"`
	ParentID       string   `json:"parentId"`
	Source         string   `json:"source"`
	Amount         float64  `json:"amount"`
	Frequency      string   `json:"frequency"`
	StartDate      *string  `json:"startDate"`
	EndDate        *string  `json:"endDate"`
	Category       string   `json:"category"`
	GrowthRate     *float64 `json:"growthRate"`
	GrowthStrategy string   `json:"growthStrategy"`
	Notes          string   `json:"notes"`
}

func (i incomeInput) toIncome() repository.Income {
	inc := repository.Income{
		ID:             i.ID,
		ParentID:       i.ParentID,
		Source:         i.Source,
		Amount:         i.Amount,
		Frequency:      i.Frequency,
		Category:       i.Category,
		GrowthStrategy: i.GrowthStrategy,
		Notes:          i.Notes,
	}
	if i.StartDate != nil {
		if t, err := time.Parse(time.RFC3339, *i.StartDate); err == nil {
			inc.StartDate = t
		}
	} else {
		inc.StartDate = time.Now()
	}
	if i.EndDate != nil {
		if t, err := time.Parse(time.RFC3339, *i.EndDate); err == nil {
			inc.EndDate = &t
		}
	}
	if i.GrowthRate != nil {
		inc.GrowthRate = *i.GrowthRate
	}
	return inc
}

// IncomeHandler serves income CRUD endpoints.
type IncomeHandler struct {
	store *repository.Store
}

func NewIncomeHandler(store *repository.Store) *IncomeHandler {
	return &IncomeHandler{store: store}
}

func (h *IncomeHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cashflow/incomes", h.handleCollection)
	router.HandleFunc("/cashflow/incomes/", h.handleItem)
}

func (h *IncomeHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *IncomeHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/incomes/")
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

func (h *IncomeHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListIncomes(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

func (h *IncomeHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetIncome(r.Context(), userID, id)
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

func (h *IncomeHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input incomeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	if input.Source == "" || input.Amount == 0 || input.Frequency == "" || input.Category == "" {
		badRequest(w, errMissingFields("source, amount, frequency, category"))
		return
	}
	created, err := h.store.CreateIncome(r.Context(), userID, input.toIncome())
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

func (h *IncomeHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input incomeInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	input.ID = id
	updated, err := h.store.UpdateIncome(r.Context(), userID, input.toIncome())
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

func (h *IncomeHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteIncome(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
