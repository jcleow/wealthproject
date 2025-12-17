package liability

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for liability versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// UpdateInput contains the parameters for updating a liability.
// Uses decimal.Decimal for financial values to avoid precision loss.
type UpdateInput struct {
	ID                string
	Name              string
	Category          string
	CurrentBalance    decimal.Decimal
	InterestRateAPR   *decimal.Decimal
	MinimumPayment    *decimal.Decimal
	GrowthStrategy    string
	RepaymentStrategy string
	Notes             string
	StartDate         *time.Time
	UpdateMode        string
}

// Service handles liability business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new liability service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned liability updates
func (s *Service) Update(ctx context.Context, userID, liabilityID string, input UpdateInput) (*repo.Liability, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, liabilityID, input)
	}
	return s.inPlaceUpdate(ctx, userID, liabilityID, input)
}

// versionedUpdate stops the current liability and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, liabilityID string, input UpdateInput) (*repo.Liability, error) {
	// 1. Get the current liability to copy fields
	current, err := s.store.GetLiability(ctx, userID, liabilityID)
	if err != nil {
		return nil, err
	}

	// 2. Set end_date on current liability (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopLiability(ctx, userID, liabilityID, endDate); err != nil {
		return nil, err
	}

	// 3. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindLiabilityByParentAndStartDate(ctx, userID, liabilityID, *input.StartDate)
	if existing != nil {
		return s.updateExistingVersion(ctx, userID, existing, input)
	}

	// 4. Create new version
	return s.createNewVersion(ctx, userID, liabilityID, current, input)
}

// updateExistingVersion updates an existing versioned liability
func (s *Service) updateExistingVersion(ctx context.Context, userID string, existing *repo.Liability, input UpdateInput) (*repo.Liability, error) {
	existing.Name = input.Name
	existing.Category = input.Category
	existing.CurrentBalance = input.CurrentBalance
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy
	existing.RepaymentStrategy = input.RepaymentStrategy

	if input.InterestRateAPR != nil {
		existing.InterestRateAPR = *input.InterestRateAPR
	}
	if input.MinimumPayment != nil {
		existing.MinimumPayment = *input.MinimumPayment
	}

	return s.store.UpdateLiability(ctx, userID, *existing)
}

// createNewVersion creates a new versioned liability
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.Liability, input UpdateInput) (*repo.Liability, error) {
	newLiability := repo.Liability{
		ParentID:          parentID,
		Name:              input.Name,
		Category:          input.Category,
		CurrentBalance:    input.CurrentBalance,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		RepaymentStrategy: input.RepaymentStrategy,
		StartDate:         *input.StartDate,
	}

	if input.InterestRateAPR != nil {
		newLiability.InterestRateAPR = *input.InterestRateAPR
	} else {
		newLiability.InterestRateAPR = current.InterestRateAPR
	}

	if input.MinimumPayment != nil {
		newLiability.MinimumPayment = *input.MinimumPayment
	} else {
		newLiability.MinimumPayment = current.MinimumPayment
	}

	created, err := s.store.CreateLiability(ctx, userID, newLiability)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the liability
func (s *Service) inPlaceUpdate(ctx context.Context, userID, liabilityID string, input UpdateInput) (*repo.Liability, error) {
	li := repo.Liability{
		ID:                liabilityID,
		Name:              input.Name,
		Category:          input.Category,
		CurrentBalance:    input.CurrentBalance,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		RepaymentStrategy: input.RepaymentStrategy,
	}

	if input.InterestRateAPR != nil {
		li.InterestRateAPR = *input.InterestRateAPR
	}
	if input.MinimumPayment != nil {
		li.MinimumPayment = *input.MinimumPayment
	}

	return s.store.UpdateLiability(ctx, userID, li)
}
