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
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	PropertySGID *string   `json:"propertySgId"`
	MYDetailsID  *string   `json:"myDetailsId"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// PropertySG contains all Singapore-specific property data
type PropertySG struct {
	ID                    string           `json:"id"`
	Name                  string           `json:"name"`
	PropertyType          string           `json:"propertyType"`
	PropertySubtype       string           `json:"propertySubtype"`
	PurchaseIcon          *string          `json:"purchaseIcon"`
	PurchaseIconColor     *string          `json:"purchaseIconColor"`
	SaleIcon              *string          `json:"saleIcon"`
	SaleIconColor         *string          `json:"saleIconColor"`
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
	Residency     string  `json:"residency"`
	PropertyCount int     `json:"propertyCount"`
	BtoLaunchDate *string `json:"btoLaunchDate"`
	BtoKeyCollectionDate *string          `json:"btoKeyCollectionDate"`
	SaleExpectedDate     *string          `json:"saleExpectedDate"`
	SaleExpectedPrice    *decimal.Decimal `json:"saleExpectedPrice"`
	// Lease tenure: nil = freehold, 1-999 = remaining years
	LeaseRemainingYears *int `json:"leaseRemainingYears"`
	// Per-borrower CPF OA tracking for downpayment
	Borrower1DownpaymentCpfOa decimal.Decimal `json:"borrower1DownpaymentCpfOa"`
	Borrower2DownpaymentCpfOa decimal.Decimal `json:"borrower2DownpaymentCpfOa"`
	// Per-borrower monthly CPF OA payment amounts
	Borrower1MonthlyCpfOa decimal.Decimal `json:"borrower1MonthlyCpfOa"`
	Borrower2MonthlyCpfOa decimal.Decimal `json:"borrower2MonthlyCpfOa"`
	// Per-borrower cash account configuration (downpayment)
	Borrower1DownpaymentCashAccountID *string         `json:"borrower1DownpaymentCashAccountId"`
	Borrower1DownpaymentCashAmount    decimal.Decimal `json:"borrower1DownpaymentCashAmount"`
	Borrower2DownpaymentCashAccountID *string         `json:"borrower2DownpaymentCashAccountId"`
	Borrower2DownpaymentCashAmount    decimal.Decimal `json:"borrower2DownpaymentCashAmount"`
	// Per-borrower cash account configuration (monthly payment)
	Borrower1MonthlyCashAccountID  *string         `json:"borrower1MonthlyCashAccountId"`
	Borrower1MonthlyCashAmountType string          `json:"borrower1MonthlyCashAmountType"` // 'fixed', 'percentage', 'remainder'
	Borrower1MonthlyCashAmount     decimal.Decimal `json:"borrower1MonthlyCashAmount"`
	Borrower2MonthlyCashAccountID  *string         `json:"borrower2MonthlyCashAccountId"`
	Borrower2MonthlyCashAmountType string          `json:"borrower2MonthlyCashAmountType"` // 'fixed', 'percentage', 'remainder'
	Borrower2MonthlyCashAmount     decimal.Decimal `json:"borrower2MonthlyCashAmount"`
	// Sale proceeds destination accounts
	Borrower1CpfRefundAccountID *string `json:"borrower1CpfRefundAccountId"` // CPF OA to receive borrower 1's refund
	Borrower2CpfRefundAccountID *string `json:"borrower2CpfRefundAccountId"` // CPF OA to receive borrower 2's refund (joint only)
	NetCashProceedsAccountID    *string `json:"netCashProceedsAccountId"`    // Cash account to receive net proceeds
	CreatedAt                   time.Time       `json:"createdAt"`
	UpdatedAt                   time.Time       `json:"updatedAt"`
}

// PropertyFee represents a purchase, sale, or recurring fee
type PropertyFee struct {
	ID           string          `json:"id"`
	PropertySGID *string         `json:"propertySgId"`
	MYDetailsID  *string         `json:"myDetailsId"`
	FeeContext   string          `json:"feeContext"` // 'purchase' | 'sale' | 'recurring'
	FeeType      string          `json:"feeType"`
	Description  *string         `json:"description"`
	Amount       decimal.Decimal `json:"amount"`
	Currency     string          `json:"currency"`
	IsPercentage bool            `json:"isPercentage"`
	Frequency    string          `json:"frequency"` // 'one_time' | 'monthly' | 'yearly'
	StartDate    *time.Time      `json:"startDate"`
	EndDate      *time.Time      `json:"endDate"`
	Icon         string          `json:"icon"`
	IconColor    string          `json:"iconColor"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// GrowthPeriod represents a period with specific growth rate
type GrowthPeriod struct {
	ID             string          `json:"id"`
	PropertySGID   *string         `json:"propertySgId"`
	AssetID        *string         `json:"assetId"`
	StartDate      time.Time       `json:"startDate"`
	EndDate        *time.Time      `json:"endDate"`
	GrowthRate     decimal.Decimal `json:"growthRate"`
	GrowthStrategy string          `json:"growthStrategy"`
	CreatedAt      time.Time       `json:"createdAt"`
}

// LiabilityRatePeriod represents a loan segment with a specific rate
type LiabilityRatePeriod struct {
	ID           string          `json:"id"`
	PropertySGID *string         `json:"propertySgId"`
	LiabilityID  *string         `json:"liabilityId"`
	PeriodOrder  int             `json:"periodOrder"`
	StartDate    time.Time       `json:"startDate"`
	TermYears    int             `json:"termYears"`
	Rate         decimal.Decimal `json:"rate"`
	RateType     string          `json:"rateType"` // "fixed" or "floating"
	CreatedAt    time.Time       `json:"createdAt"`
}

