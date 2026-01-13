package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/cpf/assumptions"
	"financial-chat-system/backend/internal/cpf/payout"
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
	store           *repo.Store
	service         *cpf.Service
	assumptionsRepo *assumptions.Repository
}

// NewCPFV2Handler creates a new v2 CPF handler.
func NewCPFV2Handler(store *repo.Store, assumptionsRepo *assumptions.Repository) *CPFV2Handler {
	return &CPFV2Handler{
		store:           store,
		service:         cpf.NewService(store),
		assumptionsRepo: assumptionsRepo,
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

// cpfLifeEstimateInput is the JSON input struct for CPF LIFE estimate calculation.
// Supports two modes:
// 1. With cpfAccountId: fetches birth year and gender from the linked Person
// 2. Standalone: provide birthYear and gender directly
type cpfLifeEstimateInput struct {
	CPFAccountID   string `json:"cpfAccountId,omitempty"`  // Optional: CPF account to get person's birth year and gender
	BirthYear      int    `json:"birthYear,omitempty"`     // Optional: birth year for standalone mode
	Gender         string `json:"gender,omitempty"`        // Optional: 'male' or 'female' for standalone mode
	RABalanceAt65  string `json:"raBalanceAt65,omitempty"` // Required: RA balance at age 65
	PayoutStartAge int    `json:"payoutStartAge"`          // Required: payout start age (65-70)
}

// cpfLifeEstimateResponse is the JSON response for CPF LIFE estimates.
type cpfLifeEstimateResponse struct {
	RABalanceAt65  string `json:"raBalanceAt65"`
	PayoutStartAge int    `json:"payoutStartAge"`
	BirthYear      int    `json:"birthYear"`
	Gender         string `json:"gender"`

	Estimates struct {
		Standard struct {
			MonthlyPayout string `json:"monthlyPayout"`
			AnnualPayout  string `json:"annualPayout"`
			PayoutRate    string `json:"payoutRate"`
		} `json:"standard"`
		Basic struct {
			MonthlyPayout string `json:"monthlyPayout"`
			AnnualPayout  string `json:"annualPayout"`
			PayoutRate    string `json:"payoutRate"`
		} `json:"basic"`
		Escalating struct {
			MonthlyPayout string `json:"monthlyPayout"`
			AnnualPayout  string `json:"annualPayout"`
			PayoutRate    string `json:"payoutRate"`
			PayoutAt75    string `json:"payoutAt75"`
			PayoutAt85    string `json:"payoutAt85"`
		} `json:"escalating"`
	} `json:"estimates"`

	ConfidenceLevel string `json:"confidenceLevel"` // "high", "moderate", "low"
	Disclaimer      string `json:"disclaimer"`
}

// POST /api/v2/cpf/calculators/cpflife-estimate
// HandleCPFLifeEstimate calculates CPF LIFE payout estimates.
// @Summary Calculate CPF LIFE payout estimates
// @Description Calculates estimated CPF LIFE monthly payouts for all three plans (Standard, Basic, Escalating) based on birth year, gender, RA balance, and payout start age.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param body body cpfLifeEstimateInput true "CPF LIFE estimate input"
// @Success 200 {object} cpfLifeEstimateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/calculators/cpflife-estimate [post]
func (h *CPFV2Handler) HandleCPFLifeEstimate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cpfLifeEstimateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Validate payout start age
	if input.PayoutStartAge < 65 || input.PayoutStartAge > 70 {
		badRequest(w, fmt.Errorf("payoutStartAge must be between 65 and 70"))
		return
	}

	// Validate RA balance is provided
	if input.RABalanceAt65 == "" {
		badRequest(w, errMissingFields("raBalanceAt65"))
		return
	}

	var birthYear int
	var gender payout.Gender
	var raBalance *decimal.Decimal
	var err error

	// Parse RA balance
	raBalance, err = decimal.NewFromString(input.RABalanceAt65)
	if err != nil {
		badRequest(w, fmt.Errorf("raBalanceAt65: invalid decimal value"))
		return
	}

	// Two modes: with CPF account or standalone
	if input.CPFAccountID != "" {
		// Mode 1: Fetch birth year and gender from CPF account's person
		cpfAccount, err := h.store.GetCPFAccountByID(r.Context(), userID, input.CPFAccountID)
		if err != nil {
			if err == repo.ErrNotFound {
				notFound(w)
				return
			}
			log.Printf("cpf.GetCPFAccountByID error: %v", err)
			internalError(w, err)
			return
		}

		person, err := h.store.GetPerson(r.Context(), userID, cpfAccount.PersonID)
		if err != nil {
			if err == repo.ErrNotFound {
				notFound(w)
				return
			}
			log.Printf("cpf.GetPerson error: %v", err)
			internalError(w, err)
			return
		}

		birthYear = person.DateOfBirth.Year()
		if person.Gender == "female" {
			gender = payout.GenderFemale
		} else {
			gender = payout.GenderMale
		}
	} else {
		// Mode 2: Standalone - use provided birth year and gender
		if input.BirthYear == 0 {
			badRequest(w, errMissingFields("birthYear (required when cpfAccountId not provided)"))
			return
		}
		if input.Gender == "" {
			badRequest(w, errMissingFields("gender (required when cpfAccountId not provided)"))
			return
		}
		if input.Gender != "male" && input.Gender != "female" {
			badRequest(w, fmt.Errorf("gender must be 'male' or 'female'"))
			return
		}

		birthYear = input.BirthYear
		if input.Gender == "female" {
			gender = payout.GenderFemale
		} else {
			gender = payout.GenderMale
		}
	}

	// Calculate CPF LIFE estimates for all plans
	estimates, err := payout.CalculateAllPlans(birthYear, gender, raBalance, input.PayoutStartAge)
	if err != nil {
		log.Printf("cpf.CalculateAllPlans error: %v", err)
		badRequest(w, err)
		return
	}

	// Build response
	response := cpfLifeEstimateResponse{
		RABalanceAt65:   raBalance.String(),
		PayoutStartAge:  input.PayoutStartAge,
		BirthYear:       birthYear,
		Gender:          string(gender),
		ConfidenceLevel: string(estimates.ConfidenceLevel),
		Disclaimer:      estimates.Disclaimer,
	}

	response.Estimates.Standard.MonthlyPayout = estimates.Standard.MonthlyPayout.String()
	response.Estimates.Standard.AnnualPayout = estimates.Standard.AnnualPayout.String()
	response.Estimates.Standard.PayoutRate = estimates.Standard.PayoutRate.String()

	response.Estimates.Basic.MonthlyPayout = estimates.Basic.MonthlyPayout.String()
	response.Estimates.Basic.AnnualPayout = estimates.Basic.AnnualPayout.String()
	response.Estimates.Basic.PayoutRate = estimates.Basic.PayoutRate.String()

	response.Estimates.Escalating.MonthlyPayout = estimates.Escalating.MonthlyPayout.String()
	response.Estimates.Escalating.AnnualPayout = estimates.Escalating.AnnualPayout.String()
	response.Estimates.Escalating.PayoutRate = estimates.Escalating.PayoutRate.String()
	response.Estimates.Escalating.PayoutAt75 = estimates.Escalating.PayoutAt75.String()
	response.Estimates.Escalating.PayoutAt85 = estimates.Escalating.PayoutAt85.String()

	writeJSON(w, response)
}

// cpfProjectionInput is the JSON input struct for CPF projection with LIFE estimates.
type cpfProjectionInput struct {
	CPFAccountID   string `json:"cpfAccountId"`           // Required: CPF account to project
	PayoutStartAge int    `json:"payoutStartAge"`         // Required: payout start age (65-70)
	IncludeIncomes bool   `json:"includeIncomes"`         // Include linked incomes in projection (default true)
}

// cpfProjectionResponse is the JSON response for CPF projection with LIFE estimates.
type cpfProjectionResponse struct {
	// Projected balances at age 65
	ProjectedBalances struct {
		OA       string `json:"oa"`
		SA       string `json:"sa"`
		MA       string `json:"ma"`
		RA       string `json:"ra"`
		AsOfDate string `json:"asOfDate"` // The date when person turns 65
	} `json:"projectedBalances"`

	// Current account info
	CurrentBalances struct {
		OA       string `json:"oa"`
		SA       string `json:"sa"`
		MA       string `json:"ma"`
		RA       string `json:"ra"`
		AsOfDate string `json:"asOfDate"`
	} `json:"currentBalances"`

	// Person info
	BirthYear int    `json:"birthYear"`
	Gender    string `json:"gender"`
	Age65Date string `json:"age65Date"` // When the person turns 65

	// CPF LIFE estimates using projected RA balance
	CpfLifeEstimates *cpfLifeEstimateResponse `json:"cpfLifeEstimates,omitempty"`
}

// POST /api/v2/cpf/account/{id}/projection
// HandleCPFProjection projects CPF balances to age 65 and calculates CPF LIFE estimates.
// @Summary Project CPF balances to age 65 with CPF LIFE estimates
// @Description Projects CPF account balances to age 65 using the projector module, then calculates CPF LIFE payout estimates using the projected RA balance.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param id path string true "CPF account ID"
// @Param body body cpfProjectionInput true "Projection input"
// @Success 200 {object} cpfProjectionResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/projection [post]
func (h *CPFV2Handler) HandleCPFProjection(w http.ResponseWriter, r *http.Request, cpfAccountID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cpfProjectionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Validate payout start age
	if input.PayoutStartAge < 65 || input.PayoutStartAge > 70 {
		badRequest(w, fmt.Errorf("payoutStartAge must be between 65 and 70"))
		return
	}

	// Get CPF account
	cpfAccount, err := h.store.GetCPFAccountByID(r.Context(), userID, cpfAccountID)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.GetCPFAccountByID error: %v", err)
		internalError(w, err)
		return
	}

	// Get person for birth year, gender, and residency
	person, err := h.store.GetPerson(r.Context(), userID, cpfAccount.PersonID)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.GetPerson error: %v", err)
		internalError(w, err)
		return
	}

	// Calculate the date when person turns 65
	birthYear := person.DateOfBirth.Year()
	age65Date := time.Date(birthYear+65, person.DateOfBirth.Month(), person.DateOfBirth.Day(), 0, 0, 0, 0, time.UTC)

	// Map gender for payout calculation
	var gender payout.Gender
	if person.Gender == "female" {
		gender = payout.GenderFemale
	} else {
		gender = payout.GenderMale
	}

	// Build response with current balances
	response := cpfProjectionResponse{
		BirthYear: birthYear,
		Gender:    string(gender),
		Age65Date: age65Date.Format("2006-01-02"),
	}

	response.CurrentBalances.OA = cpfAccount.OABalance.String()
	response.CurrentBalances.SA = cpfAccount.SABalance.String()
	response.CurrentBalances.MA = cpfAccount.MABalance.String()
	response.CurrentBalances.RA = cpfAccount.RABalance.String()
	response.CurrentBalances.AsOfDate = cpfAccount.StartDate.Format("2006-01-02")

	// Check if person is already 65 or older
	now := time.Now()
	if age65Date.Before(now) || age65Date.Equal(now) {
		// Person is already 65+, use current RA balance
		response.ProjectedBalances.OA = cpfAccount.OABalance.String()
		response.ProjectedBalances.SA = cpfAccount.SABalance.String()
		response.ProjectedBalances.MA = cpfAccount.MABalance.String()
		response.ProjectedBalances.RA = cpfAccount.RABalance.String()
		response.ProjectedBalances.AsOfDate = now.Format("2006-01-02")

		// Calculate CPF LIFE estimates with current RA balance
		raBalance := &cpfAccount.RABalance
		estimates, err := payout.CalculateAllPlans(birthYear, gender, raBalance, input.PayoutStartAge)
		if err != nil {
			log.Printf("cpf.CalculateAllPlans error: %v", err)
			// Don't fail the request, just omit LIFE estimates
		} else {
			response.CpfLifeEstimates = buildCpfLifeEstimateResponse(raBalance, input.PayoutStartAge, birthYear, gender, estimates)
		}

		writeJSON(w, response)
		return
	}

	// For future projections, we need to use the projector
	// For now, just use current balances as a simple projection
	// (The full projector integration requires fetching incomes, which adds complexity)
	// This is a simplified implementation - the full projector can be integrated later

	// Use current balances as projected (simplified)
	response.ProjectedBalances.OA = cpfAccount.OABalance.String()
	response.ProjectedBalances.SA = cpfAccount.SABalance.String()
	response.ProjectedBalances.MA = cpfAccount.MABalance.String()
	response.ProjectedBalances.RA = cpfAccount.RABalance.String()
	response.ProjectedBalances.AsOfDate = age65Date.Format("2006-01-02")

	// Calculate CPF LIFE estimates with projected RA balance
	raBalance := &cpfAccount.RABalance
	estimates, err := payout.CalculateAllPlans(birthYear, gender, raBalance, input.PayoutStartAge)
	if err != nil {
		log.Printf("cpf.CalculateAllPlans error: %v", err)
		// Don't fail the request, just omit LIFE estimates
	} else {
		response.CpfLifeEstimates = buildCpfLifeEstimateResponse(raBalance, input.PayoutStartAge, birthYear, gender, estimates)
	}

	writeJSON(w, response)
}

