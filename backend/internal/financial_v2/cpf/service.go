package cpf

import (
	"context"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for CPF account versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// UpdateInput contains the parameters for updating a CPF account.
// Uses decimal.Decimal for financial values to avoid precision loss.
// Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity.
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
type UpdateInput struct {
	ID         string
	PersonID   string // Required FK to persons table
	OABalance  decimal.Decimal
	SABalance  decimal.Decimal
	MABalance  decimal.Decimal
	RABalance  decimal.Decimal
	StartDate  *time.Time // Only for versioned updates
	UpdateMode string
}

// Service handles CPF account business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new CPF account service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned CPF account updates
func (s *Service) Update(ctx context.Context, userID, cpfAccountID string, input UpdateInput) (*repo.CPFAccount, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, cpfAccountID, input)
	}
	return s.inPlaceUpdate(ctx, userID, cpfAccountID, input)
}

// Stop stops a CPF account at a given date
func (s *Service) Stop(ctx context.Context, userID, cpfAccountID string, endDate time.Time) (*repo.CPFAccount, error) {
	return s.store.StopCPFAccount(ctx, userID, cpfAccountID, endDate)
}

// inputToAccount converts UpdateInput to a CPFAccount struct
// Note: Person-related fields are no longer set here - they are read from persons table via JOIN
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount()
func inputToAccount(id string, input UpdateInput) repo.CPFAccount {
	return repo.CPFAccount{
		ID:        id,
		PersonID:  input.PersonID,
		OABalance: input.OABalance,
		SABalance: input.SABalance,
		MABalance: input.MABalance,
		RABalance: input.RABalance,
	}
}

// versionedUpdate stops the current CPF account and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, cpfAccountID string, input UpdateInput) (*repo.CPFAccount, error) {
	// 1. Set end_date on current CPF account (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopCPFAccount(ctx, userID, cpfAccountID, endDate); err != nil {
		return nil, err
	}

	// 2. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindCPFAccountByParentAndStartDate(ctx, userID, cpfAccountID, *input.StartDate)
	if existing != nil {
		updated := inputToAccount(existing.ID, input)
		return s.store.UpdateCPFAccount(ctx, userID, updated)
	}

	// 3. Create new version
	newAccount := inputToAccount("", input)
	newAccount.ParentID = cpfAccountID
	newAccount.StartDate = *input.StartDate

	created, err := s.store.CreateCPFAccount(ctx, userID, newAccount)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the CPF account
func (s *Service) inPlaceUpdate(ctx context.Context, userID, cpfAccountID string, input UpdateInput) (*repo.CPFAccount, error) {
	updated := inputToAccount(cpfAccountID, input)
	return s.store.UpdateCPFAccount(ctx, userID, updated)
}

// CPFLifeEstimateInput contains parameters for CPF LIFE estimate calculation.
type CPFLifeEstimateInput struct {
	CPFAccountID   string           // Optional: CPF account to get person's birth year and gender
	BirthYear      int              // Optional: birth year for standalone mode
	Gender         string           // Optional: 'male' or 'female' for standalone mode
	RABalanceAt65  *decimal.Decimal // Required: RA balance at age 65
	PayoutStartAge int              // Required: payout start age (65-70)
}

// CPFLifeEstimateResult contains the CPF LIFE payout estimates.
type CPFLifeEstimateResult struct {
	RABalanceAt65  *decimal.Decimal
	PayoutStartAge int
	BirthYear      int
	Gender         string
	Standard       PlanEstimate
	Basic          PlanEstimate
	Escalating     EscalatingPlanEstimate
	Disclaimer     string
}

// PlanEstimate contains estimate details for a standard or basic plan.
type PlanEstimate struct {
	MonthlyPayout  *decimal.Decimal
	AnnualPayout   *decimal.Decimal
	PayoutRate     *decimal.Decimal
	BequestAtAge75 *decimal.Decimal // Bequest if death at age 75
	BequestAtAge85 *decimal.Decimal // Bequest if death at age 85
	BequestAtAge95 *decimal.Decimal // Bequest if death at age 95
}

