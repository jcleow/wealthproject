package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/cpf/assumptions"
	"financial-chat-system/backend/internal/cpf/engine"
	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/cpf/retirement"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/cpf"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	timeline_v2 "financial-chat-system/backend/internal/financial_v2/timeline"
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
	timelineService TimelineService
}

// TimelineService interface for CPF projection from timeline
type TimelineService interface {
	ExtractCPFProjection(
		ctx context.Context,
		userID string,
		cpfAccountID string,
		personID string,
		dateOfBirth time.Time,
		gender string,
		retirementAge int,
		payoutStartAge int,
		assumptions *engine.Assumptions,
	) (*timeline_v2.CPFTimelineProjection, error)
}

// NewCPFV2Handler creates a new v2 CPF handler.
func NewCPFV2Handler(store *repo.Store, assumptionsRepo *assumptions.Repository, timelineService TimelineService) *CPFV2Handler {
	return &CPFV2Handler{
		store:           store,
		service:         cpf.NewService(store),
		assumptionsRepo: assumptionsRepo,
		timelineService: timelineService,
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
			MonthlyPayout  string `json:"monthlyPayout"`
			AnnualPayout   string `json:"annualPayout"`
			PayoutRate     string `json:"payoutRate"`
			BequestAtAge75 string `json:"bequestAtAge75,omitempty"`
			BequestAtAge85 string `json:"bequestAtAge85,omitempty"`
			BequestAtAge95 string `json:"bequestAtAge95,omitempty"`
		} `json:"standard"`
		Basic struct {
			MonthlyPayout  string `json:"monthlyPayout"`
			AnnualPayout   string `json:"annualPayout"`
			PayoutRate     string `json:"payoutRate"`
			BequestAtAge75 string `json:"bequestAtAge75,omitempty"`
			BequestAtAge85 string `json:"bequestAtAge85,omitempty"`
			BequestAtAge95 string `json:"bequestAtAge95,omitempty"`
		} `json:"basic"`
		Escalating struct {
			MonthlyPayout  string `json:"monthlyPayout"`
			AnnualPayout   string `json:"annualPayout"`
			PayoutRate     string `json:"payoutRate"`
			PayoutAt75     string `json:"payoutAt75"`
			PayoutAt85     string `json:"payoutAt85"`
			BequestAtAge75 string `json:"bequestAtAge75,omitempty"`
			BequestAtAge85 string `json:"bequestAtAge85,omitempty"`
			BequestAtAge95 string `json:"bequestAtAge95,omitempty"`
		} `json:"escalating"`
	} `json:"estimates"`

	Disclaimer string `json:"disclaimer"`
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

	// Parse RA balance
	raBalance, err := decimal.NewFromString(input.RABalanceAt65)
	if err != nil {
		badRequest(w, fmt.Errorf("raBalanceAt65: invalid decimal value"))
		return
	}

	// Delegate to service layer
	serviceInput := cpf.CPFLifeEstimateInput{
		CPFAccountID:   input.CPFAccountID,
		BirthYear:      input.BirthYear,
		Gender:         input.Gender,
		RABalanceAt65:  raBalance,
		PayoutStartAge: input.PayoutStartAge,
	}

	result, err := h.service.CalculateCPFLifeEstimates(r.Context(), userID, serviceInput)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.CalculateCPFLifeEstimates error: %v", err)
		badRequest(w, err)
		return
	}

	// Build response
	response := cpfLifeEstimateResponse{
		RABalanceAt65:  result.RABalanceAt65.String(),
		PayoutStartAge: result.PayoutStartAge,
		BirthYear:      result.BirthYear,
		Gender:         result.Gender,
		Disclaimer:     result.Disclaimer,
	}

	response.Estimates.Standard.MonthlyPayout = result.Standard.MonthlyPayout.String()
	response.Estimates.Standard.AnnualPayout = result.Standard.AnnualPayout.String()
	response.Estimates.Standard.PayoutRate = result.Standard.PayoutRate.String()

	response.Estimates.Basic.MonthlyPayout = result.Basic.MonthlyPayout.String()
	response.Estimates.Basic.AnnualPayout = result.Basic.AnnualPayout.String()
	response.Estimates.Basic.PayoutRate = result.Basic.PayoutRate.String()

	response.Estimates.Escalating.MonthlyPayout = result.Escalating.MonthlyPayout.String()
	response.Estimates.Escalating.AnnualPayout = result.Escalating.AnnualPayout.String()
	response.Estimates.Escalating.PayoutRate = result.Escalating.PayoutRate.String()
	response.Estimates.Escalating.PayoutAt75 = result.Escalating.PayoutAt75.String()
	response.Estimates.Escalating.PayoutAt85 = result.Escalating.PayoutAt85.String()

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

	// Delegate to service layer
	result, err := h.service.ProjectCPFWithLifeEstimates(r.Context(), userID, cpfAccountID, input.PayoutStartAge)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.ProjectCPFWithLifeEstimates error: %v", err)
		badRequest(w, err)
		return
	}

	// Build response
	response := cpfProjectionResponse{
		BirthYear: result.BirthYear,
		Gender:    result.Gender,
		Age65Date: result.Age65Date.Format("2006-01-02"),
	}

	response.ProjectedBalances.OA = result.ProjectedBalances.OA.String()
	response.ProjectedBalances.SA = result.ProjectedBalances.SA.String()
	response.ProjectedBalances.MA = result.ProjectedBalances.MA.String()
	response.ProjectedBalances.RA = result.ProjectedBalances.RA.String()
	response.ProjectedBalances.AsOfDate = result.ProjectedBalances.AsOfDate.Format("2006-01-02")

	response.CurrentBalances.OA = result.CurrentBalances.OA.String()
	response.CurrentBalances.SA = result.CurrentBalances.SA.String()
	response.CurrentBalances.MA = result.CurrentBalances.MA.String()
	response.CurrentBalances.RA = result.CurrentBalances.RA.String()
	response.CurrentBalances.AsOfDate = result.CurrentBalances.AsOfDate.Format("2006-01-02")

	// Add CPF LIFE estimates if available
	if result.CPFLifeEstimates != nil {
		response.CpfLifeEstimates = buildCpfLifeEstimateResponse(result.CPFLifeEstimates)
	}

	writeJSON(w, response)
}

