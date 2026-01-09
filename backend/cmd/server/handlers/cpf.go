package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/assumptions"
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/cpf/projector"
	"financial-chat-system/backend/internal/persons"
)

// CPFHandler serves CPF-related endpoints.
type CPFHandler struct {
	accountRepo     *account.Repository
	assumptionsRepo *assumptions.Repository
	personsRepo     *persons.Repository
}

func NewCPFHandler(accountRepo *account.Repository, assumptionsRepo *assumptions.Repository, personsRepo *persons.Repository) *CPFHandler {
	return &CPFHandler{
		accountRepo:     accountRepo,
		assumptionsRepo: assumptionsRepo,
		personsRepo:     personsRepo,
	}
}

func (h *CPFHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cpf/account", h.handleAccount)
	router.HandleFunc("/cpf/account/assumptions", h.handleAssumptions)
	router.HandleFunc("/cpf/account/projection/range", h.handleProjectionRange)
	router.HandleFunc("/cpf/config", h.handleConfig)
	router.HandleFunc("/cpf/config/years", h.handleConfigYears)
	router.HandleFunc("/cpf/contribution-preview", h.handleContributionPreview)
}

// ===============================
// Account Endpoints
// ===============================

func (h *CPFHandler) handleAccount(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAccount(w, r)
	case http.MethodPost:
		h.createAccount(w, r)
	case http.MethodPut:
		h.updateAccount(w, r)
	default:
		methodNotAllowed(w)
	}
}

