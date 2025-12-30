package property

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// =============================================================================
// Types
// =============================================================================

// ValidationError represents a client input validation error.
type ValidationError struct {
	Message string
}

func (e ValidationError) Error() string {
	return e.Message
}

// IsValidationError reports whether the error is a validation error.
func IsValidationError(err error) bool {
	var ve ValidationError
	return errors.As(err, &ve)
}

// ComputedValues contains all derived values for a property scenario
type ComputedValues struct {
	LoanAmount       string `json:"loanAmount"`
	MonthlyPayment   string `json:"monthlyPayment"`
	TotalInterest    string `json:"totalInterest"`
	TotalAmountPaid  string `json:"totalAmountPaid"`
	BsdAmount        string `json:"bsdAmount"`
	AbsdAmount       string `json:"absdAmount"`
	TotalStampDuty   string `json:"totalStampDuty"`
	TotalUpfrontCash string `json:"totalUpfrontCash"`
}

// =============================================================================
// Params Types (Raw input from HTTP - strings for decimals/dates)
// =============================================================================

// CreateScenarioParams is the raw input from HTTP handlers.
type CreateScenarioParams struct {
	Country       string
	SGDetails     *CreateSGDetailsParams
	Fees          []CreateFeeParams
	GrowthPeriods []CreateGrowthPeriodParams
	RatePeriods   []CreateRatePeriodParams
	Grants        []CreateGrantParams
}

// CreateSGDetailsParams is the raw SG details input from HTTP.
type CreateSGDetailsParams struct {
	Name                  string
	PropertyType          string
	PropertySubtype       string
	Icon                  *string
	IconColor             *string
	IsIncluded            *bool
	PropertyPrice         string  // decimal as string
	ValuationPrice        *string // optional decimal
	LoanType              string
	DownpaymentCpfOa      string // decimal as string
	DownpaymentCash       string // decimal as string
	BorrowerType          string
	Borrower1IncomeID     *string
	Borrower1CpfAccountID *string
	Borrower2IncomeID     *string
	Borrower2CpfAccountID *string
	OtherDebt             string  // decimal as string
	PropertyCount         *int
	BtoLaunchDate         *string // date as string
	BtoKeyCollectionDate  *string // date as string
	SaleExpectedDate      *string // date as string
	SaleExpectedPrice     *string // optional decimal
}

// CreateFeeParams is the raw fee input from HTTP.
type CreateFeeParams struct {
	FeeContext   string
	FeeType      string
	Description  *string
	Amount       string // decimal as string
	Currency     string
	IsPercentage *bool
	Frequency    string
	StartDate    *string // date as string
	EndDate      *string // date as string
	Icon         *string
	IconColor    *string
}

// CreateGrowthPeriodParams is the raw growth period input from HTTP.
type CreateGrowthPeriodParams struct {
	StartYear      int
	EndYear        *int
	GrowthRate     string // decimal as string
	GrowthStrategy string
}

// CreateRatePeriodParams is the raw rate period input from HTTP.
type CreateRatePeriodParams struct {
	StartMonth string // YYYY-MM format
	TermYears  int
	Rate       string // decimal as string
	RateType   string
}

// CreateGrantParams is the raw grant input from HTTP.
type CreateGrantParams struct {
	Name   string
	Amount string // decimal as string
}

// =============================================================================
// Service
// =============================================================================

// Service handles property scenario business logic
type Service struct {
	store      *repo.Store
	calculator *Calculator
}

// NewService creates a new property service
func NewService(store *repo.Store) *Service {
	return &Service{
		store:      store,
		calculator: NewCalculator(),
	}
}

// =============================================================================
// Public Methods
// =============================================================================

// CreateFromParams validates and converts raw params then creates a property scenario.
func (s *Service) CreateFromParams(ctx context.Context, userID string, params CreateScenarioParams) (*repo.PropertyScenarioFull, error) {
	input, err := buildCreateScenarioInput(params)
	if err != nil {
		return nil, err
	}
	return s.store.CreatePropertyScenario(ctx, userID, input)
}

