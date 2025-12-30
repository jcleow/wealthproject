package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial_v2/property"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// PropertyPlannerV2Handler handles property planner v2 endpoints
type PropertyPlannerV2Handler struct {
	store   *repo.Store
	service *property.Service
}

// NewPropertyPlannerV2Handler creates a new property planner v2 handler
func NewPropertyPlannerV2Handler(store *repo.Store) *PropertyPlannerV2Handler {
	return &PropertyPlannerV2Handler{
		store:   store,
		service: property.NewService(store),
	}
}

// =============================================================================
// Request Types (JSON input from HTTP)
// =============================================================================

type createScenarioRequest struct {
	Country       string                      `json:"country"` // "SG" | "MY"
	SGDetails     *createSGDetailsRequest     `json:"sgDetails,omitempty"`
	Fees          []createFeeRequest          `json:"fees"`
	GrowthPeriods []createGrowthPeriodRequest `json:"growthPeriods"`
	RatePeriods   []createRatePeriodRequest   `json:"ratePeriods"`
	Grants        []createGrantRequest        `json:"grants"`
}

type createGrantRequest struct {
	Name   string `json:"name"`
	Amount string `json:"amount"`
}

type createSGDetailsRequest struct {
	Name                  string  `json:"name"`
	PropertyType          string  `json:"propertyType"`
	PropertySubtype       string  `json:"propertySubtype"`
	Icon                  *string `json:"icon"`
	IconColor             *string `json:"iconColor"`
	IsIncluded            *bool   `json:"isIncluded"`
	PropertyPrice         string  `json:"propertyPrice"`
	ValuationPrice        *string `json:"valuationPrice"`
	LoanType              string  `json:"loanType"`
	DownpaymentCpfOa      string  `json:"downpaymentCpfOa"`
	DownpaymentCash       string  `json:"downpaymentCash"`
	BorrowerType          string  `json:"borrowerType"`
	Borrower1IncomeID     *string `json:"borrower1IncomeId"`
	Borrower1CpfAccountID *string `json:"borrower1CpfAccountId"`
	Borrower2IncomeID     *string `json:"borrower2IncomeId"`
	Borrower2CpfAccountID *string `json:"borrower2CpfAccountId"`
	OtherDebt             string  `json:"otherDebt"`
	PropertyCount         *int    `json:"propertyCount"`
	BtoLaunchDate         *string `json:"btoLaunchDate"`
	BtoKeyCollectionDate  *string `json:"btoKeyCollectionDate"`
	SaleExpectedDate      *string `json:"saleExpectedDate"`
	SaleExpectedPrice     *string `json:"saleExpectedPrice"`
}

type createFeeRequest struct {
	FeeContext   string  `json:"feeContext"`
	FeeType      string  `json:"feeType"`
	Description  *string `json:"description"`
	Amount       string  `json:"amount"`
	Currency     string  `json:"currency"`
	IsPercentage *bool   `json:"isPercentage"`
	Frequency    string  `json:"frequency"`
	StartDate    *string `json:"startDate"`
	EndDate      *string `json:"endDate"`
	Icon         *string `json:"icon"`
	IconColor    *string `json:"iconColor"`
}

type createGrowthPeriodRequest struct {
	StartYear      int    `json:"startYear"`
	EndYear        *int   `json:"endYear"`
	GrowthRate     string `json:"growthRate"`
	GrowthStrategy string `json:"growthStrategy"`
}

type createRatePeriodRequest struct {
	StartMonth string `json:"startMonth"` // YYYY-MM format - for backwards compatibility
	TermYears  int    `json:"termYears"`
	Rate       string `json:"rate"`     // Interest rate (percentage)
	RateType   string `json:"rateType"` // "fixed" or "floating"
}

// =============================================================================
// Response Types
// =============================================================================

type scenarioResponse struct {
	Scenario      repo.PropertyScenario           `json:"scenario"`
	SGDetails     *repo.PropertySG                `json:"sgDetails,omitempty"`
	Fees          []repo.PropertyFee              `json:"fees"`
	GrowthPeriods []growthPeriodResponse          `json:"growthPeriods"`
	RatePeriods   []liabilityRatePeriodResponse   `json:"ratePeriods"`
	Grants        []repo.PropertySGGrant          `json:"grants"`
	Computed      *property.ComputedValues        `json:"computed,omitempty"`
}

type growthPeriodResponse struct {
	ID             string  `json:"id"`
	PropertySGID   *string `json:"propertySgId"`
	AssetID        *string `json:"assetId"`
	StartYear      int     `json:"startYear"`
	EndYear        *int    `json:"endYear"`
	GrowthRate     string  `json:"growthRate"`
	GrowthStrategy string  `json:"growthStrategy"`
	CreatedAt      string  `json:"createdAt"`
}

