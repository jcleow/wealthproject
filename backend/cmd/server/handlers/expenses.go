package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// Update mode constants for expense versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
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
	// UpdateMode: UpdateModeInPlace (default) or UpdateModeVersioned
	UpdateMode string `json:"updateMode,omitempty"`
}

// stopInput is the JSON input for stopping an expense (soft delete)
type stopInput struct {
	EndDate string `json:"endDate"`
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
	path := strings.TrimPrefix(r.URL.Path, "/cashflow/expenses/")
	if path == "" {
		notFound(w)
		return
	}

	// Check for /stop suffix (e.g., /cashflow/expenses/{id}/stop)
	if strings.HasSuffix(path, "/stop") {
		id := strings.TrimSuffix(path, "/stop")
		if r.Method == http.MethodPost {
			h.stop(w, r, id)
		} else {
			methodNotAllowed(w)
		}
		return
	}

	id := path
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
	result, err := h.store.ListExpensesGrouped(r.Context(), userID, pagination)
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

	// Check if this is a versioned update
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		// Versioned update: stop current expense and create new version
		startDate, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}

		// 1. Get the current expense to copy fields
		current, err := h.store.GetExpense(r.Context(), userID, id)
		if err != nil {
			if err == repository.ErrNotFound {
				notFound(w)
				return
			}
			internalError(w, err)
			return
		}

		// 2. Set end_date on current expense (day before new startDate)
		endDate := startDate.AddDate(0, 0, -1)
		_, err = h.store.StopExpense(r.Context(), userID, id, endDate)
		if err != nil {
			internalError(w, err)
			return
		}

		// 3. Check if version with this startDate already exists (upsert)
		existing, _ := h.store.FindExpenseByParentAndStartDate(r.Context(), userID, id, startDate)
		if existing != nil {
			// Update existing version
			existing.Payee = input.Payee
			existing.Amount = input.Amount
			existing.Frequency = input.Frequency
			existing.Category = input.Category
			existing.Notes = input.Notes
			if input.GrowthRate != nil {
				existing.GrowthRate = *input.GrowthRate
			}
			existing.GrowthStrategy = input.GrowthStrategy
			existing.SourceLiabilityID = input.SourceLiabilityID
			updated, err := h.store.UpdateExpense(r.Context(), userID, *existing)
			if err != nil {
				internalError(w, err)
				return
			}
			writeJSON(w, updated)
			return
		}

		// 4. Create new version
		newExp := input.toExpense()
		newExp.ID = "" // Let DB generate new ID
		newExp.ParentID = id
		newExp.StartDate = startDate
		// Preserve source liability ID from current if not provided
		if newExp.SourceLiabilityID == nil && current.SourceLiabilityID != nil {
			newExp.SourceLiabilityID = current.SourceLiabilityID
		}

		created, err := h.store.CreateExpense(r.Context(), userID, newExp)
		if err != nil {
			log.Printf("CreateExpense (versioned) error: %v", err)
			internalError(w, err)
			return
		}
		writeJSON(w, created)
		return
	}

	// In-place update (default)
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

// stop sets the end_date on an expense (soft delete)
func (h *ExpenseHandler) stop(w http.ResponseWriter, r *http.Request, id string) {
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
	updated, err := h.store.StopExpense(r.Context(), userID, id, endDate)
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