// UpdateFromParams validates and converts raw params then updates a property scenario.
func (s *Service) UpdateFromParams(ctx context.Context, userID, scenarioID string, params CreateScenarioParams) (*repo.PropertyScenarioFull, error) {
	createInput, err := buildCreateScenarioInput(params)
	if err != nil {
		return nil, err
	}

	updateInput := repo.UpdateScenarioInput{
		SGDetails:     createInput.SGDetails,
		Fees:          createInput.Fees,
		GrowthPeriods: createInput.GrowthPeriods,
		RatePeriods:   createInput.RatePeriods,
		Grants:        createInput.Grants,
	}

	return s.store.UpdatePropertyScenario(ctx, userID, scenarioID, updateInput)
}

// Get retrieves a property scenario by ID.
func (s *Service) Get(ctx context.Context, userID, scenarioID string) (*repo.PropertyScenarioFull, error) {
	return s.store.GetPropertyScenario(ctx, userID, scenarioID)
}

// List retrieves all property scenarios for a user.
func (s *Service) List(ctx context.Context, userID string) ([]repo.PropertyScenarioFull, error) {
	return s.store.ListPropertyScenarios(ctx, userID)
}

// Delete removes a property scenario by ID.
func (s *Service) Delete(ctx context.Context, userID, scenarioID string) error {
	return s.store.DeletePropertyScenario(ctx, userID, scenarioID)
}

// CreateGrantFromParams validates and converts raw params then creates a grant.
func (s *Service) CreateGrantFromParams(ctx context.Context, userID, scenarioID string, params CreateGrantParams) (*repo.PropertySGGrant, error) {
	input, err := buildGrantInput(params)
	if err != nil {
		return nil, err
	}
	return s.store.CreateGrant(ctx, userID, scenarioID, input)
}

// UpdateGrantFromParams validates and converts raw params then updates a grant.
func (s *Service) UpdateGrantFromParams(ctx context.Context, userID, scenarioID, grantID string, params CreateGrantParams) (*repo.PropertySGGrant, error) {
	input, err := buildGrantInput(params)
	if err != nil {
		return nil, err
	}
	return s.store.UpdateGrant(ctx, userID, scenarioID, grantID, input)
}