// cpfBalanceProjectionProjectionInput is the JSON input struct for balance-projection CPF projection.
type cpfBalanceProjectionProjectionInput struct {
	RetirementAge  int `json:"retirementAge"`  // Age at which contributions stop (default 62)
	PayoutStartAge int `json:"payoutStartAge"` // CPF LIFE payout start age (65-70)
}

// cpfBalanceProjectionSnapshotResponse represents a single year's CPF balances.
type cpfBalanceProjectionSnapshotResponse struct {
	Year              int    `json:"year"`
	Age               int    `json:"age"`
	OA                string `json:"oa"`
	SA                string `json:"sa"`
	MA                string `json:"ma"`
	RA                string `json:"ra"`
	Total             string `json:"total"`
	Contributions     string `json:"contributions"`
	Interest          string `json:"interest"`
	MonthlyPayout     string `json:"monthlyPayout,omitempty"`     // CPF LIFE monthly payout (after age 65)
	YearlyPayout      string `json:"yearlyPayout,omitempty"`      // Total CPF LIFE payouts this year
	CumulativePayouts string `json:"cumulativePayouts,omitempty"` // Total CPF LIFE payouts to date
}

// cpfBalanceProjectionProjectionResponse is the JSON response for balance-projection projection.
type cpfBalanceProjectionProjectionResponse struct {
	Snapshots []cpfBalanceProjectionSnapshotResponse `json:"snapshots"`

	Age55Balances *struct {
		OA string `json:"oa"`
		SA string `json:"sa"`
		MA string `json:"ma"`
		RA string `json:"ra"`
	} `json:"age55Balances,omitempty"`

	Age65Balances *struct {
		OA string `json:"oa"`
		SA string `json:"sa"`
		MA string `json:"ma"`
		RA string `json:"ra"`
	} `json:"age65Balances,omitempty"`

	FRSAtAge55 string `json:"frsAt55"`
	BRSAtAge55 string `json:"brsAt55"`
	ERSAtAge55 string `json:"ersAt55"`
	BHS        string `json:"bhs"`

	BirthYear int    `json:"birthYear"`
	Gender    string `json:"gender"`

	CpfLifeEstimates *cpfLifeEstimateResponse `json:"cpfLifeEstimates,omitempty"`
}

