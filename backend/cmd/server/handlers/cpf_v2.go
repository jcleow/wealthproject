package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/cpf"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// HandleGet handles GET /api/v2/cpf/account (returns current user's CPF account)
func (h *CPFV2Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	account, err := h.store.GetCPFAccount(r.Context(), userID)
	if err != nil {
		log.Printf("cpf.Get error: %v", err)
		internalError(w, err)
		return
	}

	if account == nil {
		notFound(w)
		return
	}

	writeJSON(w, account)
}

// cpfV2CreateInput is the JSON input struct for CPF v2 create.
type cpfV2CreateInput struct {
	OABalance        string  `json:"oaBalance"`
	SABalance        string  `json:"saBalance"`
	MABalance        string  `json:"maBalance"`
	RABalance        string  `json:"raBalance"`
	OAUsedForHousing string  `json:"oaUsedForHousing"`
	HousingStartDate *string `json:"housingStartDate"`
	DateOfBirth      string  `json:"dateOfBirth"`
	ResidencyStatus  string  `json:"residencyStatus"`
	PRGrantDate      *string `json:"prGrantDate"`
}

// HandleCreate handles POST /api/v2/cpf/account
func (h *CPFV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cpfV2CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values
	oaBalance, _ := decimal.NewFromString(input.OABalance)
	if oaBalance == nil {
		oaBalance = decimal.Zero()
	}
	saBalance, _ := decimal.NewFromString(input.SABalance)
	if saBalance == nil {
		saBalance = decimal.Zero()
	}
	maBalance, _ := decimal.NewFromString(input.MABalance)
	if maBalance == nil {
		maBalance = decimal.Zero()
	}
	raBalance, _ := decimal.NewFromString(input.RABalance)
	if raBalance == nil {
		raBalance = decimal.Zero()
	}
	oaUsedForHousing, _ := decimal.NewFromString(input.OAUsedForHousing)
	if oaUsedForHousing == nil {
		oaUsedForHousing = decimal.Zero()
	}

	// Parse date of birth (required)
	if input.DateOfBirth == "" {
		badRequest(w, errMissingFields("dateOfBirth"))
		return
	}
	dob, err := time.Parse("2006-01-02", input.DateOfBirth)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Parse optional dates
	var housingStartDate *time.Time
	if input.HousingStartDate != nil && *input.HousingStartDate != "" {
		t, err := time.Parse(time.RFC3339, *input.HousingStartDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *input.HousingStartDate)
		}
		if err == nil {
			housingStartDate = &t
		}
	}

	var prGrantDate *time.Time
	if input.PRGrantDate != nil && *input.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *input.PRGrantDate)
		if err == nil {
			prGrantDate = &t
		}
	}

	residencyStatus := input.ResidencyStatus
	if residencyStatus == "" {
		residencyStatus = "citizen"
	}

	cpfAccount := repo.CPFAccount{
		OABalance:        *oaBalance,
		SABalance:        *saBalance,
		MABalance:        *maBalance,
		RABalance:        *raBalance,
		OAUsedForHousing: *oaUsedForHousing,
		HousingStartDate: housingStartDate,
		DateOfBirth:      dob,
		ResidencyStatus:  residencyStatus,
		PRGrantDate:      prGrantDate,
	}

	created, err := h.store.CreateCPFAccount(r.Context(), userID, cpfAccount)
	if err != nil {
		log.Printf("cpf.Create error: %v", err)
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, created)
}

// cpfV2Input is the JSON input struct for CPF v2 update.
// Uses string for decimal values to avoid float64 precision loss.
type cpfV2Input struct {
	OABalance        string  `json:"oaBalance"`
	SABalance        string  `json:"saBalance"`
	MABalance        string  `json:"maBalance"`
	RABalance        string  `json:"raBalance"`
	OAUsedForHousing string  `json:"oaUsedForHousing"`
	HousingStartDate *string `json:"housingStartDate"`
	DateOfBirth      string  `json:"dateOfBirth"`
	ResidencyStatus  string  `json:"residencyStatus"`
	PRGrantDate      *string `json:"prGrantDate"`
	StartDate        *string `json:"startDate"`
	UpdateMode       string  `json:"updateMode,omitempty"`
}

// CPFV2Handler serves CPF v2 endpoints.
type CPFV2Handler struct {
	store   *repo.Store
	service *cpf.Service
}

// NewCPFV2Handler creates a new v2 CPF handler.
func NewCPFV2Handler(store *repo.Store) *CPFV2Handler {
	return &CPFV2Handler{
		store:   store,
		service: cpf.NewService(store),
	}
}

// HandleUpdate handles PUT /api/v2/cpf/account/{id}
func (h *CPFV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cpfV2Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values
	oaBalance, err := decimal.NewFromString(input.OABalance)
	if err != nil {
		badRequest(w, err)
		return
	}
	saBalance, err := decimal.NewFromString(input.SABalance)
	if err != nil {
		badRequest(w, err)
		return
	}
	maBalance, err := decimal.NewFromString(input.MABalance)
	if err != nil {
		badRequest(w, err)
		return
	}
	raBalance, err := decimal.NewFromString(input.RABalance)
	if err != nil {
		badRequest(w, err)
		return
	}
	oaUsedForHousing, err := decimal.NewFromString(input.OAUsedForHousing)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Parse date of birth (required)
	dob, err := time.Parse("2006-01-02", input.DateOfBirth)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Parse optional dates
	var housingStartDate *time.Time
	if input.HousingStartDate != nil && *input.HousingStartDate != "" {
		t, err := time.Parse(time.RFC3339, *input.HousingStartDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *input.HousingStartDate)
		}
		if err == nil {
			housingStartDate = &t
		}
	}

	var prGrantDate *time.Time
	if input.PRGrantDate != nil && *input.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *input.PRGrantDate)
		if err == nil {
			prGrantDate = &t
		}
	}

	var startDate *time.Time
	if input.StartDate != nil {
		t, err := time.Parse(time.RFC3339, *input.StartDate)
		if err != nil {
			badRequest(w, err)
			return
		}
		startDate = &t
	}

	// Build service input
	serviceInput := cpf.UpdateInput{
		ID:               id,
		OABalance:        *oaBalance,
		SABalance:        *saBalance,
		MABalance:        *maBalance,
		RABalance:        *raBalance,
		OAUsedForHousing: *oaUsedForHousing,
		HousingStartDate: housingStartDate,
		DateOfBirth:      dob,
		ResidencyStatus:  input.ResidencyStatus,
		PRGrantDate:      prGrantDate,
		StartDate:        startDate,
		UpdateMode:       input.UpdateMode,
	}

	// Delegate to service layer
	result, err := h.service.Update(r.Context(), userID, id, serviceInput)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.Update error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, result)
}

// HandleDelete handles DELETE /api/v2/cpf/account/{id}
func (h *CPFV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	if err := h.store.DeleteCPFAccount(r.Context(), userID, id); err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.Delete error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleStop handles POST /api/v2/cpf/account/{id}/stop
func (h *CPFV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, id string) {
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

	updated, err := h.service.Stop(r.Context(), userID, id, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.Stop error: %v", err)
		internalError(w, err)
		return
	}
	writeJSON(w, updated)
}
