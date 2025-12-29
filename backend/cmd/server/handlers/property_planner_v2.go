package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/property"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// PropertyPlannerV2Handler handles property planner v2 endpoints
type PropertyPlannerV2Handler struct {
	store      *repo.Store
	calculator *property.Calculator
}

// NewPropertyPlannerV2Handler creates a new property planner v2 handler
func NewPropertyPlannerV2Handler(store *repo.Store) *PropertyPlannerV2Handler {
	return &PropertyPlannerV2Handler{
		store:      store,
		calculator: property.NewCalculator(),
	}
}

// Input types - use strings for decimal values to avoid float64 precision loss

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
	StartMonth   string `json:"startMonth"`
	TermYears    int    `json:"termYears"`
	FixedYears   int    `json:"fixedYears"`
	FixedRate    string `json:"fixedRate"`
	FloatingRate string `json:"floatingRate"`
}

// Response types

type scenarioResponse struct {
	Scenario      repo.PropertyScenario      `json:"scenario"`
	SGDetails     *repo.PropertySGDetails    `json:"sgDetails,omitempty"`
	Fees          []repo.PropertyFee         `json:"fees"`
	GrowthPeriods []repo.GrowthPeriod        `json:"growthPeriods"`
	RatePeriods   []repo.LiabilityRatePeriod `json:"ratePeriods"`
	Grants        []repo.PropertySGGrant     `json:"grants"`
	Computed      *computedValues            `json:"computed,omitempty"`
}

type computedValues struct {
	LoanAmount       string `json:"loanAmount"`
	MonthlyPayment   string `json:"monthlyPayment"`
	TotalInterest    string `json:"totalInterest"`
	TotalAmountPaid  string `json:"totalAmountPaid"`
	BsdAmount        string `json:"bsdAmount"`
	AbsdAmount       string `json:"absdAmount"`
	TotalStampDuty   string `json:"totalStampDuty"`
	TotalUpfrontCash string `json:"totalUpfrontCash"`
}

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

	// Convert request to repository input
	input, err := h.convertCreateRequest(req)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Create in database
	scenario, err := h.store.CreatePropertyScenario(r.Context(), userID, input)
	if err != nil {
		log.Printf("PropertyPlanner.Create error: %v", err)
		internalError(w, err)
		return
	}

	// Compute derived values
	computed := h.computeValues(scenario)

	// Build response
	response := scenarioResponse{
		Scenario:      scenario.Scenario,
		SGDetails:     scenario.SGDetails,
		Fees:          scenario.Fees,
		GrowthPeriods: scenario.GrowthPeriods,
		RatePeriods:   scenario.RatePeriods,
		Grants:        scenario.Grants,
		Computed:      computed,
	}

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

	scenarios, err := h.store.ListPropertyScenarios(r.Context(), userID)
	if err != nil {
		log.Printf("PropertyPlanner.List error: %v", err)
		internalError(w, err)
		return
	}

	// Build responses with computed values
	var responses []scenarioResponse
	for _, s := range scenarios {
		computed := h.computeValues(&s)
		responses = append(responses, scenarioResponse{
			Scenario:      s.Scenario,
			SGDetails:     s.SGDetails,
			Fees:          s.Fees,
			GrowthPeriods: s.GrowthPeriods,
			RatePeriods:   s.RatePeriods,
			Grants:        s.Grants,
			Computed:      computed,
		})
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

	scenario, err := h.store.GetPropertyScenario(r.Context(), userID, scenarioID)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.Get error: %v", err)
		internalError(w, err)
		return
	}

	computed := h.computeValues(scenario)

	response := scenarioResponse{
		Scenario:      scenario.Scenario,
		SGDetails:     scenario.SGDetails,
		Fees:          scenario.Fees,
		GrowthPeriods: scenario.GrowthPeriods,
		RatePeriods:   scenario.RatePeriods,
		Grants:        scenario.Grants,
		Computed:      computed,
	}

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

	// Convert request to repository input
	createInput, err := h.convertCreateRequest(req)
	if err != nil {
		badRequest(w, err)
		return
	}

	updateInput := repo.UpdateScenarioInput{
		SGDetails:     createInput.SGDetails,
		Fees:          createInput.Fees,
		GrowthPeriods: createInput.GrowthPeriods,
		RatePeriods:   createInput.RatePeriods,
		Grants:        createInput.Grants,
	}

	scenario, err := h.store.UpdatePropertyScenario(r.Context(), userID, scenarioID, updateInput)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		log.Printf("PropertyPlanner.Update error: %v", err)
		internalError(w, err)
		return
	}

	computed := h.computeValues(scenario)

	response := scenarioResponse{
		Scenario:      scenario.Scenario,
		SGDetails:     scenario.SGDetails,
		Fees:          scenario.Fees,
		GrowthPeriods: scenario.GrowthPeriods,
		RatePeriods:   scenario.RatePeriods,
		Grants:        scenario.Grants,
		Computed:      computed,
	}

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

	err := h.store.DeletePropertyScenario(r.Context(), userID, scenarioID)
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

