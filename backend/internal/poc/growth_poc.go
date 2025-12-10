package poc

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial/growth"
)

// AccountPOC demonstrates using apd decimals for a simple account with growth
type AccountPOC struct {
	ID            string
	Name          string
	Balance       *decimal.Decimal // Using apd decimal
	GrowthRatePct *decimal.Decimal // Annual growth rate as percentage (e.g., 3.0 for 3%)
	Currency      string
}

// AccountPOCDTO is the JSON representation
type AccountPOCDTO struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Balance       string `json:"balance"`        // JSON as string
	GrowthRatePct string `json:"growth_rate_pct"` // JSON as string
	Currency      string `json:"currency"`
}

// ToDTO converts internal model to JSON DTO
func (a *AccountPOC) ToDTO() AccountPOCDTO {
	return AccountPOCDTO{
		ID:            a.ID,
		Name:          a.Name,
		Balance:       a.Balance.String(),
		GrowthRatePct: a.GrowthRatePct.String(),
		Currency:      a.Currency,
	}
}

// FromDTO converts JSON DTO to internal model
func FromDTO(dto AccountPOCDTO) (*AccountPOC, error) {
	balance, err := decimal.NewFromString(dto.Balance)
	if err != nil {
		return nil, fmt.Errorf("invalid balance: %w", err)
	}

	growthRate, err := decimal.NewFromString(dto.GrowthRatePct)
	if err != nil {
		return nil, fmt.Errorf("invalid growth rate: %w", err)
	}

	return &AccountPOC{
		ID:            dto.ID,
		Name:          dto.Name,
		Balance:       balance,
		GrowthRatePct: growthRate,
		Currency:      dto.Currency,
	}, nil
}

// MarshalJSON implements json.Marshaler
func (a AccountPOC) MarshalJSON() ([]byte, error) {
	return json.Marshal(a.ToDTO())
}

// UnmarshalJSON implements json.Unmarshaler
func (a *AccountPOC) UnmarshalJSON(data []byte) error {
	var dto AccountPOCDTO
	if err := json.Unmarshal(data, &dto); err != nil {
		return err
	}

	acc, err := FromDTO(dto)
	if err != nil {
		return err
	}

	*a = *acc
	return nil
}

// ApplyMonthlyGrowth applies compound monthly growth for N months
func (a *AccountPOC) ApplyMonthlyGrowth(months int) error {
	strategy := growth.NewCompoundMonthly()

	for i := 0; i < months; i++ {
		newBalance, err := strategy.Calculate(growth.Params{
			CurrentValue: a.Balance,
			Rate:         a.GrowthRatePct,
			PeriodIndex:  i,
			Frequency:    "monthly",
		})
		if err != nil {
			return fmt.Errorf("failed to apply growth: %w", err)
		}
		a.Balance = newBalance
	}

	return nil
}

// ApplyAnnualGrowth applies annual step growth for N years
func (a *AccountPOC) ApplyAnnualGrowth(years int) error {
	strategy := growth.NewAnnualStep()

	for i := 0; i < years; i++ {
		newBalance, err := strategy.Calculate(growth.Params{
			CurrentValue: a.Balance,
			Rate:         a.GrowthRatePct,
			PeriodIndex:  i,
			Frequency:    "yearly",
		})
		if err != nil {
			return fmt.Errorf("failed to apply growth: %w", err)
		}
		a.Balance = newBalance
	}

	return nil
}

// DatabasePOC demonstrates database operations
type DatabasePOC struct {
	db *sql.DB
}

// NewDatabasePOC creates a new database POC
func NewDatabasePOC(db *sql.DB) *DatabasePOC {
	return &DatabasePOC{db: db}
}

// CreateTable creates the POC table with NUMERIC types
func (d *DatabasePOC) CreateTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS poc_accounts (
			id VARCHAR(36) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			balance NUMERIC(15,2) NOT NULL,
			growth_rate_pct NUMERIC(8,4) NOT NULL,
			currency VARCHAR(3) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
	_, err := d.db.ExecContext(ctx, query)
	return err
}

// Insert inserts an account into the database
func (d *DatabasePOC) Insert(ctx context.Context, acc *AccountPOC) error {
	query := `
		INSERT INTO poc_accounts (id, name, balance, growth_rate_pct, currency)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := d.db.ExecContext(ctx, query,
		acc.ID,
		acc.Name,
		acc.Balance, // decimal.Decimal implements driver.Valuer
		acc.GrowthRatePct,
		acc.Currency,
	)
	return err
}

// Get retrieves an account from the database
func (d *DatabasePOC) Get(ctx context.Context, id string) (*AccountPOC, error) {
	query := `
		SELECT id, name, balance, growth_rate_pct, currency
		FROM poc_accounts
		WHERE id = $1
	`

	acc := &AccountPOC{
		Balance:       &decimal.Decimal{},
		GrowthRatePct: &decimal.Decimal{},
	}

	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&acc.ID,
		&acc.Name,
		acc.Balance,       // decimal.Decimal implements sql.Scanner
		acc.GrowthRatePct,
		&acc.Currency,
	)
	if err != nil {
		return nil, err
	}

	return acc, nil
}

// Update updates an account in the database
func (d *DatabasePOC) Update(ctx context.Context, acc *AccountPOC) error {
	query := `
		UPDATE poc_accounts
		SET balance = $1, growth_rate_pct = $2
		WHERE id = $3
	`
	_, err := d.db.ExecContext(ctx, query,
		acc.Balance,
		acc.GrowthRatePct,
		acc.ID,
	)
	return err
}

// DropTable drops the POC table
func (d *DatabasePOC) DropTable(ctx context.Context) error {
	_, err := d.db.ExecContext(ctx, "DROP TABLE IF EXISTS poc_accounts")
	return err
}