// buildCpfLifeEstimateResponse builds a CPF LIFE estimate response from service result.
func buildCpfLifeEstimateResponse(result *cpf.CPFLifeEstimateResult) *cpfLifeEstimateResponse {
	response := &cpfLifeEstimateResponse{
		RABalanceAt65:  result.RABalanceAt65.String(),
		PayoutStartAge: result.PayoutStartAge,
		BirthYear:      result.BirthYear,
		Gender:         result.Gender,
		Disclaimer:     result.Disclaimer,
	}

	// Standard plan
	response.Estimates.Standard.MonthlyPayout = result.Standard.MonthlyPayout.String()
	response.Estimates.Standard.AnnualPayout = result.Standard.AnnualPayout.String()
	response.Estimates.Standard.PayoutRate = result.Standard.PayoutRate.String()
	if result.Standard.BequestAtAge75 != nil {
		response.Estimates.Standard.BequestAtAge75 = result.Standard.BequestAtAge75.String()
	}
	if result.Standard.BequestAtAge85 != nil {
		response.Estimates.Standard.BequestAtAge85 = result.Standard.BequestAtAge85.String()
	}
	if result.Standard.BequestAtAge95 != nil {
		response.Estimates.Standard.BequestAtAge95 = result.Standard.BequestAtAge95.String()
	}

	// Basic plan
	response.Estimates.Basic.MonthlyPayout = result.Basic.MonthlyPayout.String()
	response.Estimates.Basic.AnnualPayout = result.Basic.AnnualPayout.String()
	response.Estimates.Basic.PayoutRate = result.Basic.PayoutRate.String()
	if result.Basic.BequestAtAge75 != nil {
		response.Estimates.Basic.BequestAtAge75 = result.Basic.BequestAtAge75.String()
	}
	if result.Basic.BequestAtAge85 != nil {
		response.Estimates.Basic.BequestAtAge85 = result.Basic.BequestAtAge85.String()
	}
	if result.Basic.BequestAtAge95 != nil {
		response.Estimates.Basic.BequestAtAge95 = result.Basic.BequestAtAge95.String()
	}

	// Escalating plan
	response.Estimates.Escalating.MonthlyPayout = result.Escalating.MonthlyPayout.String()
	response.Estimates.Escalating.AnnualPayout = result.Escalating.AnnualPayout.String()
	response.Estimates.Escalating.PayoutRate = result.Escalating.PayoutRate.String()
	response.Estimates.Escalating.PayoutAt75 = result.Escalating.PayoutAt75.String()
	response.Estimates.Escalating.PayoutAt85 = result.Escalating.PayoutAt85.String()
	if result.Escalating.BequestAtAge75 != nil {
		response.Estimates.Escalating.BequestAtAge75 = result.Escalating.BequestAtAge75.String()
	}
	if result.Escalating.BequestAtAge85 != nil {
		response.Estimates.Escalating.BequestAtAge85 = result.Escalating.BequestAtAge85.String()
	}
	if result.Escalating.BequestAtAge95 != nil {
		response.Estimates.Escalating.BequestAtAge95 = result.Escalating.BequestAtAge95.String()
	}

	return response
}

