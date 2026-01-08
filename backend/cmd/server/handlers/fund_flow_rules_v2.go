package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// FundFlowRuleV2Handler serves v2 fund flow rule endpoints.
// V2 uses the consolidated repository pattern with IDOR protection and ownership validation,
// replacing the v1 handler which used separate service/repository layers.
type FundFlowRuleV2Handler struct {
	store *repo.Store
}

// NewFundFlowRuleV2Handler constructs a v2 handler with the consolidated store.
func NewFundFlowRuleV2Handler(store *repo.Store) *FundFlowRuleV2Handler {
	return &FundFlowRuleV2Handler{store: store}
}

// fundFlowRuleDTO is the JSON response structure.
// Uses string for decimal values to avoid float64 precision loss.
type fundFlowRuleDTO struct {
	ID       string `json:"id"`
	UserID   string `json:"userId"`
	Name     string `json:"name"`
	RuleType string `json:"ruleType"`

	// Source
	SourceIncomeID      *string `json:"sourceIncomeId,omitempty"`
	SourceCpfAccountID  *string `json:"sourceCpfAccountId,omitempty"`
	SourceCashAccountID *string `json:"sourceCashAccountId,omitempty"`
	SourceInvestmentID  *string `json:"sourceInvestmentId,omitempty"`

	// Target
	TargetCpfAccountID  *string `json:"targetCpfAccountId,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	TargetLiabilityID   *string `json:"targetLiabilityId,omitempty"`
	TargetPropertyID    *string `json:"targetPropertyId,omitempty"`
	TargetExpenseID     *string `json:"targetExpenseId,omitempty"`

	// Amount
	AmountType  string  `json:"amountType"`
	AmountValue *string `json:"amountValue,omitempty"`

	// Priority for multiple rules on same target (lower = higher priority)
	Priority int `json:"priority"`

	// Timing
	StartDate string  `json:"startDate"`
	EndDate   *string `json:"endDate,omitempty"`

	// Metadata
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

func toFundFlowRuleDTO(r repo.FundFlowRule) fundFlowRuleDTO {
	dto := fundFlowRuleDTO{
		ID:                  r.ID,
		UserID:              r.UserID,
		Name:                r.Name,
		RuleType:            r.RuleType,
		SourceIncomeID:      r.SourceIncomeID,
		SourceCpfAccountID:  r.SourceCpfAccountID,
		SourceCashAccountID: r.SourceCashAccountID,
		SourceInvestmentID:  r.SourceInvestmentID,
		TargetCpfAccountID:  r.TargetCpfAccountID,
		TargetCashAccountID: r.TargetCashAccountID,
		TargetInvestmentID:  r.TargetInvestmentID,
		TargetLiabilityID:   r.TargetLiabilityID,
		TargetPropertyID:    r.TargetPropertyID,
		TargetExpenseID:     r.TargetExpenseID,
		AmountType:          r.AmountType,
		Priority:            r.Priority,
		StartDate:           r.StartDate.Format("2006-01-02T15:04:05Z07:00"),
		CreatedAt:           r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           r.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if r.AmountValue != nil {
		valStr := r.AmountValue.String()
		dto.AmountValue = &valStr
	}
	if r.EndDate != nil {
		endDateStr := r.EndDate.Format("2006-01-02T15:04:05Z07:00")
		dto.EndDate = &endDateStr
	}

	return dto
}

// fundFlowRuleCreateDTO is the JSON input structure for create/update.
type fundFlowRuleCreateDTO struct {
	Name     string `json:"name"`
	RuleType string `json:"ruleType"`

	// Source
	SourceIncomeID      *string `json:"sourceIncomeId,omitempty"`
	SourceCpfAccountID  *string `json:"sourceCpfAccountId,omitempty"`
	SourceCashAccountID *string `json:"sourceCashAccountId,omitempty"`
	SourceInvestmentID  *string `json:"sourceInvestmentId,omitempty"`

	// Target
	TargetCpfAccountID  *string `json:"targetCpfAccountId,omitempty"`
	TargetCashAccountID *string `json:"targetCashAccountId,omitempty"`
	TargetInvestmentID  *string `json:"targetInvestmentId,omitempty"`
	TargetLiabilityID   *string `json:"targetLiabilityId,omitempty"`
	TargetPropertyID    *string `json:"targetPropertyId,omitempty"`
	TargetExpenseID     *string `json:"targetExpenseId,omitempty"`

	// Amount
	AmountType  string  `json:"amountType"`
	AmountValue *string `json:"amountValue,omitempty"`

	// Priority for multiple rules on same target (lower = higher priority)
	Priority int `json:"priority"`

	// Timing
	StartDate string  `json:"startDate,omitempty"`
	EndDate   *string `json:"endDate,omitempty"`
}

func (dto fundFlowRuleCreateDTO) toModel() (repo.FundFlowRule, error) {
	rule := repo.FundFlowRule{
		Name:                dto.Name,
		RuleType:            dto.RuleType,
		SourceIncomeID:      dto.SourceIncomeID,
		SourceCpfAccountID:  dto.SourceCpfAccountID,
		SourceCashAccountID: dto.SourceCashAccountID,
		SourceInvestmentID:  dto.SourceInvestmentID,
		TargetCpfAccountID:  dto.TargetCpfAccountID,
		TargetCashAccountID: dto.TargetCashAccountID,
		TargetInvestmentID:  dto.TargetInvestmentID,
		TargetLiabilityID:   dto.TargetLiabilityID,
		TargetPropertyID:    dto.TargetPropertyID,
		TargetExpenseID:     dto.TargetExpenseID,
		AmountType:          dto.AmountType,
		Priority:            dto.Priority,
	}

	// Parse amount value if provided
	if dto.AmountValue != nil && *dto.AmountValue != "" {
		val, err := decimal.NewFromString(*dto.AmountValue)
		if err != nil {
			return repo.FundFlowRule{}, err
		}
		rule.AmountValue = val
	}

	// Parse start date if provided
	if dto.StartDate != "" {
		startDate, err := time.Parse(time.RFC3339, dto.StartDate)
		if err != nil {
			return repo.FundFlowRule{}, err
		}
		rule.StartDate = startDate
	}

	// Parse end date if provided
	if dto.EndDate != nil && *dto.EndDate != "" {
		endDate, err := time.Parse(time.RFC3339, *dto.EndDate)
		if err != nil {
			return repo.FundFlowRule{}, err
		}
		rule.EndDate = &endDate
	}

	return rule, nil
}

// GET /api/v2/fund-flow-rules
// HandleList lists all fund flow rules for the user.
// Query params:
//   - ruleType: "payment", "allocation", or "transfer" to filter by type
//   - targetPropertyId: filter by target property
//   - targetLiabilityId: filter by target liability
//   - limit: max results to return (default: no limit)
//   - offset: number of results to skip (default: 0)
//
// @Summary List fund flow rules (v2)
// @Description Returns all fund flow rules with optional filtering and pagination
// @Tags Fund Flow Rules V2
// @Produce json
// @Param ruleType query string false "Filter by rule type (payment|allocation|transfer)"
// @Param targetPropertyId query string false "Filter by target property ID"
// @Param targetLiabilityId query string false "Filter by target liability ID"
// @Param limit query int false "Max results to return"
// @Param offset query int false "Number of results to skip"
// @Success 200 {array} fundFlowRuleDTO
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules [get]
func (h *FundFlowRuleV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	query := repo.ListFundFlowRulesQuery{
		UserID: userID,
	}

	// Apply filters from query params
	if ruleType := r.URL.Query().Get("ruleType"); ruleType != "" {
		query.RuleType = &ruleType
	}
	if targetPropertyID := r.URL.Query().Get("targetPropertyId"); targetPropertyID != "" {
		query.TargetPropertyID = &targetPropertyID
	}
	if targetLiabilityID := r.URL.Query().Get("targetLiabilityId"); targetLiabilityID != "" {
		query.TargetLiabilityID = &targetLiabilityID
	}

	// Apply pagination params
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			query.Limit = limit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			query.Offset = offset
		}
	}

	rules, err := h.store.ListFundFlowRules(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	dtos := make([]fundFlowRuleDTO, len(rules))
	for i, rule := range rules {
		dtos[i] = toFundFlowRuleDTO(rule)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dtos)
}

// GET /api/v2/fund-flow-rules/{id}
// HandleGet retrieves a single fund flow rule by ID.
// @Summary Get fund flow rule (v2)
// @Description Returns a single fund flow rule by ID
// @Tags Fund Flow Rules V2
// @Produce json
// @Param id path string true "Rule ID"
// @Success 200 {object} fundFlowRuleDTO
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules/{id} [get]
func (h *FundFlowRuleV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, ruleID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	rule, err := h.store.GetFundFlowRule(r.Context(), userID, ruleID)
	if err != nil {
		if err == repo.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "fund flow rule not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toFundFlowRuleDTO(*rule))
}

// POST /api/v2/fund-flow-rules
// HandleCreate creates a new fund flow rule.
// @Summary Create fund flow rule (v2)
// @Description Creates a new fund flow rule
// @Tags Fund Flow Rules V2
// @Accept json
// @Produce json
// @Param rule body fundFlowRuleCreateDTO true "Rule data"
// @Success 201 {object} fundFlowRuleDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules [post]
func (h *FundFlowRuleV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input fundFlowRuleCreateDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	rule, err := input.toModel()
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	created, err := h.store.CreateFundFlowRule(r.Context(), userID, rule)
	if err != nil {
		// Check for validation errors
		switch err {
		case repo.ErrPaymentCannotHaveIncomeSource,
			repo.ErrPaymentCannotUseInvestmentSource,
			repo.ErrPaymentRequiresOneSource,
			repo.ErrPaymentRequiresLiabilityOrProperty,
			repo.ErrAllocationRequiresIncomeSource,
			repo.ErrAllocationRequiresOneAccountTarget,
			repo.ErrTransferRequiresOneAccountSource,
			repo.ErrTransferRequiresOneAccountTarget,
			repo.ErrExpenseRequiresCashSource,
			repo.ErrExpenseCannotUseNonCashSource,
			repo.ErrExpenseRequiresExpenseTarget,
			repo.ErrInvalidRuleType,
			repo.ErrAmountValueRequired,
			repo.ErrPercentageOutOfRange:
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(toFundFlowRuleDTO(*created))
}

// PUT /api/v2/fund-flow-rules/{id}
// HandleUpdate updates an existing fund flow rule.
// @Summary Update fund flow rule (v2)
// @Description Updates an existing fund flow rule
// @Tags Fund Flow Rules V2
// @Accept json
// @Produce json
// @Param id path string true "Rule ID"
// @Param rule body fundFlowRuleCreateDTO true "Rule data"
// @Success 200 {object} fundFlowRuleDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules/{id} [put]
func (h *FundFlowRuleV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, ruleID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input fundFlowRuleCreateDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	rule, err := input.toModel()
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	rule.ID = ruleID

	updated, err := h.store.UpdateFundFlowRule(r.Context(), userID, rule)
	if err != nil {
		if err == repo.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "fund flow rule not found")
			return
		}
		// Check for validation errors
		switch err {
		case repo.ErrPaymentCannotHaveIncomeSource,
			repo.ErrPaymentCannotUseInvestmentSource,
			repo.ErrPaymentRequiresOneSource,
			repo.ErrPaymentRequiresLiabilityOrProperty,
			repo.ErrAllocationRequiresIncomeSource,
			repo.ErrAllocationRequiresOneAccountTarget,
			repo.ErrTransferRequiresOneAccountSource,
			repo.ErrTransferRequiresOneAccountTarget,
			repo.ErrExpenseRequiresCashSource,
			repo.ErrExpenseCannotUseNonCashSource,
			repo.ErrExpenseRequiresExpenseTarget,
			repo.ErrInvalidRuleType,
			repo.ErrAmountValueRequired,
			repo.ErrPercentageOutOfRange:
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toFundFlowRuleDTO(*updated))
}

// DELETE /api/v2/fund-flow-rules/{id}
// HandleDelete deletes a fund flow rule.
// @ID deleteFundFlowRule
// @Summary Delete fund flow rule (v2)
// @Description Deletes a fund flow rule
// @Tags Fund Flow Rules V2
// @Param id path string true "Rule ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules/{id} [delete]
func (h *FundFlowRuleV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, ruleID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteFundFlowRule(r.Context(), userID, ruleID)
	if err != nil {
		if err == repo.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "fund flow rule not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// stopFundFlowRuleDTO is the JSON input for stopping a rule at a future date.
type stopFundFlowRuleDTO struct {
	EndDate string `json:"endDate"` // ISO 8601 format (e.g., "2031-03-31T23:59:59Z")
}

// POST /api/v2/fund-flow-rules/{id}/stop
// HandleStop sets an end date for a rule without deleting the record.
// @Summary Stop fund flow rule (v2)
// @Description Sets an endDate on a rule (soft delete)
// @Tags Fund Flow Rules V2
// @Accept json
// @Produce json
// @Param id path string true "Rule ID"
// @Param body body stopFundFlowRuleDTO true "Stop input with endDate"
// @Success 200 {object} fundFlowRuleDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules/{id}/stop [post]
func (h *FundFlowRuleV2Handler) HandleStop(w http.ResponseWriter, r *http.Request, ruleID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input stopFundFlowRuleDTO
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	if input.EndDate == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "endDate is required")
		return
	}

	endDate, err := time.Parse(time.RFC3339, input.EndDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "endDate must be in ISO 8601 format (e.g., 2031-03-31T23:59:59Z)")
		return
	}

	updated, err := h.store.SetFundFlowRuleEndDate(r.Context(), userID, ruleID, endDate)
	if err != nil {
		if err == repo.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "fund flow rule not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toFundFlowRuleDTO(*updated))
}

// DELETE /api/v2/fund-flow-rules
// HandleDeleteAll deletes all fund flow rules for a user.
// @Summary Delete all fund flow rules (v2)
// @Description Deletes all fund flow rules for the user
// @Tags Fund Flow Rules V2
// @Success 204 "No Content"
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/fund-flow-rules [delete]
func (h *FundFlowRuleV2Handler) HandleDeleteAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	_, err := h.store.DeleteAllFundFlowRules(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
