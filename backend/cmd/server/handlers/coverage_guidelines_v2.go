package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// coverageGuidelinesInput is the JSON-friendly input for upserting coverage guidelines.
type coverageGuidelinesInput struct {
	PersonID                string          `json:"personId"`
	AnnualIncome            string          `json:"annualIncome"`
	MaxPremiumPercentage    string          `json:"maxPremiumPercentage"`
	Preset                  string          `json:"preset"`
	HospRequiresIspUpgrade  *bool           `json:"hospRequiresIspUpgrade"`
	HospPreferredWardClass  string          `json:"hospPreferredWardClass"`
	HospRecommendsRider     *bool           `json:"hospRecommendsRider"`
	HospIsEnabled           *bool           `json:"hospIsEnabled"`
	HospNotes               *string         `json:"hospNotes"`
	LifeTpdIncomeMultiplier string          `json:"lifeTpdIncomeMultiplier"`
	LifeTpdIsRequired       *bool           `json:"lifeTpdIsRequired"`
	LifeTpdIsEnabled        *bool           `json:"lifeTpdIsEnabled"`
	LifeTpdNotes            *string         `json:"lifeTpdNotes"`
	CiIncomeMultiplier      string          `json:"ciIncomeMultiplier"`
	CiIsRequired            *bool           `json:"ciIsRequired"`
	CiIsEnabled             *bool           `json:"ciIsEnabled"`
	CiNotes                 *string         `json:"ciNotes"`
	PaIncomeMultiplier      string          `json:"paIncomeMultiplier"`
	PaIsRequired            *bool           `json:"paIsRequired"`
	PaIsEnabled             *bool           `json:"paIsEnabled"`
	PaNotes                 *string         `json:"paNotes"`
	QuestionnaireAnswers    json.RawMessage `json:"questionnaireAnswers"`
}

// toCoverageGuidelines converts input to a repository CoverageGuidelines struct.
func (input *coverageGuidelinesInput) toCoverageGuidelines() (repo.CoverageGuidelines, error) {
	annualIncome, err := decimal.NewFromString(input.AnnualIncome)
	if err != nil {
		annualIncome = decimal.NewFromInt64(60000, 0)
	}

	maxPremiumPercentage, err := decimal.NewFromString(input.MaxPremiumPercentage)
	if err != nil {
		maxPremiumPercentage = decimal.NewFromInt64(10, -2) // 0.10
	}

	lifeTpdMultiplier, err := decimal.NewFromString(input.LifeTpdIncomeMultiplier)
	if err != nil {
		lifeTpdMultiplier = decimal.NewFromInt64(10, 0)
	}

	ciMultiplier, err := decimal.NewFromString(input.CiIncomeMultiplier)
	if err != nil {
		ciMultiplier = decimal.NewFromInt64(5, 0)
	}

	paMultiplier, err := decimal.NewFromString(input.PaIncomeMultiplier)
	if err != nil {
		paMultiplier = decimal.NewFromInt64(5, 0)
	}

	preset := input.Preset
	if preset == "" {
		preset = "standard"
	}

	hospPreferredWardClass := input.HospPreferredWardClass
	if hospPreferredWardClass == "" {
		hospPreferredWardClass = "B1"
	}

	questionnaireAnswers := input.QuestionnaireAnswers
	if questionnaireAnswers == nil {
		questionnaireAnswers = []byte("{}")
	}

	g := repo.CoverageGuidelines{
		PersonID:                input.PersonID,
		AnnualIncome:            *annualIncome,
		MaxPremiumPercentage:    *maxPremiumPercentage,
		Preset:                  preset,
		HospRequiresIspUpgrade:  true,
		HospPreferredWardClass:  hospPreferredWardClass,
		HospRecommendsRider:     true,
		HospIsEnabled:           true,
		HospNotes:               input.HospNotes,
		LifeTpdIncomeMultiplier: *lifeTpdMultiplier,
		LifeTpdIsRequired:       true,
		LifeTpdIsEnabled:        true,
		LifeTpdNotes:            input.LifeTpdNotes,
		CiIncomeMultiplier:      *ciMultiplier,
		CiIsRequired:            true,
		CiIsEnabled:             true,
		CiNotes:                 input.CiNotes,
		PaIncomeMultiplier:      *paMultiplier,
		PaIsRequired:            true,
		PaIsEnabled:             true,
		PaNotes:                 input.PaNotes,
		QuestionnaireAnswers:    questionnaireAnswers,
	}

	// Apply boolean overrides if provided
	if input.HospRequiresIspUpgrade != nil {
		g.HospRequiresIspUpgrade = *input.HospRequiresIspUpgrade
	}
	if input.HospRecommendsRider != nil {
		g.HospRecommendsRider = *input.HospRecommendsRider
	}
	if input.HospIsEnabled != nil {
		g.HospIsEnabled = *input.HospIsEnabled
	}
	if input.LifeTpdIsRequired != nil {
		g.LifeTpdIsRequired = *input.LifeTpdIsRequired
	}
	if input.LifeTpdIsEnabled != nil {
		g.LifeTpdIsEnabled = *input.LifeTpdIsEnabled
	}
	if input.CiIsRequired != nil {
		g.CiIsRequired = *input.CiIsRequired
	}
	if input.CiIsEnabled != nil {
		g.CiIsEnabled = *input.CiIsEnabled
	}
	if input.PaIsRequired != nil {
		g.PaIsRequired = *input.PaIsRequired
	}
	if input.PaIsEnabled != nil {
		g.PaIsEnabled = *input.PaIsEnabled
	}

	return g, nil
}

// CoverageGuidelinesV2Handler serves coverage guidelines v2 endpoints.
type CoverageGuidelinesV2Handler struct {
	store *repo.Store
}

// NewCoverageGuidelinesV2Handler creates a new coverage guidelines handler.
func NewCoverageGuidelinesV2Handler(store *repo.Store) *CoverageGuidelinesV2Handler {
	return &CoverageGuidelinesV2Handler{store: store}
}

// HandleList returns all coverage guidelines for the user.
func (h *CoverageGuidelinesV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	guidelines, err := h.store.ListCoverageGuidelines(r.Context(), userID)
	if err != nil {
		log.Printf("coverageGuidelines.List error: %v", err)
		internalError(w, err)
		return
	}

	if guidelines == nil {
		guidelines = []repo.CoverageGuidelines{}
	}

	jsonResponse(w, http.StatusOK, guidelines)
}

// HandleUpsert creates or updates coverage guidelines for a person.
func (h *CoverageGuidelinesV2Handler) HandleUpsert(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input coverageGuidelinesInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.PersonID == "" {
		badRequest(w, errMissingFields("personId"))
		return
	}

	// Validate person belongs to authenticated user
	if !validatePersonOwnership(w, r, h.store, userID, &input.PersonID) {
		return
	}

	guidelines, err := input.toCoverageGuidelines()
	if err != nil {
		badRequest(w, err)
		return
	}

	result, err := h.store.UpsertCoverageGuidelines(r.Context(), userID, guidelines)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

// HandleGet returns coverage guidelines for a specific person.
func (h *CoverageGuidelinesV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, personID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	guidelines, err := h.store.GetCoverageGuidelines(r.Context(), userID, personID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, guidelines)
}

// HandleDelete deletes coverage guidelines for a specific person.
func (h *CoverageGuidelinesV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, personID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteCoverageGuidelines(r.Context(), userID, personID)
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
