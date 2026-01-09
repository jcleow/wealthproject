// Package account provides CPF account management and persistence.
//
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
package account

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
)

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("cpf account not found")

// CPFAccount represents a user's CPF account with balances and profile data.
// Personal data (DOB, residency) is stored in the linked persons table.
type CPFAccount struct {
	ID               string                 `json:"id"`
	UserID           string                 `json:"userId"`
	PersonID         string                 `json:"personId"`
	PersonName       string                 `json:"personName"`
	ParentID         *string                `json:"parentId,omitempty"`
	OABalance        float64                `json:"oaBalance"`
	SABalance        float64                `json:"saBalance"`
	MABalance        float64                `json:"maBalance"`
	RABalance        float64                `json:"raBalance"`
	OAUsedForHousing float64                `json:"oaUsedForHousing"`
	HousingStartDate *time.Time             `json:"housingStartDate"`
	StartDate        time.Time              `json:"startDate"`
	EndDate          *time.Time             `json:"endDate,omitempty"`
	// Person data (from joined persons table)
	DateOfBirth     time.Time              `json:"dateOfBirth"`
	ResidencyStatus config.ResidencyStatus `json:"residencyStatus"`
	PRGrantDate     *time.Time             `json:"prGrantDate"`
	CreatedAt       time.Time              `json:"createdAt"`
	UpdatedAt       time.Time              `json:"updatedAt"`
}

// TotalBalance returns the total CPF balance.
func (a *CPFAccount) TotalBalance() float64 {
	return a.OABalance + a.SABalance + a.MABalance + a.RABalance
}

// Age returns the current age based on date of birth.
// CPF contribution rates are based on the employee's age on the date of contribution,
// not the calendar year age.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func (a *CPFAccount) Age() int {
	now := time.Now()
	age := now.Year() - a.DateOfBirth.Year()
	// Adjust if birthday hasn't occurred yet this year
	if now.YearDay() < a.DateOfBirth.YearDay() {
		age--
	}
	return age
}

// AgeAtDate returns the age at a specific date.
// Use this to calculate CPF contributions for a specific payment date,
// as rates are based on age on the date of contribution.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func (a *CPFAccount) AgeAtDate(date time.Time) int {
	age := date.Year() - a.DateOfBirth.Year()
	if date.YearDay() < a.DateOfBirth.YearDay() {
		age--
	}
	return age
}

// Repository handles CPF account persistence.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new CPF account repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// selectColumns defines the columns selected from cpf_accounts JOIN persons.
const selectColumns = `
	c.id, c.user_id, c.person_id, c.parent_id,
	c.oa_balance, c.sa_balance, c.ma_balance, c.ra_balance,
	c.oa_used_for_housing, c.housing_start_date,
	c.start_date, c.end_date,
	c.created_at, c.updated_at,
	p.name, p.date_of_birth, p.residency_status, p.pr_grant_date
`

// scanAccount scans a row into a CPFAccount struct.
func scanAccount(row interface{ Scan(...any) error }) (*CPFAccount, error) {
	var acc CPFAccount
	var parentID sql.NullString
	var housingStartDate, endDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&acc.ID, &acc.UserID, &acc.PersonID, &parentID,
		&acc.OABalance, &acc.SABalance, &acc.MABalance, &acc.RABalance,
		&acc.OAUsedForHousing, &housingStartDate,
		&acc.StartDate, &endDate,
		&acc.CreatedAt, &acc.UpdatedAt,
		&acc.PersonName, &acc.DateOfBirth, &residencyStatus, &prGrantDate,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if parentID.Valid {
		acc.ParentID = &parentID.String
	}
	if housingStartDate.Valid {
		acc.HousingStartDate = &housingStartDate.Time
	}
	if endDate.Valid {
		acc.EndDate = &endDate.Time
	}
	if prGrantDate.Valid {
		acc.PRGrantDate = &prGrantDate.Time
	}
	acc.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &acc, nil
}

// Get retrieves the current CPF account for a user (where end_date is null).
func (r *Repository) Get(ctx context.Context, userID string) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+selectColumns+`
		FROM cpf_accounts c
		JOIN persons p ON c.person_id = p.id
		WHERE c.user_id = $1 AND c.end_date IS NULL
		ORDER BY c.start_date DESC
		LIMIT 1`, userID)

	return scanAccount(row)
}