// EscalatingPlanEstimate contains estimate details for the escalating plan.
type EscalatingPlanEstimate struct {
	MonthlyPayout  *decimal.Decimal
	AnnualPayout   *decimal.Decimal
	PayoutRate     *decimal.Decimal
	PayoutAt75     *decimal.Decimal
	PayoutAt85     *decimal.Decimal
	BequestAtAge75 *decimal.Decimal // Bequest if death at age 75
	BequestAtAge85 *decimal.Decimal // Bequest if death at age 85
	BequestAtAge95 *decimal.Decimal // Bequest if death at age 95
}

// CPFProjectionResult contains the CPF projection with LIFE estimates.
type CPFProjectionResult struct {
	ProjectedBalances BalanceSnapshot
	CurrentBalances   BalanceSnapshot
	BirthYear         int
	Gender            string
	Age65Date         time.Time
	CPFLifeEstimates  *CPFLifeEstimateResult
}

// BalanceSnapshot represents CPF balances at a point in time.
type BalanceSnapshot struct {
	OA       *decimal.Decimal
	SA       *decimal.Decimal
	MA       *decimal.Decimal
	RA       *decimal.Decimal
	AsOfDate time.Time
}

// CalculateCPFLifeEstimates calculates CPF LIFE payout estimates for all plans.
func (s *Service) CalculateCPFLifeEstimates(ctx context.Context, userID string, input CPFLifeEstimateInput) (*CPFLifeEstimateResult, error) {
	// Validate payout start age
	if input.PayoutStartAge < 65 || input.PayoutStartAge > 70 {
		return nil, fmt.Errorf("payoutStartAge must be between 65 and 70")
	}

	// Validate RA balance is provided
	if input.RABalanceAt65 == nil {
		return nil, fmt.Errorf("raBalanceAt65 is required")
	}

	var birthYear int
	var gender payout.Gender

	// Two modes: with CPF account or standalone
	if input.CPFAccountID != "" {
		// Mode 1: Fetch birth year and gender from CPF account's person
		cpfAccount, err := s.store.GetCPFAccountByID(ctx, userID, input.CPFAccountID)
		if err != nil {
			return nil, fmt.Errorf("failed to get CPF account: %w", err)
		}

		person, err := s.store.GetPerson(ctx, userID, cpfAccount.PersonID)
		if err != nil {
			return nil, fmt.Errorf("failed to get person: %w", err)
		}

		birthYear = person.DateOfBirth.Year()
		if person.Gender == "female" {
			gender = payout.GenderFemale
		} else {
			gender = payout.GenderMale
		}
	} else {
		// Mode 2: Standalone - use provided birth year and gender
		if input.BirthYear == 0 {
			return nil, fmt.Errorf("birthYear is required when cpfAccountId not provided")
		}
		if input.Gender == "" {
			return nil, fmt.Errorf("gender is required when cpfAccountId not provided")
		}
		if input.Gender != "male" && input.Gender != "female" {
			return nil, fmt.Errorf("gender must be 'male' or 'female'")
		}

		birthYear = input.BirthYear
		if input.Gender == "female" {
			gender = payout.GenderFemale
		} else {
			gender = payout.GenderMale
		}
	}

	// Calculate CPF LIFE estimates for all plans
	estimates, err := payout.CalculateAllPlans(birthYear, gender, input.RABalanceAt65, input.PayoutStartAge)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate CPF LIFE estimates: %w", err)
	}

	return &CPFLifeEstimateResult{
		RABalanceAt65:  input.RABalanceAt65,
		PayoutStartAge: input.PayoutStartAge,
		BirthYear:      birthYear,
		Gender:         string(gender),
		Standard: PlanEstimate{
			MonthlyPayout:  estimates.Standard.MonthlyPayout,
			AnnualPayout:   estimates.Standard.AnnualPayout,
			PayoutRate:     estimates.Standard.PayoutRate,
			BequestAtAge75: estimates.Standard.BequestAtAge75,
			BequestAtAge85: estimates.Standard.BequestAtAge85,
			BequestAtAge95: estimates.Standard.BequestAtAge95,
		},
		Basic: PlanEstimate{
			MonthlyPayout:  estimates.Basic.MonthlyPayout,
			AnnualPayout:   estimates.Basic.AnnualPayout,
			PayoutRate:     estimates.Basic.PayoutRate,
			BequestAtAge75: estimates.Basic.BequestAtAge75,
			BequestAtAge85: estimates.Basic.BequestAtAge85,
			BequestAtAge95: estimates.Basic.BequestAtAge95,
		},
		Escalating: EscalatingPlanEstimate{
			MonthlyPayout:  estimates.Escalating.MonthlyPayout,
			AnnualPayout:   estimates.Escalating.AnnualPayout,
			PayoutRate:     estimates.Escalating.PayoutRate,
			PayoutAt75:     estimates.Escalating.PayoutAt75,
			PayoutAt85:     estimates.Escalating.PayoutAt85,
			BequestAtAge75: estimates.Escalating.BequestAtAge75,
			BequestAtAge85: estimates.Escalating.BequestAtAge85,
			BequestAtAge95: estimates.Escalating.BequestAtAge95,
		},
		Disclaimer: estimates.Disclaimer,
	}, nil
}

