package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// CashAccount represents a persisted cash/liquid account record.
type CashAccount struct {
	ID            string        `json:"id"`
	UserID        string        `json:"userId"`
	Name          string        `json:"name"`
	Balance       float64       `json:"balance"`
	InterestRate  float64       `json:"interestRate"`
	BankName      string        `json:"bankName,omitempty"`
	AccountType   string        `json:"accountType,omitempty"` // checking, savings, money_market
	IsAccumulator bool          `json:"isAccumulator"`
	StartYear     int           `json:"startYear"`
	EndYear       sql.NullInt32 `json:"endYear,omitempty"`
	Notes         string        `json:"notes,omitempty"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// ----- CashAccount operations -----

// ListCashAccounts returns all cash accounts for a user.
func (s *Store) ListCashAccounts(ctx context.Context, userID string) ([]CashAccount, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, name, balance, interest_rate,
		       COALESCE(bank_name, '') as bank_name,
		       COALESCE(account_type, '') as account_type,
		       is_accumulator, start_year, end_year,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM cash_accounts
		WHERE user_id = $1
		ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []CashAccount
	for rows.Next() {
		var acc CashAccount
		if err := rows.Scan(
			&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
			&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
			&acc.StartYear, &acc.EndYear, &acc.Notes,
			&acc.CreatedAt, &acc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		accounts = append(accounts, acc)
	}
	if accounts == nil {
		accounts = []CashAccount{}
	}
	return accounts, rows.Err()
}

// GetCashAccount returns a single cash account by ID.
func (s *Store) GetCashAccount(ctx context.Context, userID, id string) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, balance, interest_rate,
		       COALESCE(bank_name, '') as bank_name,
		       COALESCE(account_type, '') as account_type,
		       is_accumulator, start_year, end_year,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM cash_accounts
		WHERE user_id = $1 AND id = $2`, userID, id)

	var acc CashAccount
	if err := row.Scan(
		&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
		&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
		&acc.StartYear, &acc.EndYear, &acc.Notes,
		&acc.CreatedAt, &acc.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	return acc, nil
}

// GetAccumulatorAccount returns the user's accumulator cash account.
func (s *Store) GetAccumulatorAccount(ctx context.Context, userID string) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, balance, interest_rate,
		       COALESCE(bank_name, '') as bank_name,
		       COALESCE(account_type, '') as account_type,
		       is_accumulator, start_year, end_year,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM cash_accounts
		WHERE user_id = $1 AND is_accumulator = true
		LIMIT 1`, userID)

	var acc CashAccount
	if err := row.Scan(
		&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
		&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
		&acc.StartYear, &acc.EndYear, &acc.Notes,
		&acc.CreatedAt, &acc.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	return acc, nil
}

// CreateCashAccount creates a new cash account.
func (s *Store) CreateCashAccount(ctx context.Context, acc CashAccount) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO cash_accounts (user_id, name, balance, interest_rate, bank_name, account_type, is_accumulator, start_year, end_year, notes)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7, COALESCE($8, 0), $9, NULLIF($10, ''))
		RETURNING id, user_id, name, balance, interest_rate,
		          COALESCE(bank_name, '') as bank_name,
		          COALESCE(account_type, '') as account_type,
		          is_accumulator, start_year, end_year,
		          COALESCE(notes, '') as notes,
		          created_at, updated_at`,
		acc.UserID, acc.Name, acc.Balance, acc.InterestRate,
		acc.BankName, acc.AccountType, acc.IsAccumulator,
		acc.StartYear, nullableFromNullInt32(acc.EndYear), acc.Notes)

	var created CashAccount
	if err := row.Scan(
		&created.ID, &created.UserID, &created.Name, &created.Balance, &created.InterestRate,
		&created.BankName, &created.AccountType, &created.IsAccumulator,
		&created.StartYear, &created.EndYear, &created.Notes,
		&created.CreatedAt, &created.UpdatedAt,
	); err != nil {
		return CashAccount{}, err
	}
	return created, nil
}

// UpdateCashAccount updates an existing cash account.
func (s *Store) UpdateCashAccount(ctx context.Context, acc CashAccount) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE cash_accounts
		SET name = $3,
		    balance = $4,
		    interest_rate = $5,
		    bank_name = NULLIF($6, ''),
		    account_type = NULLIF($7, ''),
		    is_accumulator = $8,
		    start_year = COALESCE($9, start_year),
		    end_year = $10,
		    notes = NULLIF($11, ''),
		    updated_at = NOW()
		WHERE user_id = $1 AND id = $2
		RETURNING id, user_id, name, balance, interest_rate,
		          COALESCE(bank_name, '') as bank_name,
		          COALESCE(account_type, '') as account_type,
		          is_accumulator, start_year, end_year,
		          COALESCE(notes, '') as notes,
		          created_at, updated_at`,
		acc.UserID, acc.ID, acc.Name, acc.Balance, acc.InterestRate,
		acc.BankName, acc.AccountType, acc.IsAccumulator,
		acc.StartYear, nullableFromNullInt32(acc.EndYear), acc.Notes)

	var updated CashAccount
	if err := row.Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Balance, &updated.InterestRate,
		&updated.BankName, &updated.AccountType, &updated.IsAccumulator,
		&updated.StartYear, &updated.EndYear, &updated.Notes,
		&updated.CreatedAt, &updated.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	return updated, nil
}

// DeleteCashAccount deletes a cash account by ID.
func (s *Store) DeleteCashAccount(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM cash_accounts WHERE user_id = $1 AND id = $2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// SetAccumulatorAccount marks a cash account as the accumulator (clears existing accumulator first).
func (s *Store) SetAccumulatorAccount(ctx context.Context, userID, accountID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Clear existing accumulator
	_, err = tx.ExecContext(ctx, `
		UPDATE cash_accounts
		SET is_accumulator = false, updated_at = NOW()
		WHERE user_id = $1 AND is_accumulator = true`, userID)
	if err != nil {
		return err
	}

	// Set new accumulator
	result, err := tx.ExecContext(ctx, `
		UPDATE cash_accounts
		SET is_accumulator = true, updated_at = NOW()
		WHERE user_id = $1 AND id = $2`, userID, accountID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}
