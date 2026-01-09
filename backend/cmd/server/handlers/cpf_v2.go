package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/cpf/assumptions"
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

// ─────────────────────────────────────────────────────────────────────────────
// CPF Assumptions endpoints
// ─────────────────────────────────────────────────────────────────────────────

// cpfAssumptionsResponse is the JSON response for CPF assumptions.
// Structured to match the spec's nested format.
type cpfAssumptionsResponse struct {
	ID           string `json:"id"`
	CPFAccountID string `json:"cpfAccountId"`
	InterestRates struct {
		OA                   string `json:"oa"`
		SA                   string `json:"sa"`
		MA                   string `json:"ma"`
		RA                   string `json:"ra"`
		ExtraFirst60K        string `json:"extraFirst60K"`
		ExtraFirst30KAbove55 string `json:"extraFirst30KAbove55"`
	} `json:"interestRates"`
	GrowthRates struct {
		Inflation string `json:"inflation"`
		FRS       string `json:"frs"`
		Salary    string `json:"salary"`
	} `json:"growthRates"`
	Employment struct {
		AssumeContinuous bool `json:"assumeContinuous"`
		RetirementAge    int  `json:"retirementAge"`
	} `json:"employment"`
	CPFLife struct {
		Plan             string `json:"plan"`
		PayoutStartAge   int    `json:"payoutStartAge"`
		EscalatingGrowth string `json:"escalatingGrowth"`
	} `json:"cpfLife"`
	PresetName string `json:"presetName"`
}

// mapAssumptionsToResponse converts internal assumptions to API response.
func mapAssumptionsToResponse(a *assumptions.CPFAssumptions) *cpfAssumptionsResponse {
	resp := &cpfAssumptionsResponse{
		ID:           a.ID,
		CPFAccountID: a.CPFAccountID,
		PresetName:   string(a.PresetName),
	}
	resp.InterestRates.OA = a.InterestRateOA.String()
	resp.InterestRates.SA = a.InterestRateSA.String()
	resp.InterestRates.MA = a.InterestRateMA.String()
	resp.InterestRates.RA = a.InterestRateRA.String()
	resp.InterestRates.ExtraFirst60K = a.ExtraInterestFirst60K.String()
	resp.InterestRates.ExtraFirst30KAbove55 = a.ExtraInterestFirst30KAbove55.String()
	resp.GrowthRates.Inflation = a.InflationRate.String()
	resp.GrowthRates.FRS = a.FRSGrowthRate.String()
	resp.GrowthRates.Salary = a.SalaryGrowthRate.String()
	resp.Employment.AssumeContinuous = a.AssumeContinuousEmployment
	resp.Employment.RetirementAge = a.RetirementAge
	resp.CPFLife.Plan = string(a.CPFLifePlan)
	resp.CPFLife.PayoutStartAge = a.PayoutStartAge
	resp.CPFLife.EscalatingGrowth = a.EscalatingPlanGrowth.String()
	return resp
}

// cpfAssumptionsInput is the JSON input for updating CPF assumptions.
type cpfAssumptionsInput struct {
	InterestRates *struct {
		OA                   *string `json:"oa"`
		SA                   *string `json:"sa"`
		MA                   *string `json:"ma"`
		RA                   *string `json:"ra"`
		ExtraFirst60K        *string `json:"extraFirst60K"`
		ExtraFirst30KAbove55 *string `json:"extraFirst30KAbove55"`
	} `json:"interestRates"`
	GrowthRates *struct {
		Inflation *string `json:"inflation"`
		FRS       *string `json:"frs"`
		Salary    *string `json:"salary"`
	} `json:"growthRates"`
	Employment *struct {
		AssumeContinuous *bool `json:"assumeContinuous"`
		RetirementAge    *int  `json:"retirementAge"`
	} `json:"employment"`
	CPFLife *struct {
		Plan             *string `json:"plan"`
		PayoutStartAge   *int    `json:"payoutStartAge"`
		EscalatingGrowth *string `json:"escalatingGrowth"`
	} `json:"cpfLife"`
	PresetName *string `json:"presetName"`
}