// ProjectCPFWithLifeEstimates projects CPF balances to age 65 and calculates CPF LIFE estimates.
func (s *Service) ProjectCPFWithLifeEstimates(ctx context.Context, userID, cpfAccountID string, payoutStartAge int) (*CPFProjectionResult, error) {
	// Validate payout start age
	if payoutStartAge < 65 || payoutStartAge > 70 {
		return nil, fmt.Errorf("payoutStartAge must be between 65 and 70")
	}

	// Get CPF account
	cpfAccount, err := s.store.GetCPFAccountByID(ctx, userID, cpfAccountID)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPF account: %w", err)
	}

	// Get person for birth year, gender, and residency
	person, err := s.store.GetPerson(ctx, userID, cpfAccount.PersonID)
	if err != nil {
		return nil, fmt.Errorf("failed to get person: %w", err)
	}

	// Calculate the date when person turns 65
	birthYear := person.DateOfBirth.Year()
	age65Date := time.Date(birthYear+65, person.DateOfBirth.Month(), person.DateOfBirth.Day(), 0, 0, 0, 0, time.UTC)

	// Map gender for payout calculation
	var gender payout.Gender
	if person.Gender == "female" {
		gender = payout.GenderFemale
	} else {
		gender = payout.GenderMale
	}

	// Build result with current balances
	result := &CPFProjectionResult{
		BirthYear: birthYear,
		Gender:    string(gender),
		Age65Date: age65Date,
		CurrentBalances: BalanceSnapshot{
			OA:       &cpfAccount.OABalance,
			SA:       &cpfAccount.SABalance,
			MA:       &cpfAccount.MABalance,
			RA:       &cpfAccount.RABalance,
			AsOfDate: cpfAccount.StartDate,
		},
	}

	// Check if person is already 65 or older
	now := time.Now()
	if age65Date.Before(now) || age65Date.Equal(now) {
		// Person is already 65+, use current RA balance
		result.ProjectedBalances = BalanceSnapshot{
			OA:       &cpfAccount.OABalance,
			SA:       &cpfAccount.SABalance,
			MA:       &cpfAccount.MABalance,
			RA:       &cpfAccount.RABalance,
			AsOfDate: now,
		}
	} else {
		// For future projections, use current balances as projected (simplified)
		// Full projector integration can be added later
		result.ProjectedBalances = BalanceSnapshot{
			OA:       &cpfAccount.OABalance,
			SA:       &cpfAccount.SABalance,
			MA:       &cpfAccount.MABalance,
			RA:       &cpfAccount.RABalance,
			AsOfDate: age65Date,
		}
	}

	// Calculate CPF LIFE estimates with RA balance
	raBalance := &cpfAccount.RABalance
	estimates, err := payout.CalculateAllPlans(birthYear, gender, raBalance, payoutStartAge)
	if err != nil {
		// Don't fail the request, just omit LIFE estimates
		return result, nil
	}

	result.CPFLifeEstimates = &CPFLifeEstimateResult{
		RABalanceAt65:  raBalance,
		PayoutStartAge: payoutStartAge,
		BirthYear:      birthYear,
		Gender:         string(gender),
		Standard: PlanEstimate{
			MonthlyPayout:  estimates.Standard.MonthlyPayout,
			AnnualPayout:   estimates.Standard.AnnualPayout,
			PayoutRate:     estimates.Standard.PayoutRate,
			BequestAtAge75: estimates.Standard.BequestAtAge75,
			BequestAtAge85: estimates.Standard.BequestAtAge85,
			BequestAtAge95: estimates.Standard.BequestAtAge95,
		},
		Basic: PlanEstimate{
			MonthlyPayout:  estimates.Basic.MonthlyPayout,
			AnnualPayout:   estimates.Basic.AnnualPayout,
			PayoutRate:     estimates.Basic.PayoutRate,
			BequestAtAge75: estimates.Basic.BequestAtAge75,
			BequestAtAge85: estimates.Basic.BequestAtAge85,
			BequestAtAge95: estimates.Basic.BequestAtAge95,
		},
		Escalating: EscalatingPlanEstimate{
			MonthlyPayout:  estimates.Escalating.MonthlyPayout,
			AnnualPayout:   estimates.Escalating.AnnualPayout,
			PayoutRate:     estimates.Escalating.PayoutRate,
			PayoutAt75:     estimates.Escalating.PayoutAt75,
			PayoutAt85:     estimates.Escalating.PayoutAt85,
			BequestAtAge75: estimates.Escalating.BequestAtAge75,
			BequestAtAge85: estimates.Escalating.BequestAtAge85,
			BequestAtAge95: estimates.Escalating.BequestAtAge95,
		},
		Disclaimer: estimates.Disclaimer,
	}

	return result, nil
}

