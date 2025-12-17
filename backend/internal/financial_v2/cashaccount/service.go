package cashaccount

import (
	"context"
	"errors"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for cash account versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// ErrCannotDeleteAccumulator is returned when attempting to delete the accumulator account
var ErrCannotDeleteAccumulator = errors.New("cannot delete cash accumulator account")

// UpdateInput contains the parameters for updating a cash account
type UpdateInput struct {
	ID             string
	Name           string
	Balance        float64
	InterestRate   *float64
	BankName       string
	AccountType    string
	Notes          string
	GrowthStrategy string
	StartDate      *time.Time
	UpdateMode     string
}

// Service handles cash account business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new cash account service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned cash account updates
func (s *Service) Update(ctx context.Context, userID, accountID string, input UpdateInput) (*repo.CashAsset, error) {
	// Cash accounts don't support versioning in the same way as other entities
	// (they don't have parent_id), so always use in-place update
	return s.inPlaceUpdate(ctx, userID, accountID, input)
}

// Delete deletes a cash account with validation
func (s *Service) Delete(ctx context.Context, userID, accountID string) error {
	// Check if this is the accumulator account
	account, err := s.store.GetCashAccount(ctx, userID, accountID)
	if err != nil {
		return err
	}

	// Prevent deletion of accumulator account
	if account.IsAccumulator {
		return ErrCannotDeleteAccumulator
	}

	return s.store.DeleteCashAccount(ctx, userID, accountID)
}

// Stop stops a cash account and cascades to linked income allocations
func (s *Service) Stop(ctx context.Context, userID, accountID string, endDate time.Time) (*repo.CashAsset, error) {
	// 1. Stop all income allocations targeting this cash account
	if err := s.store.StopAllocationsByCashAccount(ctx, userID, accountID, endDate); err != nil {
		return nil, err
	}

	// 2. Stop the cash account itself
	return s.store.StopCashAccount(ctx, userID, accountID, endDate)
}

// inPlaceUpdate performs a direct update on the cash account
func (s *Service) inPlaceUpdate(ctx context.Context, userID, accountID string, input UpdateInput) (*repo.CashAsset, error) {
	ca := repo.CashAsset{
		ID:             accountID,
		UserID:         userID,
		Name:           input.Name,
		Balance:        *decimal.MustFromFloat64(input.Balance),
		BankName:       input.BankName,
		AccountType:    input.AccountType,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
	}

	if input.InterestRate != nil {
		ca.InterestRate = *decimal.MustFromFloat64(*input.InterestRate)
	}

	return s.store.UpdateCashAccount(ctx, userID, ca)
}