type liabilityRatePeriodResponse struct {
	ID           string  `json:"id"`
	PropertySGID *string `json:"propertySgId"`
	LiabilityID  *string `json:"liabilityId"`
	PeriodOrder  int     `json:"periodOrder"`
	StartDate    string  `json:"startDate"`
	TermYears    int     `json:"termYears"`
	Rate         string  `json:"rate"`
	RateType     string  `json:"rateType"`
	CreatedAt    string  `json:"createdAt"`
}

// =============================================================================
// Scenario CRUD Handlers
// =============================================================================

// POST /api/v2/property-planner/scenarios
// HandleCreate creates a new property scenario.
// @Summary Create a property scenario (v2)
// @Description Creates a new property scenario for the authenticated user with computed values
// @Tags Property Planner V2
// @Accept json
// @Produce json
// @Param scenario body createScenarioRequest true "Property scenario data"
// @Success 201 {object} scenarioResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios [post]
func (h *PropertyPlannerV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	// Validate required fields
	if len(req.RatePeriods) == 0 {
		badRequest(w, errMissingFields("ratePeriods"))
		return
	}

	if req.SGDetails == nil {
		badRequest(w, errMissingFields("sgDetails"))
		return
	}

	// Convert request to service params and delegate to service
	params := toCreateScenarioParams(req)
	scenario, err := h.service.CreateFromParams(r.Context(), userID, params)
	if err != nil {
		if property.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		log.Printf("PropertyPlanner.Create error: %v", err)
		internalError(w, err)
		return
	}

	// Compute derived values and build response
	computed := h.service.ComputeValues(scenario)
	response := buildScenarioResponse(scenario, computed)

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, response)
}

// GET /api/v2/property-planner/scenarios
// HandleList returns all property scenarios for the authenticated user.
// @Summary List property scenarios (v2)
// @Description Returns all property scenarios for the authenticated user with computed values
// @Tags Property Planner V2
// @Produce json
// @Success 200 {array} scenarioResponse
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios [get]
func (h *PropertyPlannerV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	scenarios, err := h.service.List(r.Context(), userID)
	if err != nil {
		log.Printf("PropertyPlanner.List error: %v", err)
		internalError(w, err)
		return
	}

	// Build responses with computed values
	var responses []scenarioResponse
	for _, s := range scenarios {
		computed := h.service.ComputeValues(&s)
		responses = append(responses, buildScenarioResponse(&s, computed))
	}

	writeJSON(w, responses)
}

// GET /api/v2/property-planner/scenarios/{id}
// HandleGet returns a single property scenario by ID.
// @Summary Get a property scenario (v2)
// @Description Returns a property scenario by ID with computed values
// @Tags Property Planner V2
// @Produce json
// @Param id path string true "Scenario ID"
// @Success 200 {object} scenarioResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id} [get]
func (h *PropertyPlannerV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, scenarioID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	scenario, err := h.service.Get(r.Context(), userID, scenarioID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.Get error: %v", err)
		internalError(w, err)
		return
	}

	computed := h.service.ComputeValues(scenario)
	response := buildScenarioResponse(scenario, computed)

	writeJSON(w, response)
}

// PUT /api/v2/property-planner/scenarios/{id}
// HandleUpdate updates a property scenario by ID.
// @Summary Update a property scenario (v2)
// @Description Updates a property scenario by ID with new data and returns computed values
// @Tags Property Planner V2
// @Accept json
// @Produce json
// @Param id path string true "Scenario ID"
// @Param scenario body createScenarioRequest true "Property scenario data"
// @Success 200 {object} scenarioResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id} [put]
func (h *PropertyPlannerV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, scenarioID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	// Validate required fields
	if len(req.RatePeriods) == 0 {
		badRequest(w, errMissingFields("ratePeriods"))
		return
	}

	// Convert request to service params and delegate to service
	params := toCreateScenarioParams(req)
	scenario, err := h.service.UpdateFromParams(r.Context(), userID, scenarioID, params)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		if property.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		log.Printf("PropertyPlanner.Update error: %v", err)
		internalError(w, err)
		return
	}

	computed := h.service.ComputeValues(scenario)
	response := buildScenarioResponse(scenario, computed)

	writeJSON(w, response)
}

