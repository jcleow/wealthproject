package asset

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for asset versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// UpdateInput contains the parameters for updating an asset.
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
	EndDate        *time.Time
	TerminalValue  *decimal.Decimal
	UpdateMode     string
}

// Service handles asset business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new asset service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned asset updates
func (s *Service) Update(ctx context.Context, userID, assetID string, input UpdateInput) (*repo.NonCashAsset, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, assetID, input)
	}
	return s.inPlaceUpdate(ctx, userID, assetID, input)
}

// versionedUpdate stops the current asset and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, assetID string, input UpdateInput) (*repo.NonCashAsset, error) {
	// 1. Get the current asset to copy fields
	current, err := s.store.GetNonCashAsset(ctx, userID, assetID)
	if err != nil {
		return nil, err
	}

	// 2. Set end_date on current asset (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopNonCashAsset(ctx, userID, assetID, endDate); err != nil {
		return nil, err
	}

	// 3. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindNonCashAssetByParentAndStartDate(ctx, userID, assetID, *input.StartDate)
	if existing != nil {
		return s.updateExistingVersion(ctx, userID, existing, input)
	}

	// 4. Create new version
	return s.createNewVersion(ctx, userID, assetID, current, input)
}

// updateExistingVersion updates an existing versioned asset
func (s *Service) updateExistingVersion(ctx context.Context, userID string, existing *repo.NonCashAsset, input UpdateInput) (*repo.NonCashAsset, error) {
	existing.Name = input.Name
	existing.Category = input.Category
	existing.CurrentValue = input.CurrentValue
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy
	existing.TerminalValue = input.TerminalValue

	if input.GrowthRate != nil {
		existing.AnnualGrowthRate = *input.GrowthRate
	}
	if input.EndDate != nil {
		existing.EndDate = input.EndDate
	}

	return s.store.UpdateNonCashAsset(ctx, userID, *existing)
}

// createNewVersion creates a new versioned asset
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.NonCashAsset, input UpdateInput) (*repo.NonCashAsset, error) {
	newAsset := repo.NonCashAsset{
		ParentID:       parentID,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   input.CurrentValue,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
		StartDate:      *input.StartDate,
		EndDate:        input.EndDate,
		TerminalValue:  input.TerminalValue,
	}

	if input.GrowthRate != nil {
		newAsset.AnnualGrowthRate = *input.GrowthRate
	} else {
		newAsset.AnnualGrowthRate = current.AnnualGrowthRate
	}

	created, err := s.store.CreateNonCashAsset(ctx, userID, newAsset)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the asset
func (s *Service) inPlaceUpdate(ctx context.Context, userID, assetID string, input UpdateInput) (*repo.NonCashAsset, error) {
	asset := repo.NonCashAsset{
		ID:             assetID,
		Name:           input.Name,
		Category:       input.Category,
		CurrentValue:   input.CurrentValue,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
		EndDate:        input.EndDate,
		TerminalValue:  input.TerminalValue,
	}

	if input.GrowthRate != nil {
		asset.AnnualGrowthRate = *input.GrowthRate
	}

	return s.store.UpdateNonCashAsset(ctx, userID, asset)
}
