package cpf

import (
	"context"
	"fmt"
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
type UpdateInput struct {
	ID               string
	PersonID         string // Required FK to persons table
	OABalance        decimal.Decimal
	SABalance        decimal.Decimal
	MABalance        decimal.Decimal
	RABalance        decimal.Decimal
	OAUsedForHousing decimal.Decimal
	HousingStartDate *time.Time
	StartDate        *time.Time // Only for versioned updates
	UpdateMode       string
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
func inputToAccount(id string, input UpdateInput) repo.CPFAccount {
	return repo.CPFAccount{
		ID:               id,
		PersonID:         input.PersonID,
		OABalance:        input.OABalance,
		SABalance:        input.SABalance,
		MABalance:        input.MABalance,
		RABalance:        input.RABalance,
		OAUsedForHousing: input.OAUsedForHousing,
		HousingStartDate: input.HousingStartDate,
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
	RABalanceAt65   *decimal.Decimal
	PayoutStartAge  int
	BirthYear       int
	Gender          string
	Standard        PlanEstimate
	Basic           PlanEstimate
	Escalating      EscalatingPlanEstimate
	ConfidenceLevel string
	Disclaimer      string
}

// PlanEstimate contains estimate details for a standard or basic plan.
type PlanEstimate struct {
	MonthlyPayout *decimal.Decimal
	AnnualPayout  *decimal.Decimal
	PayoutRate    *decimal.Decimal
}

// EscalatingPlanEstimate contains estimate details for the escalating plan.
type EscalatingPlanEstimate struct {
	MonthlyPayout *decimal.Decimal
	AnnualPayout  *decimal.Decimal
	PayoutRate    *decimal.Decimal
	PayoutAt75    *decimal.Decimal
	PayoutAt85    *decimal.Decimal
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
			MonthlyPayout: estimates.Standard.MonthlyPayout,
			AnnualPayout:  estimates.Standard.AnnualPayout,
			PayoutRate:    estimates.Standard.PayoutRate,
		},
		Basic: PlanEstimate{
			MonthlyPayout: estimates.Basic.MonthlyPayout,
			AnnualPayout:  estimates.Basic.AnnualPayout,
			PayoutRate:    estimates.Basic.PayoutRate,
		},
		Escalating: EscalatingPlanEstimate{
			MonthlyPayout: estimates.Escalating.MonthlyPayout,
			AnnualPayout:  estimates.Escalating.AnnualPayout,
			PayoutRate:    estimates.Escalating.PayoutRate,
			PayoutAt75:    estimates.Escalating.PayoutAt75,
			PayoutAt85:    estimates.Escalating.PayoutAt85,
		},
		ConfidenceLevel: string(estimates.ConfidenceLevel),
		Disclaimer:      estimates.Disclaimer,
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
			MonthlyPayout: estimates.Standard.MonthlyPayout,
			AnnualPayout:  estimates.Standard.AnnualPayout,
			PayoutRate:    estimates.Standard.PayoutRate,
		},
		Basic: PlanEstimate{
			MonthlyPayout: estimates.Basic.MonthlyPayout,
			AnnualPayout:  estimates.Basic.AnnualPayout,
			PayoutRate:    estimates.Basic.PayoutRate,
		},
		Escalating: EscalatingPlanEstimate{
			MonthlyPayout: estimates.Escalating.MonthlyPayout,
			AnnualPayout:  estimates.Escalating.AnnualPayout,
			PayoutRate:    estimates.Escalating.PayoutRate,
			PayoutAt75:    estimates.Escalating.PayoutAt75,
			PayoutAt85:    estimates.Escalating.PayoutAt85,
		},
		ConfidenceLevel: string(estimates.ConfidenceLevel),
		Disclaimer:      estimates.Disclaimer,
	}

	return result, nil
}