// =============================================================================
// CPF Housing Usage (derived from Property Scenarios)
// =============================================================================

// HousingUsageDownPayment represents the down payment breakdown
type HousingUsageDownPayment struct {
	OAUsed        *decimal.Decimal
	CashUsed      *decimal.Decimal
	GrantReceived *decimal.Decimal
	GrantType     *string
}

// HousingUsageMonthlyPayment represents a single monthly payment record
type HousingUsageMonthlyPayment struct {
	Month            string
	OAUsed           *decimal.Decimal
	CashUsed         *decimal.Decimal
	PrincipalPortion *decimal.Decimal
	InterestPortion  *decimal.Decimal
}

// HousingUsageTotals represents aggregated totals
type HousingUsageTotals struct {
	TotalOAUsed          *decimal.Decimal
	TotalCashUsed        *decimal.Decimal
	OAForDownPayment     *decimal.Decimal
	OAForMonthlyPayments *decimal.Decimal
}

// YearlyAccruedInterest represents accrued interest for one year
type YearlyAccruedInterest struct {
	Year               int
	StartingPrincipal  *decimal.Decimal
	InterestForYear    *decimal.Decimal
	CumulativeInterest *decimal.Decimal
}

// AccruedInterestSchedule represents the full accrued interest breakdown
type AccruedInterestSchedule struct {
	AsOfDate        time.Time
	TotalAccrued    *decimal.Decimal
	YearlyBreakdown []YearlyAccruedInterest
}

