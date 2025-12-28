package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// PropertyScenario is the header table linking to country-specific details
type PropertyScenario struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	SGDetailsID *string   `json:"sgDetailsId"`
	MYDetailsID *string   `json:"myDetailsId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// PropertySGDetails contains all Singapore-specific property data
type PropertySGDetails struct {
	ID                    string           `json:"id"`
	Name                  string           `json:"name"`
	PropertyType          string           `json:"propertyType"`
	PropertySubtype       string           `json:"propertySubtype"`
	Icon                  *string          `json:"icon"`
	IconColor             *string          `json:"iconColor"`
	IsIncluded            bool             `json:"isIncluded"`
	PropertyPrice         decimal.Decimal  `json:"propertyPrice"`
	ValuationPrice        *decimal.Decimal `json:"valuationPrice"`
	LoanType              string           `json:"loanType"`
	DownpaymentCpfOa      decimal.Decimal  `json:"downpaymentCpfOa"`
	DownpaymentCash       decimal.Decimal  `json:"downpaymentCash"`
	BorrowerType          string           `json:"borrowerType"`
	Borrower1IncomeID     *string          `json:"borrower1IncomeId"`
	Borrower1CpfAccountID *string          `json:"borrower1CpfAccountId"`
	Borrower2IncomeID     *string          `json:"borrower2IncomeId"`
	Borrower2CpfAccountID *string          `json:"borrower2CpfAccountId"`
	OtherDebt             decimal.Decimal  `json:"otherDebt"`
	// Residency is DERIVED from Borrower1IncomeID → finance_incomes.residency_status (not stored in DB)
	Residency            string           `json:"residency"`
	PropertyCount        int              `json:"propertyCount"`
	Grants               decimal.Decimal  `json:"grants"`
	BtoLaunchDate        *string          `json:"btoLaunchDate"`
	BtoKeyCollectionDate *string          `json:"btoKeyCollectionDate"`
	SaleExpectedDate     *string          `json:"saleExpectedDate"`
	SaleExpectedPrice    *decimal.Decimal `json:"saleExpectedPrice"`
	CreatedAt            time.Time        `json:"createdAt"`
	UpdatedAt            time.Time        `json:"updatedAt"`
}

// PropertyFee represents a purchase, sale, or recurring fee
type PropertyFee struct {
	ID           string          `json:"id"`
	ScenarioID   string          `json:"scenarioId"`
	FeeContext   string          `json:"feeContext"` // 'purchase' | 'sale' | 'recurring'
	FeeType      string          `json:"feeType"`
	Description  *string         `json:"description"`
	Amount       decimal.Decimal `json:"amount"`
	Currency     string          `json:"currency"`
	IsPercentage bool            `json:"isPercentage"`
	Frequency    string          `json:"frequency"` // 'one_time' | 'monthly' | 'yearly'
	StartDate    *string         `json:"startDate"`
	EndDate      *string         `json:"endDate"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// GrowthPeriod represents a period with specific growth rate
type GrowthPeriod struct {
	ID                 string          `json:"id"`
	PropertyScenarioID *string         `json:"propertyScenarioId"`
	AssetID            *string         `json:"assetId"`
	StartYear          int             `json:"startYear"`
	EndYear            *int            `json:"endYear"`
	GrowthRate         decimal.Decimal `json:"growthRate"`
	GrowthStrategy     string          `json:"growthStrategy"`
	CreatedAt          time.Time       `json:"createdAt"`
}

// LiabilityRatePeriod represents a loan segment with specific rates
type LiabilityRatePeriod struct {
	ID                 string          `json:"id"`
	PropertyScenarioID *string         `json:"propertyScenarioId"`
	LiabilityID        *string         `json:"liabilityId"`
	PeriodOrder        int             `json:"periodOrder"`
	StartMonth         string          `json:"startMonth"`
	TermYears          int             `json:"termYears"`
	FixedYears         int             `json:"fixedYears"`
	FixedRate          decimal.Decimal `json:"fixedRate"`
	FloatingRate       decimal.Decimal `json:"floatingRate"`
	CreatedAt          time.Time       `json:"createdAt"`
}

