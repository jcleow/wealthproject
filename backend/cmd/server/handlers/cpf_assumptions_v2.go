package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"financial-chat-system/backend/internal/cpf/assumptions"
	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// ============================================================================
// CPF Assumptions Types
// ============================================================================

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
		FRS string `json:"frs"`
	} `json:"growthRates"`
	Employment struct {
		RetirementAge int `json:"retirementAge"`
	} `json:"employment"`
	CPFLife struct {
		Plan             string `json:"plan"`
		PayoutStartAge   int    `json:"payoutStartAge"`
		EscalatingGrowth string `json:"escalatingGrowth"`
	} `json:"cpfLife"`
	PresetName string `json:"presetName"`
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
		FRS *string `json:"frs"`
	} `json:"growthRates"`
	Employment *struct {
		RetirementAge *int `json:"retirementAge"`
	} `json:"employment"`
	CPFLife *struct {
		Plan             *string `json:"plan"`
		PayoutStartAge   *int    `json:"payoutStartAge"`
		EscalatingGrowth *string `json:"escalatingGrowth"`
	} `json:"cpfLife"`
	PresetName *string `json:"presetName"`
}

// ============================================================================
// CPF Assumptions Handlers
// ============================================================================

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
	resp.GrowthRates.FRS = a.FRSGrowthRate.String()
	resp.Employment.RetirementAge = a.RetirementAge
	resp.CPFLife.Plan = string(a.CPFLifePlan)
	resp.CPFLife.PayoutStartAge = a.PayoutStartAge
	resp.CPFLife.EscalatingGrowth = a.EscalatingPlanGrowth.String()
	return resp
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
	mergeAssumptionsInput(existing, &input)

	// Save updated assumptions
	updated, err := h.assumptionsRepo.Upsert(r.Context(), existing)
	if err != nil {
		log.Printf("cpf.UpdateAssumptions save error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, mapAssumptionsToResponse(updated))
}

// mergeAssumptionsInput applies partial input to existing assumptions.
func mergeAssumptionsInput(existing *assumptions.CPFAssumptions, input *cpfAssumptionsInput) {
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
		if input.GrowthRates.FRS != nil {
			if d, err := decimal.NewFromString(*input.GrowthRates.FRS); err == nil {
				existing.FRSGrowthRate = *d
			}
		}
	}

	if input.Employment != nil {
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
			if age >= assumptions.MinPayoutStartAge && age <= assumptions.MaxPayoutStartAge {
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