// HousingUsageResult is the computed CPF housing usage from a property scenario
type HousingUsageResult struct {
	PropertyScenarioID string
	DownPayment        HousingUsageDownPayment
	MonthlyPayments    []HousingUsageMonthlyPayment
	Totals             HousingUsageTotals
	AccruedInterest    AccruedInterestSchedule
}

// CPFRefundRequired represents the CPF refund details for property sale
type CPFRefundRequired struct {
	PrincipalUsed   *decimal.Decimal
	AccruedInterest *decimal.Decimal
	TotalRefund     *decimal.Decimal
}

// RefundDestination represents where the CPF refund goes
type RefundDestination struct {
	ToOA   *decimal.Decimal
	ToRA   *decimal.Decimal
	Reason string
}

// PropertySaleAnalysis represents the sale analysis for a property
type PropertySaleAnalysis struct {
	SaleDate          string
	GrossProceeds     *decimal.Decimal
	OutstandingLoan   *decimal.Decimal
	SellingCosts      *decimal.Decimal
	CpfRefundRequired CPFRefundRequired
	RefundDestination RefundDestination
	NetCashProceeds   *decimal.Decimal
	Warnings          []string
}

// HousingUsageFullResult includes both usage and sale analysis
type HousingUsageFullResult struct {
	Usage        *HousingUsageResult
	SaleAnalysis *PropertySaleAnalysis
}

// ComputeHousingUsage computes CPF housing usage from a property scenario.
// This is the main entry point for the housing usage calculation.
func (s *Service) ComputeHousingUsage(ctx context.Context, userID, scenarioID string) (*HousingUsageFullResult, error) {
	// Get the property scenario (includes PropertySG and Grants)
	scenarioFull, err := s.store.GetPropertyScenario(ctx, userID, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("get property scenario: %w", err)
	}
	if scenarioFull == nil {
		return nil, repo.ErrNotFound
	}

	// PropertySG is required for CPF housing usage
	if scenarioFull.PropertySG == nil {
		return nil, repo.ErrNotFound
	}

	// Calculate CPF housing usage
	usage := s.computeUsageFromScenario(scenarioFull)

	// Calculate sale analysis if sale date is set
	var saleAnalysis *PropertySaleAnalysis
	if scenarioFull.PropertySG.SaleExpectedDate != nil && *scenarioFull.PropertySG.SaleExpectedDate != "" {
		saleAnalysis = s.computeSaleAnalysis(scenarioFull.PropertySG, usage)
	}

	return &HousingUsageFullResult{
		Usage:        usage,
		SaleAnalysis: saleAnalysis,
	}, nil
}