// ComputeValues calculates all derived values for a scenario
func (s *Service) ComputeValues(scenario *repo.PropertyScenarioFull) *ComputedValues {
	if scenario.SGDetails == nil || len(scenario.RatePeriods) == 0 {
		return nil
	}

	details := scenario.SGDetails

	// Sum all grants
	grantsTotal := sumGrants(scenario.Grants)

	// Calculate downpayment total
	downpaymentTotal := details.DownpaymentCpfOa.Add(&details.DownpaymentCash)
	downpaymentTotal = downpaymentTotal.Add(grantsTotal)

	// Calculate loan amount
	loanAmount := details.PropertyPrice.Sub(downpaymentTotal)

	// Calculate total term from rate periods
	totalTermMonths := calculateTotalTermMonths(scenario.RatePeriods)

	// Use first rate period for initial mortgage calculation
	firstRate := scenario.RatePeriods[0].Rate

	mortgageResult := s.calculator.CalculateMortgage(loanAmount, totalTermMonths, &firstRate)

	// Calculate stamp duties
	bsd := s.calculator.CalculateBSD(&details.PropertyPrice)
	absd := s.calculator.CalculateABSD(&details.PropertyPrice, details.Residency, details.PropertyCount)

	totalStampDuty := bsd.Add(absd)

	// Calculate total upfront cash
	totalUpfrontCash := details.DownpaymentCash.Add(totalStampDuty)

	return &ComputedValues{
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

// =============================================================================
// Build Functions (convert Params to repo Input)
// =============================================================================

func buildCreateScenarioInput(params CreateScenarioParams) (repo.CreateScenarioInput, error) {
	var input repo.CreateScenarioInput
	input.Country = params.Country

	if params.SGDetails != nil {
		sg, err := buildSGDetailsInput(params.SGDetails)
		if err != nil {
			return input, err
		}
		input.SGDetails = sg
	}

	for _, f := range params.Fees {
		fee, err := buildFeeInput(f)
		if err != nil {
			return input, err
		}
		input.Fees = append(input.Fees, fee)
	}

	for _, g := range params.GrowthPeriods {
		period, err := buildGrowthPeriodInput(g)
		if err != nil {
			return input, err
		}
		input.GrowthPeriods = append(input.GrowthPeriods, period)
	}

	for _, r := range params.RatePeriods {
		period, err := buildRatePeriodInput(r)
		if err != nil {
			return input, err
		}
		input.RatePeriods = append(input.RatePeriods, period)
	}

	for _, g := range params.Grants {
		grant, err := buildGrantInput(g)
		if err != nil {
			return input, err
		}
		input.Grants = append(input.Grants, grant)
	}

	return input, nil
}

func buildSGDetailsInput(params *CreateSGDetailsParams) (*repo.CreateSGDetailsInput, error) {
	propertyPrice, err := parseDecimalField("propertyPrice", params.PropertyPrice)
	if err != nil {
		return nil, err
	}

	valuationPrice, err := parseOptionalDecimal("valuationPrice", params.ValuationPrice)
	if err != nil {
		return nil, err
	}

	downpaymentCpfOa, err := parseOptionalDecimalWithDefault("downpaymentCpfOa", params.DownpaymentCpfOa)
	if err != nil {
		return nil, err
	}

	downpaymentCash, err := parseOptionalDecimalWithDefault("downpaymentCash", params.DownpaymentCash)
	if err != nil {
		return nil, err
	}

	otherDebt, err := parseOptionalDecimalWithDefault("otherDebt", params.OtherDebt)
	if err != nil {
		return nil, err
	}

	saleExpectedPrice, err := parseOptionalDecimal("saleExpectedPrice", params.SaleExpectedPrice)
	if err != nil {
		return nil, err
	}

	return &repo.CreateSGDetailsInput{
		Name:                  params.Name,
		PropertyType:          params.PropertyType,
		PropertySubtype:       params.PropertySubtype,
		Icon:                  params.Icon,
		IconColor:             params.IconColor,
		IsIncluded:            params.IsIncluded,
		PropertyPrice:         *propertyPrice,
		ValuationPrice:        valuationPrice,
		LoanType:              params.LoanType,
		DownpaymentCpfOa:      downpaymentCpfOa,
		DownpaymentCash:       downpaymentCash,
		BorrowerType:          params.BorrowerType,
		Borrower1IncomeID:     params.Borrower1IncomeID,
		Borrower1CpfAccountID: params.Borrower1CpfAccountID,
		Borrower2IncomeID:     params.Borrower2IncomeID,
		Borrower2CpfAccountID: params.Borrower2CpfAccountID,
		OtherDebt:             otherDebt,
		PropertyCount:         params.PropertyCount,
		BtoLaunchDate:         params.BtoLaunchDate,
		BtoKeyCollectionDate:  params.BtoKeyCollectionDate,
		SaleExpectedDate:      params.SaleExpectedDate,
		SaleExpectedPrice:     saleExpectedPrice,
	}, nil
}

func buildFeeInput(params CreateFeeParams) (repo.CreateFeeInput, error) {
	amount, err := parseDecimalField("amount", params.Amount)
	if err != nil {
		return repo.CreateFeeInput{}, err
	}

	startDate, err := parseFlexibleDatePointer(params.StartDate)
	if err != nil {
		return repo.CreateFeeInput{}, ValidationError{Message: fmt.Sprintf("invalid startDate: %v", err)}
	}

	endDate, err := parseFlexibleDatePointer(params.EndDate)
	if err != nil {
		return repo.CreateFeeInput{}, ValidationError{Message: fmt.Sprintf("invalid endDate: %v", err)}
	}

	return repo.CreateFeeInput{
		FeeContext:   params.FeeContext,
		FeeType:      params.FeeType,
		Description:  params.Description,
		Amount:       *amount,
		Currency:     params.Currency,
		IsPercentage: params.IsPercentage,
		Frequency:    params.Frequency,
		StartDate:    startDate,
		EndDate:      endDate,
		Icon:         params.Icon,
		IconColor:    params.IconColor,
	}, nil
}

func buildGrowthPeriodInput(params CreateGrowthPeriodParams) (repo.CreateGrowthPeriodInput, error) {
	growthRate, err := parseDecimalField("growthRate", params.GrowthRate)
	if err != nil {
		return repo.CreateGrowthPeriodInput{}, err
	}

	// Convert StartYear (int) to StartDate (time.Time) - use January 1st
	startDate := time.Date(params.StartYear, time.January, 1, 0, 0, 0, 0, time.UTC)

	// Convert EndYear to EndDate if present
	var endDate *time.Time
	if params.EndYear != nil {
		ed := time.Date(*params.EndYear, time.December, 31, 23, 59, 59, 0, time.UTC)
		endDate = &ed
	}

	return repo.CreateGrowthPeriodInput{
		StartDate:      startDate,
		EndDate:        endDate,
		GrowthRate:     *growthRate,
		GrowthStrategy: params.GrowthStrategy,
	}, nil
}

func buildRatePeriodInput(params CreateRatePeriodParams) (repo.CreateRatePeriodInput, error) {
	rate, err := parseDecimalField("rate", params.Rate)
	if err != nil {
		return repo.CreateRatePeriodInput{}, err
	}

	// Convert StartMonth (YYYY-MM) to StartDate (time.Time)
	startDate, err := time.Parse("2006-01", params.StartMonth)
	if err != nil {
		return repo.CreateRatePeriodInput{}, ValidationError{Message: fmt.Sprintf("invalid startMonth format: %v", err)}
	}

	// Default to "fixed" if not specified
	rateType := params.RateType
	if rateType == "" {
		rateType = "fixed"
	}

	return repo.CreateRatePeriodInput{
		StartDate: startDate,
		TermYears: params.TermYears,
		Rate:      *rate,
		RateType:  rateType,
	}, nil
}

func buildGrantInput(params CreateGrantParams) (repo.CreateGrantInput, error) {
	amount, err := parseDecimalField("amount", params.Amount)
	if err != nil {
		return repo.CreateGrantInput{}, err
	}

	return repo.CreateGrantInput{
		Name:   params.Name,
		Amount: *amount,
	}, nil
}

// =============================================================================
// Parsing Helpers
// =============================================================================

func parseDecimalField(field, value string) (*decimal.Decimal, error) {
	if value == "" {
		return nil, ValidationError{Message: fmt.Sprintf("%s is required", field)}
	}
	d, err := decimal.NewFromString(value)
	if err != nil {
		return nil, ValidationError{Message: fmt.Sprintf("invalid %s: %v", field, err)}
	}
	return d, nil
}

func parseOptionalDecimal(field string, value *string) (*decimal.Decimal, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	d, err := decimal.NewFromString(*value)
	if err != nil {
		return nil, ValidationError{Message: fmt.Sprintf("invalid %s: %v", field, err)}
	}
	return d, nil
}

func parseOptionalDecimalWithDefault(field, value string) (*decimal.Decimal, error) {
	if value == "" {
		return nil, nil
	}
	d, err := decimal.NewFromString(value)
	if err != nil {
		return nil, ValidationError{Message: fmt.Sprintf("invalid %s: %v", field, err)}
	}
	return d, nil
}

// parseFlexibleDate parses dates in various formats: YYYY-MM, YYYY-MM-DD, or ISO8601
func parseFlexibleDate(s string) (time.Time, error) {
	// Try YYYY-MM format first (most common for property fees)
	if len(s) == 7 {
		t, err := time.Parse("2006-01", s)
		if err == nil {
			return t, nil
		}
	}

	// Try YYYY-MM-DD format
	if len(s) == 10 {
		t, err := time.Parse("2006-01-02", s)
		if err == nil {
			return t, nil
		}
	}

	// Try full ISO8601 format
	t, err := time.Parse(time.RFC3339, s)
	if err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("unsupported date format: %s", s)
}

func parseFlexibleDatePointer(value *string) (*time.Time, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	t, err := parseFlexibleDate(*value)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// =============================================================================
// Computation Helpers
// =============================================================================

func sumGrants(grants []repo.PropertySGGrant) *decimal.Decimal {
	total := decimal.Zero()
	for _, g := range grants {
		total = total.Add(&g.Amount)
	}
	return total
}

func calculateTotalTermMonths(ratePeriods []repo.LiabilityRatePeriod) int {
	total := 0
	for _, rp := range ratePeriods {
		total += rp.TermYears * 12
	}
	return total
}