// convertCreateRequest converts API request to repository input
func (h *PropertyPlannerV2Handler) convertCreateRequest(req createScenarioRequest) (repo.CreateScenarioInput, error) {
	var input repo.CreateScenarioInput
	input.Country = req.Country

	if req.SGDetails != nil {
		sg, err := h.convertSGDetails(req.SGDetails)
		if err != nil {
			return input, err
		}
		input.SGDetails = sg
	}

	// Convert fees
	for _, f := range req.Fees {
		fee, err := h.convertFee(f)
		if err != nil {
			return input, err
		}
		input.Fees = append(input.Fees, fee)
	}

	// Convert growth periods
	for _, g := range req.GrowthPeriods {
		period, err := h.convertGrowthPeriod(g)
		if err != nil {
			return input, err
		}
		input.GrowthPeriods = append(input.GrowthPeriods, period)
	}

	// Convert rate periods
	for _, r := range req.RatePeriods {
		period, err := h.convertRatePeriod(r)
		if err != nil {
			return input, err
		}
		input.RatePeriods = append(input.RatePeriods, period)
	}

	// Convert grants
	for _, g := range req.Grants {
		grant, err := h.convertGrant(g)
		if err != nil {
			return input, err
		}
		input.Grants = append(input.Grants, grant)
	}

	return input, nil
}

func (h *PropertyPlannerV2Handler) convertSGDetails(req *createSGDetailsRequest) (*repo.CreateSGDetailsInput, error) {
	propertyPrice, err := decimal.NewFromString(req.PropertyPrice)
	if err != nil {
		return nil, err
	}

	var valuationPrice *decimal.Decimal
	if req.ValuationPrice != nil && *req.ValuationPrice != "" {
		vp, err := decimal.NewFromString(*req.ValuationPrice)
		if err != nil {
			return nil, err
		}
		valuationPrice = vp
	}

	var downpaymentCpfOa *decimal.Decimal
	if req.DownpaymentCpfOa != "" {
		d, err := decimal.NewFromString(req.DownpaymentCpfOa)
		if err != nil {
			return nil, err
		}
		downpaymentCpfOa = d
	}

	var downpaymentCash *decimal.Decimal
	if req.DownpaymentCash != "" {
		d, err := decimal.NewFromString(req.DownpaymentCash)
		if err != nil {
			return nil, err
		}
		downpaymentCash = d
	}

	var otherDebt *decimal.Decimal
	if req.OtherDebt != "" {
		d, err := decimal.NewFromString(req.OtherDebt)
		if err != nil {
			return nil, err
		}
		otherDebt = d
	}

	var saleExpectedPrice *decimal.Decimal
	if req.SaleExpectedPrice != nil && *req.SaleExpectedPrice != "" {
		sep, err := decimal.NewFromString(*req.SaleExpectedPrice)
		if err != nil {
			return nil, err
		}
		saleExpectedPrice = sep
	}

	return &repo.CreateSGDetailsInput{
		Name:                  req.Name,
		PropertyType:          req.PropertyType,
		PropertySubtype:       req.PropertySubtype,
		Icon:                  req.Icon,
		IconColor:             req.IconColor,
		IsIncluded:            req.IsIncluded,
		PropertyPrice:         *propertyPrice,
		ValuationPrice:        valuationPrice,
		LoanType:              req.LoanType,
		DownpaymentCpfOa:      downpaymentCpfOa,
		DownpaymentCash:       downpaymentCash,
		BorrowerType:          req.BorrowerType,
		Borrower1IncomeID:     req.Borrower1IncomeID,
		Borrower1CpfAccountID: req.Borrower1CpfAccountID,
		Borrower2IncomeID:     req.Borrower2IncomeID,
		Borrower2CpfAccountID: req.Borrower2CpfAccountID,
		OtherDebt:             otherDebt,
		PropertyCount:         req.PropertyCount,
		BtoLaunchDate:         req.BtoLaunchDate,
		BtoKeyCollectionDate:  req.BtoKeyCollectionDate,
		SaleExpectedDate:      req.SaleExpectedDate,
		SaleExpectedPrice:     saleExpectedPrice,
	}, nil
}

func (h *PropertyPlannerV2Handler) convertGrant(req createGrantRequest) (repo.CreateGrantInput, error) {
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return repo.CreateGrantInput{}, err
	}

	return repo.CreateGrantInput{
		Name:   req.Name,
		Amount: *amount,
	}, nil
}

