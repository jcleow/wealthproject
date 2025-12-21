package expense

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for expense versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
)

// Default values for expense creation
const (
	DefaultGrowthRate = 2.0
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

// CreateInput contains the parameters for creating an expense.
// Uses decimal.Decimal for financial values to avoid precision loss.
type CreateInput struct {
	Name             string
	Amount            decimal.Decimal
	Frequency         string
	Category          string
	Notes             string
	GrowthRate        *decimal.Decimal
	GrowthStrategy    string
	SourceLiabilityID *string
	StartDate         *time.Time
	EndDate           *time.Time
	ParentID          *string
}

// CreateParams is the raw input (strings) used by HTTP handlers.
type CreateParams struct {
	Name             string
	Amount            string
	Frequency         string
	Category          string
	Notes             string
	GrowthRate        *string
	GrowthStrategy    string
	SourceLiabilityID *string
	StartDate         *string
	EndDate           *string
	ParentID          *string
}

// UpdateInput contains the parameters for updating an expense.
// Uses decimal.Decimal for financial values to avoid precision loss.
type UpdateInput struct {
	ID                string
	Name             string
	Amount            decimal.Decimal
	Frequency         string
	Category          string
	Notes             string
	GrowthRate        *decimal.Decimal
	GrowthStrategy    string
	SourceLiabilityID *string
	StartDate         *time.Time
	UpdateMode        string
}

// UpdateParams is the raw input (strings) used by HTTP handlers.
type UpdateParams struct {
	Name             string
	Amount            string
	Frequency         string
	Category          string
	Notes             string
	GrowthRate        *string
	GrowthStrategy    string
	SourceLiabilityID *string
	StartDate         *string
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

// Create creates a new expense with default values applied
func (s *Service) Create(ctx context.Context, userID string, input CreateInput) (*repo.Expense, error) {
	exp := repo.Expense{
		Name:             input.Name,
		Amount:            input.Amount,
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
	}

	// Set ParentID if provided (for versioned creates)
	if input.ParentID != nil {
		exp.ParentID = *input.ParentID
	}

	// Apply default or provided growth rate
	if input.GrowthRate != nil {
		exp.GrowthRate = *input.GrowthRate
	} else {
		exp.GrowthRate = *decimal.MustFromFloat64(DefaultGrowthRate)
	}

	// Apply default or provided start date
	if input.StartDate != nil {
		exp.StartDate = *input.StartDate
	} else {
		exp.StartDate = time.Now().UTC()
	}

	// Set end date if provided
	if input.EndDate != nil {
		exp.EndDate = input.EndDate
	}

	created, err := s.store.CreateExpense(ctx, userID, exp)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// CreateFromParams validates and converts raw params then delegates to Create.
func (s *Service) CreateFromParams(ctx context.Context, userID string, params CreateParams) (*repo.Expense, error) {
	input, err := buildCreateInput(params)
	if err != nil {
		return nil, err
	}
	return s.Create(ctx, userID, input)
}

// Update handles both in-place and versioned expense updates
func (s *Service) Update(ctx context.Context, userID, expenseID string, input UpdateInput) (*repo.Expense, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, expenseID, input)
	}
	return s.inPlaceUpdate(ctx, userID, expenseID, input)
}

// UpdateFromParams validates and converts raw params then delegates to Update.
func (s *Service) UpdateFromParams(ctx context.Context, userID, expenseID string, params UpdateParams) (*repo.Expense, error) {
	input, err := buildUpdateInput(expenseID, params)
	if err != nil {
		return nil, err
	}
	return s.Update(ctx, userID, expenseID, input)
}

// =============================================================================
// Private Methods
// =============================================================================

func buildCreateInput(params CreateParams) (CreateInput, error) {
	if err := requireFields(map[string]string{
		"name":     params.Name,
		"amount":    params.Amount,
		"frequency": params.Frequency,
		"category":  params.Category,
	}); err != nil {
		return CreateInput{}, err
	}

	amount, err := parseDecimalField("amount", params.Amount)
	if err != nil {
		return CreateInput{}, err
	}
	growthRate, err := parseOptionalDecimal("growthRate", params.GrowthRate)
	if err != nil {
		return CreateInput{}, err
	}

	startDate, err := parseRFC3339Pointer(params.StartDate)
	if err != nil {
		return CreateInput{}, ValidationError{Message: fmt.Sprintf("invalid startDate: %v", err)}
	}

	endDate, err := parseRFC3339Pointer(params.EndDate)
	if err != nil {
		return CreateInput{}, ValidationError{Message: fmt.Sprintf("invalid endDate: %v", err)}
	}

	return CreateInput{
		Name:             params.Name,
		Amount:            *amount,
		Frequency:         params.Frequency,
		Category:          params.Category,
		Notes:             params.Notes,
		GrowthRate:        growthRate,
		GrowthStrategy:    params.GrowthStrategy,
		SourceLiabilityID: params.SourceLiabilityID,
		StartDate:         startDate,
		EndDate:           endDate,
		ParentID:          params.ParentID,
	}, nil
}

func buildUpdateInput(expenseID string, params UpdateParams) (UpdateInput, error) {
	if err := requireFields(map[string]string{
		"name":     params.Name,
		"amount":    params.Amount,
		"frequency": params.Frequency,
		"category":  params.Category,
	}); err != nil {
		return UpdateInput{}, err
	}

	amount, err := parseDecimalField("amount", params.Amount)
	if err != nil {
		return UpdateInput{}, err
	}
	growthRate, err := parseOptionalDecimal("growthRate", params.GrowthRate)
	if err != nil {
		return UpdateInput{}, err
	}

	startDate, err := parseRFC3339Pointer(params.StartDate)
	if err != nil {
		return UpdateInput{}, ValidationError{Message: fmt.Sprintf("invalid startDate: %v", err)}
	}

	return UpdateInput{
		ID:                expenseID,
		Name:             params.Name,
		Amount:            *amount,
		Frequency:         params.Frequency,
		Category:          params.Category,
		Notes:             params.Notes,
		GrowthRate:        growthRate,
		GrowthStrategy:    params.GrowthStrategy,
		SourceLiabilityID: params.SourceLiabilityID,
		StartDate:         startDate,
		UpdateMode:        params.UpdateMode,
	}, nil
}

func parseRFC3339Pointer(value *string) (*time.Time, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, *value)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func parseDecimalField(field, value string) (*decimal.Decimal, error) {
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
	return parseDecimalField(field, *value)
}

func requireFields(fields map[string]string) error {
	for name, val := range fields {
		if val == "" {
			return ValidationError{Message: fmt.Sprintf("%s is required", name)}
		}
	}
	return nil
}

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
	existing.Name = input.Name
	existing.Amount = input.Amount
	existing.Frequency = input.Frequency
	existing.Category = input.Category
	existing.Notes = input.Notes
	existing.GrowthStrategy = input.GrowthStrategy
	existing.SourceLiabilityID = input.SourceLiabilityID

	if input.GrowthRate != nil {
		existing.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateExpense(ctx, userID, *existing)
}

// createNewVersion creates a new versioned expense
func (s *Service) createNewVersion(ctx context.Context, userID, parentID string, current *repo.Expense, input UpdateInput) (*repo.Expense, error) {
	newExp := repo.Expense{
		ParentID:          parentID,
		Name:             input.Name,
		Amount:            input.Amount,
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
		StartDate:         *input.StartDate,
	}

	if input.GrowthRate != nil {
		newExp.GrowthRate = *input.GrowthRate
	} else {
		newExp.GrowthRate = current.GrowthRate
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
		Name:             input.Name,
		Amount:            input.Amount,
		Frequency:         input.Frequency,
		Category:          input.Category,
		Notes:             input.Notes,
		GrowthStrategy:    input.GrowthStrategy,
		SourceLiabilityID: input.SourceLiabilityID,
	}

	if input.GrowthRate != nil {
		exp.GrowthRate = *input.GrowthRate
	}

	return s.store.UpdateExpense(ctx, userID, exp)
}