// PropertySGGrant represents an HDB grant (e.g. EHG, Family Grant, PHG)
type PropertySGGrant struct {
	ID           string          `json:"id"`
	PropertySGID string          `json:"propertySgId"`
	Name         string          `json:"name"`
	Amount       decimal.Decimal `json:"amount"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// CreateGrantInput is the input for creating a grant
type CreateGrantInput struct {
	Name   string          `json:"name"`
	Amount decimal.Decimal `json:"amount"`
}

// PropertyScenarioFull is the complete scenario with all related data
type PropertyScenarioFull struct {
	Scenario      PropertyScenario      `json:"scenario"`
	PropertySG    *PropertySG           `json:"propertySG,omitempty"`
	PropertyMY    interface{}           `json:"propertyMY,omitempty"` // Future
	Fees          []PropertyFee         `json:"fees"`
	GrowthPeriods []GrowthPeriod        `json:"growthPeriods"`
	RatePeriods   []LiabilityRatePeriod `json:"ratePeriods"`
	Grants        []PropertySGGrant     `json:"grants"`
}

// Input types for creating/updating scenarios

// CreatePropertySGInput is the input for creating Singapore property details
type CreatePropertySGInput struct {
	Name                  string           `json:"name"`
	PropertyType          string           `json:"propertyType"`
	PropertySubtype       string           `json:"propertySubtype"`
	PurchaseIcon          *string          `json:"purchaseIcon"`
	PurchaseIconColor     *string          `json:"purchaseIconColor"`
	SaleIcon              *string          `json:"saleIcon"`
	SaleIconColor         *string          `json:"saleIconColor"`
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
	BtoLaunchDate         *string          `json:"btoLaunchDate"`
	BtoKeyCollectionDate  *string          `json:"btoKeyCollectionDate"`
	SaleExpectedDate      *string          `json:"saleExpectedDate"`
	SaleExpectedPrice     *decimal.Decimal `json:"saleExpectedPrice"`
	// Lease tenure: nil = freehold, 1-999 = remaining years
	LeaseRemainingYears *int `json:"leaseRemainingYears"`
	// Per-borrower CPF OA tracking
	Borrower1DownpaymentCpfOa *decimal.Decimal `json:"borrower1DownpaymentCpfOa"`
	Borrower2DownpaymentCpfOa *decimal.Decimal `json:"borrower2DownpaymentCpfOa"`
	Borrower1MonthlyCpfOa     *decimal.Decimal `json:"borrower1MonthlyCpfOa"`
	Borrower2MonthlyCpfOa     *decimal.Decimal `json:"borrower2MonthlyCpfOa"`
	// Per-borrower cash account configuration (downpayment)
	Borrower1DownpaymentCashAccountID *string          `json:"borrower1DownpaymentCashAccountId"`
	Borrower1DownpaymentCashAmount    *decimal.Decimal `json:"borrower1DownpaymentCashAmount"`
	Borrower2DownpaymentCashAccountID *string          `json:"borrower2DownpaymentCashAccountId"`
	Borrower2DownpaymentCashAmount    *decimal.Decimal `json:"borrower2DownpaymentCashAmount"`
	// Per-borrower cash account configuration (monthly payment)
	Borrower1MonthlyCashAccountID  *string          `json:"borrower1MonthlyCashAccountId"`
	Borrower1MonthlyCashAmountType *string          `json:"borrower1MonthlyCashAmountType"` // 'fixed', 'percentage', 'remainder'
	Borrower1MonthlyCashAmount     *decimal.Decimal `json:"borrower1MonthlyCashAmount"`
	Borrower2MonthlyCashAccountID  *string          `json:"borrower2MonthlyCashAccountId"`
	Borrower2MonthlyCashAmountType *string          `json:"borrower2MonthlyCashAmountType"` // 'fixed', 'percentage', 'remainder'
	Borrower2MonthlyCashAmount     *decimal.Decimal `json:"borrower2MonthlyCashAmount"`
	// Sale proceeds destination accounts
	Borrower1CpfRefundAccountID *string `json:"borrower1CpfRefundAccountId"`
	Borrower2CpfRefundAccountID *string `json:"borrower2CpfRefundAccountId"`
	NetCashProceedsAccountID    *string `json:"netCashProceedsAccountId"`
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
	StartDate    *time.Time      `json:"startDate"`
	EndDate      *time.Time      `json:"endDate"`
	Icon         *string         `json:"icon"`
	IconColor    *string         `json:"iconColor"`
}

// CreateGrowthPeriodInput is the input for creating a growth period
type CreateGrowthPeriodInput struct {
	StartDate      time.Time       `json:"startDate"`
	EndDate        *time.Time      `json:"endDate"`
	GrowthRate     decimal.Decimal `json:"growthRate"`
	GrowthStrategy string          `json:"growthStrategy"`
}

// CreateRatePeriodInput is the input for creating a loan rate period
type CreateRatePeriodInput struct {
	StartDate time.Time       `json:"startDate"`
	TermYears int             `json:"termYears"`
	Rate      decimal.Decimal `json:"rate"`
	RateType  string          `json:"rateType"` // "fixed" or "floating"
}

// CreateScenarioInput is the input for creating a property scenario
type CreateScenarioInput struct {
	Country       string                    `json:"country"` // "SG" or "MY"
	PropertySG    *CreatePropertySGInput     `json:"propertySG"`
	Fees          []CreateFeeInput          `json:"fees"`
	GrowthPeriods []CreateGrowthPeriodInput `json:"growthPeriods"`
	RatePeriods   []CreateRatePeriodInput   `json:"ratePeriods"`
	Grants        []CreateGrantInput        `json:"grants"`
}

// UpdateScenarioInput is the input for updating a property scenario
type UpdateScenarioInput struct {
	PropertySG    *CreatePropertySGInput     `json:"propertySG"`
	Fees          []CreateFeeInput          `json:"fees"`
	GrowthPeriods []CreateGrowthPeriodInput `json:"growthPeriods"`
	RatePeriods   []CreateRatePeriodInput   `json:"ratePeriods"`
	Grants        []CreateGrantInput        `json:"grants"`
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
	var propertySGID *string
	if input.PropertySG != nil {
		id, err := s.createPropertySG(ctx, tx, input.PropertySG)
		if err != nil {
			return nil, fmt.Errorf("create sg details: %w", err)
		}
		propertySGID = &id

		// 1b. Create grants for SG details
		if len(input.Grants) > 0 {
			if err := s.createPropertyGrants(ctx, tx, id, input.Grants); err != nil {
				return nil, fmt.Errorf("create grants: %w", err)
			}
		}

		// 1c. Create fees for SG details
		if err := s.createPropertyFees(ctx, tx, id, input.Fees); err != nil {
			return nil, fmt.Errorf("create fees: %w", err)
		}
	}

	// 2. Create header scenario
	var scenarioID string
	err = tx.QueryRow(ctx, `
		INSERT INTO property_scenarios (user_id, property_sg_id, my_details_id)
		VALUES ($1, $2, NULL)
		RETURNING id
	`, userID, propertySGID).Scan(&scenarioID)
	if err != nil {
		return nil, fmt.Errorf("create scenario header: %w", err)
	}

	// 4. Create growth periods (linked to sg_details, not scenario header)
	if propertySGID != nil {
		if err := s.createGrowthPeriods(ctx, tx, *propertySGID, input.GrowthPeriods); err != nil {
			return nil, fmt.Errorf("create growth periods: %w", err)
		}

		// 5. Create loan rate periods (linked to sg_details, not scenario header)
		if err := s.createRatePeriods(ctx, tx, *propertySGID, input.RatePeriods); err != nil {
			return nil, fmt.Errorf("create rate periods: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	// Fetch and return the full scenario
	return s.GetPropertyScenario(ctx, userID, scenarioID)
}

// createPropertySG creates Singapore property details and returns the ID
func (s *Store) createPropertySG(ctx context.Context, tx pgx.Tx, input *CreatePropertySGInput) (string, error) {
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

	// Per-borrower CPF OA defaults
	borrower1DownpaymentCpfOa := decimal.Zero()
	if input.Borrower1DownpaymentCpfOa != nil {
		borrower1DownpaymentCpfOa = input.Borrower1DownpaymentCpfOa
	}

	borrower2DownpaymentCpfOa := decimal.Zero()
	if input.Borrower2DownpaymentCpfOa != nil {
		borrower2DownpaymentCpfOa = input.Borrower2DownpaymentCpfOa
	}

	borrower1MonthlyCpfOa := decimal.Zero()
	if input.Borrower1MonthlyCpfOa != nil {
		borrower1MonthlyCpfOa = input.Borrower1MonthlyCpfOa
	}

	borrower2MonthlyCpfOa := decimal.Zero()
	if input.Borrower2MonthlyCpfOa != nil {
		borrower2MonthlyCpfOa = input.Borrower2MonthlyCpfOa
	}

	// Per-borrower cash account defaults (downpayment)
	borrower1DownpaymentCashAmount := decimal.Zero()
	if input.Borrower1DownpaymentCashAmount != nil {
		borrower1DownpaymentCashAmount = input.Borrower1DownpaymentCashAmount
	}

	borrower2DownpaymentCashAmount := decimal.Zero()
	if input.Borrower2DownpaymentCashAmount != nil {
		borrower2DownpaymentCashAmount = input.Borrower2DownpaymentCashAmount
	}

	// Per-borrower cash account defaults (monthly payment)
	borrower1MonthlyCashAmountType := "remainder"
	if input.Borrower1MonthlyCashAmountType != nil {
		borrower1MonthlyCashAmountType = *input.Borrower1MonthlyCashAmountType
	}

	borrower1MonthlyCashAmount := decimal.Zero()
	if input.Borrower1MonthlyCashAmount != nil {
		borrower1MonthlyCashAmount = input.Borrower1MonthlyCashAmount
	}

	borrower2MonthlyCashAmountType := "remainder"
	if input.Borrower2MonthlyCashAmountType != nil {
		borrower2MonthlyCashAmountType = *input.Borrower2MonthlyCashAmountType
	}

	borrower2MonthlyCashAmount := decimal.Zero()
	if input.Borrower2MonthlyCashAmount != nil {
		borrower2MonthlyCashAmount = input.Borrower2MonthlyCashAmount
	}

	var id string
	err := tx.QueryRow(ctx, `
		INSERT INTO property_sg (
			name, property_type, property_subtype,
			purchase_icon, purchase_icon_color, sale_icon, sale_icon_color, is_included,
			property_price, valuation_price, loan_type,
			downpayment_cpf_oa, downpayment_cash,
			borrower_type, borrower1_income_id, borrower1_cpf_account_id,
			borrower2_income_id, borrower2_cpf_account_id,
			other_debt, property_count,
			bto_launch_date, bto_key_collection_date,
			sale_expected_date, sale_expected_price,
			lease_remaining_years,
			borrower1_downpayment_cpf_oa, borrower2_downpayment_cpf_oa,
			borrower1_monthly_cpf_oa, borrower2_monthly_cpf_oa,
			borrower1_downpayment_cash_account_id, borrower1_downpayment_cash_amount,
			borrower2_downpayment_cash_account_id, borrower2_downpayment_cash_amount,
			borrower1_monthly_cash_account_id, borrower1_monthly_cash_amount_type, borrower1_monthly_cash_amount,
			borrower2_monthly_cash_account_id, borrower2_monthly_cash_amount_type, borrower2_monthly_cash_amount,
			borrower1_cpf_refund_account_id, borrower2_cpf_refund_account_id, net_cash_proceeds_account_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
			$30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
		) RETURNING id
	`,
		input.Name, input.PropertyType, input.PropertySubtype,
		input.PurchaseIcon, input.PurchaseIconColor, input.SaleIcon, input.SaleIconColor, isIncluded,
		input.PropertyPrice, input.ValuationPrice, input.LoanType,
		downpaymentCpfOa, downpaymentCash,
		input.BorrowerType, input.Borrower1IncomeID, input.Borrower1CpfAccountID,
		input.Borrower2IncomeID, input.Borrower2CpfAccountID,
		otherDebt, propertyCount,
		input.BtoLaunchDate, input.BtoKeyCollectionDate,
		input.SaleExpectedDate, input.SaleExpectedPrice,
		input.LeaseRemainingYears,
		borrower1DownpaymentCpfOa, borrower2DownpaymentCpfOa,
		borrower1MonthlyCpfOa, borrower2MonthlyCpfOa,
		input.Borrower1DownpaymentCashAccountID, borrower1DownpaymentCashAmount,
		input.Borrower2DownpaymentCashAccountID, borrower2DownpaymentCashAmount,
		input.Borrower1MonthlyCashAccountID, borrower1MonthlyCashAmountType, borrower1MonthlyCashAmount,
		input.Borrower2MonthlyCashAccountID, borrower2MonthlyCashAmountType, borrower2MonthlyCashAmount,
		input.Borrower1CpfRefundAccountID, input.Borrower2CpfRefundAccountID, input.NetCashProceedsAccountID,
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("insert sg details: %w", err)
	}

	return id, nil
}

// createPropertyFees creates fees for a property_sg record
func (s *Store) createPropertyFees(ctx context.Context, tx pgx.Tx, propertySGID string, fees []CreateFeeInput) error {
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

		// Default icon values
		icon := "receipt"
		if fee.Icon != nil && *fee.Icon != "" {
			icon = *fee.Icon
		}

		iconColor := "#64748b"
		if fee.IconColor != nil && *fee.IconColor != "" {
			iconColor = *fee.IconColor
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO property_fees (
				property_sg_id, fee_context, fee_type, description,
				amount, currency, is_percentage, frequency,
				start_date, end_date, icon, icon_color
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`,
			propertySGID, fee.FeeContext, fee.FeeType, fee.Description,
			fee.Amount, currency, isPercentage, frequency,
			fee.StartDate, fee.EndDate, icon, iconColor,
		)
		if err != nil {
			return fmt.Errorf("insert fee: %w", err)
		}
	}
	return nil
}