// DELETE /api/v2/property-planner/scenarios/{id}
// HandleDelete deletes a property scenario by ID.
// @Summary Delete a property scenario (v2)
// @Description Deletes a property scenario by ID and all related data
// @Tags Property Planner V2
// @Param id path string true "Scenario ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id} [delete]
func (h *PropertyPlannerV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, scenarioID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.service.Delete(r.Context(), userID, scenarioID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.Delete error: %v", err)
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Grant CRUD Handlers
// =============================================================================

// GET /api/v2/property-planner/scenarios/{id}/grants
// HandleListGrants returns all grants for a property scenario.
// @Summary List grants for a property scenario (v2)
// @Description Returns all grants for a property scenario by ID
// @Tags Property Planner V2
// @Produce json
// @Param id path string true "Scenario ID"
// @Success 200 {array} repo.PropertySGGrant
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id}/grants [get]
func (h *PropertyPlannerV2Handler) HandleListGrants(w http.ResponseWriter, r *http.Request, scenarioID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	grants, err := h.store.ListGrants(r.Context(), userID, scenarioID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.ListGrants error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, grants)
}

// POST /api/v2/property-planner/scenarios/{id}/grants
// HandleCreateGrant creates a new grant for a property scenario.
// @Summary Create a grant for a property scenario (v2)
// @Description Creates a new grant for a property scenario by ID
// @Tags Property Planner V2
// @Accept json
// @Produce json
// @Param id path string true "Scenario ID"
// @Param grant body createGrantRequest true "Grant data"
// @Success 201 {object} repo.PropertySGGrant
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id}/grants [post]
func (h *PropertyPlannerV2Handler) HandleCreateGrant(w http.ResponseWriter, r *http.Request, scenarioID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createGrantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	params := property.CreateGrantParams{
		Name:   req.Name,
		Amount: req.Amount,
	}

	grant, err := h.service.CreateGrantFromParams(r.Context(), userID, scenarioID, params)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		if property.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		log.Printf("PropertyPlanner.CreateGrant error: %v", err)
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, grant)
}

// PUT /api/v2/property-planner/scenarios/{id}/grants/{grantId}
// HandleUpdateGrant updates a grant by ID.
// @Summary Update a grant (v2)
// @Description Updates a grant by ID
// @Tags Property Planner V2
// @Accept json
// @Produce json
// @Param id path string true "Scenario ID"
// @Param grantId path string true "Grant ID"
// @Param grant body createGrantRequest true "Grant data"
// @Success 200 {object} repo.PropertySGGrant
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id}/grants/{grantId} [put]
func (h *PropertyPlannerV2Handler) HandleUpdateGrant(w http.ResponseWriter, r *http.Request, scenarioID, grantID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createGrantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, err)
		return
	}

	params := property.CreateGrantParams{
		Name:   req.Name,
		Amount: req.Amount,
	}

	grant, err := h.service.UpdateGrantFromParams(r.Context(), userID, scenarioID, grantID, params)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		if property.IsValidationError(err) {
			badRequest(w, err)
			return
		}
		log.Printf("PropertyPlanner.UpdateGrant error: %v", err)
		internalError(w, err)
		return
	}

	writeJSON(w, grant)
}

