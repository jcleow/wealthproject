package liability

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// Update mode constants for liability versioning
const (
	UpdateModeInPlace   = "in_place"
	UpdateModeVersioned = "versioned"
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

// CreateInput contains the parameters for creating a liability.
// Uses decimal.Decimal for financial values to avoid precision loss.
type CreateInput struct {
	Name              string
	Category          string
	CurrentBalance    decimal.Decimal
	InterestRateAPR   *decimal.Decimal
	MinimumPayment    *decimal.Decimal
	GrowthStrategy    string
	RepaymentStrategy string
	Notes             string
	StartDate         *time.Time
	EndDate           *time.Time
}

// CreateParams is the raw input (strings) used by HTTP handlers.
type CreateParams struct {
	Name              string
	Category          string
	CurrentBalance    string
	InterestRateAPR   *string
	MinimumPayment    *string
	GrowthStrategy    string
	RepaymentStrategy string
	Notes             string
	StartDate         *string
	EndDate           *string
}

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

// UpdateParams is the raw input (strings) used by HTTP handlers.
type UpdateParams struct {
	Name              string
	Category          string
	CurrentBalance    string
	InterestRateAPR   *string
	MinimumPayment    *string
	GrowthStrategy    string
	RepaymentStrategy string
	Notes             string
	StartDate         *string
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

// =============================================================================
// Public Methods
// =============================================================================

// Create creates a new liability with default values applied
func (s *Service) Create(ctx context.Context, userID string, input CreateInput) (*repo.Liability, error) {
	li := repo.Liability{
		Name:              input.Name,
		Category:          input.Category,
		CurrentBalance:    input.CurrentBalance,
		GrowthStrategy:    input.GrowthStrategy,
		RepaymentStrategy: input.RepaymentStrategy,
		Notes:             input.Notes,
	}

	// Apply interest rate if provided
	if input.InterestRateAPR != nil {
		li.InterestRateAPR = *input.InterestRateAPR
	}

	// Apply minimum payment if provided
	if input.MinimumPayment != nil {
		li.MinimumPayment = *input.MinimumPayment
	}

	// Apply start date (default to now)
	if input.StartDate != nil {
		li.StartDate = *input.StartDate
	} else {
		li.StartDate = time.Now().UTC()
	}

	// Set end date if provided
	if input.EndDate != nil {
		li.EndDate = input.EndDate
	}

	created, err := s.store.CreateLiability(ctx, userID, li)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

// CreateFromParams validates and converts raw params then delegates to Create.
func (s *Service) CreateFromParams(ctx context.Context, userID string, params CreateParams) (*repo.Liability, error) {
	input, err := buildCreateInput(params)
	if err != nil {
		return nil, err
	}
	return s.Create(ctx, userID, input)
}

// Update handles both in-place and versioned liability updates
func (s *Service) Update(ctx context.Context, userID, liabilityID string, input UpdateInput) (*repo.Liability, error) {
	if input.UpdateMode == UpdateModeVersioned && input.StartDate != nil {
		return s.versionedUpdate(ctx, userID, liabilityID, input)
	}
	return s.inPlaceUpdate(ctx, userID, liabilityID, input)
}

// UpdateFromParams validates and converts raw params then delegates to Update.
func (s *Service) UpdateFromParams(ctx context.Context, userID, liabilityID string, params UpdateParams) (*repo.Liability, error) {
	input, err := buildUpdateInput(liabilityID, params)
	if err != nil {
		return nil, err
	}
	return s.Update(ctx, userID, liabilityID, input)
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

func buildCreateInput(params CreateParams) (CreateInput, error) {
	if err := requireFields(map[string]string{
		"name":     params.Name,
		"category": params.Category,
	}); err != nil {
		return CreateInput{}, err
	}

	currentBalance, err := parseDecimalOrZero(params.CurrentBalance)
	if err != nil {
		return CreateInput{}, err
	}
	interestRate, err := parseOptionalDecimal("interestRateApr", params.InterestRateAPR)
	if err != nil {
		return CreateInput{}, err
	}
	minPayment, err := parseOptionalDecimal("minimumPayment", params.MinimumPayment)
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
		Name:              params.Name,
		Category:          params.Category,
		CurrentBalance:    *currentBalance,
		InterestRateAPR:   interestRate,
		MinimumPayment:    minPayment,
		GrowthStrategy:    params.GrowthStrategy,
		RepaymentStrategy: params.RepaymentStrategy,
		Notes:             params.Notes,
		StartDate:         startDate,
		EndDate:           endDate,
	}, nil
}

func buildUpdateInput(liabilityID string, params UpdateParams) (UpdateInput, error) {
	if err := requireFields(map[string]string{
		"name":           params.Name,
		"category":       params.Category,
		"currentBalance": params.CurrentBalance,
	}); err != nil {
		return UpdateInput{}, err
	}

	currentBalance, err := parseDecimalField("currentBalance", params.CurrentBalance)
	if err != nil {
		return UpdateInput{}, err
	}
	interestRate, err := parseOptionalDecimal("interestRateApr", params.InterestRateAPR)
	if err != nil {
		return UpdateInput{}, err
	}
	minPayment, err := parseOptionalDecimal("minimumPayment", params.MinimumPayment)
	if err != nil {
		return UpdateInput{}, err
	}

	startDate, err := parseRFC3339Pointer(params.StartDate)
	if err != nil {
		return UpdateInput{}, ValidationError{Message: fmt.Sprintf("invalid startDate: %v", err)}
	}

	return UpdateInput{
		ID:                liabilityID,
		Name:              params.Name,
		Category:          params.Category,
		CurrentBalance:    *currentBalance,
		InterestRateAPR:   interestRate,
		MinimumPayment:    minPayment,
		GrowthStrategy:    params.GrowthStrategy,
		RepaymentStrategy: params.RepaymentStrategy,
		Notes:             params.Notes,
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

func parseDecimalOrZero(value string) (*decimal.Decimal, error) {
	if value == "" {
		return decimal.Zero(), nil
	}
	return parseDecimalField("currentBalance", value)
}

func requireFields(fields map[string]string) error {
	for name, val := range fields {
		if val == "" {
			return ValidationError{Message: fmt.Sprintf("%s is required", name)}
		}
	}
	return nil
}