// PropertyScenarioFull is the complete scenario with all related data
type PropertyScenarioFull struct {
	Scenario      PropertyScenario      `json:"scenario"`
	SGDetails     *PropertySGDetails    `json:"sgDetails,omitempty"`
	MYDetails     interface{}           `json:"myDetails,omitempty"` // Future
	Fees          []PropertyFee         `json:"fees"`
	GrowthPeriods []GrowthPeriod        `json:"growthPeriods"`
	RatePeriods   []LiabilityRatePeriod `json:"ratePeriods"`
}

// Input types for creating/updating scenarios

// CreateSGDetailsInput is the input for creating Singapore property details
type CreateSGDetailsInput struct {
	Name                  string           `json:"name"`
	PropertyType          string           `json:"propertyType"`
	PropertySubtype       string           `json:"propertySubtype"`
	Icon                  *string          `json:"icon"`
	IconColor             *string          `json:"iconColor"`
	IsIncluded            *bool            `json:"isIncluded"`
	PropertyPrice         decimal.Decimal  `json:"propertyPrice"`
	ValuationPrice        *decimal.Decimal `json:"valuationPrice"`
	LoanType              string           `json:"loanType"`
	DownpaymentCpfOa      *decimal.Decimal `json:"downpaymentCpfOa"`
	DownpaymentCash       *decimal.Decimal `json:"downpaymentCash"`
	BorrowerType          string           `json:"borrowerType"`
	Borrower1IncomeID     *string          `json:"borrower1IncomeId"`
	Borrower1CpfAccountID *string          `json:"borrower1CpfAccountId"`
	Borrower2IncomeID     *string          `json:"borrower2IncomeId"`
	Borrower2CpfAccountID *string          `json:"borrower2CpfAccountId"`
	OtherDebt             *decimal.Decimal `json:"otherDebt"`
	PropertyCount         *int             `json:"propertyCount"`
	Grants                *decimal.Decimal `json:"grants"`
	BtoLaunchDate         *string          `json:"btoLaunchDate"`
	BtoKeyCollectionDate  *string          `json:"btoKeyCollectionDate"`
	SaleExpectedDate      *string          `json:"saleExpectedDate"`
	SaleExpectedPrice     *decimal.Decimal `json:"saleExpectedPrice"`
}

// CreateFeeInput is the input for creating a property fee
type CreateFeeInput struct {
	FeeContext   string          `json:"feeContext"`
	FeeType      string          `json:"feeType"`
	Description  *string         `json:"description"`
	Amount       decimal.Decimal `json:"amount"`
	Currency     string          `json:"currency"`
	IsPercentage *bool           `json:"isPercentage"`
	Frequency    string          `json:"frequency"`
	StartDate    *string         `json:"startDate"`
	EndDate      *string         `json:"endDate"`
}

// CreateGrowthPeriodInput is the input for creating a growth period
type CreateGrowthPeriodInput struct {
	StartYear      int             `json:"startYear"`
	EndYear        *int            `json:"endYear"`
	GrowthRate     decimal.Decimal `json:"growthRate"`
	GrowthStrategy string          `json:"growthStrategy"`
}

// CreateRatePeriodInput is the input for creating a loan rate period
type CreateRatePeriodInput struct {
	StartMonth   string          `json:"startMonth"`
	TermYears    int             `json:"termYears"`
	FixedYears   int             `json:"fixedYears"`
	FixedRate    decimal.Decimal `json:"fixedRate"`
	FloatingRate decimal.Decimal `json:"floatingRate"`
}

// CreateScenarioInput is the input for creating a property scenario
type CreateScenarioInput struct {
	Country       string                    `json:"country"` // "SG" or "MY"
	SGDetails     *CreateSGDetailsInput     `json:"sgDetails"`
	Fees          []CreateFeeInput          `json:"fees"`
	GrowthPeriods []CreateGrowthPeriodInput `json:"growthPeriods"`
	RatePeriods   []CreateRatePeriodInput   `json:"ratePeriods"`
}