func (h *PropertyPlannerV2Handler) convertFee(req createFeeRequest) (repo.CreateFeeInput, error) {
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return repo.CreateFeeInput{}, err
	}

	return repo.CreateFeeInput{
		FeeContext:   req.FeeContext,
		FeeType:      req.FeeType,
		Description:  req.Description,
		Amount:       *amount,
		Currency:     req.Currency,
		IsPercentage: req.IsPercentage,
		Frequency:    req.Frequency,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		Icon:         req.Icon,
		IconColor:    req.IconColor,
	}, nil
}

func (h *PropertyPlannerV2Handler) convertGrowthPeriod(req createGrowthPeriodRequest) (repo.CreateGrowthPeriodInput, error) {
	growthRate, err := decimal.NewFromString(req.GrowthRate)
	if err != nil {
		return repo.CreateGrowthPeriodInput{}, err
	}

	return repo.CreateGrowthPeriodInput{
		StartYear:      req.StartYear,
		EndYear:        req.EndYear,
		GrowthRate:     *growthRate,
		GrowthStrategy: req.GrowthStrategy,
	}, nil
}

func (h *PropertyPlannerV2Handler) convertRatePeriod(req createRatePeriodRequest) (repo.CreateRatePeriodInput, error) {
	fixedRate, err := decimal.NewFromString(req.FixedRate)
	if err != nil {
		return repo.CreateRatePeriodInput{}, err
	}

	floatingRate, err := decimal.NewFromString(req.FloatingRate)
	if err != nil {
		return repo.CreateRatePeriodInput{}, err
	}

	return repo.CreateRatePeriodInput{
		StartMonth:   req.StartMonth,
		TermYears:    req.TermYears,
		FixedYears:   req.FixedYears,
		FixedRate:    *fixedRate,
		FloatingRate: *floatingRate,
	}, nil
}

// computeValues calculates all derived values for a scenario
func (h *PropertyPlannerV2Handler) computeValues(s *repo.PropertyScenarioFull) *computedValues {
	if s.SGDetails == nil || len(s.RatePeriods) == 0 {
		return nil
	}

	details := s.SGDetails
	zero := decimal.Zero()

	// Sum all grants from the grants array
	grantsTotal := zero
	for _, g := range s.Grants {
		grantsTotal = grantsTotal.Add(&g.Amount)
	}

	// Calculate downpayment total
	downpaymentTotal := details.DownpaymentCpfOa.Add(&details.DownpaymentCash)
	downpaymentTotal = downpaymentTotal.Add(grantsTotal)

	// Calculate loan amount
	loanAmount := details.PropertyPrice.Sub(downpaymentTotal)

	// Calculate total term from rate periods
	totalTermMonths := 0
	for _, rp := range s.RatePeriods {
		totalTermMonths += rp.TermYears * 12
	}

	// Use first rate period for initial mortgage calculation
	firstRate := s.RatePeriods[0].FixedRate
	if s.RatePeriods[0].FixedYears == 0 {
		firstRate = s.RatePeriods[0].FloatingRate
	}

	mortgageResult := h.calculator.CalculateMortgage(loanAmount, totalTermMonths, &firstRate)

	// Calculate stamp duties
	bsd := h.calculator.CalculateBSD(&details.PropertyPrice)
	absd := h.calculator.CalculateABSD(&details.PropertyPrice, details.Residency, details.PropertyCount)

	totalStampDuty := bsd.Add(absd)

	// Calculate total upfront cash
	totalUpfrontCash := details.DownpaymentCash.Add(totalStampDuty)

	_ = zero // silence unused variable

	return &computedValues{
		LoanAmount:       loanAmount.String(),
		MonthlyPayment:   mortgageResult.MonthlyPayment.String(),
		TotalInterest:    mortgageResult.TotalInterest.String(),
		TotalAmountPaid:  mortgageResult.TotalAmountPaid.String(),
		BsdAmount:        bsd.String(),
		AbsdAmount:       absd.String(),
		TotalStampDuty:   totalStampDuty.String(),
		TotalUpfrontCash: totalUpfrontCash.String(),
	}
}

// ============================================================================
// Grant CRUD Handlers
// ============================================================================

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

	grantInput, err := h.convertGrant(req)
	if err != nil {
		badRequest(w, err)
		return
	}

	grant, err := h.store.CreateGrant(r.Context(), userID, scenarioID, grantInput)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
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

	grantInput, err := h.convertGrant(req)
	if err != nil {
		badRequest(w, err)
		return
	}

	grant, err := h.store.UpdateGrant(r.Context(), userID, scenarioID, grantID, grantInput)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
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
