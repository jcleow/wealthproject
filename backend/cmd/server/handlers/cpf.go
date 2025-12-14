package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/decimal"
)

// cpfAccountStore defines the interface for CPF account persistence.
type cpfAccountStore interface {
	Get(ctx context.Context, userID string) (*account.CPFAccount, error)
	Upsert(ctx context.Context, acc *account.CPFAccount) (*account.CPFAccount, error)
	Update(ctx context.Context, userID string, acc *account.CPFAccount) (*account.CPFAccount, error)
	Delete(ctx context.Context, userID string) error
}

// CPFHandler serves CPF-related endpoints.
//
// TODO: Migrate API request/response types from float64 to string-serialized decimals
// for consistency with other financial endpoints and to avoid precision loss at JSON boundary.
type CPFHandler struct {
	accountRepo cpfAccountStore
}

func NewCPFHandler(accountRepo cpfAccountStore) *CPFHandler {
	return &CPFHandler{
		accountRepo: accountRepo,
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
	case http.MethodDelete:
		h.deleteAccount(w, r)
	default:
		methodNotAllowed(w)
	}
}

type cpfAccountResponse struct {
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	OABalance        float64 `json:"oa_balance"`
	SABalance        float64 `json:"sa_balance"`
	MABalance        float64 `json:"ma_balance"`
	RABalance        float64 `json:"ra_balance"`
	OAUsedForHousing float64 `json:"oa_used_for_housing"`
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
		OABalance:        acc.OABalance.ToFloat64(),
		SABalance:        acc.SABalance.ToFloat64(),
		MABalance:        acc.MABalance.ToFloat64(),
		RABalance:        acc.RABalance.ToFloat64(),
		OAUsedForHousing: acc.OAUsedForHousing.ToFloat64(),
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
		internalError(w, err)
		return
	}

	writeJSON(w, accountToResponse(acc))
}

type createAccountRequest struct {
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
		acc.OABalance = *decimal.MustFromFloat64(*req.OABalance)
	}
	if req.SABalance != nil {
		acc.SABalance = *decimal.MustFromFloat64(*req.SABalance)
	}
	if req.MABalance != nil {
		acc.MABalance = *decimal.MustFromFloat64(*req.MABalance)
	}
	if req.RABalance != nil {
		acc.RABalance = *decimal.MustFromFloat64(*req.RABalance)
	}
	if req.OAUsedForHousing != nil {
		acc.OAUsedForHousing = *decimal.MustFromFloat64(*req.OAUsedForHousing)
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
		internalError(w, err)
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
		internalError(w, err)
		return
	}

	var req updateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	// Apply updates
	if req.OABalance != nil {
		existing.OABalance = *decimal.MustFromFloat64(*req.OABalance)
	}
	if req.SABalance != nil {
		existing.SABalance = *decimal.MustFromFloat64(*req.SABalance)
	}
	if req.MABalance != nil {
		existing.MABalance = *decimal.MustFromFloat64(*req.MABalance)
	}
	if req.RABalance != nil {
		existing.RABalance = *decimal.MustFromFloat64(*req.RABalance)
	}
	if req.OAUsedForHousing != nil {
		existing.OAUsedForHousing = *decimal.MustFromFloat64(*req.OAUsedForHousing)
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
		internalError(w, err)
		return
	}

	writeJSON(w, accountToResponse(updated))
}

func (h *CPFHandler) deleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.accountRepo.Delete(r.Context(), userID)
	if err != nil {
		if errors.Is(err, account.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "CPF account not found")
			return
		}
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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
		internalError(w, err)
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
		internalError(w, err)
		return
	}

	// Calculate contribution
	calc := contribution.NewCalculator(&cfg.Config)
	grossWageDecimal := decimal.MustFromFloat64(grossWage)

	var result contribution.ContributionResult
	if cpfWageType == "aw" {
		// For AW, we need YTD values (default to 0 for preview)
		result = calc.CalculateAW(grossWageDecimal, age, residency, decimal.Zero(), decimal.Zero())
	} else {
		result = calc.CalculateOW(grossWageDecimal, age, residency)
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
		GrossWage:            result.GrossWage.ToFloat64(),
		CappedWage:           result.CappedWage.ToFloat64(),
		EmployeeContribution: result.EmployeeContribution.ToFloat64(),
		EmployerContribution: result.EmployerContribution.ToFloat64(),
		TotalContribution:    result.TotalContribution.ToFloat64(),
		TakeHomePay:          result.TakeHomePay.ToFloat64(),
		Allocation: allocationResponse{
			OA: result.Allocation.OA.ToFloat64(),
			SA: result.Allocation.SA.ToFloat64(),
			MA: result.Allocation.MA.ToFloat64(),
			RA: result.Allocation.RA.ToFloat64(),
		},
		RatesApplied: ratesResponse{
			Employee:        result.RatesApplied.Employee.ToFloat64(),
			Employer:        result.RatesApplied.Employer.ToFloat64(),
			AgeGroup:        result.RatesApplied.AgeGroup,
			ResidencyStatus: string(result.RatesApplied.ResidencyStatus),
		},
	}
}
