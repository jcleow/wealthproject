package expense

import (
	"context"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for expense versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// =============================================================================
// Types
// =============================================================================

// UpdateInput contains the parameters for updating an expense
type UpdateInput struct {
	ID                string
	Payee             string
	Amount            float64
	Frequency         string
	Category          string
	Notes             string
	GrowthRate        *float64
	GrowthStrategy    string
	SourceLiabilityID *string
	StartDate         *time.Time
	UpdateMode        string
}

// Service handles expense business logic
type Service struct {
	store *repo.Store
}

// NewService creates a new expense service
func NewService(store *repo.Store) *Service {
	return &Service{store: store}
}

// =============================================================================
// Public Methods
// =============================================================================

// Update handles both in-place and versioned expense updates
func (s *Service) Update(ctx context.Context, userID, expenseID string, input UpdateInput) (*repo.Expense, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, expenseID, input)
	}
	return s.inPlaceUpdate(ctx, userID, expenseID, input)
}

// =============================================================================
// Private Methods
// =============================================================================

// versionedUpdate stops the current expense and creates a new version
func (s *Service) versionedUpdate(ctx context.Context, userID, expenseID string, input UpdateInput) (*repo.Expense, error) {
	// 1. Get the current expense to copy fields
	current, err := s.store.GetExpense(ctx, userID, expenseID)
	if err != nil {
		return nil, err
	}

	// 2. Set end_date on current expense (day before new startDate)
	endDate := input.StartDate.AddDate(0, 0, -1)
	if _, err := s.store.StopExpense(ctx, userID, expenseID, endDate); err != nil {
		return nil, err
	}

	// 3. Check if version with this startDate already exists (upsert)
	existing, _ := s.store.FindExpenseByParentAndStartDate(ctx, userID, expenseID, *input.StartDate)
	if existing != nil {
		return s.updateExistingVersion(ctx, userID, existing, input)
	}

	// 4. Create new version
	return s.createNewVersion(ctx, userID, expenseID, current, input)
}

// updateExistingVersion updates an existing versioned expense
func (s *Service) updateExistingVersion(ctx context.Context, userID string, existing *repo.Expense, input UpdateInput) (*repo.Expense, error) {
	existing.Payee = input.Payee
	existing.Amount = *decimal.MustFromFloat64(input.Amount)
	existing.Frequency = input.Frequency
	existing.Category = input.Category
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy
	existing.SourceLiabilityID = input.SourceLiabilityID

	if input.GrowthRate != nil {
		existing.GrowthRate = *decimal.MustFromFloat64(*input.GrowthRate)
	}

	return s.store.UpdateExpense(ctx, userID, *existing)
}

// createNewVersion creates a new versioned expense
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.Expense, input UpdateInput) (*repo.Expense, error) {
	newExp := repo.Expense{
		ParentID:          parentID,
		Payee:             input.Payee,
		Amount:            *decimal.MustFromFloat64(input.Amount),
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
		StartDate:         *input.StartDate,
	}

	if input.GrowthRate != nil {
		newExp.GrowthRate = *decimal.MustFromFloat64(*input.GrowthRate)
	}

	// Preserve source liability ID from current if not provided
	if newExp.SourceLiabilityID == nil && current.SourceLiabilityID != nil {
		newExp.SourceLiabilityID = current.SourceLiabilityID
	}

	created, err := s.store.CreateExpense(ctx, userID, newExp)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// inPlaceUpdate performs a direct update on the expense
func (s *Service) inPlaceUpdate(ctx context.Context, userID, expenseID string, input UpdateInput) (*repo.Expense, error) {
	exp := repo.Expense{
		ID:                expenseID,
		Payee:             input.Payee,
		Amount:            *decimal.MustFromFloat64(input.Amount),
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
	}

	if input.GrowthRate != nil {
		exp.GrowthRate = *decimal.MustFromFloat64(*input.GrowthRate)
	}

	return s.store.UpdateExpense(ctx, userID, exp)
}