// age55ConversionInput is the JSON input struct for Age 55 conversion calculation.
type age55ConversionInput struct {
	OABalance            string `json:"oaBalance"`            // Ordinary Account balance
	SABalance            string `json:"saBalance"`            // Special Account balance
	MABalance            string `json:"maBalance"`            // MediSave Account balance
	TargetScheme         string `json:"targetScheme"`         // "brs", "frs", or "ers"
	BRS                  string `json:"brs"`                  // Basic Retirement Sum
	FRS                  string `json:"frs"`                  // Full Retirement Sum
	ERS                  string `json:"ers"`                  // Enhanced Retirement Sum
	BHS                  string `json:"bhs"`                  // Basic Healthcare Sum
	PropertyPledgeAmount string `json:"propertyPledgeAmount"` // Optional: property pledge amount
}

// age55ConversionResponse is the JSON response for Age 55 conversion calculation.
type age55ConversionResponse struct {
	// Transfer breakdown
	SAToRA         string `json:"saToRa"`
	OAToRA         string `json:"oaToRa"`
	MAOverflowToRA string `json:"maOverflowToRa"`

	// Final balances after conversion
	FinalOA string `json:"finalOa"`
	FinalSA string `json:"finalSa"`
	FinalMA string `json:"finalMa"`
	FinalRA string `json:"finalRa"`

	// Status
	MeetsTarget     bool `json:"meetsTarget"`
	CPFLifeEligible bool `json:"cpfLifeEligible"`

	// Withdrawable
	WithdrawableOA string `json:"withdrawableOa"`

	// Target details
	TargetScheme string `json:"targetScheme"`
	TargetAmount string `json:"targetAmount"`
}

// POST /api/v2/cpf/calculators/age55-conversion
// HandleAge55Conversion calculates the Age 55 RA conversion.
// @Summary Calculate Age 55 RA conversion
// @Description Calculates how CPF balances will be transferred to RA at age 55 based on target scheme.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param body body age55ConversionInput true "Conversion input"
// @Success 200 {object} age55ConversionResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/calculators/age55-conversion [post]
func (h *CPFV2Handler) HandleAge55Conversion(w http.ResponseWriter, r *http.Request) {
	_, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input age55ConversionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Parse decimal values
	oaBalance, err := decimal.NewFromString(input.OABalance)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid oaBalance: %w", err))
		return
	}
	saBalance, err := decimal.NewFromString(input.SABalance)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid saBalance: %w", err))
		return
	}
	maBalance, err := decimal.NewFromString(input.MABalance)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid maBalance: %w", err))
		return
	}
	brs, err := decimal.NewFromString(input.BRS)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid brs: %w", err))
		return
	}
	frs, err := decimal.NewFromString(input.FRS)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid frs: %w", err))
		return
	}
	ers, err := decimal.NewFromString(input.ERS)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid ers: %w", err))
		return
	}
	bhs, err := decimal.NewFromString(input.BHS)
	if err != nil {
		badRequest(w, fmt.Errorf("invalid bhs: %w", err))
		return
	}

	// Optional property pledge
	var propertyPledge *decimal.Decimal
	if input.PropertyPledgeAmount != "" {
		pp, err := decimal.NewFromString(input.PropertyPledgeAmount)
		if err != nil {
			badRequest(w, fmt.Errorf("invalid propertyPledgeAmount: %w", err))
			return
		}
		propertyPledge = pp
	}

	// Build conversion input
	convInput := retirement.ConversionInput{
		OABalance:            oaBalance,
		SABalance:            saBalance,
		MABalance:            maBalance,
		TargetScheme:         retirement.TargetScheme(input.TargetScheme),
		BRS:                  brs,
		FRS:                  frs,
		ERS:                  ers,
		BHS:                  bhs,
		PropertyPledgeAmount: propertyPledge,
	}

	// Calculate conversion
	result, err := retirement.CalculateConversion(convInput)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Build response
	response := age55ConversionResponse{
		SAToRA:          result.SAToRA.String(),
		OAToRA:          result.OAToRA.String(),
		MAOverflowToRA:  result.MAOverflowToRA.String(),
		FinalOA:         result.FinalOA.String(),
		FinalSA:         result.FinalSA.String(),
		FinalMA:         result.FinalMA.String(),
		FinalRA:         result.FinalRA.String(),
		MeetsTarget:     result.MeetsTarget,
		CPFLifeEligible: result.CPFLifeEligible,
		WithdrawableOA:  result.WithdrawableOA.String(),
		TargetScheme:    string(result.TargetScheme),
		TargetAmount:    result.TargetAmount.String(),
	}

	writeJSON(w, response)
}