// UpdateScenarioInput is the input for updating a property scenario
type UpdateScenarioInput struct {
	SGDetails     *CreateSGDetailsInput     `json:"sgDetails"`
	Fees          []CreateFeeInput          `json:"fees"`
	GrowthPeriods []CreateGrowthPeriodInput `json:"growthPeriods"`
	RatePeriods   []CreateRatePeriodInput   `json:"ratePeriods"`
}

// ErrMissingRatePeriods is returned when no rate periods are provided
var ErrMissingRatePeriods = errors.New("at least one rate period required")

// CreatePropertyScenario creates a new property scenario with all related data
func (s *Store) CreatePropertyScenario(ctx context.Context, userID string, input CreateScenarioInput) (*PropertyScenarioFull, error) {
	// Validate input
	if len(input.RatePeriods) == 0 {
		return nil, ErrMissingRatePeriods
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Create country-specific details first (to get the ID)
	var sgDetailsID *string
	if input.SGDetails != nil {
		id, err := s.createSGDetails(ctx, tx, input.SGDetails)
		if err != nil {
			return nil, fmt.Errorf("create sg details: %w", err)
		}
		sgDetailsID = &id
	}

	// 2. Create header scenario
	var scenarioID string
	err = tx.QueryRow(ctx, `
		INSERT INTO property_scenarios (user_id, sg_details_id, my_details_id)
		VALUES ($1, $2, NULL)
		RETURNING id
	`, userID, sgDetailsID).Scan(&scenarioID)
	if err != nil {
		return nil, fmt.Errorf("create scenario header: %w", err)
	}

	// 3. Create fees
	if err := s.createPropertyFees(ctx, tx, scenarioID, input.Fees); err != nil {
		return nil, fmt.Errorf("create fees: %w", err)
	}

	// 4. Create growth periods
	if err := s.createGrowthPeriods(ctx, tx, scenarioID, input.GrowthPeriods); err != nil {
		return nil, fmt.Errorf("create growth periods: %w", err)
	}

	// 5. Create loan rate periods
	if err := s.createRatePeriods(ctx, tx, scenarioID, input.RatePeriods); err != nil {
		return nil, fmt.Errorf("create rate periods: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	// Fetch and return the full scenario
	return s.GetPropertyScenario(ctx, userID, scenarioID)
}

// createSGDetails creates Singapore property details and returns the ID
func (s *Store) createSGDetails(ctx context.Context, tx pgx.Tx, input *CreateSGDetailsInput) (string, error) {
	// Set defaults
	isIncluded := true
	if input.IsIncluded != nil {
		isIncluded = *input.IsIncluded
	}

	downpaymentCpfOa := decimal.Zero()
	if input.DownpaymentCpfOa != nil {
		downpaymentCpfOa = input.DownpaymentCpfOa
	}

	downpaymentCash := decimal.Zero()
	if input.DownpaymentCash != nil {
		downpaymentCash = input.DownpaymentCash
	}

	otherDebt := decimal.Zero()
	if input.OtherDebt != nil {
		otherDebt = input.OtherDebt
	}

	propertyCount := 0
	if input.PropertyCount != nil {
		propertyCount = *input.PropertyCount
	}

	grants := decimal.Zero()
	if input.Grants != nil {
		grants = input.Grants
	}

	var id string
	err := tx.QueryRow(ctx, `
		INSERT INTO property_sg_details (
			name, property_type, property_subtype,
			icon, icon_color, is_included,
			property_price, valuation_price, loan_type,
			downpayment_cpf_oa, downpayment_cash,
			borrower_type, borrower1_income_id, borrower1_cpf_account_id,
			borrower2_income_id, borrower2_cpf_account_id,
			other_debt, property_count, grants,
			bto_launch_date, bto_key_collection_date,
			sale_expected_date, sale_expected_price
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
		) RETURNING id
	`,
		input.Name, input.PropertyType, input.PropertySubtype,
		input.Icon, input.IconColor, isIncluded,
		input.PropertyPrice, input.ValuationPrice, input.LoanType,
		downpaymentCpfOa, downpaymentCash,
		input.BorrowerType, input.Borrower1IncomeID, input.Borrower1CpfAccountID,
		input.Borrower2IncomeID, input.Borrower2CpfAccountID,
		otherDebt, propertyCount, grants,
		input.BtoLaunchDate, input.BtoKeyCollectionDate,
		input.SaleExpectedDate, input.SaleExpectedPrice,
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("insert sg details: %w", err)
	}

	return id, nil
}

// createPropertyFees creates fees for a scenario
func (s *Store) createPropertyFees(ctx context.Context, tx pgx.Tx, scenarioID string, fees []CreateFeeInput) error {
	for _, fee := range fees {
		isPercentage := false
		if fee.IsPercentage != nil {
			isPercentage = *fee.IsPercentage
		}

		currency := fee.Currency
		if currency == "" {
			currency = "SGD"
		}

		frequency := fee.Frequency
		if frequency == "" {
			frequency = "one_time"
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO property_fees (
				scenario_id, fee_context, fee_type, description,
				amount, currency, is_percentage, frequency,
				start_date, end_date
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`,
			scenarioID, fee.FeeContext, fee.FeeType, fee.Description,
			fee.Amount, currency, isPercentage, frequency,
			fee.StartDate, fee.EndDate,
		)
		if err != nil {
			return fmt.Errorf("insert fee: %w", err)
		}
	}
	return nil
}

// createGrowthPeriods creates growth periods for a scenario
func (s *Store) createGrowthPeriods(ctx context.Context, tx pgx.Tx, scenarioID string, periods []CreateGrowthPeriodInput) error {
	for _, period := range periods {
		growthStrategy := period.GrowthStrategy
		if growthStrategy == "" {
			growthStrategy = "annual_step"
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO growth_periods (
				property_scenario_id, start_year, end_year, growth_rate, growth_strategy
			) VALUES ($1, $2, $3, $4, $5)
		`,
			scenarioID, period.StartYear, period.EndYear, period.GrowthRate, growthStrategy,
		)
		if err != nil {
			return fmt.Errorf("insert growth period: %w", err)
		}
	}
	return nil
}

// createRatePeriods creates loan rate periods for a scenario
func (s *Store) createRatePeriods(ctx context.Context, tx pgx.Tx, scenarioID string, periods []CreateRatePeriodInput) error {
	for i, period := range periods {
		_, err := tx.Exec(ctx, `
			INSERT INTO liability_rate_periods (
				property_scenario_id, period_order, start_month, term_years,
				fixed_years, fixed_rate, floating_rate
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			scenarioID, i, period.StartMonth, period.TermYears,
			period.FixedYears, period.FixedRate, period.FloatingRate,
		)
		if err != nil {
			return fmt.Errorf("insert rate period: %w", err)
		}
	}
	return nil
}

// GetPropertyScenario retrieves a scenario with all related data
func (s *Store) GetPropertyScenario(ctx context.Context, userID, scenarioID string) (*PropertyScenarioFull, error) {
	// 1. Get scenario header and verify ownership
	var scenario PropertyScenario
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, sg_details_id, my_details_id, created_at, updated_at
		FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(
		&scenario.ID, &scenario.UserID, &scenario.SGDetailsID, &scenario.MYDetailsID,
		&scenario.CreatedAt, &scenario.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get scenario: %w", err)
	}

	result := &PropertyScenarioFull{
		Scenario:      scenario,
		Fees:          []PropertyFee{},
		GrowthPeriods: []GrowthPeriod{},
		RatePeriods:   []LiabilityRatePeriod{},
	}

	// 2. Get SG details if present
	if scenario.SGDetailsID != nil {
		sgDetails, err := s.getSGDetails(ctx, *scenario.SGDetailsID)
		if err != nil {
			return nil, fmt.Errorf("get sg details: %w", err)
		}
		result.SGDetails = sgDetails
	}

	// 3. Get fees
	fees, err := s.getPropertyFees(ctx, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("get fees: %w", err)
	}
	result.Fees = fees

	// 4. Get growth periods
	growthPeriods, err := s.getGrowthPeriods(ctx, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("get growth periods: %w", err)
	}
	result.GrowthPeriods = growthPeriods

	// 5. Get rate periods
	ratePeriods, err := s.getRatePeriods(ctx, scenarioID)
	if err != nil {
		return nil, fmt.Errorf("get rate periods: %w", err)
	}
	result.RatePeriods = ratePeriods

	return result, nil
}

// getSGDetails fetches Singapore property details by ID
func (s *Store) getSGDetails(ctx context.Context, id string) (*PropertySGDetails, error) {
	var details PropertySGDetails
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, property_type, property_subtype,
			icon, icon_color, is_included,
			property_price, valuation_price, loan_type,
			downpayment_cpf_oa, downpayment_cash,
			borrower_type, borrower1_income_id, borrower1_cpf_account_id,
			borrower2_income_id, borrower2_cpf_account_id,
			other_debt, property_count, grants,
			bto_launch_date, bto_key_collection_date,
			sale_expected_date, sale_expected_price,
			created_at, updated_at
		FROM property_sg_details WHERE id = $1
	`, id).Scan(
		&details.ID, &details.Name, &details.PropertyType, &details.PropertySubtype,
		&details.Icon, &details.IconColor, &details.IsIncluded,
		&details.PropertyPrice, &details.ValuationPrice, &details.LoanType,
		&details.DownpaymentCpfOa, &details.DownpaymentCash,
		&details.BorrowerType, &details.Borrower1IncomeID, &details.Borrower1CpfAccountID,
		&details.Borrower2IncomeID, &details.Borrower2CpfAccountID,
		&details.OtherDebt, &details.PropertyCount, &details.Grants,
		&details.BtoLaunchDate, &details.BtoKeyCollectionDate,
		&details.SaleExpectedDate, &details.SaleExpectedPrice,
		&details.CreatedAt, &details.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Derive residency from borrower1_income_id
	details.Residency = s.deriveResidency(ctx, details.Borrower1IncomeID)

	return &details, nil
}

// deriveResidency looks up residency_status from finance_incomes table
// Returns "singapore_citizen" as default if incomeID is nil or lookup fails
func (s *Store) deriveResidency(ctx context.Context, incomeID *string) string {
	const defaultResidency = "singapore_citizen"

	if incomeID == nil {
		return defaultResidency
	}

	var residencyStatus string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(residency_status, 'singapore_citizen')
		FROM finance_incomes
		WHERE id = $1
	`, *incomeID).Scan(&residencyStatus)
	if err != nil {
		// Log error but don't fail - return default
		return defaultResidency
	}

	return residencyStatus
}

// getPropertyFees fetches all fees for a scenario
func (s *Store) getPropertyFees(ctx context.Context, scenarioID string) ([]PropertyFee, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, scenario_id, fee_context, fee_type, description,
			amount, currency, is_percentage, frequency,
			start_date, end_date, created_at
		FROM property_fees
		WHERE scenario_id = $1
		ORDER BY created_at
	`, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fees []PropertyFee
	for rows.Next() {
		var fee PropertyFee
		err := rows.Scan(
			&fee.ID, &fee.ScenarioID, &fee.FeeContext, &fee.FeeType, &fee.Description,
			&fee.Amount, &fee.Currency, &fee.IsPercentage, &fee.Frequency,
			&fee.StartDate, &fee.EndDate, &fee.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		fees = append(fees, fee)
	}

	return fees, nil
}

// getGrowthPeriods fetches all growth periods for a scenario
func (s *Store) getGrowthPeriods(ctx context.Context, scenarioID string) ([]GrowthPeriod, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_scenario_id, asset_id, start_year, end_year, growth_rate, growth_strategy, created_at
		FROM growth_periods
		WHERE property_scenario_id = $1
		ORDER BY start_year
	`, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var periods []GrowthPeriod
	for rows.Next() {
		var period GrowthPeriod
		err := rows.Scan(
			&period.ID, &period.PropertyScenarioID, &period.AssetID,
			&period.StartYear, &period.EndYear, &period.GrowthRate,
			&period.GrowthStrategy, &period.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		periods = append(periods, period)
	}

	return periods, nil
}

// getRatePeriods fetches all rate periods for a scenario
func (s *Store) getRatePeriods(ctx context.Context, scenarioID string) ([]LiabilityRatePeriod, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_scenario_id, liability_id, period_order, start_month,
			term_years, fixed_years, fixed_rate, floating_rate, created_at
		FROM liability_rate_periods
		WHERE property_scenario_id = $1
		ORDER BY period_order
	`, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var periods []LiabilityRatePeriod
	for rows.Next() {
		var period LiabilityRatePeriod
		err := rows.Scan(
			&period.ID, &period.PropertyScenarioID, &period.LiabilityID,
			&period.PeriodOrder, &period.StartMonth,
			&period.TermYears, &period.FixedYears, &period.FixedRate,
			&period.FloatingRate, &period.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		periods = append(periods, period)
	}

	return periods, nil
}

// ListPropertyScenarios returns all scenarios for a user
func (s *Store) ListPropertyScenarios(ctx context.Context, userID string) ([]PropertyScenarioFull, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, sg_details_id, my_details_id, created_at, updated_at
		FROM property_scenarios
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list scenarios: %w", err)
	}
	defer rows.Close()

	var scenarios []PropertyScenarioFull
	for rows.Next() {
		var scenario PropertyScenario
		err := rows.Scan(
			&scenario.ID, &scenario.UserID, &scenario.SGDetailsID, &scenario.MYDetailsID,
			&scenario.CreatedAt, &scenario.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan scenario: %w", err)
		}

		// Fetch full scenario details
		full, err := s.GetPropertyScenario(ctx, userID, scenario.ID)
		if err != nil {
			return nil, fmt.Errorf("get full scenario %s: %w", scenario.ID, err)
		}
		scenarios = append(scenarios, *full)
	}

	return scenarios, nil
}

// UpdatePropertyScenario updates an existing scenario with new data
func (s *Store) UpdatePropertyScenario(ctx context.Context, userID, scenarioID string, input UpdateScenarioInput) (*PropertyScenarioFull, error) {
	// Validate input
	if len(input.RatePeriods) == 0 {
		return nil, ErrMissingRatePeriods
	}

	// Verify ownership
	var existingSGDetailsID *string
	err := s.pool.QueryRow(ctx, `
		SELECT sg_details_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&existingSGDetailsID)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("verify ownership: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update SG details if present
	if input.SGDetails != nil && existingSGDetailsID != nil {
		if err := s.updateSGDetails(ctx, tx, *existingSGDetailsID, input.SGDetails); err != nil {
			return nil, fmt.Errorf("update sg details: %w", err)
		}
	}

	// Delete and recreate fees
	if _, err := tx.Exec(ctx, `DELETE FROM property_fees WHERE scenario_id = $1`, scenarioID); err != nil {
		return nil, fmt.Errorf("delete fees: %w", err)
	}
	if err := s.createPropertyFees(ctx, tx, scenarioID, input.Fees); err != nil {
		return nil, fmt.Errorf("create fees: %w", err)
	}

	// Delete and recreate growth periods
	if _, err := tx.Exec(ctx, `DELETE FROM growth_periods WHERE property_scenario_id = $1`, scenarioID); err != nil {
		return nil, fmt.Errorf("delete growth periods: %w", err)
	}
	if err := s.createGrowthPeriods(ctx, tx, scenarioID, input.GrowthPeriods); err != nil {
		return nil, fmt.Errorf("create growth periods: %w", err)
	}

	// Delete and recreate rate periods
	if _, err := tx.Exec(ctx, `DELETE FROM liability_rate_periods WHERE property_scenario_id = $1`, scenarioID); err != nil {
		return nil, fmt.Errorf("delete rate periods: %w", err)
	}
	if err := s.createRatePeriods(ctx, tx, scenarioID, input.RatePeriods); err != nil {
		return nil, fmt.Errorf("create rate periods: %w", err)
	}

	// Update scenario timestamp
	if _, err := tx.Exec(ctx, `UPDATE property_scenarios SET updated_at = NOW() WHERE id = $1`, scenarioID); err != nil {
		return nil, fmt.Errorf("update scenario timestamp: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	return s.GetPropertyScenario(ctx, userID, scenarioID)
}

// updateSGDetails updates Singapore property details
func (s *Store) updateSGDetails(ctx context.Context, tx pgx.Tx, id string, input *CreateSGDetailsInput) error {
	// Set defaults
	isIncluded := true
	if input.IsIncluded != nil {
		isIncluded = *input.IsIncluded
	}

	downpaymentCpfOa := decimal.Zero()
	if input.DownpaymentCpfOa != nil {
		downpaymentCpfOa = input.DownpaymentCpfOa
	}

	downpaymentCash := decimal.Zero()
	if input.DownpaymentCash != nil {
		downpaymentCash = input.DownpaymentCash
	}

	otherDebt := decimal.Zero()
	if input.OtherDebt != nil {
		otherDebt = input.OtherDebt
	}

	propertyCount := 0
	if input.PropertyCount != nil {
		propertyCount = *input.PropertyCount
	}

	grants := decimal.Zero()
	if input.Grants != nil {
		grants = input.Grants
	}

	_, err := tx.Exec(ctx, `
		UPDATE property_sg_details SET
			name = $2, property_type = $3, property_subtype = $4,
			icon = $5, icon_color = $6, is_included = $7,
			property_price = $8, valuation_price = $9, loan_type = $10,
			downpayment_cpf_oa = $11, downpayment_cash = $12,
			borrower_type = $13, borrower1_income_id = $14, borrower1_cpf_account_id = $15,
			borrower2_income_id = $16, borrower2_cpf_account_id = $17,
			other_debt = $18, property_count = $19, grants = $20,
			bto_launch_date = $21, bto_key_collection_date = $22,
			sale_expected_date = $23, sale_expected_price = $24,
			updated_at = NOW()
		WHERE id = $1
	`,
		id,
		input.Name, input.PropertyType, input.PropertySubtype,
		input.Icon, input.IconColor, isIncluded,
		input.PropertyPrice, input.ValuationPrice, input.LoanType,
		downpaymentCpfOa, downpaymentCash,
		input.BorrowerType, input.Borrower1IncomeID, input.Borrower1CpfAccountID,
		input.Borrower2IncomeID, input.Borrower2CpfAccountID,
		otherDebt, propertyCount, grants,
		input.BtoLaunchDate, input.BtoKeyCollectionDate,
		input.SaleExpectedDate, input.SaleExpectedPrice,
	)

	return err
}

// DeletePropertyScenario deletes a scenario and all related data (cascades via FK)
func (s *Store) DeletePropertyScenario(ctx context.Context, userID, scenarioID string) error {
	// Get the sg_details_id first (we need to delete it separately since FK is ON DELETE CASCADE only from scenario)
	var sgDetailsID *string
	err := s.pool.QueryRow(ctx, `
		SELECT sg_details_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&sgDetailsID)
	if err == pgx.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("get scenario: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete scenario (cascades to fees, growth_periods, rate_periods)
	tag, err := tx.Exec(ctx, `DELETE FROM property_scenarios WHERE id = $1 AND user_id = $2`, scenarioID, userID)
	if err != nil {
		return fmt.Errorf("delete scenario: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	// Delete SG details (not cascaded from scenario deletion)
	if sgDetailsID != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM property_sg_details WHERE id = $1`, *sgDetailsID); err != nil {
			return fmt.Errorf("delete sg details: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
