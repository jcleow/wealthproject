package investment

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for investment versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// UpdateInput contains the parameters for updating an investment.
// Uses decimal.Decimal for financial values to avoid precision loss.
type UpdateInput struct {
	ID             string
	Name           string
	Category       string
	CurrentValue   decimal.Decimal
	GrowthRate     *decimal.Decimal
	GrowthStrategy string
	Notes          string
	StartDate      *time.Time
	UpdateMode     string
}

// Service handles investment business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new investment service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned investment updates
func (s *Service) Update(ctx context.Context, userID, investmentID string, input UpdateInput) (*repo.Investment, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, investmentID, input)
	}
	return s.inPlaceUpdate(ctx, userID, investmentID, input)
}

// Stop stops an investment and cascades to linked income allocations
func (s *Service) Stop(ctx context.Context, userID, investmentID string, endDate time.Time) (*repo.Investment, error) {
	// 1. Stop all income allocations targeting this investment
	if err := s.store.StopAllocationsByInvestment(ctx, userID, investmentID, endDate); err != nil {
		return nil, err
	}

	// 2. Stop the investment itself
	return s.store.StopInvestment(ctx, userID, investmentID, endDate)
}

// versionedUpdate stops the current investment and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, investmentID string, input UpdateInput) (*repo.Investment, error) {
	// 1. Get the current investment to copy fields
	current, err := s.store.GetInvestment(ctx, userID, investmentID)
	if err != nil {
		return nil, err
	}

	// 2. Set end_date on current investment (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopInvestment(ctx, userID, investmentID, endDate); err != nil {
		return nil, err
	}

	// 3. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindInvestmentByParentAndStartDate(ctx, userID, investmentID, *input.StartDate)
	if existing != nil {
		return s.updateExistingVersion(ctx, userID, existing, input)
	}

	// 4. Create new version
	return s.createNewVersion(ctx, userID, investmentID, current, input)
}

// updateExistingVersion updates an existing versioned investment
func (s *Service) updateExistingVersion(ctx context.Context, userID string, existing *repo.Investment, input UpdateInput) (*repo.Investment, error) {
	existing.Name = input.Name
	existing.Category = input.Category
	existing.CurrentValue = input.CurrentValue
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy

	if input.GrowthRate != nil {
		existing.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateInvestment(ctx, userID, *existing)
}

// createNewVersion creates a new versioned investment
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.Investment, input UpdateInput) (*repo.Investment, error) {
	newInvestment := repo.Investment{
		ParentID:       parentID,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   input.CurrentValue,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
		StartDate:      *input.StartDate,
	}

	if input.GrowthRate != nil {
		newInvestment.GrowthRate = *input.GrowthRate
	} else {
		newInvestment.GrowthRate = current.GrowthRate
	}

	created, err := s.store.CreateInvestment(ctx, userID, newInvestment)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the investment
func (s *Service) inPlaceUpdate(ctx context.Context, userID, investmentID string, input UpdateInput) (*repo.Investment, error) {
	inv := repo.Investment{
		ID:             investmentID,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   input.CurrentValue,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
	}

	if input.GrowthRate != nil {
		inv.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateInvestment(ctx, userID, inv)
}