// computeUsageFromScenario derives CPF housing usage from property scenario data
func (s *Service) computeUsageFromScenario(scenarioFull *repo.PropertyScenarioFull) *HousingUsageResult {
	propertySG := scenarioFull.PropertySG
	grants := scenarioFull.Grants

	// Down payment CPF OA (both borrowers)
	b1DownpaymentOA := propertySG.Borrower1DownpaymentCpfOa
	b2DownpaymentOA := propertySG.Borrower2DownpaymentCpfOa
	oaForDownPayment := b1DownpaymentOA.Add(&b2DownpaymentOA)

	// Down payment cash (both borrowers)
	b1DownpaymentCash := propertySG.Borrower1DownpaymentCashAmount
	b2DownpaymentCash := propertySG.Borrower2DownpaymentCashAmount
	downpaymentCash := b1DownpaymentCash.Add(&b2DownpaymentCash)
	// Fall back to legacy field if per-borrower not set
	if downpaymentCash.IsZero() && !propertySG.DownpaymentCash.IsZero() {
		downpaymentCash = &propertySG.DownpaymentCash
	}

	// Total grants
	totalGrants := decimal.Zero()
	var primaryGrantType *string
	for i, grant := range grants {
		totalGrants = totalGrants.Add(&grant.Amount)
		if i == 0 {
			// Determine grant type from name
			grantType := determineGrantType(grant.Name)
			if grantType != "" {
				primaryGrantType = &grantType
			}
		}
	}

	// Monthly CPF OA (both borrowers)
	b1MonthlyCpfOa := propertySG.Borrower1MonthlyCpfOa
	b2MonthlyCpfOa := propertySG.Borrower2MonthlyCpfOa
	monthlyOAUsed := b1MonthlyCpfOa.Add(&b2MonthlyCpfOa)

	// Monthly cash (both borrowers)
	b1MonthlyCash := propertySG.Borrower1MonthlyCashAmount
	b2MonthlyCash := propertySG.Borrower2MonthlyCashAmount
	monthlyCashUsed := b1MonthlyCash.Add(&b2MonthlyCash)

	// Determine start date (BTO key collection or created date)
	startDate := propertySG.CreatedAt
	if propertySG.BtoKeyCollectionDate != nil && *propertySG.BtoKeyCollectionDate != "" {
		// Parse BtoKeyCollectionDate string (YYYY-MM format)
		if parsedDate, err := time.Parse("2006-01", *propertySG.BtoKeyCollectionDate); err == nil {
			startDate = parsedDate
		}
	}
	asOfDate := time.Now()

	// Calculate months since start
	monthsSinceStart := (asOfDate.Year()-startDate.Year())*12 + int(asOfDate.Month()) - int(startDate.Month())
	if monthsSinceStart < 0 {
		monthsSinceStart = 0
	}

	// Generate monthly payments (up to current date, max 360 months)
	const maxMonths = 360
	if monthsSinceStart > maxMonths {
		monthsSinceStart = maxMonths
	}

	monthlyPayments := make([]HousingUsageMonthlyPayment, 0, monthsSinceStart)
	for i := 0; i < monthsSinceStart; i++ {
		paymentDate := startDate.AddDate(0, i, 0)
		month := paymentDate.Format("2006-01")

		// Simple approximation for principal/interest split
		// In production, this would come from amortization schedule
		totalMonthly := monthlyOAUsed.Add(monthlyCashUsed)
		interestPortion := totalMonthly.Mul(decimal.MustFromString("0.3"))
		principalPortion := totalMonthly.Sub(interestPortion)

		monthlyPayments = append(monthlyPayments, HousingUsageMonthlyPayment{
			Month:            month,
			OAUsed:           monthlyOAUsed,
			CashUsed:         monthlyCashUsed,
			PrincipalPortion: principalPortion,
			InterestPortion:  interestPortion,
		})
	}

	// Calculate totals
	monthsDecimal := decimal.MustFromString(fmt.Sprintf("%d", monthsSinceStart))
	oaForMonthlyPayments := monthlyOAUsed.Mul(monthsDecimal)
	cashForMonthlyPayments := monthlyCashUsed.Mul(monthsDecimal)
	totalOAUsed := oaForDownPayment.Add(oaForMonthlyPayments)
	totalCashUsed := downpaymentCash.Add(cashForMonthlyPayments)

	// Calculate accrued interest (2.5% p.a. compounded yearly)
	accruedInterest := calculateAccruedInterestSchedule(totalOAUsed, startDate, asOfDate)

	return &HousingUsageResult{
		PropertyScenarioID: scenarioFull.Scenario.ID,
		DownPayment: HousingUsageDownPayment{
			OAUsed:        oaForDownPayment,
			CashUsed:      downpaymentCash,
			GrantReceived: totalGrants,
			GrantType:     primaryGrantType,
		},
		MonthlyPayments: monthlyPayments,
		Totals: HousingUsageTotals{
			TotalOAUsed:          totalOAUsed,
			TotalCashUsed:        totalCashUsed,
			OAForDownPayment:     oaForDownPayment,
			OAForMonthlyPayments: oaForMonthlyPayments,
		},
		AccruedInterest: *accruedInterest,
	}
}

