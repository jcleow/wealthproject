package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// insurancePolicyInput is the JSON-friendly input for creating/updating an insurance policy.
// Uses string for decimal values to avoid float64 precision loss (consistent with v2 pattern).
type insurancePolicyInput struct {
	PersonID               *string `json:"personId"`
	Name                   string  `json:"name"`
	Category               string  `json:"category"`
	Subcategory            *string `json:"subcategory"`
	GovernmentScheme       *string `json:"governmentScheme"`
	CoverageAmount         string  `json:"coverageAmount"`
	DeathBenefit           *string `json:"deathBenefit"`
	CriticalIllnessBenefit *string `json:"criticalIllnessBenefit"`
	TpdBenefit             *string `json:"tpdBenefit"`
	DailyHospitalCash      *string `json:"dailyHospitalCash"`
	PayoutAmount           *string `json:"payoutAmount"`
	PayoutFrequency        *string `json:"payoutFrequency"`
	PremiumAmount          string  `json:"premiumAmount"`
	PremiumFrequency       string  `json:"premiumFrequency"`
	StartDate              string  `json:"startDate"`
	EndDate                *string `json:"endDate"`
	RenewalDate            *string `json:"renewalDate"`
	InsurerName            *string `json:"insurerName"`
	PolicyNumber           *string `json:"policyNumber"`
	LinkedExpenseID        *string `json:"linkedExpenseId"`
	IsActive               *bool   `json:"isActive"`
	Notes                  *string `json:"notes"`
}

// toInsurancePolicy converts input to a repository InsurancePolicy struct.
func (input *insurancePolicyInput) toInsurancePolicy() (repo.InsurancePolicy, error) {
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}

	coverageAmount := decimal.Zero()
	if input.CoverageAmount != "" {
		coverageAmount, err = decimal.NewFromString(input.CoverageAmount)
		if err != nil {
			return repo.InsurancePolicy{}, err
		}
	}

	premiumAmount := decimal.Zero()
	if input.PremiumAmount != "" {
		premiumAmount, err = decimal.NewFromString(input.PremiumAmount)
		if err != nil {
			return repo.InsurancePolicy{}, err
		}
	}

	deathBenefit, err := parseOptionalDecimal(input.DeathBenefit)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}
	criticalIllnessBenefit, err := parseOptionalDecimal(input.CriticalIllnessBenefit)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}
	tpdBenefit, err := parseOptionalDecimal(input.TpdBenefit)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}
	dailyHospitalCash, err := parseOptionalDecimal(input.DailyHospitalCash)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}
	payoutAmount, err := parseOptionalDecimal(input.PayoutAmount)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}

	endDate, err := parseOptionalDate(input.EndDate)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}
	renewalDate, err := parseOptionalDate(input.RenewalDate)
	if err != nil {
		return repo.InsurancePolicy{}, err
	}

	premiumFrequency := input.PremiumFrequency
	if premiumFrequency == "" {
		premiumFrequency = "annually"
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	return repo.InsurancePolicy{
		PersonID:               input.PersonID,
		Name:                   input.Name,
		Category:               input.Category,
		Subcategory:            input.Subcategory,
		GovernmentScheme:       input.GovernmentScheme,
		CoverageAmount:         *coverageAmount,
		DeathBenefit:           deathBenefit,
		CriticalIllnessBenefit: criticalIllnessBenefit,
		TpdBenefit:             tpdBenefit,
		DailyHospitalCash:     dailyHospitalCash,
		PayoutAmount:           payoutAmount,
		PayoutFrequency:        input.PayoutFrequency,
		PremiumAmount:          *premiumAmount,
		PremiumFrequency:       premiumFrequency,
		StartDate:              startDate,
		EndDate:                endDate,
		RenewalDate:            renewalDate,
		InsurerName:            input.InsurerName,
		PolicyNumber:           input.PolicyNumber,
		LinkedExpenseID:        input.LinkedExpenseID,
		IsActive:               isActive,
		Notes:                  input.Notes,
	}, nil
}

// InsurancePolicyV2Handler serves insurance policy v2 endpoints.
type InsurancePolicyV2Handler struct {
	store *repo.Store
}

// NewInsurancePolicyV2Handler creates a new insurance policy handler.
func NewInsurancePolicyV2Handler(store *repo.Store) *InsurancePolicyV2Handler {
	return &InsurancePolicyV2Handler{store: store}
}

// HandleList returns all insurance policies for the user.
func (h *InsurancePolicyV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	pagination := parsePaginationV2(r)
	sort := parseSortParams(r)

	filter := repo.InsurancePolicyFilter{
		PersonIDs:     parsePersonIDs(r),
		Categories:    parseCategories(r),
		StartDateFrom: parseDateParam(r, "startDateFrom"),
		StartDateTo:   parseDateParam(r, "startDateTo"),
	}

	result, err := h.store.ListInsurancePolicies(r.Context(), userID, filter, pagination, sort)
	if err != nil {
		log.Printf("insurancePolicies.List error: %v", err)
		internalError(w, err)
		return
	}

	if result.Data == nil {
		result.Data = []repo.InsurancePolicy{}
	}

	jsonResponse(w, http.StatusOK, result)
}

// HandleCreate creates a new insurance policy.
func (h *InsurancePolicyV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input insurancePolicyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" {
		badRequest(w, errMissingFields("name"))
		return
	}
	if input.Category == "" {
		badRequest(w, errMissingFields("category"))
		return
	}
	if input.StartDate == "" {
		badRequest(w, errMissingFields("startDate"))
		return
	}

	// Validate person belongs to authenticated user
	if !validatePersonOwnership(w, r, h.store, userID, input.PersonID) {
		return
	}

	policy, err := input.toInsurancePolicy()
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.store.CreateInsurancePolicy(r.Context(), userID, policy)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusCreated, created)
}

// HandleGet returns a single insurance policy by ID.
func (h *InsurancePolicyV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	policy, err := h.store.GetInsurancePolicy(r.Context(), userID, id)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, policy)
}

// HandleUpdate updates an existing insurance policy.
func (h *InsurancePolicyV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input insurancePolicyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" {
		badRequest(w, errMissingFields("name"))
		return
	}
	if input.Category == "" {
		badRequest(w, errMissingFields("category"))
		return
	}
	if input.StartDate == "" {
		badRequest(w, errMissingFields("startDate"))
		return
	}

	// Validate person belongs to authenticated user
	if !validatePersonOwnership(w, r, h.store, userID, input.PersonID) {
		return
	}

	policy, err := input.toInsurancePolicy()
	if err != nil {
		badRequest(w, err)
		return
	}

	updated, err := h.store.UpdateInsurancePolicy(r.Context(), userID, id, policy)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, updated)
}

// HandleDelete deletes a single insurance policy.
func (h *InsurancePolicyV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteInsurancePolicy(r.Context(), userID, id)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleDeleteAll deletes all insurance policies for the user.
func (h *InsurancePolicyV2Handler) HandleDeleteAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	count, err := h.store.DeleteAllInsurancePolicies(r.Context(), userID)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]int64{"deleted": count})
}
