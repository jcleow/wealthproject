package cpf

import (
	"context"
	"time"

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
type UpdateInput struct {
	ID               string
	Earner           string
	PersonID         string // Required FK to persons table
	OABalance        decimal.Decimal
	SABalance        decimal.Decimal
	MABalance        decimal.Decimal
	RABalance        decimal.Decimal
	OAUsedForHousing decimal.Decimal
	HousingStartDate *time.Time
	DateOfBirth      time.Time
	ResidencyStatus  string
	PRGrantDate      *time.Time
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
func inputToAccount(id string, input UpdateInput) repo.CPFAccount {
	return repo.CPFAccount{
		ID:               id,
		Earner:           input.Earner,
		PersonID:         input.PersonID,
		OABalance:        input.OABalance,
		SABalance:        input.SABalance,
		MABalance:        input.MABalance,
		RABalance:        input.RABalance,
		OAUsedForHousing: input.OAUsedForHousing,
		HousingStartDate: input.HousingStartDate,
		DateOfBirth:      input.DateOfBirth,
		ResidencyStatus:  input.ResidencyStatus,
		PRGrantDate:      input.PRGrantDate,
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