// GET /api/v2/cpf/account/{id}/assumptions
// HandleGetAssumptions retrieves CPF assumptions for an account.
// @Summary Get CPF assumptions (v2)
// @Description Returns the assumptions for a specific CPF account. Creates defaults if none exist.
// @Tags CPF V2
// @Produce json
// @Param id path string true "CPF account ID"
// @Success 200 {object} cpfAssumptionsResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/assumptions [get]
func (h *CPFV2Handler) HandleGetAssumptions(w http.ResponseWriter, r *http.Request, cpfAccountID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Verify the CPF account belongs to the user
	account, err := h.store.GetCPFAccountByID(r.Context(), userID, cpfAccountID)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.GetAssumptions account lookup error: %v", err)
		internalError(w, err)
		return
	}
	if account == nil {
		notFound(w)
		return
	}

	// Get or create default assumptions
	a, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccountID)
	if err != nil {
		log.Printf("cpf.GetAssumptions error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, mapAssumptionsToResponse(a))
}

// PUT /api/v2/cpf/account/{id}/assumptions
// HandleUpdateAssumptions updates CPF assumptions for an account.
// @Summary Update CPF assumptions (v2)
// @Description Updates the assumptions for a specific CPF account. Only provided fields are updated.
// @Tags CPF V2
// @Accept json
// @Produce json
// @Param id path string true "CPF account ID"
// @Param assumptions body cpfAssumptionsInput true "Assumptions data"
// @Success 200 {object} cpfAssumptionsResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/assumptions [put]
func (h *CPFV2Handler) HandleUpdateAssumptions(w http.ResponseWriter, r *http.Request, cpfAccountID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Verify the CPF account belongs to the user
	account, err := h.store.GetCPFAccountByID(r.Context(), userID, cpfAccountID)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.UpdateAssumptions account lookup error: %v", err)
		internalError(w, err)
		return
	}
	if account == nil {
		notFound(w)
		return
	}

	var input cpfAssumptionsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Get existing or default assumptions to merge with
	existing, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccountID)
	if err != nil {
		log.Printf("cpf.UpdateAssumptions get existing error: %v", err)
		internalError(w, err)
		return
	}

	// Merge input into existing assumptions
	if input.InterestRates != nil {
		if input.InterestRates.OA != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.OA); err == nil {
				existing.InterestRateOA = *d
			}
		}
		if input.InterestRates.SA != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.SA); err == nil {
				existing.InterestRateSA = *d
			}
		}
		if input.InterestRates.MA != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.MA); err == nil {
				existing.InterestRateMA = *d
			}
		}
		if input.InterestRates.RA != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.RA); err == nil {
				existing.InterestRateRA = *d
			}
		}
		if input.InterestRates.ExtraFirst60K != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.ExtraFirst60K); err == nil {
				existing.ExtraInterestFirst60K = *d
			}
		}
		if input.InterestRates.ExtraFirst30KAbove55 != nil {
			if d, err := decimal.NewFromString(*input.InterestRates.ExtraFirst30KAbove55); err == nil {
				existing.ExtraInterestFirst30KAbove55 = *d
			}
		}
	}

	if input.GrowthRates != nil {
		if input.GrowthRates.Inflation != nil {
			if d, err := decimal.NewFromString(*input.GrowthRates.Inflation); err == nil {
				existing.InflationRate = *d
			}
		}
		if input.GrowthRates.FRS != nil {
			if d, err := decimal.NewFromString(*input.GrowthRates.FRS); err == nil {
				existing.FRSGrowthRate = *d
			}
		}
		if input.GrowthRates.Salary != nil {
			if d, err := decimal.NewFromString(*input.GrowthRates.Salary); err == nil {
				existing.SalaryGrowthRate = *d
			}
		}
	}

	if input.Employment != nil {
		if input.Employment.AssumeContinuous != nil {
			existing.AssumeContinuousEmployment = *input.Employment.AssumeContinuous
		}
		if input.Employment.RetirementAge != nil {
			existing.RetirementAge = *input.Employment.RetirementAge
		}
	}

	if input.CPFLife != nil {
		if input.CPFLife.Plan != nil {
			plan := assumptions.CPFLifePlan(*input.CPFLife.Plan)
			if plan == assumptions.CPFLifePlanStandard || plan == assumptions.CPFLifePlanBasic || plan == assumptions.CPFLifePlanEscalating {
				existing.CPFLifePlan = plan
			}
		}
		if input.CPFLife.PayoutStartAge != nil {
			age := *input.CPFLife.PayoutStartAge
			if age >= 65 && age <= 70 {
				existing.PayoutStartAge = age
			}
		}
		if input.CPFLife.EscalatingGrowth != nil {
			if d, err := decimal.NewFromString(*input.CPFLife.EscalatingGrowth); err == nil {
				existing.EscalatingPlanGrowth = *d
			}
		}
	}

	if input.PresetName != nil {
		preset := assumptions.PresetName(*input.PresetName)
		if preset == assumptions.PresetOfficial || preset == assumptions.PresetConservative || preset == assumptions.PresetOptimistic || preset == assumptions.PresetCustom {
			existing.PresetName = preset
		}
	}

	// Save updated assumptions
	updated, err := h.assumptionsRepo.Upsert(r.Context(), existing)
	if err != nil {
		log.Printf("cpf.UpdateAssumptions save error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, mapAssumptionsToResponse(updated))
}

// DELETE /api/v2/cpf/account/{id}/assumptions
// HandleDeleteAssumptions removes CPF assumptions for an account (resets to defaults).
// @Summary Delete CPF assumptions (v2)
// @Description Deletes the assumptions for a specific CPF account, effectively resetting to defaults.
// @Tags CPF V2
// @Param id path string true "CPF account ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/cpf/account/{id}/assumptions [delete]
func (h *CPFV2Handler) HandleDeleteAssumptions(w http.ResponseWriter, r *http.Request, cpfAccountID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Verify the CPF account belongs to the user
	account, err := h.store.GetCPFAccountByID(r.Context(), userID, cpfAccountID)
	if err != nil {
		if err == repo.ErrNotFound {
			notFound(w)
			return
		}
		log.Printf("cpf.DeleteAssumptions account lookup error: %v", err)
		internalError(w, err)
		return
	}
	if account == nil {
		notFound(w)
		return
	}

	if err := h.assumptionsRepo.Delete(r.Context(), cpfAccountID); err != nil {
		if errors.Is(err, assumptions.ErrNotFound) {
			// Not an error - just means no custom assumptions existed
			w.WriteHeader(http.StatusNoContent)
			return
		}
		log.Printf("cpf.DeleteAssumptions error: %v", err)
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
