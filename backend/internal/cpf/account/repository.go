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
	"financial-chat-system/backend/internal/decimal"
)

// ResidencyStatus is an alias for config.ResidencyStatus for convenience
type ResidencyStatus = config.ResidencyStatus

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("cpf account not found")

// CPFAccount represents a user's CPF account with balances and profile data.
type CPFAccount struct {
	ID               string                 `json:"id"`
	UserID           string                 `json:"userId"`
	OABalance        decimal.Decimal        `json:"oaBalance"`
	SABalance        decimal.Decimal        `json:"saBalance"`
	MABalance        decimal.Decimal        `json:"maBalance"`
	RABalance        decimal.Decimal        `json:"raBalance"`
	OAUsedForHousing decimal.Decimal        `json:"oaUsedForHousing"`
	HousingStartDate *time.Time             `json:"housingStartDate"`
	DateOfBirth      time.Time              `json:"dateOfBirth"`
	ResidencyStatus  config.ResidencyStatus `json:"residencyStatus"`
	PRGrantDate      *time.Time             `json:"prGrantDate"`
	CreatedAt        time.Time              `json:"createdAt"`
	UpdatedAt        time.Time              `json:"updatedAt"`
}

// TotalBalance returns the total CPF balance.
func (a *CPFAccount) TotalBalance() *decimal.Decimal {
	total := decimal.Zero()
	total, _ = total.Add(&a.OABalance)
	total, _ = total.Add(&a.SABalance)
	total, _ = total.Add(&a.MABalance)
	total, _ = total.Add(&a.RABalance)
	return total
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

// Get retrieves the CPF account for a user.
func (r *Repository) Get(ctx context.Context, userID string) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		       oa_used_for_housing, housing_start_date, date_of_birth,
		       residency_status, pr_grant_date, created_at, updated_at
		FROM cpf_accounts
		WHERE user_id = $1`, userID)

	var acc CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&acc.ID, &acc.UserID, &acc.OABalance, &acc.SABalance, &acc.MABalance, &acc.RABalance,
		&acc.OAUsedForHousing, &housingStartDate, &acc.DateOfBirth,
		&residencyStatus, &prGrantDate, &acc.CreatedAt, &acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if housingStartDate.Valid {
		acc.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		acc.PRGrantDate = &prGrantDate.Time
	}
	acc.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &acc, nil
}

// Create creates a new CPF account for a user.
func (r *Repository) Create(ctx context.Context, acc *CPFAccount) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO cpf_accounts (
			user_id, oa_balance, sa_balance, ma_balance, ra_balance,
			oa_used_for_housing, housing_start_date, date_of_birth,
			residency_status, pr_grant_date
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		          oa_used_for_housing, housing_start_date, date_of_birth,
		          residency_status, pr_grant_date, created_at, updated_at`,
		acc.UserID, acc.OABalance, acc.SABalance, acc.MABalance, acc.RABalance,
		acc.OAUsedForHousing, acc.HousingStartDate, acc.DateOfBirth,
		string(acc.ResidencyStatus), acc.PRGrantDate,
	)

	var created CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&created.ID, &created.UserID, &created.OABalance, &created.SABalance,
		&created.MABalance, &created.RABalance, &created.OAUsedForHousing,
		&housingStartDate, &created.DateOfBirth, &residencyStatus,
		&prGrantDate, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if housingStartDate.Valid {
		created.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		created.PRGrantDate = &prGrantDate.Time
	}
	created.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &created, nil
}