// DELETE /api/v2/property-planner/scenarios/{id}/grants/{grantId}
// HandleDeleteGrant deletes a grant by ID.
// @Summary Delete a grant (v2)
// @Description Deletes a grant by ID
// @Tags Property Planner V2
// @Param id path string true "Scenario ID"
// @Param grantId path string true "Grant ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/property-planner/scenarios/{id}/grants/{grantId} [delete]
func (h *PropertyPlannerV2Handler) HandleDeleteGrant(w http.ResponseWriter, r *http.Request, scenarioID, grantID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteGrant(r.Context(), userID, scenarioID, grantID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.DeleteGrant error: %v", err)
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Request to Params Conversion (thin mapping layer)
// =============================================================================

func toCreateScenarioParams(req createScenarioRequest) property.CreateScenarioParams {
	params := property.CreateScenarioParams{
		Country: req.Country,
	}

	if req.SGDetails != nil {
		params.SGDetails = toSGDetailsParams(req.SGDetails)
	}

	for _, f := range req.Fees {
		params.Fees = append(params.Fees, toFeeParams(f))
	}

	for _, g := range req.GrowthPeriods {
		params.GrowthPeriods = append(params.GrowthPeriods, toGrowthPeriodParams(g))
	}

	for _, r := range req.RatePeriods {
		params.RatePeriods = append(params.RatePeriods, toRatePeriodParams(r))
	}

	for _, g := range req.Grants {
		params.Grants = append(params.Grants, property.CreateGrantParams{
			Name:   g.Name,
			Amount: g.Amount,
		})
	}

	return params
}

func toSGDetailsParams(req *createSGDetailsRequest) *property.CreateSGDetailsParams {
	return &property.CreateSGDetailsParams{
		Name:                  req.Name,
		PropertyType:          req.PropertyType,
		PropertySubtype:       req.PropertySubtype,
		Icon:                  req.Icon,
		IconColor:             req.IconColor,
		IsIncluded:            req.IsIncluded,
		PropertyPrice:         req.PropertyPrice,
		ValuationPrice:        req.ValuationPrice,
		LoanType:              req.LoanType,
		DownpaymentCpfOa:      req.DownpaymentCpfOa,
		DownpaymentCash:       req.DownpaymentCash,
		BorrowerType:          req.BorrowerType,
		Borrower1IncomeID:     req.Borrower1IncomeID,
		Borrower1CpfAccountID: req.Borrower1CpfAccountID,
		Borrower2IncomeID:     req.Borrower2IncomeID,
		Borrower2CpfAccountID: req.Borrower2CpfAccountID,
		OtherDebt:             req.OtherDebt,
		PropertyCount:         req.PropertyCount,
		BtoLaunchDate:         req.BtoLaunchDate,
		BtoKeyCollectionDate:  req.BtoKeyCollectionDate,
		SaleExpectedDate:      req.SaleExpectedDate,
		SaleExpectedPrice:     req.SaleExpectedPrice,
	}
}

func toFeeParams(req createFeeRequest) property.CreateFeeParams {
	return property.CreateFeeParams{
		FeeContext:   req.FeeContext,
		FeeType:      req.FeeType,
		Description:  req.Description,
		Amount:       req.Amount,
		Currency:     req.Currency,
		IsPercentage: req.IsPercentage,
		Frequency:    req.Frequency,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		Icon:         req.Icon,
		IconColor:    req.IconColor,
	}
}

func toGrowthPeriodParams(req createGrowthPeriodRequest) property.CreateGrowthPeriodParams {
	return property.CreateGrowthPeriodParams{
		StartYear:      req.StartYear,
		EndYear:        req.EndYear,
		GrowthRate:     req.GrowthRate,
		GrowthStrategy: req.GrowthStrategy,
	}
}

func toRatePeriodParams(req createRatePeriodRequest) property.CreateRatePeriodParams {
	return property.CreateRatePeriodParams{
		StartMonth: req.StartMonth,
		TermYears:  req.TermYears,
		Rate:       req.Rate,
		RateType:   req.RateType,
	}
}

// =============================================================================
// Response Building
// =============================================================================

func buildScenarioResponse(s *repo.PropertyScenarioFull, computed *property.ComputedValues) scenarioResponse {
	return scenarioResponse{
		Scenario:      s.Scenario,
		SGDetails:     s.SGDetails,
		Fees:          s.Fees,
		GrowthPeriods: toGrowthPeriodsResponse(s.GrowthPeriods),
		RatePeriods:   toRatePeriodsResponse(s.RatePeriods),
		Grants:        s.Grants,
		Computed:      computed,
	}
}

func toGrowthPeriodResponse(g repo.GrowthPeriod) growthPeriodResponse {
	var endYear *int
	if g.EndDate != nil {
		ey := g.EndDate.Year()
		endYear = &ey
	}
	return growthPeriodResponse{
		ID:             g.ID,
		PropertySGID:   g.PropertySGID,
		AssetID:        g.AssetID,
		StartYear:      g.StartDate.Year(),
		EndYear:        endYear,
		GrowthRate:     g.GrowthRate.String(),
		GrowthStrategy: g.GrowthStrategy,
		CreatedAt:      g.CreatedAt.Format(time.RFC3339),
	}
}

func toGrowthPeriodsResponse(periods []repo.GrowthPeriod) []growthPeriodResponse {
	result := make([]growthPeriodResponse, len(periods))
	for i, p := range periods {
		result[i] = toGrowthPeriodResponse(p)
	}
	return result
}

func toLiabilityRatePeriodResponse(r repo.LiabilityRatePeriod) liabilityRatePeriodResponse {
	return liabilityRatePeriodResponse{
		ID:           r.ID,
		PropertySGID: r.PropertySGID,
		LiabilityID:  r.LiabilityID,
		PeriodOrder:  r.PeriodOrder,
		StartDate:    r.StartDate.Format(time.RFC3339),
		TermYears:    r.TermYears,
		Rate:         r.Rate.String(),
		RateType:     r.RateType,
		CreatedAt:    r.CreatedAt.Format(time.RFC3339),
	}
}

func toRatePeriodsResponse(periods []repo.LiabilityRatePeriod) []liabilityRatePeriodResponse {
	result := make([]liabilityRatePeriodResponse, len(periods))
	for i, p := range periods {
		result[i] = toLiabilityRatePeriodResponse(p)
	}
	return result
}