// GetByID retrieves a CPF account by its ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+selectColumns+`
		FROM cpf_accounts c
		JOIN persons p ON c.person_id = p.id
		WHERE c.id = $1`, id)

	return scanAccount(row)
}

// GetByPersonID retrieves the current CPF account for a specific person.
func (r *Repository) GetByPersonID(ctx context.Context, userID, personID string) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+selectColumns+`
		FROM cpf_accounts c
		JOIN persons p ON c.person_id = p.id
		WHERE c.user_id = $1 AND c.person_id = $2 AND c.end_date IS NULL
		ORDER BY c.start_date DESC
		LIMIT 1`, userID, personID)

	return scanAccount(row)
}

// ListByUser retrieves all current CPF accounts for a user (one per person).
func (r *Repository) ListByUser(ctx context.Context, userID string) ([]*CPFAccount, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+selectColumns+`
		FROM cpf_accounts c
		JOIN persons p ON c.person_id = p.id
		WHERE c.user_id = $1 AND c.end_date IS NULL
		ORDER BY p.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []*CPFAccount
	for rows.Next() {
		acc, err := scanAccount(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, acc)
	}

	return accounts, rows.Err()
}

// CreateAccountInput contains the data needed to create a CPF account.
type CreateAccountInput struct {
	UserID           string
	PersonID         string
	OABalance        float64
	SABalance        float64
	MABalance        float64
	RABalance        float64
	OAUsedForHousing float64
	HousingStartDate *time.Time
}

// Create creates a new CPF account for an existing person.
func (r *Repository) Create(ctx context.Context, input CreateAccountInput) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO cpf_accounts (
			user_id, person_id, oa_balance, sa_balance, ma_balance, ra_balance,
			oa_used_for_housing, housing_start_date
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`,
		input.UserID, input.PersonID,
		input.OABalance, input.SABalance, input.MABalance, input.RABalance,
		input.OAUsedForHousing, input.HousingStartDate,
	)

	var id string
	if err := row.Scan(&id); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// UpdateBalancesInput contains balance updates.
type UpdateBalancesInput struct {
	OABalance        *float64
	SABalance        *float64
	MABalance        *float64
	RABalance        *float64
	OAUsedForHousing *float64
	HousingStartDate *time.Time
}

// UpdateBalances updates the balances of a CPF account.
func (r *Repository) UpdateBalances(ctx context.Context, id string, input UpdateBalancesInput) (*CPFAccount, error) {
	// Use a simpler approach: always update all balance fields
	_, err := r.db.ExecContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = COALESCE($2, oa_balance),
		    sa_balance = COALESCE($3, sa_balance),
		    ma_balance = COALESCE($4, ma_balance),
		    ra_balance = COALESCE($5, ra_balance),
		    oa_used_for_housing = COALESCE($6, oa_used_for_housing),
		    housing_start_date = COALESCE($7, housing_start_date),
		    updated_at = NOW()
		WHERE id = $1`,
		id,
		input.OABalance, input.SABalance, input.MABalance, input.RABalance,
		input.OAUsedForHousing, input.HousingStartDate,
	)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// AddContribution adds contribution amounts to the respective accounts.
func (r *Repository) AddContribution(ctx context.Context, id string, oaAmount, saAmount, maAmount, raAmount float64) (*CPFAccount, error) {
	_, err := r.db.ExecContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = oa_balance + $2,
		    sa_balance = sa_balance + $3,
		    ma_balance = ma_balance + $4,
		    ra_balance = ra_balance + $5,
		    updated_at = NOW()
		WHERE id = $1`,
		id, oaAmount, saAmount, maAmount, raAmount,
	)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// WithdrawFromOA withdraws from OA for housing purposes.
// Records the withdrawal and updates the housing usage tracker.
func (r *Repository) WithdrawFromOA(ctx context.Context, id string, amount float64) (*CPFAccount, error) {
	result, err := r.db.ExecContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = oa_balance - $2,
		    oa_used_for_housing = oa_used_for_housing + $2,
		    housing_start_date = COALESCE(housing_start_date, NOW()),
		    updated_at = NOW()
		WHERE id = $1 AND oa_balance >= $2`,
		id, amount,
	)
	if err != nil {
		return nil, err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, errors.New("insufficient OA balance or account not found")
	}

	return r.GetByID(ctx, id)
}

// Delete removes a CPF account by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM cpf_accounts WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// Upsert creates or updates a CPF account for a person.
// If an active account exists for the person, it updates balances.
// Otherwise, it creates a new account.
func (r *Repository) Upsert(ctx context.Context, input CreateAccountInput) (*CPFAccount, error) {
	// Try to get existing account for this person
	existing, err := r.GetByPersonID(ctx, input.UserID, input.PersonID)
	if err == nil {
		// Update existing account
		oaBalance := input.OABalance
		saBalance := input.SABalance
		maBalance := input.MABalance
		raBalance := input.RABalance
		oaUsedForHousing := input.OAUsedForHousing

		return r.UpdateBalances(ctx, existing.ID, UpdateBalancesInput{
			OABalance:        &oaBalance,
			SABalance:        &saBalance,
			MABalance:        &maBalance,
			RABalance:        &raBalance,
			OAUsedForHousing: &oaUsedForHousing,
			HousingStartDate: input.HousingStartDate,
		})
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	// Create new account
	return r.Create(ctx, input)
}
