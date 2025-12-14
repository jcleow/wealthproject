package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// CashAccount represents a persisted cash/liquid account record.
type CashAccount struct {
	ID             string        `json:"id"`
	UserID         string        `json:"userId"`
	Name           string        `json:"name"`
	Balance        float64       `json:"balance"`
	InterestRate   float64       `json:"interestRate"`
	BankName       string        `json:"bankName,omitempty"`
	AccountType    string        `json:"accountType,omitempty"` // checking, savings, money_market
	IsAccumulator  bool          `json:"isAccumulator"`
	StartDate      time.Time     `json:"startDate"`         // Precise start date (day-level)
	EndDate        *time.Time    `json:"endDate,omitempty"` // NULL means ongoing
	StartYear      int           `json:"startYear"`         // Legacy: for migration period
	EndYear        sql.NullInt32 `json:"endYear,omitempty"` // Legacy: for migration period
	Notes          string        `json:"notes,omitempty"`
	GrowthStrategy string        `json:"growthStrategy"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// ----- CashAccount operations -----

// ListCashAccounts returns all cash accounts for a user with optional date range filtering.
// Pass empty DateRangeOptions{} to get all accounts without filtering.
func (s *Store) ListCashAccounts(ctx context.Context, userID string, opts DateRangeOptions) ([]CashAccount, error) {
	query := `
		SELECT id, user_id, name, balance, interest_rate,
		       COALESCE(bank_name, '') as bank_name,
		       COALESCE(account_type, '') as account_type,
		       is_accumulator,
		       start_date,
		       end_date,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM finance_cash_accounts
		WHERE user_id = $1`

	args := []interface{}{userID}
	argIdx := 2

	// Add optional date range filtering
	if opts.ActiveAfter != nil {
		query += ` AND (end_date IS NULL OR end_date >= $` + fmt.Sprintf("%d", argIdx) + `)`
		args = append(args, *opts.ActiveAfter)
		argIdx++
	}
	if opts.ActiveBefore != nil {
		query += ` AND start_date <= $` + fmt.Sprintf("%d", argIdx)
		args = append(args, *opts.ActiveBefore)
		argIdx++
	}

	query += ` ORDER BY created_at`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []CashAccount
	for rows.Next() {
		var acc CashAccount
		var endDate sql.NullTime
		if err := rows.Scan(
			&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
			&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
			&acc.StartDate, &endDate,
			&acc.Notes, &acc.CreatedAt, &acc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if endDate.Valid {
			acc.EndDate = &endDate.Time
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
		       is_accumulator, start_date, end_date,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM finance_cash_accounts
		WHERE user_id = $1 AND id = $2`, userID, id)

	var acc CashAccount
	var endDate sql.NullTime
	if err := row.Scan(
		&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
		&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
		&acc.StartDate, &endDate, &acc.Notes,
		&acc.CreatedAt, &acc.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	if endDate.Valid {
		acc.EndDate = &endDate.Time
	}
	return acc, nil
}

// GetAccumulatorAccount returns the user's accumulator cash account.
func (s *Store) GetAccumulatorAccount(ctx context.Context, userID string) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, balance, interest_rate,
		       COALESCE(bank_name, '') as bank_name,
		       COALESCE(account_type, '') as account_type,
		       is_accumulator, start_date, end_date,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM finance_cash_accounts
		WHERE user_id = $1 AND is_accumulator = true
		LIMIT 1`, userID)

	var acc CashAccount
	var endDate sql.NullTime
	if err := row.Scan(
		&acc.ID, &acc.UserID, &acc.Name, &acc.Balance, &acc.InterestRate,
		&acc.BankName, &acc.AccountType, &acc.IsAccumulator,
		&acc.StartDate, &endDate, &acc.Notes,
		&acc.CreatedAt, &acc.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	if endDate.Valid {
		acc.EndDate = &endDate.Time
	}
	return acc, nil
}

// CreateCashAccount creates a new cash account.
func (s *Store) CreateCashAccount(ctx context.Context, acc CashAccount) (CashAccount, error) {
	// Compute startDate from StartDate field
	startDate := acc.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Use EndDate field
	endDate := acc.EndDate

	row := s.db.QueryRowContext(ctx, `
		INSERT INTO finance_cash_accounts (user_id, name, balance, interest_rate, bank_name, account_type, is_accumulator, start_date, end_date, notes)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, NULLIF($10, ''))
		RETURNING id, user_id, name, balance, interest_rate,
		          COALESCE(bank_name, '') as bank_name,
		          COALESCE(account_type, '') as account_type,
		          is_accumulator, start_date, end_date,
		          COALESCE(notes, '') as notes,
		          created_at, updated_at`,
		acc.UserID, acc.Name, acc.Balance, acc.InterestRate,
		acc.BankName, acc.AccountType, acc.IsAccumulator,
		startDate, endDate, acc.Notes)

	var created CashAccount
	var endDateVal sql.NullTime
	if err := row.Scan(
		&created.ID, &created.UserID, &created.Name, &created.Balance, &created.InterestRate,
		&created.BankName, &created.AccountType, &created.IsAccumulator,
		&created.StartDate, &endDateVal, &created.Notes,
		&created.CreatedAt, &created.UpdatedAt,
	); err != nil {
		return CashAccount{}, err
	}
	if endDateVal.Valid {
		created.EndDate = &endDateVal.Time
	}
	return created, nil
}

// UpdateCashAccount updates an existing cash account.
func (s *Store) UpdateCashAccount(ctx context.Context, acc CashAccount) (CashAccount, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE finance_cash_accounts
		SET name = $3,
		    balance = $4,
		    interest_rate = $5,
		    bank_name = NULLIF($6, ''),
		    account_type = NULLIF($7, ''),
		    is_accumulator = $8,
		    start_date = COALESCE($9, start_date),
		    end_date = $10,
		    notes = NULLIF($11, ''),
		    updated_at = NOW()
		WHERE user_id = $1 AND id = $2
		RETURNING id, user_id, name, balance, interest_rate,
		          COALESCE(bank_name, '') as bank_name,
		          COALESCE(account_type, '') as account_type,
		          is_accumulator, start_date, end_date,
		          COALESCE(notes, '') as notes,
		          created_at, updated_at`,
		acc.UserID, acc.ID, acc.Name, acc.Balance, acc.InterestRate,
		acc.BankName, acc.AccountType, acc.IsAccumulator,
		acc.StartDate, acc.EndDate, acc.Notes)

	var updated CashAccount
	var endDate sql.NullTime
	if err := row.Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Balance, &updated.InterestRate,
		&updated.BankName, &updated.AccountType, &updated.IsAccumulator,
		&updated.StartDate, &endDate, &updated.Notes,
		&updated.CreatedAt, &updated.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CashAccount{}, ErrNotFound
		}
		return CashAccount{}, err
	}
	if endDate.Valid {
		updated.EndDate = &endDate.Time
	}
	return updated, nil
}

// DeleteCashAccount deletes a cash account by ID.
func (s *Store) DeleteCashAccount(ctx context.Context, userID, id string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM finance_cash_accounts WHERE user_id = $1 AND id = $2`, userID, id)
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
		UPDATE finance_cash_accounts
		SET is_accumulator = false, updated_at = NOW()
		WHERE user_id = $1 AND is_accumulator = true`, userID)
	if err != nil {
		return err
	}

	// Set new accumulator
	result, err := tx.ExecContext(ctx, `
		UPDATE finance_cash_accounts
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
