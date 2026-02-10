package repository

import (
	"context"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/decimal"

	"github.com/jackc/pgx/v5"
)

// GetCashAccount retrieves a single cash account by ID.
func (s *Store) GetCashAccount(ctx context.Context, userID, id string) (*CashAsset, error) {
	query := `
	SELECT id,
		user_id,
		name,
		balance,
		interest_rate,
		COALESCE(bank_name, '') as bank_name,
		COALESCE(account_type, '') as account_type,
		is_accumulator,
		start_date,
		end_date,
		COALESCE(notes, '') as notes,
		COALESCE(growth_strategy, '') as growth_strategy,
		created_at,
		updated_at
	FROM finance_cash_accounts
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var ca CashAsset
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&ca.ID, &ca.UserID, &ca.Name, &ca.Balance, &ca.InterestRate,
		&ca.BankName, &ca.AccountType, &ca.IsAccumulator,
		&ca.StartDate, &ca.EndDate, &ca.Notes, &ca.GrowthStrategy,
		&ca.CreatedAt, &ca.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get cash account: %w", err)
	}

	return &ca, nil
}

// CreateCashAsset creates a new cash account record.
func (s *Store) CreateCashAsset(ctx context.Context, userID string, ca CashAsset) (CashAsset, error) {
	startDate := ca.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// Default growth strategy if not provided
	growthStrategy := ca.GrowthStrategy
	if growthStrategy == "" {
		growthStrategy = "compound_monthly"
	}

	query := `
	INSERT INTO finance_cash_accounts (
		user_id, name, balance, interest_rate, bank_name, account_type,
		is_accumulator, start_date, end_date, notes, growth_strategy, category
	) VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, NULLIF($10, ''), $11, NULLIF($12, ''))
	RETURNING id, user_id, name, balance, interest_rate, COALESCE(bank_name, ''), COALESCE(account_type, ''),
	          is_accumulator, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), created_at, updated_at`

	args := []any{
		userID, ca.Name, ca.Balance, ca.InterestRate,
		ca.BankName, ca.AccountType, ca.IsAccumulator,
		startDate, ca.EndDate, ca.Notes, growthStrategy, ca.Category,
	}

	logQuery(query, args)

	var created CashAsset
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&created.ID, &created.UserID, &created.Name, &created.Balance, &created.InterestRate,
		&created.BankName, &created.AccountType, &created.IsAccumulator,
		&created.StartDate, &created.EndDate, &created.Notes, &created.GrowthStrategy,
		&created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return CashAsset{}, fmt.Errorf("failed to create cash account: %w", err)
	}

	return created, nil
}

// UpdateCashAccount updates an existing cash account record.
func (s *Store) UpdateCashAccount(ctx context.Context, userID string, ca CashAsset) (*CashAsset, error) {
	query := `
	UPDATE finance_cash_accounts
	SET name = $3,
	    balance = $4,
	    interest_rate = COALESCE($5, interest_rate),
	    bank_name = NULLIF($6, ''),
	    account_type = NULLIF($7, ''),
	    notes = NULLIF($8, ''),
	    growth_strategy = COALESCE(NULLIF($9, ''), growth_strategy),
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, user_id, name, balance, interest_rate, COALESCE(bank_name, ''), COALESCE(account_type, ''), is_accumulator, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), created_at, updated_at`

	var interestRate *decimal.Decimal
	zero := decimal.Zero()
	if ca.InterestRate.Cmp(zero) != 0 {
		interestRate = &ca.InterestRate
	}

	args := []any{
		userID, ca.ID, ca.Name, ca.Balance, interestRate,
		ca.BankName, ca.AccountType, ca.Notes, ca.GrowthStrategy,
	}

	logQuery(query, args)

	var updated CashAsset
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Balance, &updated.InterestRate,
		&updated.BankName, &updated.AccountType, &updated.IsAccumulator,
		&updated.StartDate, &updated.EndDate, &updated.Notes, &updated.GrowthStrategy,
		&updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update cash account: %w", err)
	}

	return &updated, nil
}

// DeleteCashAccount deletes a cash account.
// Note: Cannot delete if is_accumulator is true (must be handled by caller).
func (s *Store) DeleteCashAccount(ctx context.Context, userID, id string) error {
	return s.deleteByID(ctx, "finance_cash_accounts", userID, id)
}

// StopCashAccount sets the end_date on a cash account (soft delete).
func (s *Store) StopCashAccount(ctx context.Context, userID, id string, endDate time.Time) (*CashAsset, error) {
	query := `
	UPDATE finance_cash_accounts
	SET end_date = $3, updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, user_id, name, balance, interest_rate, COALESCE(bank_name, ''), COALESCE(account_type, ''), is_accumulator, start_date, end_date, COALESCE(notes, ''), COALESCE(growth_strategy, ''), created_at, updated_at`

	logQuery(query, []any{userID, id, endDate})

	var updated CashAsset
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Balance, &updated.InterestRate,
		&updated.BankName, &updated.AccountType, &updated.IsAccumulator,
		&updated.StartDate, &updated.EndDate, &updated.Notes, &updated.GrowthStrategy,
		&updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop cash account: %w", err)
	}

	return &updated, nil
}

// StopAllocationsByCashAccount sets end_date on all income allocations targeting a cash account.
// Used for cascade stop when stopping a cash account.
func (s *Store) StopAllocationsByCashAccount(ctx context.Context, userID, cashAccountID string, endDate time.Time) error {
	query := `
	UPDATE income_allocations ia
	SET end_date = $3
	FROM finance_incomes fi
	WHERE ia.target_cash_account_id = $2
	  AND ia.income_id = fi.id
	  AND fi.user_id = $1
	  AND (ia.end_date IS NULL OR ia.end_date > $3)`

	logQuery(query, []any{userID, cashAccountID, endDate})

	_, err := s.pool.Exec(ctx, query, userID, cashAccountID, endDate)
	if err != nil {
		return fmt.Errorf("failed to stop allocations by cash account: %w", err)
	}

	return nil
}

// SetAccumulatorAccount sets a specific cash account as the accumulator,
// clearing the flag from any other accounts for this user.
func (s *Store) SetAccumulatorAccount(ctx context.Context, userID, accountID string) error {
	// Clear all accumulators for user first
	clearQuery := `UPDATE finance_cash_accounts SET is_accumulator = false WHERE user_id = $1`
	_, err := s.pool.Exec(ctx, clearQuery, userID)
	if err != nil {
		return fmt.Errorf("failed to clear accumulator: %w", err)
	}

	// Set the specific account as accumulator
	setQuery := `UPDATE finance_cash_accounts SET is_accumulator = true WHERE user_id = $1 AND id = $2`
	tag, err := s.pool.Exec(ctx, setQuery, userID, accountID)
	if err != nil {
		return fmt.Errorf("failed to set accumulator: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