// Update updates an existing CPF account.
func (r *Repository) Update(ctx context.Context, userID string, acc *CPFAccount) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = $2,
		    sa_balance = $3,
		    ma_balance = $4,
		    ra_balance = $5,
		    oa_used_for_housing = $6,
		    housing_start_date = $7,
		    date_of_birth = $8,
		    residency_status = $9,
		    pr_grant_date = $10,
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		          oa_used_for_housing, housing_start_date, date_of_birth,
		          residency_status, pr_grant_date, created_at, updated_at`,
		userID, acc.OABalance, acc.SABalance, acc.MABalance, acc.RABalance,
		acc.OAUsedForHousing, acc.HousingStartDate, acc.DateOfBirth,
		string(acc.ResidencyStatus), acc.PRGrantDate,
	)

	var updated CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&updated.ID, &updated.UserID, &updated.OABalance, &updated.SABalance,
		&updated.MABalance, &updated.RABalance, &updated.OAUsedForHousing,
		&housingStartDate, &updated.DateOfBirth, &residencyStatus,
		&prGrantDate, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if housingStartDate.Valid {
		updated.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		updated.PRGrantDate = &prGrantDate.Time
	}
	updated.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &updated, nil
}

// Upsert creates or updates a CPF account for a user.
func (r *Repository) Upsert(ctx context.Context, acc *CPFAccount) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO cpf_accounts (
			user_id, oa_balance, sa_balance, ma_balance, ra_balance,
			oa_used_for_housing, housing_start_date, date_of_birth,
			residency_status, pr_grant_date
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id) DO UPDATE
		SET oa_balance = EXCLUDED.oa_balance,
		    sa_balance = EXCLUDED.sa_balance,
		    ma_balance = EXCLUDED.ma_balance,
		    ra_balance = EXCLUDED.ra_balance,
		    oa_used_for_housing = EXCLUDED.oa_used_for_housing,
		    housing_start_date = EXCLUDED.housing_start_date,
		    date_of_birth = EXCLUDED.date_of_birth,
		    residency_status = EXCLUDED.residency_status,
		    pr_grant_date = EXCLUDED.pr_grant_date,
		    updated_at = NOW()
		RETURNING id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		          oa_used_for_housing, housing_start_date, date_of_birth,
		          residency_status, pr_grant_date, created_at, updated_at`,
		acc.UserID, acc.OABalance, acc.SABalance, acc.MABalance, acc.RABalance,
		acc.OAUsedForHousing, acc.HousingStartDate, acc.DateOfBirth,
		string(acc.ResidencyStatus), acc.PRGrantDate,
	)

	var result CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&result.ID, &result.UserID, &result.OABalance, &result.SABalance,
		&result.MABalance, &result.RABalance, &result.OAUsedForHousing,
		&housingStartDate, &result.DateOfBirth, &residencyStatus,
		&prGrantDate, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if housingStartDate.Valid {
		result.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		result.PRGrantDate = &prGrantDate.Time
	}
	result.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &result, nil
}

// AddContribution adds contribution amounts to the respective accounts.
func (r *Repository) AddContribution(ctx context.Context, userID string, oaAmount, saAmount, maAmount, raAmount *decimal.Decimal) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = oa_balance + $2,
		    sa_balance = sa_balance + $3,
		    ma_balance = ma_balance + $4,
		    ra_balance = ra_balance + $5,
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		          oa_used_for_housing, housing_start_date, date_of_birth,
		          residency_status, pr_grant_date, created_at, updated_at`,
		userID, oaAmount, saAmount, maAmount, raAmount,
	)

	var acc CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&acc.ID, &acc.UserID, &acc.OABalance, &acc.SABalance,
		&acc.MABalance, &acc.RABalance, &acc.OAUsedForHousing,
		&housingStartDate, &acc.DateOfBirth, &residencyStatus,
		&prGrantDate, &acc.CreatedAt, &acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if housingStartDate.Valid {
		acc.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		acc.PRGrantDate = &prGrantDate.Time
	}
	acc.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &acc, nil
}

// WithdrawFromOA withdraws from OA for housing purposes.
// Records the withdrawal and updates the housing usage tracker.
func (r *Repository) WithdrawFromOA(ctx context.Context, userID string, amount *decimal.Decimal) (*CPFAccount, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE cpf_accounts
		SET oa_balance = oa_balance - $2,
		    oa_used_for_housing = oa_used_for_housing + $2,
		    housing_start_date = COALESCE(housing_start_date, NOW()),
		    updated_at = NOW()
		WHERE user_id = $1 AND oa_balance >= $2
		RETURNING id, user_id, oa_balance, sa_balance, ma_balance, ra_balance,
		          oa_used_for_housing, housing_start_date, date_of_birth,
		          residency_status, pr_grant_date, created_at, updated_at`,
		userID, amount,
	)

	var acc CPFAccount
	var housingStartDate, prGrantDate sql.NullTime
	var residencyStatus string

	err := row.Scan(
		&acc.ID, &acc.UserID, &acc.OABalance, &acc.SABalance,
		&acc.MABalance, &acc.RABalance, &acc.OAUsedForHousing,
		&housingStartDate, &acc.DateOfBirth, &residencyStatus,
		&prGrantDate, &acc.CreatedAt, &acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("insufficient OA balance")
		}
		return nil, err
	}

	if housingStartDate.Valid {
		acc.HousingStartDate = &housingStartDate.Time
	}
	if prGrantDate.Valid {
		acc.PRGrantDate = &prGrantDate.Time
	}
	acc.ResidencyStatus = config.ResidencyStatus(residencyStatus)

	return &acc, nil
}

// Delete removes a CPF account for a user.
func (r *Repository) Delete(ctx context.Context, userID string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM cpf_accounts WHERE user_id = $1`, userID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}
