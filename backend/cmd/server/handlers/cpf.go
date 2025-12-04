package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
)

// CPFHandler serves CPF-related endpoints.
type CPFHandler struct {
	accountRepo  *account.Repository
	configLoader *config.Loader
}

func NewCPFHandler(accountRepo *account.Repository, configLoader *config.Loader) *CPFHandler {
	return &CPFHandler{
		accountRepo:  accountRepo,
		configLoader: configLoader,
	}
}

func (h *CPFHandler) RegisterRoutes(router *http.ServeMux) {
	router.HandleFunc("/cpf/account", h.handleAccount)
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
	OABalance        int64   `json:"oa_balance"`
	SABalance        int64   `json:"sa_balance"`
	MABalance        int64   `json:"ma_balance"`
	RABalance        int64   `json:"ra_balance"`
	OAUsedForHousing int64   `json:"oa_used_for_housing"`
	HousingStartDate *string `json:"housing_start_date,omitempty"`
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
		OABalance:        acc.OABalance,
		SABalance:        acc.SABalance,
		MABalance:        acc.MABalance,
		RABalance:        acc.RABalance,
		OAUsedForHousing: acc.OAUsedForHousing,
		DateOfBirth:      acc.DateOfBirth.Format("2006-01-02"),
		ResidencyStatus:  string(acc.ResidencyStatus),
		CreatedAt:        acc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        acc.UpdatedAt.Format(time.RFC3339),
	}
	if acc.HousingStartDate != nil {
		s := acc.HousingStartDate.Format(time.RFC3339)
		resp.HousingStartDate = &s
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
	OABalance        *int64  `json:"oa_balance"`
	SABalance        *int64  `json:"sa_balance"`
	MABalance        *int64  `json:"ma_balance"`
	RABalance        *int64  `json:"ra_balance"`
	OAUsedForHousing *int64  `json:"oa_used_for_housing"`
	HousingStartDate *string `json:"housing_start_date"`
	DateOfBirth      string  `json:"date_of_birth"`
	ResidencyStatus  string  `json:"residency_status"`
	PRGrantDate      *string `json:"pr_grant_date"`
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

	residency := config.ResidencyCitizen
	if req.ResidencyStatus != "" {
		residency = config.ResidencyStatus(req.ResidencyStatus)
	}

	acc := &account.CPFAccount{
		UserID:          userID,
		DateOfBirth:     dob,
		ResidencyStatus: residency,
	}

	if req.OABalance != nil {
		acc.OABalance = *req.OABalance
	}
	if req.SABalance != nil {
		acc.SABalance = *req.SABalance
	}
	if req.MABalance != nil {
		acc.MABalance = *req.MABalance
	}
	if req.RABalance != nil {
		acc.RABalance = *req.RABalance
	}
	if req.OAUsedForHousing != nil {
		acc.OAUsedForHousing = *req.OAUsedForHousing
	}
	if req.HousingStartDate != nil && *req.HousingStartDate != "" {
		t, err := time.Parse(time.RFC3339, *req.HousingStartDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *req.HousingStartDate)
		}
		if err == nil {
			acc.HousingStartDate = &t
		}
	}
	if req.PRGrantDate != nil && *req.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *req.PRGrantDate)
		if err == nil {
			acc.PRGrantDate = &t
		}
	}

	created, err := h.accountRepo.Upsert(r.Context(), acc)
	if err != nil {
		internalError(w)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, accountToResponse(created))
}

type updateAccountRequest struct {
	OABalance        *int64  `json:"oa_balance"`
	SABalance        *int64  `json:"sa_balance"`
	MABalance        *int64  `json:"ma_balance"`
	RABalance        *int64  `json:"ra_balance"`
	OAUsedForHousing *int64  `json:"oa_used_for_housing"`
	HousingStartDate *string `json:"housing_start_date"`
	DateOfBirth      *string `json:"date_of_birth"`
	ResidencyStatus  *string `json:"residency_status"`
	PRGrantDate      *string `json:"pr_grant_date"`
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

	// Apply updates
	if req.OABalance != nil {
		existing.OABalance = *req.OABalance
	}
	if req.SABalance != nil {
		existing.SABalance = *req.SABalance
	}
	if req.MABalance != nil {
		existing.MABalance = *req.MABalance
	}
	if req.RABalance != nil {
		existing.RABalance = *req.RABalance
	}
	if req.OAUsedForHousing != nil {
		existing.OAUsedForHousing = *req.OAUsedForHousing
	}
	if req.HousingStartDate != nil {
		if *req.HousingStartDate == "" {
			existing.HousingStartDate = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.HousingStartDate)
			if err != nil {
				t, err = time.Parse("2006-01-02", *req.HousingStartDate)
			}
			if err == nil {
				existing.HousingStartDate = &t
			}
		}
	}
	if req.DateOfBirth != nil {
		dob, err := time.Parse("2006-01-02", *req.DateOfBirth)
		if err == nil {
			existing.DateOfBirth = dob
		}
	}
	if req.ResidencyStatus != nil {
		existing.ResidencyStatus = config.ResidencyStatus(*req.ResidencyStatus)
	}
	if req.PRGrantDate != nil {
		if *req.PRGrantDate == "" {
			existing.PRGrantDate = nil
		} else {
			t, err := time.Parse("2006-01-02", *req.PRGrantDate)
			if err == nil {
				existing.PRGrantDate = &t
			}
		}
	}

	updated, err := h.accountRepo.Update(r.Context(), userID, existing)
	if err != nil {
		internalError(w)
		return
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
		cfg, err = h.configLoader.GetByYear(r.Context(), year)
	} else if dateStr != "" {
		date, parseErr := time.Parse("2006-01-02", dateStr)
		if parseErr != nil {
			badRequest(w, errors.New("invalid date parameter, expected YYYY-MM-DD"))
			return
		}
		cfg, err = h.configLoader.GetByDate(r.Context(), date)
	} else {
		cfg, err = h.configLoader.GetCurrentYear(r.Context())
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

	years, err := h.configLoader.ListYears(r.Context())
	if err != nil {
		internalError(w)
		return
	}

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
	cfg, err := h.configLoader.GetCurrentYear(r.Context())
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
