package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// expenseInput is the JSON-friendly input struct for expense creation/update.
type expenseInput struct {
	ID             string   `json:"id"`
	ParentID       string   `json:"parentId"`
	Payee          string   `json:"payee"`
	Amount         float64  `json:"amount"`
	Frequency      string   `json:"frequency"`
	StartDate      *string  `json:"startDate"`
	EndDate        *string  `json:"endDate"`
	Category       string   `json:"category"`
	GrowthRate     *float64 `json:"growthRate"`
	GrowthStrategy string   `json:"growthStrategy"`
	Notes          string   `json:"notes"`
	// Source relationship to liability (e.g., loan payment)
	SourceLiabilityID *string `json:"sourceLiabilityId,omitempty"`
}

func (e expenseInput) toExpense() repository.Expense {
	exp := repository.Expense{
		ID:                e.ID,
		ParentID:          e.ParentID,
		Payee:             e.Payee,
		Amount:            e.Amount,
		Frequency:         e.Frequency,
		Category:          e.Category,
		GrowthStrategy:    e.GrowthStrategy,
		Notes:             e.Notes,
		SourceLiabilityID: e.SourceLiabilityID,
	}
	if e.StartDate != nil {
		if t, err := time.Parse(time.RFC3339, *e.StartDate); err == nil {
			exp.StartDate = t
		}
	}
	if e.EndDate != nil {
		if t, err := time.Parse(time.RFC3339, *e.EndDate); err == nil {
			exp.EndDate = &t
		}
	}
	if e.GrowthRate != nil {
		exp.GrowthRate = *e.GrowthRate
	}
	return exp
}

// ExpenseHandler serves expense CRUD endpoints.
type ExpenseHandler struct {
	store *repository.Store
}

func NewExpenseHandler(store *repository.Store) *ExpenseHandler {
	return &ExpenseHandler{store: store}
}

func (h *ExpenseHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cashflow/expenses", h.handleCollection)
	router.HandleFunc("/cashflow/expenses/", h.handleItem)
}

func (h *ExpenseHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *ExpenseHandler) handleItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/cashflow/expenses/")
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

func (h *ExpenseHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	pagination := parsePagination(r)
	result, err := h.store.ListExpenses(r.Context(), userID, pagination)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

func (h *ExpenseHandler) get(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	item, err := h.store.GetExpense(r.Context(), userID, id)
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

func (h *ExpenseHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input expenseInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	if input.Payee == "" || input.Amount == 0 || input.Frequency == "" || input.Category == "" {
		badRequest(w, errMissingFields("payee, amount, frequency, category"))
		return
	}
	created, err := h.store.CreateExpense(r.Context(), userID, input.toExpense())
	if err != nil {
		log.Printf("CreateExpense error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, created)
}

func (h *ExpenseHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var input expenseInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}
	input.ID = id
	updated, err := h.store.UpdateExpense(r.Context(), userID, input.toExpense())
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

func (h *ExpenseHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteExpense(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
