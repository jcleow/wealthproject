package property

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/cpf/projector"
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

// =============================================================================
// Cross-Property Validation Types
// =============================================================================

// CrossPropertyValidationResult holds validation results for cross-property syncing
type CrossPropertyValidationResult struct {
	TDSRValid          bool                    `json:"tdsrValid"`
	TDSRRatio          *decimal.Decimal        `json:"tdsrRatio,omitempty"`
	TDSRLimit          *decimal.Decimal        `json:"tdsrLimit"`
	OtherMortgageTotal *decimal.Decimal        `json:"otherMortgageTotal,omitempty"`
	CPFOAValid         bool                    `json:"cpfOaValid"`
	CPFOAErrors        []CPFOAValidationError  `json:"cpfOaErrors,omitempty"`
}

// CPFOAValidationError describes a CPF OA validation failure
type CPFOAValidationError struct {
	AccountID      string           `json:"accountId"`
	AccountEarner  string           `json:"accountEarner"`
	AvailableOA    *decimal.Decimal `json:"availableOa"`
	RequestedUsage *decimal.Decimal `json:"requestedUsage"`
	OtherUsage     *decimal.Decimal `json:"otherUsage"`
	TotalUsage     *decimal.Decimal `json:"totalUsage"`
	Shortfall      *decimal.Decimal `json:"shortfall"`
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

	// Projected CPF OA balances at purchase date
	ProjectedBorrower1OA string `json:"projectedBorrower1OA,omitempty"`
	ProjectedBorrower2OA string `json:"projectedBorrower2OA,omitempty"`

	// Cross-property context (only populated when scenario is included)
	OtherMortgageTotal  string                  `json:"otherMortgageTotal,omitempty"`
	EffectiveTDSRRatio  string                  `json:"effectiveTdsrRatio,omitempty"`
	TDSRLimit           string                  `json:"tdsrLimit,omitempty"`
	CPFOAUsageByAccount []CPFOAAccountUsageInfo `json:"cpfOaUsageByAccount,omitempty"`
}

// CPFOAAccountUsageInfo shows CPF OA usage info for display purposes
type CPFOAAccountUsageInfo struct {
	AccountID     string `json:"accountId"`
	AccountEarner string `json:"accountEarner"`
	OABalance     string `json:"oaBalance"`
	UsedHere      string `json:"usedHere"`
	UsedElsewhere string `json:"usedElsewhere"`
	TotalUsed     string `json:"totalUsed"`
	Remaining     string `json:"remaining"`
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
	store        *repo.Store
	calculator   *Calculator
	cpfProjector *projector.Projector
}

// NewService creates a new property service
func NewService(store *repo.Store) *Service {
	return &Service{
		store:        store,
		calculator:   NewCalculator(),
		cpfProjector: projector.New(),
	}
}

// =============================================================================
// Public Methods
// =============================================================================

// CreateFromParams validates and converts raw params then creates a property scenario.
func (s *Service) CreateFromParams(ctx context.Context, userID string, params CreateScenarioParams) (*repo.PropertyScenarioFull, error) {
	// Validate cross-property constraints before creating
	validation, err := s.ValidateCrossPropertyConstraints(ctx, userID, nil, params)
	if err != nil {
		return nil, fmt.Errorf("validate cross-property constraints: %w", err)
	}

	if !validation.TDSRValid {
		return nil, ValidationError{
			Message: s.buildTDSRErrorMessage(validation),
		}
	}

	if !validation.CPFOAValid {
		return nil, ValidationError{
			Message: s.buildCPFOAErrorMessage(validation.CPFOAErrors),
		}
	}

	input, err := buildCreateScenarioInput(params)
	if err != nil {
		return nil, err
	}
	return s.store.CreatePropertyScenario(ctx, userID, input)
}