// createGrowthPeriods creates growth periods for a scenario (linked to property_sg)
func (s *Store) createGrowthPeriods(ctx context.Context, tx pgx.Tx, propertySGID string, periods []CreateGrowthPeriodInput) error {
	for _, period := range periods {
		growthStrategy := period.GrowthStrategy
		if growthStrategy == "" {
			growthStrategy = "annual_step"
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO growth_periods (
				property_sg_id, start_date, end_date, growth_rate, growth_strategy
			) VALUES ($1, $2, $3, $4, $5)
		`,
			propertySGID, period.StartDate, period.EndDate, period.GrowthRate, growthStrategy,
		)
		if err != nil {
			return fmt.Errorf("insert growth period: %w", err)
		}
	}
	return nil
}

// createRatePeriods creates loan rate periods for a scenario (linked to property_sg)
func (s *Store) createRatePeriods(ctx context.Context, tx pgx.Tx, propertySGID string, periods []CreateRatePeriodInput) error {
	for i, period := range periods {
		_, err := tx.Exec(ctx, `
			INSERT INTO liability_rate_periods (
				property_sg_id, period_order, start_date, term_years,
				rate, rate_type
			) VALUES ($1, $2, $3, $4, $5, $6)
		`,
			propertySGID, i, period.StartDate, period.TermYears,
			period.Rate, period.RateType,
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
		SELECT id, user_id, property_sg_id, my_details_id, created_at, updated_at
		FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(
		&scenario.ID, &scenario.UserID, &scenario.PropertySGID, &scenario.MYDetailsID,
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
		Grants:        []PropertySGGrant{},
	}

	// 2. Get SG details if present
	if scenario.PropertySGID != nil {
		sgDetails, err := s.getPropertySG(ctx, *scenario.PropertySGID)
		if err != nil {
			return nil, fmt.Errorf("get sg details: %w", err)
		}
		result.PropertySG = sgDetails

		// 2b. Get grants for SG details
		grants, err := s.getPropertyGrants(ctx, *scenario.PropertySGID)
		if err != nil {
			return nil, fmt.Errorf("get grants: %w", err)
		}
		result.Grants = grants

		// 2c. Get fees for SG details
		fees, err := s.getPropertyFees(ctx, *scenario.PropertySGID)
		if err != nil {
			return nil, fmt.Errorf("get fees: %w", err)
		}
		result.Fees = fees
	}

	// 4. Get growth periods (linked to property_sg)
	if scenario.PropertySGID != nil {
		growthPeriods, err := s.getGrowthPeriods(ctx, *scenario.PropertySGID)
		if err != nil {
			return nil, fmt.Errorf("get growth periods: %w", err)
		}
		result.GrowthPeriods = growthPeriods

		// 5. Get rate periods (linked to property_sg)
		ratePeriods, err := s.getRatePeriods(ctx, *scenario.PropertySGID)
		if err != nil {
			return nil, fmt.Errorf("get rate periods: %w", err)
		}
		result.RatePeriods = ratePeriods
	}

	return result, nil
}

// getPropertySG fetches Singapore property details by ID
func (s *Store) getPropertySG(ctx context.Context, id string) (*PropertySG, error) {
	var details PropertySG
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, property_type, property_subtype,
			purchase_icon, purchase_icon_color, sale_icon, sale_icon_color, is_included,
			property_price, valuation_price, loan_type,
			downpayment_cpf_oa, downpayment_cash,
			borrower_type, borrower1_income_id, borrower1_cpf_account_id,
			borrower2_income_id, borrower2_cpf_account_id,
			other_debt, property_count,
			bto_launch_date, bto_key_collection_date,
			sale_expected_date, sale_expected_price,
			lease_remaining_years,
			borrower1_downpayment_cpf_oa, borrower2_downpayment_cpf_oa,
			borrower1_monthly_cpf_oa, borrower2_monthly_cpf_oa,
			borrower1_downpayment_cash_account_id, borrower1_downpayment_cash_amount,
			borrower2_downpayment_cash_account_id, borrower2_downpayment_cash_amount,
			borrower1_monthly_cash_account_id, borrower1_monthly_cash_amount_type, borrower1_monthly_cash_amount,
			borrower2_monthly_cash_account_id, borrower2_monthly_cash_amount_type, borrower2_monthly_cash_amount,
			borrower1_cpf_refund_account_id, borrower2_cpf_refund_account_id, net_cash_proceeds_account_id,
			created_at, updated_at
		FROM property_sg WHERE id = $1
	`, id).Scan(
		&details.ID, &details.Name, &details.PropertyType, &details.PropertySubtype,
		&details.PurchaseIcon, &details.PurchaseIconColor, &details.SaleIcon, &details.SaleIconColor, &details.IsIncluded,
		&details.PropertyPrice, &details.ValuationPrice, &details.LoanType,
		&details.DownpaymentCpfOa, &details.DownpaymentCash,
		&details.BorrowerType, &details.Borrower1IncomeID, &details.Borrower1CpfAccountID,
		&details.Borrower2IncomeID, &details.Borrower2CpfAccountID,
		&details.OtherDebt, &details.PropertyCount,
		&details.BtoLaunchDate, &details.BtoKeyCollectionDate,
		&details.SaleExpectedDate, &details.SaleExpectedPrice,
		&details.LeaseRemainingYears,
		&details.Borrower1DownpaymentCpfOa, &details.Borrower2DownpaymentCpfOa,
		&details.Borrower1MonthlyCpfOa, &details.Borrower2MonthlyCpfOa,
		&details.Borrower1DownpaymentCashAccountID, &details.Borrower1DownpaymentCashAmount,
		&details.Borrower2DownpaymentCashAccountID, &details.Borrower2DownpaymentCashAmount,
		&details.Borrower1MonthlyCashAccountID, &details.Borrower1MonthlyCashAmountType, &details.Borrower1MonthlyCashAmount,
		&details.Borrower2MonthlyCashAccountID, &details.Borrower2MonthlyCashAmountType, &details.Borrower2MonthlyCashAmount,
		&details.Borrower1CpfRefundAccountID, &details.Borrower2CpfRefundAccountID, &details.NetCashProceedsAccountID,
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

// getPropertyFees fetches all fees for a property_sg record
func (s *Store) getPropertyFees(ctx context.Context, propertySGID string) ([]PropertyFee, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_sg_id, my_details_id, fee_context, fee_type, description,
			amount, currency, is_percentage, frequency,
			start_date, end_date, icon, icon_color, created_at
		FROM property_fees
		WHERE property_sg_id = $1
		ORDER BY created_at
	`, propertySGID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fees []PropertyFee
	for rows.Next() {
		var fee PropertyFee
		err := rows.Scan(
			&fee.ID, &fee.PropertySGID, &fee.MYDetailsID, &fee.FeeContext, &fee.FeeType, &fee.Description,
			&fee.Amount, &fee.Currency, &fee.IsPercentage, &fee.Frequency,
			&fee.StartDate, &fee.EndDate, &fee.Icon, &fee.IconColor, &fee.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		fees = append(fees, fee)
	}

	return fees, nil
}

// getGrowthPeriods fetches all growth periods for a scenario (linked to property_sg)
func (s *Store) getGrowthPeriods(ctx context.Context, propertySGID string) ([]GrowthPeriod, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_sg_id, start_date, end_date, growth_rate, growth_strategy, created_at
		FROM growth_periods
		WHERE property_sg_id = $1
		ORDER BY start_date
	`, propertySGID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var periods []GrowthPeriod
	for rows.Next() {
		var period GrowthPeriod
		err := rows.Scan(
			&period.ID, &period.PropertySGID,
			&period.StartDate, &period.EndDate, &period.GrowthRate,
			&period.GrowthStrategy, &period.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		periods = append(periods, period)
	}

	return periods, nil
}

// getRatePeriods fetches all rate periods for a scenario (linked to property_sg)
func (s *Store) getRatePeriods(ctx context.Context, propertySGID string) ([]LiabilityRatePeriod, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_sg_id, liability_id, period_order, start_date,
			term_years, rate, rate_type, created_at
		FROM liability_rate_periods
		WHERE property_sg_id = $1
		ORDER BY period_order
	`, propertySGID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var periods []LiabilityRatePeriod
	for rows.Next() {
		var period LiabilityRatePeriod
		err := rows.Scan(
			&period.ID, &period.PropertySGID, &period.LiabilityID,
			&period.PeriodOrder, &period.StartDate,
			&period.TermYears, &period.Rate, &period.RateType, &period.CreatedAt,
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
		SELECT id, user_id, property_sg_id, my_details_id, created_at, updated_at
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
			&scenario.ID, &scenario.UserID, &scenario.PropertySGID, &scenario.MYDetailsID,
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
	var existingPropertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&existingPropertySGID)
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
	if input.PropertySG != nil && existingPropertySGID != nil {
		if err := s.updatePropertySG(ctx, tx, *existingPropertySGID, input.PropertySG); err != nil {
			return nil, fmt.Errorf("update sg details: %w", err)
		}

		// Delete and recreate grants
		if err := s.deletePropertyGrants(ctx, tx, *existingPropertySGID); err != nil {
			return nil, fmt.Errorf("delete grants: %w", err)
		}
		if err := s.createPropertyGrants(ctx, tx, *existingPropertySGID, input.Grants); err != nil {
			return nil, fmt.Errorf("create grants: %w", err)
		}

		// Delete and recreate fees
		if _, err := tx.Exec(ctx, `DELETE FROM property_fees WHERE property_sg_id = $1`, *existingPropertySGID); err != nil {
			return nil, fmt.Errorf("delete fees: %w", err)
		}
		if err := s.createPropertyFees(ctx, tx, *existingPropertySGID, input.Fees); err != nil {
			return nil, fmt.Errorf("create fees: %w", err)
		}

		// Delete and recreate growth periods (linked to sg_details)
		if _, err := tx.Exec(ctx, `DELETE FROM growth_periods WHERE property_sg_id = $1`, *existingPropertySGID); err != nil {
			return nil, fmt.Errorf("delete growth periods: %w", err)
		}
		if err := s.createGrowthPeriods(ctx, tx, *existingPropertySGID, input.GrowthPeriods); err != nil {
			return nil, fmt.Errorf("create growth periods: %w", err)
		}

		// Delete and recreate rate periods (linked to sg_details)
		if _, err := tx.Exec(ctx, `DELETE FROM liability_rate_periods WHERE property_sg_id = $1`, *existingPropertySGID); err != nil {
			return nil, fmt.Errorf("delete rate periods: %w", err)
		}
		if err := s.createRatePeriods(ctx, tx, *existingPropertySGID, input.RatePeriods); err != nil {
			return nil, fmt.Errorf("create rate periods: %w", err)
		}
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

// updatePropertySG updates Singapore property details
func (s *Store) updatePropertySG(ctx context.Context, tx pgx.Tx, id string, input *CreatePropertySGInput) error {
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

	// Per-borrower CPF OA defaults
	borrower1DownpaymentCpfOa := decimal.Zero()
	if input.Borrower1DownpaymentCpfOa != nil {
		borrower1DownpaymentCpfOa = input.Borrower1DownpaymentCpfOa
	}

	borrower2DownpaymentCpfOa := decimal.Zero()
	if input.Borrower2DownpaymentCpfOa != nil {
		borrower2DownpaymentCpfOa = input.Borrower2DownpaymentCpfOa
	}

	borrower1MonthlyCpfOa := decimal.Zero()
	if input.Borrower1MonthlyCpfOa != nil {
		borrower1MonthlyCpfOa = input.Borrower1MonthlyCpfOa
	}

	borrower2MonthlyCpfOa := decimal.Zero()
	if input.Borrower2MonthlyCpfOa != nil {
		borrower2MonthlyCpfOa = input.Borrower2MonthlyCpfOa
	}

	// Per-borrower cash account defaults (downpayment)
	borrower1DownpaymentCashAmount := decimal.Zero()
	if input.Borrower1DownpaymentCashAmount != nil {
		borrower1DownpaymentCashAmount = input.Borrower1DownpaymentCashAmount
	}

	borrower2DownpaymentCashAmount := decimal.Zero()
	if input.Borrower2DownpaymentCashAmount != nil {
		borrower2DownpaymentCashAmount = input.Borrower2DownpaymentCashAmount
	}

	// Per-borrower cash account defaults (monthly payment)
	borrower1MonthlyCashAmountType := "remainder"
	if input.Borrower1MonthlyCashAmountType != nil {
		borrower1MonthlyCashAmountType = *input.Borrower1MonthlyCashAmountType
	}

	borrower1MonthlyCashAmount := decimal.Zero()
	if input.Borrower1MonthlyCashAmount != nil {
		borrower1MonthlyCashAmount = input.Borrower1MonthlyCashAmount
	}

	borrower2MonthlyCashAmountType := "remainder"
	if input.Borrower2MonthlyCashAmountType != nil {
		borrower2MonthlyCashAmountType = *input.Borrower2MonthlyCashAmountType
	}

	borrower2MonthlyCashAmount := decimal.Zero()
	if input.Borrower2MonthlyCashAmount != nil {
		borrower2MonthlyCashAmount = input.Borrower2MonthlyCashAmount
	}

	_, err := tx.Exec(ctx, `
		UPDATE property_sg SET
			name = $2, property_type = $3, property_subtype = $4,
			purchase_icon = $5, purchase_icon_color = $6, sale_icon = $7, sale_icon_color = $8, is_included = $9,
			property_price = $10, valuation_price = $11, loan_type = $12,
			downpayment_cpf_oa = $13, downpayment_cash = $14,
			borrower_type = $15, borrower1_income_id = $16, borrower1_cpf_account_id = $17,
			borrower2_income_id = $18, borrower2_cpf_account_id = $19,
			other_debt = $20, property_count = $21,
			bto_launch_date = $22, bto_key_collection_date = $23,
			sale_expected_date = $24, sale_expected_price = $25,
			lease_remaining_years = $26,
			borrower1_downpayment_cpf_oa = $27, borrower2_downpayment_cpf_oa = $28,
			borrower1_monthly_cpf_oa = $29, borrower2_monthly_cpf_oa = $30,
			borrower1_downpayment_cash_account_id = $31, borrower1_downpayment_cash_amount = $32,
			borrower2_downpayment_cash_account_id = $33, borrower2_downpayment_cash_amount = $34,
			borrower1_monthly_cash_account_id = $35, borrower1_monthly_cash_amount_type = $36, borrower1_monthly_cash_amount = $37,
			borrower2_monthly_cash_account_id = $38, borrower2_monthly_cash_amount_type = $39, borrower2_monthly_cash_amount = $40,
			borrower1_cpf_refund_account_id = $41, borrower2_cpf_refund_account_id = $42, net_cash_proceeds_account_id = $43,
			updated_at = NOW()
		WHERE id = $1
	`,
		id,
		input.Name, input.PropertyType, input.PropertySubtype,
		input.PurchaseIcon, input.PurchaseIconColor, input.SaleIcon, input.SaleIconColor, isIncluded,
		input.PropertyPrice, input.ValuationPrice, input.LoanType,
		downpaymentCpfOa, downpaymentCash,
		input.BorrowerType, input.Borrower1IncomeID, input.Borrower1CpfAccountID,
		input.Borrower2IncomeID, input.Borrower2CpfAccountID,
		otherDebt, propertyCount,
		input.BtoLaunchDate, input.BtoKeyCollectionDate,
		input.SaleExpectedDate, input.SaleExpectedPrice,
		input.LeaseRemainingYears,
		borrower1DownpaymentCpfOa, borrower2DownpaymentCpfOa,
		borrower1MonthlyCpfOa, borrower2MonthlyCpfOa,
		input.Borrower1DownpaymentCashAccountID, borrower1DownpaymentCashAmount,
		input.Borrower2DownpaymentCashAccountID, borrower2DownpaymentCashAmount,
		input.Borrower1MonthlyCashAccountID, borrower1MonthlyCashAmountType, borrower1MonthlyCashAmount,
		input.Borrower2MonthlyCashAccountID, borrower2MonthlyCashAmountType, borrower2MonthlyCashAmount,
		input.Borrower1CpfRefundAccountID, input.Borrower2CpfRefundAccountID, input.NetCashProceedsAccountID,
	)

	return err
}

// DeletePropertyScenario deletes a scenario and all related data (cascades via FK)
func (s *Store) DeletePropertyScenario(ctx context.Context, userID, scenarioID string) error {
	// Get the property_sg_id first (we need to delete it separately since FK is ON DELETE CASCADE only from scenario)
	var propertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&propertySGID)
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
	if propertySGID != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM property_sg WHERE id = $1`, *propertySGID); err != nil {
			return fmt.Errorf("delete sg details: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// ============================================================================
// Grant CRUD Methods
// ============================================================================

// createPropertyGrants creates grants for an sg_details record
func (s *Store) createPropertyGrants(ctx context.Context, tx pgx.Tx, propertySGID string, grants []CreateGrantInput) error {
	for _, grant := range grants {
		_, err := tx.Exec(ctx, `
			INSERT INTO property_sg_grants (property_sg_id, name, amount)
			VALUES ($1, $2, $3)
		`, propertySGID, grant.Name, grant.Amount)
		if err != nil {
			return fmt.Errorf("insert grant: %w", err)
		}
	}
	return nil
}

// getPropertyGrants fetches all grants for an sg_details record
func (s *Store) getPropertyGrants(ctx context.Context, propertySGID string) ([]PropertySGGrant, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, property_sg_id, name, amount, created_at
		FROM property_sg_grants
		WHERE property_sg_id = $1
		ORDER BY created_at
	`, propertySGID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var grants []PropertySGGrant
	for rows.Next() {
		var grant PropertySGGrant
		err := rows.Scan(&grant.ID, &grant.PropertySGID, &grant.Name, &grant.Amount, &grant.CreatedAt)
		if err != nil {
			return nil, err
		}
		grants = append(grants, grant)
	}
	return grants, nil
}

// deletePropertyGrants deletes all grants for an sg_details record
func (s *Store) deletePropertyGrants(ctx context.Context, tx pgx.Tx, propertySGID string) error {
	_, err := tx.Exec(ctx, `DELETE FROM property_sg_grants WHERE property_sg_id = $1`, propertySGID)
	return err
}

// CreateGrant creates a single grant for a scenario
func (s *Store) CreateGrant(ctx context.Context, userID, scenarioID string, input CreateGrantInput) (*PropertySGGrant, error) {
	// Get property_sg_id from scenario
	var propertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&propertySGID)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get scenario: %w", err)
	}
	if propertySGID == nil {
		return nil, fmt.Errorf("scenario has no SG details")
	}

	var grant PropertySGGrant
	err = s.pool.QueryRow(ctx, `
		INSERT INTO property_sg_grants (property_sg_id, name, amount)
		VALUES ($1, $2, $3)
		RETURNING id, property_sg_id, name, amount, created_at
	`, *propertySGID, input.Name, input.Amount).Scan(
		&grant.ID, &grant.PropertySGID, &grant.Name, &grant.Amount, &grant.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert grant: %w", err)
	}

	return &grant, nil
}

// UpdateGrant updates a single grant
func (s *Store) UpdateGrant(ctx context.Context, userID, scenarioID, grantID string, input CreateGrantInput) (*PropertySGGrant, error) {
	// Verify ownership
	var propertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&propertySGID)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get scenario: %w", err)
	}
	if propertySGID == nil {
		return nil, fmt.Errorf("scenario has no SG details")
	}

	var grant PropertySGGrant
	err = s.pool.QueryRow(ctx, `
		UPDATE property_sg_grants
		SET name = $2, amount = $3
		WHERE id = $1 AND property_sg_id = $4
		RETURNING id, property_sg_id, name, amount, created_at
	`, grantID, input.Name, input.Amount, *propertySGID).Scan(
		&grant.ID, &grant.PropertySGID, &grant.Name, &grant.Amount, &grant.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update grant: %w", err)
	}

	return &grant, nil
}

// DeleteGrant deletes a single grant
func (s *Store) DeleteGrant(ctx context.Context, userID, scenarioID, grantID string) error {
	// Verify ownership
	var propertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&propertySGID)
	if err == pgx.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("get scenario: %w", err)
	}
	if propertySGID == nil {
		return fmt.Errorf("scenario has no SG details")
	}

	tag, err := s.pool.Exec(ctx, `
		DELETE FROM property_sg_grants
		WHERE id = $1 AND property_sg_id = $2
	`, grantID, *propertySGID)
	if err != nil {
		return fmt.Errorf("delete grant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// ListGrants returns all grants for a scenario
func (s *Store) ListGrants(ctx context.Context, userID, scenarioID string) ([]PropertySGGrant, error) {
	// Verify ownership and get property_sg_id
	var propertySGID *string
	err := s.pool.QueryRow(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE id = $1 AND user_id = $2
	`, scenarioID, userID).Scan(&propertySGID)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get scenario: %w", err)
	}
	if propertySGID == nil {
		return []PropertySGGrant{}, nil
	}

	return s.getPropertyGrants(ctx, *propertySGID)
}

// DeleteAllPropertyScenarios deletes all property scenarios for a user
func (s *Store) DeleteAllPropertyScenarios(ctx context.Context, userID string) (int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get all property_sg_ids for the user's scenarios
	rows, err := tx.Query(ctx, `
		SELECT property_sg_id FROM property_scenarios
		WHERE user_id = $1 AND property_sg_id IS NOT NULL
	`, userID)
	if err != nil {
		return 0, fmt.Errorf("get property_sg_ids: %w", err)
	}

	var propertySGIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, fmt.Errorf("scan property_sg_id: %w", err)
		}
		propertySGIDs = append(propertySGIDs, id)
	}
	rows.Close()

	// Delete all property scenarios (cascades to child tables via FK)
	tag, err := tx.Exec(ctx, `DELETE FROM property_scenarios WHERE user_id = $1`, userID)
	if err != nil {
		return 0, fmt.Errorf("delete scenarios: %w", err)
	}
	rowsAffected := tag.RowsAffected()

	// Delete sg_details records (not cascaded from scenario deletion)
	for _, propertySGID := range propertySGIDs {
		if _, err := tx.Exec(ctx, `DELETE FROM property_sg WHERE id = $1`, propertySGID); err != nil {
			return 0, fmt.Errorf("delete sg details %s: %w", propertySGID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit transaction: %w", err)
	}

	return rowsAffected, nil
}

// ListIncludedPropertyScenarios returns property scenarios where is_included=true
// for use in timeline projections. Only returns scenarios with SG details currently.
func (s *Store) ListIncludedPropertyScenarios(ctx context.Context, userID string) ([]PropertyScenarioFull, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ps.id, ps.user_id, ps.property_sg_id, ps.my_details_id, ps.created_at, ps.updated_at
		FROM property_scenarios ps
		JOIN property_sg sg ON ps.property_sg_id = sg.id
		WHERE ps.user_id = $1 AND sg.is_included = true
		ORDER BY ps.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list included scenarios: %w", err)
	}
	defer rows.Close()

	var scenarios []PropertyScenarioFull
	for rows.Next() {
		var scenario PropertyScenario
		err := rows.Scan(
			&scenario.ID, &scenario.UserID, &scenario.PropertySGID, &scenario.MYDetailsID,
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

// ============================================================================
// Cross-Property Validation Methods
// ============================================================================

// OtherPropertyMortgageInfo contains mortgage info from other included properties
type OtherPropertyMortgageInfo struct {
	PropertySGID   string          `json:"propertySgId"`
	PropertyName   string          `json:"propertyName"`
	LoanAmount     decimal.Decimal `json:"loanAmount"`
	MonthlyPayment decimal.Decimal `json:"monthlyPayment"`
	FirstRate      decimal.Decimal `json:"firstRate"`
	TotalTermYears int             `json:"totalTermYears"`
}

// GetOtherIncludedPropertyMortgages returns mortgage details for other included properties.
// This is used for TDSR calculation when validating a new property scenario.
// Excludes the property with the given excludePropertySGID (can be nil for new properties).
func (s *Store) GetOtherIncludedPropertyMortgages(
	ctx context.Context,
	userID string,
	excludePropertySGID *string,
) ([]OtherPropertyMortgageInfo, error) {
	// Query all included properties with their first rate period
	// We need: property_price, downpayment totals, grants, and rate info to calculate loan amount and monthly payment
	query := `
		SELECT
			sg.id,
			sg.name,
			sg.property_price,
			sg.downpayment_cpf_oa,
			sg.downpayment_cash,
			COALESCE((SELECT SUM(amount) FROM property_sg_grants WHERE property_sg_id = sg.id), 0) as grants_total,
			rp.rate,
			rp.term_years
		FROM property_scenarios ps
		JOIN property_sg sg ON ps.property_sg_id = sg.id
		LEFT JOIN LATERAL (
			SELECT rate, term_years
			FROM liability_rate_periods
			WHERE property_sg_id = sg.id
			ORDER BY period_order
			LIMIT 1
		) rp ON true
		WHERE ps.user_id = $1
		  AND sg.is_included = true
		  AND ($2::uuid IS NULL OR sg.id != $2)
	`

	var excludeID interface{}
	if excludePropertySGID != nil {
		excludeID = *excludePropertySGID
	}

	rows, err := s.pool.Query(ctx, query, userID, excludeID)
	if err != nil {
		return nil, fmt.Errorf("query other property mortgages: %w", err)
	}
	defer rows.Close()

	var results []OtherPropertyMortgageInfo
	for rows.Next() {
		var info OtherPropertyMortgageInfo
		var propertyPrice, downpaymentCpfOa, downpaymentCash, grantsTotal decimal.Decimal
		var rate *decimal.Decimal
		var termYears *int

		err := rows.Scan(
			&info.PropertySGID,
			&info.PropertyName,
			&propertyPrice,
			&downpaymentCpfOa,
			&downpaymentCash,
			&grantsTotal,
			&rate,
			&termYears,
		)
		if err != nil {
			return nil, fmt.Errorf("scan property mortgage info: %w", err)
		}

		// Skip if no rate period (can't calculate mortgage)
		if rate == nil || termYears == nil {
			continue
		}

		// Calculate loan amount: property_price - (cpf_oa + cash + grants)
		downpaymentTotal := downpaymentCpfOa.Add(&downpaymentCash)
		downpaymentTotal = downpaymentTotal.Add(&grantsTotal)
		loanAmount := propertyPrice.Sub(downpaymentTotal)

		// Skip if loan amount is zero or negative
		zero := decimal.Zero()
		if loanAmount.Cmp(zero) <= 0 {
			continue
		}

		info.LoanAmount = *loanAmount
		info.FirstRate = *rate
		info.TotalTermYears = *termYears

		// Monthly payment will be calculated in the service layer using the calculator
		// For now, store the components needed

		results = append(results, info)
	}

	return results, nil
}

// CPFOAUsageByAccount represents CPF OA usage aggregated by account
type CPFOAUsageByAccount struct {
	AccountID  string          `json:"accountId"`
	PersonID   string          `json:"personId"`
	PersonName string          `json:"personName"`
	OABalance  decimal.Decimal `json:"oaBalance"`
	TotalUsage decimal.Decimal `json:"totalUsage"`
}

// GetCPFOAUsageByAccount returns total CPF OA usage across all included properties,
// grouped by CPF account ID. Excludes the property with the given excludePropertySGID.
func (s *Store) GetCPFOAUsageByAccount(
	ctx context.Context,
	userID string,
	excludePropertySGID *string,
) ([]CPFOAUsageByAccount, error) {
	// Query to get CPF OA usage by account from all included properties
	// We need to consider both borrower1 and borrower2 CPF accounts
	query := `
		WITH property_cpf_usage AS (
			-- Get borrower1 CPF usage (per-borrower tracking)
			SELECT
				sg.borrower1_cpf_account_id as cpf_account_id,
				sg.borrower1_downpayment_cpf_oa as usage
			FROM property_scenarios ps
			JOIN property_sg sg ON ps.property_sg_id = sg.id
			WHERE ps.user_id = $1
			  AND sg.is_included = true
			  AND sg.borrower1_cpf_account_id IS NOT NULL
			  AND ($2::uuid IS NULL OR sg.id != $2)

			UNION ALL

			-- Get borrower2 CPF usage (per-borrower tracking for joint purchases)
			SELECT
				sg.borrower2_cpf_account_id as cpf_account_id,
				sg.borrower2_downpayment_cpf_oa as usage
			FROM property_scenarios ps
			JOIN property_sg sg ON ps.property_sg_id = sg.id
			WHERE ps.user_id = $1
			  AND sg.is_included = true
			  AND sg.borrower2_cpf_account_id IS NOT NULL
			  AND sg.borrower2_cpf_account_id != sg.borrower1_cpf_account_id  -- Avoid double-counting if same account
			  AND ($2::uuid IS NULL OR sg.id != $2)
		)
		SELECT
			cpf.id as account_id,
			COALESCE(cpf.person_id::text, '') as person_id,
			COALESCE(p.name, '') as person_name,
			cpf.oa_balance,
			COALESCE(SUM(pcu.usage), 0) as total_usage
		FROM cpf_accounts cpf
		LEFT JOIN persons p ON cpf.person_id = p.id
		LEFT JOIN property_cpf_usage pcu ON cpf.id = pcu.cpf_account_id
		WHERE cpf.user_id = $1
		  AND cpf.end_date IS NULL  -- Only active CPF accounts
		  AND cpf.id IN (SELECT cpf_account_id FROM property_cpf_usage WHERE cpf_account_id IS NOT NULL)
		GROUP BY cpf.id, cpf.person_id, p.name, cpf.oa_balance
	`

	var excludeID interface{}
	if excludePropertySGID != nil {
		excludeID = *excludePropertySGID
	}

	rows, err := s.pool.Query(ctx, query, userID, excludeID)
	if err != nil {
		return nil, fmt.Errorf("query CPF OA usage by account: %w", err)
	}
	defer rows.Close()

	var results []CPFOAUsageByAccount
	for rows.Next() {
		var usage CPFOAUsageByAccount
		err := rows.Scan(
			&usage.AccountID,
			&usage.PersonID,
			&usage.PersonName,
			&usage.OABalance,
			&usage.TotalUsage,
		)
		if err != nil {
			return nil, fmt.Errorf("scan CPF OA usage: %w", err)
		}
		results = append(results, usage)
	}

	return results, nil
}

// GetCPFAccountOABalance retrieves the OA balance for a specific CPF account.
// Returns the OA balance and personID for the account.
func (s *Store) GetCPFAccountOABalance(ctx context.Context, userID, accountID string) (*decimal.Decimal, string, error) {
	var oaBalance decimal.Decimal
	var personID string
	err := s.pool.QueryRow(ctx, `
		SELECT oa_balance, COALESCE(person_id::text, '')
		FROM cpf_accounts
		WHERE user_id = $1 AND id = $2 AND end_date IS NULL
	`, userID, accountID).Scan(&oaBalance, &personID)
	if err == pgx.ErrNoRows {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", fmt.Errorf("get CPF OA balance: %w", err)
	}
	return &oaBalance, personID, nil
}