// POST /api/v2/cpf/account/{id}/timeline-projection
// HandleCPFTimelineProjection projects CPF balances using the Timeline service.
// This ensures consistency with all Timeline calculations including scenario impacts and income growth.
// @Summary Project CPF balances using Timeline (recommended)
// @Description Projects CPF account balances year by year using the Timeline service, which includes scenario impacts, income growth, and all CPF lifecycle events.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param id path string true "CPF account ID"
// @Param body body cpfBalanceProjectionProjectionInput true "Projection input"
// @Success 200 {object} cpfBalanceProjectionProjectionResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/timeline-projection [post]
func (h *CPFV2Handler) HandleCPFTimelineProjection(w http.ResponseWriter, r *http.Request, cpfAccountID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input cpfBalanceProjectionProjectionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Default retirement age to 62 if not provided
	retirementAge := input.RetirementAge
	if retirementAge == 0 {
		retirementAge = 62
	}

	// Default payout start age to 65 if not provided
	payoutStartAge := input.PayoutStartAge
	if payoutStartAge == 0 {
		payoutStartAge = 65
	}

	// Validate payout start age
	if payoutStartAge < 65 || payoutStartAge > 70 {
		badRequest(w, fmt.Errorf("payoutStartAge must be between 65 and 70"))
		return
	}

	// Get CPF account to find personID and person details
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

	// Get person details for birth date and gender
	person, err := h.store.GetPerson(r.Context(), userID, cpfAccount.PersonID)
	if err != nil {
		log.Printf("cpf.GetPerson error: %v", err)
		internalError(w, err)
		return
	}

	// Fetch custom assumptions for this CPF account (or create defaults if none exist)
	var engineAssumptions *engine.Assumptions
	dbAssumptions, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccountID)
	if err != nil {
		log.Printf("cpf.GetAssumptions error: %v (using defaults)", err)
		// Continue with nil - will use engine defaults
	} else {
		engineAssumptions = engine.FromCPFAssumptions(dbAssumptions)
	}

	// Use Timeline service to extract CPF projection
	result, err := h.timelineService.ExtractCPFProjection(
		r.Context(),
		userID,
		cpfAccountID,
		cpfAccount.PersonID,
		person.DateOfBirth,
		person.Gender,
		retirementAge,
		payoutStartAge,
		engineAssumptions,
	)
	if err != nil {
		log.Printf("cpf.ExtractCPFProjection error: %v", err)
		internalError(w, err)
		return
	}

	// Build response in the same format as HandleCPFBalanceProjection
	bhsStr := "0"
	if result.BHS != nil {
		bhsStr = result.BHS.String()
	}
	response := cpfBalanceProjectionProjectionResponse{
		Snapshots:  make([]cpfBalanceProjectionSnapshotResponse, len(result.Snapshots)),
		FRSAtAge55: common.SafeDecimalString(result.FRSAtAge55),
		BRSAtAge55: common.SafeDecimalString(result.BRSAtAge55),
		ERSAtAge55: common.SafeDecimalString(result.ERSAtAge55),
		BHS:        bhsStr,
		BirthYear:  result.BirthYear,
		Gender:     result.Gender,
	}

	// Map snapshots
	for i, snap := range result.Snapshots {
		snapshotResponse := cpfBalanceProjectionSnapshotResponse{
			Year:          snap.Year,
			Age:           snap.Age,
			OA:            common.SafeDecimalString(snap.OA),
			SA:            common.SafeDecimalString(snap.SA),
			MA:            common.SafeDecimalString(snap.MA),
			RA:            common.SafeDecimalString(snap.RA),
			Total:         common.SafeDecimalString(snap.Total),
			Contributions: common.SafeDecimalString(snap.Contributions),
			Interest:      common.SafeDecimalString(snap.Interest),
		}

		// Include payout fields if available
		if snap.MonthlyPayout != nil {
			snapshotResponse.MonthlyPayout = snap.MonthlyPayout.String()
		}
		if snap.YearlyPayout != nil {
			snapshotResponse.YearlyPayout = snap.YearlyPayout.String()
		}
		if snap.CumulativePayouts != nil {
			snapshotResponse.CumulativePayouts = snap.CumulativePayouts.String()
		}

		response.Snapshots[i] = snapshotResponse
	}

	// Map age 55 balances
	if result.Age55Balances != nil {
		response.Age55Balances = &struct {
			OA string `json:"oa"`
			SA string `json:"sa"`
			MA string `json:"ma"`
			RA string `json:"ra"`
		}{
			OA: common.SafeDecimalString(result.Age55Balances.OA),
			SA: common.SafeDecimalString(result.Age55Balances.SA),
			MA: common.SafeDecimalString(result.Age55Balances.MA),
			RA: common.SafeDecimalString(result.Age55Balances.RA),
		}
	}

	// Map age 65 balances
	if result.Age65Balances != nil {
		response.Age65Balances = &struct {
			OA string `json:"oa"`
			SA string `json:"sa"`
			MA string `json:"ma"`
			RA string `json:"ra"`
		}{
			OA: common.SafeDecimalString(result.Age65Balances.OA),
			SA: common.SafeDecimalString(result.Age65Balances.SA),
			MA: common.SafeDecimalString(result.Age65Balances.MA),
			RA: common.SafeDecimalString(result.Age65Balances.RA),
		}
	}

	// Calculate CPF LIFE estimates for all plans if we have age 65 RA balance
	if result.Age65Balances != nil && result.Age65Balances.RA != nil && !result.Age65Balances.RA.IsZero() {
		// Determine gender for payout calculation
		var gender payout.Gender
		if result.Gender == "male" {
			gender = payout.GenderMale
		} else {
			gender = payout.GenderFemale
		}

		// Calculate all plan estimates
		estimates, err := payout.CalculateAllPlans(result.BirthYear, gender, result.Age65Balances.RA, payoutStartAge)
		if err != nil {
			log.Printf("cpf.CalculateAllPlans error: %v", err)
		} else {
			response.CpfLifeEstimates = &cpfLifeEstimateResponse{
				RABalanceAt65:  common.SafeDecimalString(result.Age65Balances.RA),
				PayoutStartAge: payoutStartAge,
				BirthYear:      result.BirthYear,
				Gender:         result.Gender,
				Disclaimer:     estimates.Disclaimer,
			}

			// Standard plan
			response.CpfLifeEstimates.Estimates.Standard.MonthlyPayout = estimates.Standard.MonthlyPayout.String()
			response.CpfLifeEstimates.Estimates.Standard.AnnualPayout = estimates.Standard.AnnualPayout.String()
			response.CpfLifeEstimates.Estimates.Standard.PayoutRate = estimates.Standard.PayoutRate.String()

			// Basic plan
			response.CpfLifeEstimates.Estimates.Basic.MonthlyPayout = estimates.Basic.MonthlyPayout.String()
			response.CpfLifeEstimates.Estimates.Basic.AnnualPayout = estimates.Basic.AnnualPayout.String()
			response.CpfLifeEstimates.Estimates.Basic.PayoutRate = estimates.Basic.PayoutRate.String()

			// Escalating plan
			response.CpfLifeEstimates.Estimates.Escalating.MonthlyPayout = estimates.Escalating.MonthlyPayout.String()
			response.CpfLifeEstimates.Estimates.Escalating.AnnualPayout = estimates.Escalating.AnnualPayout.String()
			response.CpfLifeEstimates.Estimates.Escalating.PayoutRate = estimates.Escalating.PayoutRate.String()
			response.CpfLifeEstimates.Estimates.Escalating.PayoutAt75 = estimates.Escalating.PayoutAt75.String()
			response.CpfLifeEstimates.Estimates.Escalating.PayoutAt85 = estimates.Escalating.PayoutAt85.String()
		}
	}

	writeJSON(w, response)
}
