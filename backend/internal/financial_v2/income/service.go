package income

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for income versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// UpdateInput contains the parameters for updating an income.
// Uses decimal.Decimal for financial values to avoid precision loss.
type UpdateInput struct {
	ID             string
	Name           string
	PersonID       string // Required FK to persons table
	Category       string
	Amount         decimal.Decimal
	Frequency      string
	GrowthRate     *decimal.Decimal
	GrowthStrategy string
	Notes          string
	StartDate      *time.Time
	UpdateMode     string
}

// Service handles income business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new income service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// Update handles both in-place and versioned income updates
func (s *Service) Update(ctx context.Context, userID, incomeID string, input UpdateInput) (*repo.Income, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, incomeID, input)
	}
	return s.inPlaceUpdate(ctx, userID, incomeID, input)
}

// versionedUpdate stops the current income and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, incomeID string, input UpdateInput) (*repo.Income, error) {
	// 1. Get the current income to copy fields
	current, err := s.store.GetIncome(ctx, userID, incomeID)
	if err != nil {
		return nil, err
	}

	// 2. Set end_date on current income (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopIncome(ctx, userID, incomeID, endDate); err != nil {
		return nil, err
	}

	// 3. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindIncomeByParentAndStartDate(ctx, userID, incomeID, *input.StartDate)
	if existing != nil {
		return s.updateExistingVersion(ctx, userID, existing, input)
	}

	// 4. Create new version
	return s.createNewVersion(ctx, userID, incomeID, current, input)
}

// updateExistingVersion updates an existing versioned income
func (s *Service) updateExistingVersion(ctx context.Context, userID string, existing *repo.Income, input UpdateInput) (*repo.Income, error) {
	existing.Name = input.Name
	existing.PersonID = input.PersonID
	existing.Category = input.Category
	existing.Amount = input.Amount
	existing.Frequency = input.Frequency
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy

	if input.GrowthRate != nil {
		existing.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateIncome(ctx, userID, *existing)
}

// createNewVersion creates a new versioned income
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.Income, input UpdateInput) (*repo.Income, error) {
	// Use input.PersonID if provided, otherwise preserve current
	personID := input.PersonID
	if personID == "" {
		personID = current.PersonID
	}

	newIncome := repo.Income{
		ParentID:       parentID,
		Name:           input.Name,
		PersonID:       personID,
		Category:       input.Category,
		Amount:         input.Amount,
		Frequency:      input.Frequency,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
		StartDate:      *input.StartDate,
		// Preserve CPF fields
		IncomeType:  current.IncomeType,
		CPFWageType: current.CPFWageType,
	}

	if input.GrowthRate != nil {
		newIncome.GrowthRate = *input.GrowthRate
	} else {
		newIncome.GrowthRate = current.GrowthRate
	}

	created, err := s.store.CreateIncome(ctx, userID, newIncome)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the income
func (s *Service) inPlaceUpdate(ctx context.Context, userID, incomeID string, input UpdateInput) (*repo.Income, error) {
	inc := repo.Income{
		ID:             incomeID,
		Name:           input.Name,
		PersonID:       input.PersonID,
		Category:       input.Category,
		Amount:         input.Amount,
		Frequency:      input.Frequency,
		Notes:          input.Notes,
		GrowthStrategy: input.GrowthStrategy,
	}

	if input.GrowthRate != nil {
		inc.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateIncome(ctx, userID, inc)
}