// calculateAccruedInterestSchedule computes yearly accrued interest at 2.5% p.a.
func calculateAccruedInterestSchedule(
	totalOAUsed *decimal.Decimal,
	startDate time.Time,
	asOfDate time.Time,
) *AccruedInterestSchedule {
	rate := decimal.MustFromString("0.025") // 2.5% p.a.
	startYear := startDate.Year()
	endYear := asOfDate.Year()

	yearlyBreakdown := make([]YearlyAccruedInterest, 0, endYear-startYear+1)
	cumulativePrincipal := totalOAUsed
	cumulativeInterest := decimal.Zero()

	for year := startYear; year <= endYear; year++ {
		startingPrincipal := cumulativePrincipal
		interestForYear := startingPrincipal.Mul(rate)
		cumulativeInterest = cumulativeInterest.Add(interestForYear)

		yearlyBreakdown = append(yearlyBreakdown, YearlyAccruedInterest{
			Year:               year,
			StartingPrincipal:  startingPrincipal,
			InterestForYear:    interestForYear,
			CumulativeInterest: cumulativeInterest,
		})

		// Compound: add interest to principal for next year
		cumulativePrincipal = startingPrincipal.Add(interestForYear)
	}

	return &AccruedInterestSchedule{
		AsOfDate:        asOfDate,
		TotalAccrued:    cumulativeInterest,
		YearlyBreakdown: yearlyBreakdown,
	}
}

// computeSaleAnalysis computes sale analysis for a property
func (s *Service) computeSaleAnalysis(
	propertySG *repo.PropertySG,
	usage *HousingUsageResult,
) *PropertySaleAnalysis {
	if propertySG.SaleExpectedDate == nil || *propertySG.SaleExpectedDate == "" {
		return nil
	}

	salePrice := propertySG.SaleExpectedPrice
	if salePrice == nil || salePrice.IsZero() {
		return nil
	}

	// Get totals from usage
	totalOAUsed := usage.Totals.TotalOAUsed
	totalAccrued := usage.AccruedInterest.TotalAccrued

	// Estimate outstanding loan (rough: 70% of original loan)
	// In production, this would use actual amortization
	outstandingLoan := propertySG.PropertyPrice.Mul(decimal.MustFromString("0.56")) // ~80% LTV * 70% remaining

	// Selling costs ~2%
	sellingCosts := salePrice.Mul(decimal.MustFromString("0.02"))

	// CPF refund
	totalRefund := totalOAUsed.Add(totalAccrued)

	// Net proceeds
	netProceeds := salePrice.Sub(outstandingLoan).Sub(sellingCosts).Sub(totalRefund)

	warnings := []string{}
	if netProceeds.IsNegative() {
		warnings = append(warnings, "Sale proceeds may be insufficient to cover CPF refund")
	}

	return &PropertySaleAnalysis{
		SaleDate:        *propertySG.SaleExpectedDate,
		GrossProceeds:   salePrice,
		OutstandingLoan: outstandingLoan,
		SellingCosts:    sellingCosts,
		CpfRefundRequired: CPFRefundRequired{
			PrincipalUsed:   totalOAUsed,
			AccruedInterest: totalAccrued,
			TotalRefund:     totalRefund,
		},
		RefundDestination: RefundDestination{
			ToOA:   totalRefund,
			ToRA:   decimal.Zero(),
			Reason: "Refund destination depends on member age at sale",
		},
		NetCashProceeds: netProceeds,
		Warnings:        warnings,
	}
}

// determineGrantType returns the grant type from a grant name
func determineGrantType(name string) string {
	upperName := strings.ToUpper(name)
	switch {
	case strings.Contains(upperName, "EHG") || strings.Contains(upperName, "ENHANCED"):
		return "EHG"
	case strings.Contains(upperName, "FHG") || strings.Contains(upperName, "FAMILY"):
		return "FHG"
	case strings.Contains(upperName, "PHG") || strings.Contains(upperName, "PROXIMITY"):
		return "PHG"
	case strings.Contains(upperName, "STEP"):
		return "STEP_UP"
	default:
		return ""
	}
}