type cpfAccountResponse struct {
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	PersonID         string  `json:"person_id"`
	PersonName       string  `json:"person_name"`
	OABalance        float64 `json:"oa_balance"`
	SABalance        float64 `json:"sa_balance"`
	MABalance        float64 `json:"ma_balance"`
	RABalance        float64 `json:"ra_balance"`
	OAUsedForHousing float64 `json:"oa_used_for_housing"`
	HousingStartDate *string `json:"housing_start_date,omitempty"`
	StartDate        string  `json:"start_date"`
	EndDate          *string `json:"end_date,omitempty"`
	DateOfBirth      string  `json:"date_of_birth"`
	ResidencyStatus  string  `json:"residency_status"`
	PRGrantDate      *string `json:"pr_grant_date,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

func accountToResponse(acc *account.CPFAccount) cpfAccountResponse {
	resp := cpfAccountResponse{
		ID:               acc.ID,
		UserID:           acc.UserID,
		PersonID:         acc.PersonID,
		PersonName:       acc.PersonName,
		OABalance:        acc.OABalance,
		SABalance:        acc.SABalance,
		MABalance:        acc.MABalance,
		RABalance:        acc.RABalance,
		OAUsedForHousing: acc.OAUsedForHousing,
		StartDate:        acc.StartDate.Format(time.RFC3339),
		DateOfBirth:      acc.DateOfBirth.Format("2006-01-02"),
		ResidencyStatus:  string(acc.ResidencyStatus),
		CreatedAt:        acc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        acc.UpdatedAt.Format(time.RFC3339),
	}
	if acc.HousingStartDate != nil {
		s := acc.HousingStartDate.Format(time.RFC3339)
		resp.HousingStartDate = &s
	}
	if acc.EndDate != nil {
		s := acc.EndDate.Format(time.RFC3339)
		resp.EndDate = &s
	}
	if acc.PRGrantDate != nil {
		s := acc.PRGrantDate.Format("2006-01-02")
		resp.PRGrantDate = &s
	}
	return resp
}

func (h *CPFHandler) getAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	acc, err := h.accountRepo.Get(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found")
			return
		}
		internalError(w)
		return
	}

	writeJSON(w, accountToResponse(acc))
}

type createAccountRequest struct {
	PersonName       string   `json:"person_name"`
	OABalance        *float64 `json:"oa_balance"`
	SABalance        *float64 `json:"sa_balance"`
	MABalance        *float64 `json:"ma_balance"`
	RABalance        *float64 `json:"ra_balance"`
	OAUsedForHousing *float64 `json:"oa_used_for_housing"`
	HousingStartDate *string  `json:"housing_start_date"`
	DateOfBirth      string   `json:"date_of_birth"`
	ResidencyStatus  string   `json:"residency_status"`
	PRGrantDate      *string  `json:"pr_grant_date"`
}

func (h *CPFHandler) createAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	if req.DateOfBirth == "" {
		badRequest(w, errMissingFields("date_of_birth"))
		return
	}

	dob, err := time.Parse("2006-01-02", req.DateOfBirth)
	if err != nil {
		badRequest(w, errors.New("invalid date_of_birth format, expected YYYY-MM-DD"))
		return
	}

	residency := "citizen"
	if req.ResidencyStatus != "" {
		residency = req.ResidencyStatus
	}

	// Parse PR grant date if provided
	var prGrantDate *time.Time
	if req.PRGrantDate != nil && *req.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *req.PRGrantDate)
		if err == nil {
			prGrantDate = &t
		}
	}

	// Person name defaults to "Self" if not provided
	personName := req.PersonName
	if personName == "" {
		personName = "Self"
	}

	// Get or create the person
	person, err := h.personsRepo.GetOrCreate(r.Context(), userID, personName, persons.CreateInput{
		DateOfBirth:     dob,
		ResidencyStatus: residency,
		PRGrantDate:     prGrantDate,
		IsIncluded:      true,
	})
	if err != nil {
		internalError(w)
		return
	}

	// Build account input
	accountInput := account.CreateAccountInput{
		UserID:   userID,
		PersonID: person.ID,
	}
	if req.OABalance != nil {
		accountInput.OABalance = *req.OABalance
	}
	if req.SABalance != nil {
		accountInput.SABalance = *req.SABalance
	}
	if req.MABalance != nil {
		accountInput.MABalance = *req.MABalance
	}
	if req.RABalance != nil {
		accountInput.RABalance = *req.RABalance
	}
	if req.OAUsedForHousing != nil {
		accountInput.OAUsedForHousing = *req.OAUsedForHousing
	}
	if req.HousingStartDate != nil && *req.HousingStartDate != "" {
		t, err := time.Parse(time.RFC3339, *req.HousingStartDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *req.HousingStartDate)
		}
		if err == nil {
			accountInput.HousingStartDate = &t
		}
	}

	created, err := h.accountRepo.Upsert(r.Context(), accountInput)
	if err != nil {
		internalError(w)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, accountToResponse(created))
}

type updateAccountRequest struct {
	OABalance        *float64 `json:"oa_balance"`
	SABalance        *float64 `json:"sa_balance"`
	MABalance        *float64 `json:"ma_balance"`
	RABalance        *float64 `json:"ra_balance"`
	OAUsedForHousing *float64 `json:"oa_used_for_housing"`
	HousingStartDate *string  `json:"housing_start_date"`
	DateOfBirth      *string  `json:"date_of_birth"`
	ResidencyStatus  *string  `json:"residency_status"`
	PRGrantDate      *string  `json:"pr_grant_date"`
}

func (h *CPFHandler) updateAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// First get existing account
	existing, err := h.accountRepo.Get(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found")
			return
		}
		internalError(w)
		return
	}

	var req updateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	// Update person data if provided (DOB, residency, PR grant date are on persons table)
	personUpdate := persons.UpdateInput{}
	hasPersonUpdate := false

	if req.DateOfBirth != nil {
		dob, err := time.Parse("2006-01-02", *req.DateOfBirth)
		if err == nil {
			personUpdate.DateOfBirth = &dob
			hasPersonUpdate = true
		}
	}
	if req.ResidencyStatus != nil {
		personUpdate.ResidencyStatus = req.ResidencyStatus
		hasPersonUpdate = true
	}
	if req.PRGrantDate != nil {
		if *req.PRGrantDate == "" {
			// Clear PR grant date - set to zero time (will be treated as null)
			// Note: The repo uses COALESCE, so we need a different approach for clearing
			hasPersonUpdate = true
		} else {
			t, err := time.Parse("2006-01-02", *req.PRGrantDate)
			if err == nil {
				personUpdate.PRGrantDate = &t
				hasPersonUpdate = true
			}
		}
	}

	if hasPersonUpdate {
		_, err := h.personsRepo.Update(r.Context(), existing.PersonID, personUpdate)
		if err != nil {
			internalError(w)
			return
		}
	}

	// Build balance update input
	balanceUpdate := account.UpdateBalancesInput{}
	hasBalanceUpdate := false

	if req.OABalance != nil {
		balanceUpdate.OABalance = req.OABalance
		hasBalanceUpdate = true
	}
	if req.SABalance != nil {
		balanceUpdate.SABalance = req.SABalance
		hasBalanceUpdate = true
	}
	if req.MABalance != nil {
		balanceUpdate.MABalance = req.MABalance
		hasBalanceUpdate = true
	}
	if req.RABalance != nil {
		balanceUpdate.RABalance = req.RABalance
		hasBalanceUpdate = true
	}
	if req.OAUsedForHousing != nil {
		balanceUpdate.OAUsedForHousing = req.OAUsedForHousing
		hasBalanceUpdate = true
	}
	if req.HousingStartDate != nil {
		if *req.HousingStartDate != "" {
			t, err := time.Parse(time.RFC3339, *req.HousingStartDate)
			if err != nil {
				t, err = time.Parse("2006-01-02", *req.HousingStartDate)
			}
			if err == nil {
				balanceUpdate.HousingStartDate = &t
				hasBalanceUpdate = true
			}
		}
	}

	var updated *account.CPFAccount
	if hasBalanceUpdate {
		updated, err = h.accountRepo.UpdateBalances(r.Context(), existing.ID, balanceUpdate)
		if err != nil {
			internalError(w)
			return
		}
	} else {
		// Re-fetch to get updated person data
		updated, err = h.accountRepo.GetByID(r.Context(), existing.ID)
		if err != nil {
			internalError(w)
			return
		}
	}

	writeJSON(w, accountToResponse(updated))
}

// ===============================
// Configuration Endpoints
// ===============================

func (h *CPFHandler) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	// Check for year or date parameter
	yearStr := r.URL.Query().Get("year")
	dateStr := r.URL.Query().Get("date")

	var cfg *config.CPFConfiguration
	var err error

	if yearStr != "" {
		year, parseErr := strconv.Atoi(yearStr)
		if parseErr != nil {
			badRequest(w, errors.New("invalid year parameter"))
			return
		}
		cfg, err = config.GetByYear(year)
	} else if dateStr != "" {
		date, parseErr := time.Parse("2006-01-02", dateStr)
		if parseErr != nil {
			badRequest(w, errors.New("invalid date parameter, expected YYYY-MM-DD"))
			return
		}
		cfg, err = config.GetByDate(date)
	} else {
		cfg, err = config.GetCurrentYear()
	}

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, "not_found", "CPF configuration not found")
			return
		}
		internalError(w)
		return
	}

	writeJSON(w, configToResponse(cfg))
}

type cpfConfigResponse struct {
	ID            string             `json:"id"`
	Year          int                `json:"year"`
	EffectiveFrom string             `json:"effective_from"`
	EffectiveTo   *string            `json:"effective_to,omitempty"`
	Config        config.ConfigData  `json:"config"`
	CreatedAt     string             `json:"created_at"`
	UpdatedAt     string             `json:"updated_at"`
}

func configToResponse(cfg *config.CPFConfiguration) cpfConfigResponse {
	resp := cpfConfigResponse{
		ID:            cfg.ID,
		Year:          cfg.Year,
		EffectiveFrom: cfg.EffectiveFrom.Format(time.RFC3339),
		Config:        cfg.Config,
		CreatedAt:     cfg.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     cfg.UpdatedAt.Format(time.RFC3339),
	}
	if cfg.EffectiveTo != nil {
		s := cfg.EffectiveTo.Format(time.RFC3339)
		resp.EffectiveTo = &s
	}
	return resp
}

func (h *CPFHandler) handleConfigYears(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	years := config.ListYears()
	writeJSON(w, map[string][]int{"years": years})
}

// ===============================
// Contribution Preview Endpoint
// ===============================

func (h *CPFHandler) handleContributionPreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	// Parse required parameters
	grossWageStr := r.URL.Query().Get("gross_wage")
	ageStr := r.URL.Query().Get("age")
	residencyStatusStr := r.URL.Query().Get("residency_status")
	cpfWageType := r.URL.Query().Get("cpf_wage_type")

	if grossWageStr == "" || ageStr == "" {
		badRequest(w, errMissingFields("gross_wage, age"))
		return
	}

	grossWage, err := strconv.ParseFloat(grossWageStr, 64)
	if err != nil {
		badRequest(w, errors.New("invalid gross_wage parameter"))
		return
	}

	age, err := strconv.Atoi(ageStr)
	if err != nil {
		badRequest(w, errors.New("invalid age parameter"))
		return
	}

	residency := config.ResidencyCitizen
	if residencyStatusStr != "" {
		residency = config.ResidencyStatus(residencyStatusStr)
	}

	// Get current year's config
	cfg, err := config.GetCurrentYear()
	if err != nil {
		internalError(w)
		return
	}

	// Calculate contribution
	calc := contribution.NewCalculator(&cfg.Config)

	var result contribution.ContributionResult
	if cpfWageType == "aw" {
		// For AW, we need YTD values (default to 0 for preview)
		result = calc.CalculateAW(grossWage, age, residency, 0, 0)
	} else {
		result = calc.CalculateOW(grossWage, age, residency)
	}

	writeJSON(w, contributionToResponse(result))
}

type contributionPreviewResponse struct {
	GrossWage            float64            `json:"gross_wage"`
	CappedWage           float64            `json:"capped_wage"`
	EmployeeContribution float64            `json:"employee_contribution"`
	EmployerContribution float64            `json:"employer_contribution"`
	TotalContribution    float64            `json:"total_contribution"`
	TakeHomePay          float64            `json:"take_home_pay"`
	Allocation           allocationResponse `json:"allocation"`
	RatesApplied         ratesResponse      `json:"rates_applied"`
}

type allocationResponse struct {
	OA float64 `json:"oa"`
	SA float64 `json:"sa"`
	MA float64 `json:"ma"`
	RA float64 `json:"ra"`
}

type ratesResponse struct {
	Employee        float64 `json:"employee"`
	Employer        float64 `json:"employer"`
	AgeGroup        string  `json:"age_group"`
	ResidencyStatus string  `json:"residency_status"`
}

func contributionToResponse(result contribution.ContributionResult) contributionPreviewResponse {
	return contributionPreviewResponse{
		GrossWage:            result.GrossWage,
		CappedWage:           result.CappedWage,
		EmployeeContribution: result.EmployeeContribution,
		EmployerContribution: result.EmployerContribution,
		TotalContribution:    result.TotalContribution,
		TakeHomePay:          result.TakeHomePay,
		Allocation: allocationResponse{
			OA: result.Allocation.OA,
			SA: result.Allocation.SA,
			MA: result.Allocation.MA,
			RA: result.Allocation.RA,
		},
		RatesApplied: ratesResponse{
			Employee:        result.RatesApplied.Employee,
			Employer:        result.RatesApplied.Employer,
			AgeGroup:        result.RatesApplied.AgeGroup,
			ResidencyStatus: string(result.RatesApplied.ResidencyStatus),
		},
	}
}

// ===============================
// Assumptions Endpoints
// ===============================

func (h *CPFHandler) handleAssumptions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAssumptions(w, r)
	case http.MethodPut:
		h.updateAssumptions(w, r)
	default:
		methodNotAllowed(w)
	}
}

type assumptionsResponse struct {
	ID           string                   `json:"id"`
	CPFAccountID string                   `json:"cpfAccountId"`
	InterestRates interestRatesResponse   `json:"interestRates"`
	GrowthRates   growthRatesResponse     `json:"growthRates"`
	Employment    employmentResponse      `json:"employment"`
	CPFLife       cpfLifeResponse         `json:"cpfLife"`
	PresetName    string                  `json:"presetName"`
	CreatedAt     string                  `json:"createdAt"`
	UpdatedAt     string                  `json:"updatedAt"`
}

type interestRatesResponse struct {
	OA                    float64 `json:"oa"`
	SA                    float64 `json:"sa"`
	MA                    float64 `json:"ma"`
	RA                    float64 `json:"ra"`
	ExtraFirst60k         float64 `json:"extraFirst60k"`
	ExtraFirst30kAbove55  float64 `json:"extraFirst30kAbove55"`
}

type growthRatesResponse struct {
	Inflation float64 `json:"inflation"`
	FRS       float64 `json:"frs"`
	Salary    float64 `json:"salary"`
}

type employmentResponse struct {
	AssumeContinuous bool `json:"assumeContinuous"`
	RetirementAge    int  `json:"retirementAge"`
}

type cpfLifeResponse struct {
	Plan             string  `json:"plan"`
	PayoutStartAge   int     `json:"payoutStartAge"`
	EscalatingGrowth float64 `json:"escalatingGrowth"`
}

func assumptionsToResponse(a *assumptions.CPFAssumptions) assumptionsResponse {
	return assumptionsResponse{
		ID:           a.ID,
		CPFAccountID: a.CPFAccountID,
		InterestRates: interestRatesResponse{
			OA:                   a.InterestRateOA,
			SA:                   a.InterestRateSA,
			MA:                   a.InterestRateMA,
			RA:                   a.InterestRateRA,
			ExtraFirst60k:        a.ExtraInterestFirst60k,
			ExtraFirst30kAbove55: a.ExtraInterestFirst30kAbove55,
		},
		GrowthRates: growthRatesResponse{
			Inflation: a.InflationRate,
			FRS:       a.FRSGrowthRate,
			Salary:    a.SalaryGrowthRate,
		},
		Employment: employmentResponse{
			AssumeContinuous: a.AssumeContinuousEmployment,
			RetirementAge:    a.RetirementAge,
		},
		CPFLife: cpfLifeResponse{
			Plan:             string(a.CPFLifePlan),
			PayoutStartAge:   a.PayoutStartAge,
			EscalatingGrowth: a.EscalatingPlanGrowth,
		},
		PresetName: string(a.PresetName),
		CreatedAt:  a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  a.UpdatedAt.Format(time.RFC3339),
	}
}

func (h *CPFHandler) getAssumptions(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// First get the CPF account to get the account ID
	cpfAccount, err := h.accountRepo.Get(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found. Create a CPF account first.")
			return
		}
		internalError(w)
		return
	}

	// Get or create default assumptions
	a, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccount.ID)
	if err != nil {
		internalError(w)
		return
	}

	writeJSON(w, assumptionsToResponse(a))
}

type updateAssumptionsRequest struct {
	InterestRates *updateInterestRatesRequest `json:"interestRates"`
	GrowthRates   *updateGrowthRatesRequest   `json:"growthRates"`
	Employment    *updateEmploymentRequest    `json:"employment"`
	CPFLife       *updateCPFLifeRequest       `json:"cpfLife"`
	PresetName    *string                     `json:"presetName"`
}

type updateInterestRatesRequest struct {
	OA                   *float64 `json:"oa"`
	SA                   *float64 `json:"sa"`
	MA                   *float64 `json:"ma"`
	RA                   *float64 `json:"ra"`
	ExtraFirst60k        *float64 `json:"extraFirst60k"`
	ExtraFirst30kAbove55 *float64 `json:"extraFirst30kAbove55"`
}

type updateGrowthRatesRequest struct {
	Inflation *float64 `json:"inflation"`
	FRS       *float64 `json:"frs"`
	Salary    *float64 `json:"salary"`
}

type updateEmploymentRequest struct {
	AssumeContinuous *bool `json:"assumeContinuous"`
	RetirementAge    *int  `json:"retirementAge"`
}

type updateCPFLifeRequest struct {
	Plan             *string  `json:"plan"`
	PayoutStartAge   *int     `json:"payoutStartAge"`
	EscalatingGrowth *float64 `json:"escalatingGrowth"`
}

func (h *CPFHandler) updateAssumptions(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// First get the CPF account
	cpfAccount, err := h.accountRepo.Get(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found. Create a CPF account first.")
			return
		}
		internalError(w)
		return
	}

	// Get existing assumptions or create defaults
	existing, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccount.ID)
	if err != nil {
		internalError(w)
		return
	}

	var req updateAssumptionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	// Apply updates
	if req.InterestRates != nil {
		if req.InterestRates.OA != nil {
			existing.InterestRateOA = *req.InterestRates.OA
		}
		if req.InterestRates.SA != nil {
			existing.InterestRateSA = *req.InterestRates.SA
		}
		if req.InterestRates.MA != nil {
			existing.InterestRateMA = *req.InterestRates.MA
		}
		if req.InterestRates.RA != nil {
			existing.InterestRateRA = *req.InterestRates.RA
		}
		if req.InterestRates.ExtraFirst60k != nil {
			existing.ExtraInterestFirst60k = *req.InterestRates.ExtraFirst60k
		}
		if req.InterestRates.ExtraFirst30kAbove55 != nil {
			existing.ExtraInterestFirst30kAbove55 = *req.InterestRates.ExtraFirst30kAbove55
		}
	}

	if req.GrowthRates != nil {
		if req.GrowthRates.Inflation != nil {
			existing.InflationRate = *req.GrowthRates.Inflation
		}
		if req.GrowthRates.FRS != nil {
			existing.FRSGrowthRate = *req.GrowthRates.FRS
		}
		if req.GrowthRates.Salary != nil {
			existing.SalaryGrowthRate = *req.GrowthRates.Salary
		}
	}

	if req.Employment != nil {
		if req.Employment.AssumeContinuous != nil {
			existing.AssumeContinuousEmployment = *req.Employment.AssumeContinuous
		}
		if req.Employment.RetirementAge != nil {
			existing.RetirementAge = *req.Employment.RetirementAge
		}
	}

	if req.CPFLife != nil {
		if req.CPFLife.Plan != nil {
			existing.CPFLifePlan = assumptions.CPFLifePlan(*req.CPFLife.Plan)
		}
		if req.CPFLife.PayoutStartAge != nil {
			existing.PayoutStartAge = *req.CPFLife.PayoutStartAge
		}
		if req.CPFLife.EscalatingGrowth != nil {
			existing.EscalatingPlanGrowth = *req.CPFLife.EscalatingGrowth
		}
	}

	if req.PresetName != nil {
		existing.PresetName = assumptions.PresetName(*req.PresetName)
	}

	// Save updates
	updated, err := h.assumptionsRepo.Upsert(r.Context(), existing)
	if err != nil {
		internalError(w)
		return
	}

	writeJSON(w, assumptionsToResponse(updated))
}

// ===============================
// Projection Endpoints
// ===============================

func (h *CPFHandler) handleProjectionRange(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	// Get CPF account
	cpfAccount, err := h.accountRepo.Get(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found. Create a CPF account first.")
			return
		}
		internalError(w)
		return
	}

	// Get assumptions
	assumptionsData, err := h.assumptionsRepo.GetOrCreateDefault(r.Context(), cpfAccount.ID)
	if err != nil {
		internalError(w)
		return
	}

	// Get CPF config for current year
	cfg, err := config.GetCurrentYear()
	if err != nil {
		internalError(w)
		return
	}

	// Parse years parameter (default 30)
	yearsStr := r.URL.Query().Get("years")
	years := 30
	if yearsStr != "" {
		if parsed, err := strconv.Atoi(yearsStr); err == nil && parsed > 0 && parsed <= 50 {
			years = parsed
		}
	}

	// Parse monthly salary and bonus (optional - allows override)
	monthlySalary := 8500.0 // Default
	annualBonus := 25500.0  // Default (3 months)
	if salaryStr := r.URL.Query().Get("monthlySalary"); salaryStr != "" {
		if parsed, err := strconv.ParseFloat(salaryStr, 64); err == nil && parsed > 0 {
			monthlySalary = parsed
		}
	}
	if bonusStr := r.URL.Query().Get("annualBonus"); bonusStr != "" {
		if parsed, err := strconv.ParseFloat(bonusStr, 64); err == nil && parsed >= 0 {
			annualBonus = parsed
		}
	}

	// Build projection input
	input := projector.ProjectionInput{
		OABalance:                    cpfAccount.OABalance,
		SABalance:                    cpfAccount.SABalance,
		MABalance:                    cpfAccount.MABalance,
		RABalance:                    cpfAccount.RABalance,
		DateOfBirth:                  cpfAccount.DateOfBirth,
		CurrentDate:                  time.Now(),
		MonthlySalary:                monthlySalary,
		AnnualBonus:                  annualBonus,
		InterestRateOA:               assumptionsData.InterestRateOA,
		InterestRateSA:               assumptionsData.InterestRateSA,
		InterestRateMA:               assumptionsData.InterestRateMA,
		InterestRateRA:               assumptionsData.InterestRateRA,
		ExtraInterestFirst60k:        assumptionsData.ExtraInterestFirst60k,
		ExtraInterestFirst30kAbove55: assumptionsData.ExtraInterestFirst30kAbove55,
		FRSGrowthRate:                assumptionsData.FRSGrowthRate,
		SalaryGrowthRate:             assumptionsData.SalaryGrowthRate,
		RetirementAge:                assumptionsData.RetirementAge,
		AssumeContinuousEmployment:   assumptionsData.AssumeContinuousEmployment,
		PayoutStartAge:               assumptionsData.PayoutStartAge,
		FRS:                          cfg.Config.RetirementSums.FRS,
		BRS:                          cfg.Config.RetirementSums.BRS,
		ERS:                          cfg.Config.RetirementSums.ERS,
		BHS:                          cfg.Config.BHS,
	}

	result := projector.ProjectRange(input, years)
	writeJSON(w, projectionRangeToResponse(result))
}

type projectionRangeResponse struct {
	Projections []projectionYearResponse `json:"projections"`
	Milestones  milestonesResponse       `json:"milestones"`
	Retirement  retirementResponse       `json:"retirement"`
}

type projectionYearResponse struct {
	Year          int     `json:"year"`
	Age           int     `json:"age"`
	OA            float64 `json:"oa"`
	SA            float64 `json:"sa"`
	MA            float64 `json:"ma"`
	RA            float64 `json:"ra"`
	Total         float64 `json:"total"`
	Contributions float64 `json:"contributions"`
	Interest      float64 `json:"interest"`
}

type milestonesResponse struct {
	Age55 *milestoneResponse `json:"age55,omitempty"`
	Age65 *milestoneResponse `json:"age65,omitempty"`
}

type milestoneResponse struct {
	Year     int                     `json:"year"`
	Balances accountBalancesResponse `json:"balances"`
}

type accountBalancesResponse struct {
	OA float64 `json:"oa"`
	SA float64 `json:"sa"`
	MA float64 `json:"ma"`
	RA float64 `json:"ra"`
}

type retirementResponse struct {
	FRSTarget        float64               `json:"frsTarget"`
	BRSTarget        float64               `json:"brsTarget"`
	ERSTarget        float64               `json:"ersTarget"`
	CPFLifeEstimates cpfLifeEstimatesResp  `json:"cpfLifeEstimates"`
}

type cpfLifeEstimatesResp struct {
	Standard   float64 `json:"standard"`
	Basic      float64 `json:"basic"`
	Escalating float64 `json:"escalating"`
}

func projectionRangeToResponse(result *projector.ProjectionRangeResult) projectionRangeResponse {
	projections := make([]projectionYearResponse, len(result.Projections))
	for i, p := range result.Projections {
		projections[i] = projectionYearResponse{
			Year:          p.Year,
			Age:           p.Age,
			OA:            p.OA,
			SA:            p.SA,
			MA:            p.MA,
			RA:            p.RA,
			Total:         p.Total,
			Contributions: p.Contributions,
			Interest:      p.Interest,
		}
	}

	resp := projectionRangeResponse{
		Projections: projections,
		Milestones:  milestonesResponse{},
		Retirement: retirementResponse{
			FRSTarget: result.Retirement.FRSTarget,
			BRSTarget: result.Retirement.BRSTarget,
			ERSTarget: result.Retirement.ERSTarget,
			CPFLifeEstimates: cpfLifeEstimatesResp{
				Standard:   result.Retirement.CPFLifeEstimates.Standard,
				Basic:      result.Retirement.CPFLifeEstimates.Basic,
				Escalating: result.Retirement.CPFLifeEstimates.Escalating,
			},
		},
	}

	if result.Milestones.Age55 != nil {
		resp.Milestones.Age55 = &milestoneResponse{
			Year: result.Milestones.Age55.Year,
			Balances: accountBalancesResponse{
				OA: result.Milestones.Age55.Balances.OA,
				SA: result.Milestones.Age55.Balances.SA,
				MA: result.Milestones.Age55.Balances.MA,
				RA: result.Milestones.Age55.Balances.RA,
			},
		}
	}

	if result.Milestones.Age65 != nil {
		resp.Milestones.Age65 = &milestoneResponse{
			Year: result.Milestones.Age65.Year,
			Balances: accountBalancesResponse{
				OA: result.Milestones.Age65.Balances.OA,
				SA: result.Milestones.Age65.Balances.SA,
				MA: result.Milestones.Age65.Balances.MA,
				RA: result.Milestones.Age65.Balances.RA,
			},
		}
	}

	return resp
}