// UpdateFromParams validates and converts raw params then updates a property scenario.
func (s *Service) UpdateFromParams(ctx context.Context, userID, scenarioID string, params CreateScenarioParams) (*repo.PropertyScenarioFull, error) {
	// Get existing scenario to find its property_sg_id for exclusion
	existing, err := s.store.GetPropertyScenario(ctx, userID, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("get existing scenario: %w", err)
	}

	// Validate cross-property constraints (exclude current property from "other" calculations)
	var excludePropertySGID *string
	if existing.PropertySG != nil {
		excludePropertySGID = &existing.PropertySG.ID
	}

	validation, err := s.ValidateCrossPropertyConstraints(ctx, userID, excludePropertySGID, params)
	if err != nil {
		return nil, fmt.Errorf("validate cross-property constraints: %w", err)
	}

	if !validation.TDSRValid {
		return nil, ValidationError{
			Message: s.buildTDSRErrorMessage(validation),
		}
	}

	if !validation.CPFOAValid {
		return nil, ValidationError{
			Message: s.buildCPFOAErrorMessage(validation.CPFOAErrors),
		}
	}

	createInput, err := buildCreateScenarioInput(params)
	if err != nil {
		return nil, err
	}

	updateInput := repo.UpdateScenarioInput{
		PropertySG:    createInput.PropertySG,
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

// ValidateCrossPropertyConstraints validates TDSR and CPF OA across all included properties.
// This should be called BEFORE creating/updating a property scenario.
// Returns validation result (check TDSRValid and CPFOAValid for violations).
// Parameters:
//   - excludePropertySGID: the property_sg ID to exclude (nil for create, set for update)
//   - params: the property being created/updated
func (s *Service) ValidateCrossPropertyConstraints(
	ctx context.Context,
	userID string,
	excludePropertySGID *string,
	params CreateScenarioParams,
) (*CrossPropertyValidationResult, error) {
	result := &CrossPropertyValidationResult{
		TDSRValid:  true,
		CPFOAValid: true,
		TDSRLimit:  decimal.MustFromString("0.55"), // 55%
	}

	if params.SGDetails == nil {
		return result, nil
	}

	// Check if this property is included
	if params.SGDetails.IsIncluded != nil && !*params.SGDetails.IsIncluded {
		// Not included, skip validation
		return result, nil
	}

	// Build the input to get loan amount and rate info
	input, err := buildCreateScenarioInput(params)
	if err != nil {
		return nil, err
	}

	// ==========================================================================
	// TDSR Validation
	// ==========================================================================
	if err := s.validateTDSR(ctx, userID, excludePropertySGID, input, result); err != nil {
		return nil, err
	}

	// ==========================================================================
	// CPF OA Validation
	// ==========================================================================
	if err := s.validateCPFOA(ctx, userID, excludePropertySGID, input, result); err != nil {
		return nil, err
	}

	return result, nil
}

// validateTDSR checks if the new property's mortgage + other property mortgages exceeds TDSR limit
func (s *Service) validateTDSR(
	ctx context.Context,
	userID string,
	excludePropertySGID *string,
	input repo.CreateScenarioInput,
	result *CrossPropertyValidationResult,
) error {
	if input.PropertySG == nil || len(input.RatePeriods) == 0 {
		return nil
	}

	details := input.PropertySG

	// Get borrower's monthly income
	monthlyIncome, err := s.getBorrowerMonthlyIncome(ctx, userID, details.Borrower1IncomeID, details.Borrower2IncomeID)
	if err != nil {
		return err
	}

	// If no income linked, we can't validate TDSR - skip validation
	zero := decimal.Zero()
	if monthlyIncome == nil || monthlyIncome.Cmp(zero) <= 0 {
		return nil
	}

	// Calculate current property's monthly payment
	grantsTotal := sumGrantsInput(input.Grants)
	downpaymentCpfOa := decimal.Zero()
	if details.DownpaymentCpfOa != nil {
		downpaymentCpfOa = details.DownpaymentCpfOa
	}
	downpaymentCash := decimal.Zero()
	if details.DownpaymentCash != nil {
		downpaymentCash = details.DownpaymentCash
	}

	downpaymentTotal := downpaymentCpfOa.Add(downpaymentCash)
	downpaymentTotal = downpaymentTotal.Add(grantsTotal)
	loanAmount := details.PropertyPrice.Sub(downpaymentTotal)

	// Skip TDSR check if no loan needed
	if loanAmount.Cmp(zero) <= 0 {
		return nil
	}

	// Calculate monthly payment for this property
	totalTermMonths := 0
	for _, rp := range input.RatePeriods {
		totalTermMonths += rp.TermYears * 12
	}
	firstRate := input.RatePeriods[0].Rate

	mortgageResult := s.calculator.CalculateMortgage(loanAmount, totalTermMonths, &firstRate)
	currentMonthlyPayment := mortgageResult.MonthlyPayment

	// Get other property mortgages
	otherMortgages, err := s.store.GetOtherIncludedPropertyMortgages(ctx, userID, excludePropertySGID)
	if err != nil {
		return fmt.Errorf("get other property mortgages: %w", err)
	}

	// Calculate total monthly payment from other properties
	otherMortgageTotal := decimal.Zero()
	for _, other := range otherMortgages {
		// Calculate monthly payment for each other property
		termMonths := other.TotalTermYears * 12
		otherResult := s.calculator.CalculateMortgage(&other.LoanAmount, termMonths, &other.FirstRate)
		otherMortgageTotal = otherMortgageTotal.Add(otherResult.MonthlyPayment)
	}
	result.OtherMortgageTotal = otherMortgageTotal

	// Get manual other debt
	otherDebt := decimal.Zero()
	if details.OtherDebt != nil {
		otherDebt = details.OtherDebt
	}

	// Calculate total debt service ratio
	totalMonthlyDebt := currentMonthlyPayment.Add(otherMortgageTotal)
	totalMonthlyDebt = totalMonthlyDebt.Add(otherDebt)

	tdsrRatio := totalMonthlyDebt.Div(monthlyIncome)
	result.TDSRRatio = tdsrRatio.Round(4)

	// Check if TDSR exceeds limit (55%)
	tdsrLimit := decimal.MustFromString("0.55")
	if tdsrRatio.Cmp(tdsrLimit) > 0 {
		result.TDSRValid = false
	}

	return nil
}

// validateCPFOA checks if the new property's CPF OA usage exceeds available balance
func (s *Service) validateCPFOA(
	ctx context.Context,
	userID string,
	excludePropertySGID *string,
	input repo.CreateScenarioInput,
	result *CrossPropertyValidationResult,
) error {
	if input.PropertySG == nil {
		return nil
	}

	details := input.PropertySG

	// Get current property's CPF OA usage
	requestedCpfOa := decimal.Zero()
	if details.DownpaymentCpfOa != nil {
		requestedCpfOa = details.DownpaymentCpfOa
	}

	// Skip if no CPF OA usage requested
	zero := decimal.Zero()
	if requestedCpfOa.Cmp(zero) <= 0 {
		return nil
	}

	// Get borrower1's CPF account ID
	if details.Borrower1CpfAccountID == nil {
		// No CPF account linked, skip validation
		return nil
	}

	// Get CPF OA usage from other properties
	existingUsage, err := s.store.GetCPFOAUsageByAccount(ctx, userID, excludePropertySGID)
	if err != nil {
		return fmt.Errorf("get CPF OA usage: %w", err)
	}

	// Build a map of existing usage by account ID
	usageByAccount := make(map[string]*decimal.Decimal)
	for _, u := range existingUsage {
		usageByAccount[u.AccountID] = &u.TotalUsage
	}

	// Check borrower1's CPF account
	accountID := *details.Borrower1CpfAccountID
	oaBalance, earner, err := s.store.GetCPFAccountOABalance(ctx, userID, accountID)
	if err != nil {
		return fmt.Errorf("get CPF account balance: %w", err)
	}

	if oaBalance != nil {
		otherUsage := decimal.Zero()
		if existingUsagePtr, ok := usageByAccount[accountID]; ok {
			otherUsage = existingUsagePtr
		}

		totalUsage := requestedCpfOa.Add(otherUsage)

		if totalUsage.Cmp(oaBalance) > 0 {
			shortfall := totalUsage.Sub(oaBalance)
			result.CPFOAValid = false
			result.CPFOAErrors = append(result.CPFOAErrors, CPFOAValidationError{
				AccountID:      accountID,
				AccountEarner:  earner,
				AvailableOA:    oaBalance,
				RequestedUsage: requestedCpfOa,
				OtherUsage:     otherUsage,
				TotalUsage:     totalUsage,
				Shortfall:      shortfall,
			})
		}
	}

	// Note: For borrower2, we would need separate downpayment tracking per borrower
	// Currently downpayment_cpf_oa is a single field representing total CPF usage
	// This could be enhanced in the future with borrower1_cpf_oa and borrower2_cpf_oa fields

	return nil
}

// getBorrowerMonthlyIncome retrieves the total monthly income for borrowers
func (s *Service) getBorrowerMonthlyIncome(
	ctx context.Context,
	userID string,
	borrower1IncomeID *string,
	borrower2IncomeID *string,
) (*decimal.Decimal, error) {
	totalIncome := decimal.Zero()

	// Get borrower1's income
	if borrower1IncomeID != nil {
		income, err := s.getMonthlyIncomeByID(ctx, userID, *borrower1IncomeID)
		if err != nil {
			return nil, err
		}
		if income != nil {
			totalIncome = totalIncome.Add(income)
		}
	}

	// Get borrower2's income (for joint purchases)
	if borrower2IncomeID != nil && borrower2IncomeID != borrower1IncomeID {
		income, err := s.getMonthlyIncomeByID(ctx, userID, *borrower2IncomeID)
		if err != nil {
			return nil, err
		}
		if income != nil {
			totalIncome = totalIncome.Add(income)
		}
	}

	return totalIncome, nil
}

// getMonthlyIncomeByID retrieves monthly income for a given income ID
func (s *Service) getMonthlyIncomeByID(ctx context.Context, userID, incomeID string) (*decimal.Decimal, error) {
	income, err := s.store.GetIncome(ctx, userID, incomeID)
	if err != nil {
		if errors.Is(err, repo.ErrNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("get income: %w", err)
	}

	// Convert to monthly based on frequency
	monthlyAmount := &income.Amount
	switch income.Frequency {
	case "yearly", "annual":
		monthly := income.Amount.Div(decimal.NewFromInt64(12, 0))
		monthlyAmount = monthly
	case "one_time":
		// One-time income shouldn't be used for TDSR
		return nil, nil
	}

	return monthlyAmount, nil
}

// sumGrantsInput sums all grants from input
func sumGrantsInput(grants []repo.CreateGrantInput) *decimal.Decimal {
	total := decimal.Zero()
	for _, g := range grants {
		total = total.Add(&g.Amount)
	}
	return total
}

// buildTDSRErrorMessage builds a user-friendly error message for TDSR violations
func (s *Service) buildTDSRErrorMessage(result *CrossPropertyValidationResult) string {
	hundred := decimal.MustFromString("100")
	ratioPercent := result.TDSRRatio.Mul(hundred).Round(1)
	limitPercent := result.TDSRLimit.Mul(hundred).Round(0)

	msg := fmt.Sprintf("TDSR ratio %s%% exceeds %s%% limit", ratioPercent.String(), limitPercent.String())

	if result.OtherMortgageTotal != nil {
		zero := decimal.Zero()
		if result.OtherMortgageTotal.Cmp(zero) > 0 {
			msg += fmt.Sprintf(". Other included properties contribute $%s/month in mortgage payments", result.OtherMortgageTotal.Round(0).String())
		}
	}

	return msg
}

// buildCPFOAErrorMessage builds a user-friendly error message for CPF OA violations
func (s *Service) buildCPFOAErrorMessage(errors []CPFOAValidationError) string {
	if len(errors) == 0 {
		return "CPF OA usage exceeds available balance"
	}

	msg := "CPF OA usage exceeds available balance:\n"
	for _, e := range errors {
		accountName := e.AccountEarner
		if accountName == "" {
			accountName = "CPF Account"
		}
		msg += fmt.Sprintf("- %s: $%s (this property) + $%s (other properties) = $%s total (Available: $%s)\n",
			accountName,
			e.RequestedUsage.Round(0).String(),
			e.OtherUsage.Round(0).String(),
			e.TotalUsage.Round(0).String(),
			e.AvailableOA.Round(0).String(),
		)
	}

	return msg
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
	if scenario.PropertySG == nil || len(scenario.RatePeriods) == 0 {
		return nil
	}

	details := scenario.PropertySG

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

// getProjectedBorrowerBalances projects CPF OA balances to the purchase date for both borrowers.
// It returns projected OA balances accounting for contributions and interest growth.
func (s *Service) getProjectedBorrowerBalances(
	ctx context.Context,
	userID string,
	borrower1IncomeID, borrower1CpfAccountID *string,
	borrower2IncomeID, borrower2CpfAccountID *string,
	purchaseDate time.Time,
) (borrower1OA, borrower2OA *decimal.Decimal, err error) {
	// Helper function to project a single borrower
	projectBorrower := func(incomeID, cpfAccountID *string) (*decimal.Decimal, error) {
		if cpfAccountID == nil {
			return nil, nil
		}

		// Get CPF account
		cpfAccount, err := s.store.GetCPFAccountByID(ctx, userID, *cpfAccountID)
		if err != nil {
			if errors.Is(err, repo.ErrNotFound) {
				return nil, nil
			}
			return nil, fmt.Errorf("get CPF account: %w", err)
		}

		// Build account snapshot
		snapshot := projector.AccountSnapshot{
			OABalance:       &cpfAccount.OABalance,
			SABalance:       &cpfAccount.SABalance,
			MABalance:       &cpfAccount.MABalance,
			RABalance:       &cpfAccount.RABalance,
			DateOfBirth:     cpfAccount.DateOfBirth,
			ResidencyStatus: cpfAccount.ResidencyStatus,
			AsOfDate:        cpfAccount.StartDate,
		}

		// Build income streams
		var incomes []projector.IncomeStream
		if incomeID != nil {
			income, err := s.store.GetIncome(ctx, userID, *incomeID)
			if err == nil {
				// Convert to monthly amount
				monthlyAmount := &income.Amount
				switch income.Frequency {
				case "yearly", "annual":
					monthly := income.Amount.Div(decimal.NewFromInt64(12, 0))
					monthlyAmount = monthly
				}

				// Only include if wage type is valid for CPF
				if income.CPFWageType == "ow" || income.CPFWageType == "aw" {
					incomes = append(incomes, projector.IncomeStream{
						MonthlyAmount: monthlyAmount,
						WageType:      income.CPFWageType,
						StartDate:     income.StartDate,
						EndDate:       income.EndDate,
					})
				}
			}
		}

		// Project to purchase date
		projected, err := s.cpfProjector.ProjectToDate(ctx, snapshot, incomes, purchaseDate)
		if err != nil {
			return nil, fmt.Errorf("project CPF: %w", err)
		}

		return projected.OA, nil
	}

	// Project borrower 1
	borrower1OA, err = projectBorrower(borrower1IncomeID, borrower1CpfAccountID)
	if err != nil {
		return nil, nil, err
	}

	// Project borrower 2 (only if different from borrower 1)
	if borrower2CpfAccountID != nil && (borrower1CpfAccountID == nil || *borrower2CpfAccountID != *borrower1CpfAccountID) {
		borrower2OA, err = projectBorrower(borrower2IncomeID, borrower2CpfAccountID)
		if err != nil {
			return nil, nil, err
		}
	}

	return borrower1OA, borrower2OA, nil
}

// getPurchaseDate determines the earliest purchase date from scenario details.
// For BTO properties, uses BtoKeyCollectionDate. Otherwise uses first rate period start.
func (s *Service) getPurchaseDate(scenario *repo.PropertyScenarioFull) time.Time {
	if scenario.PropertySG == nil {
		return time.Now()
	}

	// For BTO, use key collection date if available
	if scenario.PropertySG.BtoKeyCollectionDate != nil {
		parsed, err := time.Parse("2006-01", *scenario.PropertySG.BtoKeyCollectionDate)
		if err == nil {
			return parsed
		}
	}

	// Otherwise use first rate period's start date (loan start)
	if len(scenario.RatePeriods) > 0 {
		return scenario.RatePeriods[0].StartDate
	}

	return time.Now()
}

// ComputeValuesWithContext calculates all derived values including cross-property context.
// This includes information about other property mortgages and CPF OA usage.
func (s *Service) ComputeValuesWithContext(
	ctx context.Context,
	userID string,
	scenario *repo.PropertyScenarioFull,
) *ComputedValues {
	// Get base computed values
	result := s.ComputeValues(scenario)
	if result == nil {
		return nil
	}

	// Only add cross-property context for included scenarios
	if scenario.PropertySG == nil || !scenario.PropertySG.IsIncluded {
		return result
	}

	details := scenario.PropertySG

	// Get projected CPF OA balances at purchase date
	purchaseDate := s.getPurchaseDate(scenario)
	b1OA, b2OA, err := s.getProjectedBorrowerBalances(
		ctx, userID,
		details.Borrower1IncomeID, details.Borrower1CpfAccountID,
		details.Borrower2IncomeID, details.Borrower2CpfAccountID,
		purchaseDate,
	)
	if err == nil {
		if b1OA != nil {
			result.ProjectedBorrower1OA = b1OA.Round(2).String()
		}
		if b2OA != nil {
			result.ProjectedBorrower2OA = b2OA.Round(2).String()
		}
	}

	// Get other property mortgages
	otherMortgages, err := s.store.GetOtherIncludedPropertyMortgages(ctx, userID, &details.ID)
	if err == nil {
		// Calculate total monthly payment from other properties
		otherMortgageTotal := decimal.Zero()
		for _, other := range otherMortgages {
			termMonths := other.TotalTermYears * 12
			otherResult := s.calculator.CalculateMortgage(&other.LoanAmount, termMonths, &other.FirstRate)
			otherMortgageTotal = otherMortgageTotal.Add(otherResult.MonthlyPayment)
		}
		result.OtherMortgageTotal = otherMortgageTotal.Round(2).String()

		// Calculate effective TDSR if we have income info
		monthlyIncome, _ := s.getBorrowerMonthlyIncome(ctx, userID, details.Borrower1IncomeID, details.Borrower2IncomeID)
		zero := decimal.Zero()
		if monthlyIncome != nil && monthlyIncome.Cmp(zero) > 0 {
			// Parse current monthly payment
			currentPayment, _ := decimal.NewFromString(result.MonthlyPayment)
			if currentPayment != nil {
				totalDebt := currentPayment.Add(otherMortgageTotal)
				totalDebt = totalDebt.Add(&details.OtherDebt)
				tdsrRatio := totalDebt.Div(monthlyIncome)

				hundred := decimal.MustFromString("100")
				tdsrPercent := tdsrRatio.Mul(hundred).Round(1)
				result.EffectiveTDSRRatio = tdsrPercent.String() + "%"
				result.TDSRLimit = "55%"
			}
		}
	}

	// Get CPF OA usage info
	if details.Borrower1CpfAccountID != nil {
		existingUsage, err := s.store.GetCPFOAUsageByAccount(ctx, userID, &details.ID)
		if err == nil {
			// Build a map of existing usage by account ID
			usageByAccount := make(map[string]*decimal.Decimal)
			for _, u := range existingUsage {
				usageByAccount[u.AccountID] = &u.TotalUsage
			}

			// Get the CPF account info
			oaBalance, earner, err := s.store.GetCPFAccountOABalance(ctx, userID, *details.Borrower1CpfAccountID)
			if err == nil && oaBalance != nil {
				usedHere := &details.DownpaymentCpfOa
				usedElsewhere := decimal.Zero()
				if existingUsagePtr, ok := usageByAccount[*details.Borrower1CpfAccountID]; ok {
					usedElsewhere = existingUsagePtr
				}
				totalUsed := usedHere.Add(usedElsewhere)
				remaining := oaBalance.Sub(totalUsed)

				result.CPFOAUsageByAccount = append(result.CPFOAUsageByAccount, CPFOAAccountUsageInfo{
					AccountID:     *details.Borrower1CpfAccountID,
					AccountEarner: earner,
					OABalance:     oaBalance.Round(0).String(),
					UsedHere:      usedHere.Round(0).String(),
					UsedElsewhere: usedElsewhere.Round(0).String(),
					TotalUsed:     totalUsed.Round(0).String(),
					Remaining:     remaining.Round(0).String(),
				})
			}
		}
	}

	return result
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
		input.PropertySG = sg
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
