package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// expenseInput is the JSON-friendly input struct for expense creation/update.
// It uses *int for nullable year fields since sql.NullInt32 doesn't unmarshal from JSON numbers.
type expenseInput struct {
	ID         string   `json:"id"`
	ParentID   string   `json:"parentId"`
	Payee      string   `json:"payee"`
	Amount     float64  `json:"amount"`
	Frequency  string   `json:"frequency"`
	StartYear  *int     `json:"startYear"`
	EndYear    *int     `json:"endYear"`
	Category   string   `json:"category"`
	GrowthRate *float64 `json:"growthRate"`
	Notes      string   `json:"notes"`
}

func (e expenseInput) toExpense() repository.Expense {
	exp := repository.Expense{
		ID:        e.ID,
		ParentID:  e.ParentID,
		Payee:     e.Payee,
		Amount:    e.Amount,
		Frequency: e.Frequency,
		Category:  e.Category,
		Notes:     e.Notes,
	}
	if e.StartYear != nil {
		exp.StartYear = *e.StartYear
	}
	if e.EndYear != nil {
		exp.EndYear = sql.NullInt32{Int32: int32(*e.EndYear), Valid: true}
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
		internalError(w)
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
		internalError(w)
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
		internalError(w)
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
		internalError(w)
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
		internalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