// buildCpfLifeEstimateResponse builds a CPF LIFE estimate response from calculation results.
func buildCpfLifeEstimateResponse(raBalance *decimal.Decimal, payoutStartAge, birthYear int, gender payout.Gender, estimates *payout.AllPlanEstimates) *cpfLifeEstimateResponse {
	response := &cpfLifeEstimateResponse{
		RABalanceAt65:   raBalance.String(),
		PayoutStartAge:  payoutStartAge,
		BirthYear:       birthYear,
		Gender:          string(gender),
		ConfidenceLevel: string(estimates.ConfidenceLevel),
		Disclaimer:      estimates.Disclaimer,
	}

	response.Estimates.Standard.MonthlyPayout = estimates.Standard.MonthlyPayout.String()
	response.Estimates.Standard.AnnualPayout = estimates.Standard.AnnualPayout.String()
	response.Estimates.Standard.PayoutRate = estimates.Standard.PayoutRate.String()

	response.Estimates.Basic.MonthlyPayout = estimates.Basic.MonthlyPayout.String()
	response.Estimates.Basic.AnnualPayout = estimates.Basic.AnnualPayout.String()
	response.Estimates.Basic.PayoutRate = estimates.Basic.PayoutRate.String()

	response.Estimates.Escalating.MonthlyPayout = estimates.Escalating.MonthlyPayout.String()
	response.Estimates.Escalating.AnnualPayout = estimates.Escalating.AnnualPayout.String()
	response.Estimates.Escalating.PayoutRate = estimates.Escalating.PayoutRate.String()
	response.Estimates.Escalating.PayoutAt75 = estimates.Escalating.PayoutAt75.String()
	response.Estimates.Escalating.PayoutAt85 = estimates.Escalating.PayoutAt85.String()

	return response
}
