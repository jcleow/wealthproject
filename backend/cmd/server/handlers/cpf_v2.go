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

// GET /api/v2/cpf/account
// HandleGet returns the current user's CPF account.
// @Summary Get CPF account (v2)
// @Description Returns the CPF account for the authenticated user
// @Tags CPF V2
// @Produce json
// @Success 200 {object} repo.CPFAccount
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account [get]
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

// GET /api/v2/cpf/accounts
// HandleList returns all CPF accounts for the current user.
// @Summary List CPF accounts (v2)
// @Description Returns all CPF accounts for the authenticated user
// @Tags CPF V2
// @Produce json
// @Success 200 {array} repo.CPFAccount
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/accounts [get]
func (h *CPFV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	accounts, err := h.store.ListCPFAccounts(r.Context(), userID, repo.DateRangeOptions{})
	if err != nil {
		log.Printf("cpf.List error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, accounts)
}

// cpfV2CreateInput is the JSON input struct for CPF v2 create.
// Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity.
type cpfV2CreateInput struct {
	PersonID         string  `json:"personId"` // Required FK to persons table
	OABalance        string  `json:"oaBalance"`
	SABalance        string  `json:"saBalance"`
	MABalance        string  `json:"maBalance"`
	RABalance        string  `json:"raBalance"`
	OAUsedForHousing string  `json:"oaUsedForHousing"`
	HousingStartDate *string `json:"housingStartDate"`
}

// POST /api/v2/cpf/account
// HandleCreate creates a CPF account.
// @Summary Create CPF account (v2)
// @Description Creates a CPF account with balances. Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are read from the linked Person entity.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param cpf body cpfV2CreateInput true "CPF account data"
// @Success 201 {object} repo.CPFAccount
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account [post]
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

	// Validate personId is provided
	if input.PersonID == "" {
		badRequest(w, errMissingFields("personId"))
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

	// Parse optional housing start date
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

	cpfAccount := repo.CPFAccount{
		PersonID:         input.PersonID,
		OABalance:        *oaBalance,
		SABalance:        *saBalance,
		MABalance:        *maBalance,
		RABalance:        *raBalance,
		OAUsedForHousing: *oaUsedForHousing,
		HousingStartDate: housingStartDate,
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
// Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity.
type cpfV2Input struct {
	PersonID         string  `json:"personId"` // Required FK to persons table
	OABalance        string  `json:"oaBalance"`
	SABalance        string  `json:"saBalance"`
	MABalance        string  `json:"maBalance"`
	RABalance        string  `json:"raBalance"`
	OAUsedForHousing string  `json:"oaUsedForHousing"`
	HousingStartDate *string `json:"housingStartDate"`
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

// PUT /api/v2/cpf/account/{id}
// HandleUpdate updates a CPF account.
// @Summary Update CPF account (v2)
// @Description Updates a CPF account version. Person-related fields are read from the linked Person entity.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param id path string true "CPF account ID"
// @Param cpf body cpfV2Input true "CPF account data"
// @Success 200 {object} repo.CPFAccount
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id} [put]
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

	// Parse optional housing start date
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
		PersonID:         input.PersonID,
		OABalance:        *oaBalance,
		SABalance:        *saBalance,
		MABalance:        *maBalance,
		RABalance:        *raBalance,
		OAUsedForHousing: *oaUsedForHousing,
		HousingStartDate: housingStartDate,
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

// DELETE /api/v2/cpf/account/{id}
// HandleDelete removes a CPF account.
// @Summary Delete CPF account (v2)
// @Description Deletes a CPF account and its versions
// @Tags CPF V2
// @Param id path string true "CPF account ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id} [delete]
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

// POST /api/v2/cpf/account/{id}/stop
// HandleStop sets an end date for a CPF account.
// @Summary Stop CPF account (v2)
// @Description Sets the endDate on a CPF account (soft delete)
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param id path string true "CPF account ID"
// @Param body body stopInput true "Stop input with endDate"
// @Success 200 {object} repo.CPFAccount
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/stop [post]
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
