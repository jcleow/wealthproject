package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

// calculateMonthlyPayment calculates the monthly payment using the amortization formula:
// M = P * [r(1+r)^n] / [(1+r)^n - 1]
// where P = principal, r = monthly interest rate, n = number of months
func calculateMonthlyPayment(principal, annualInterestRate float64, months int) float64 {
	if months <= 0 || principal <= 0 {
		return 0
	}
	// If interest rate is 0, it's just principal divided by months
	if annualInterestRate == 0 {
		return principal / float64(months)
	}
	r := annualInterestRate / 100 / 12 // monthly interest rate as decimal
	n := float64(months)
	// M = P * [r(1+r)^n] / [(1+r)^n - 1]
	numerator := r * math.Pow(1+r, n)
	denominator := math.Pow(1+r, n) - 1
	return principal * (numerator / denominator)
}

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
	case http.MethodPut:
		h.update(w, r, id)
	case http.MethodDelete:
		h.delete(w, r, id)
	default:
		methodNotAllowed(w)
	}
}

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

	// Auto-create linked expense for loan repayment (only if end_date is provided)
	if created.EndDate != nil {
		months := int(created.EndDate.Sub(created.StartDate).Hours() / 24 / 30)
		if months > 0 {
			monthlyPayment := calculateMonthlyPayment(created.CurrentBalance, created.InterestRateAPR, months)
			if monthlyPayment > 0 {
				expense := repository.Expense{
					Payee:             created.Name,
					Amount:            monthlyPayment,
					Frequency:         "monthly",
					StartDate:         created.StartDate,
					EndDate:           created.EndDate,
					Category:          "loan_repayment",
					GrowthRate:        0, // Loan payments typically don't grow
					GrowthStrategy:    "fixed",
					Notes:             fmt.Sprintf("Auto-generated loan repayment for %s", created.Name),
					SourceLiabilityID: &created.ID,
				}
				_, _ = h.store.CreateExpense(r.Context(), userID, expense)
			}
		}
	}

	writeJSON(w, created)
}

func (h *LiabilityHandler) update(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	var payload repository.Liability
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	payload.ID = id
	updated, err := h.store.UpdateLiability(r.Context(), userID, payload)
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

func (h *LiabilityHandler) delete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	if err := h.store.DeleteLiability(r.Context(), userID, id); err != nil {
		if err == repository.ErrNotFound {
			notFound(w)
			return
		}
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
