package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// GetCPFAccountByID retrieves a CPF account by its ID.
func (s *Store) GetCPFAccountByID(ctx context.Context, userID, id string) (*CPFAccount, error) {
	query := `
	SELECT
		c.id,
		c.user_id,
		COALESCE(p.name, c.earner, '') as earner,
		c.person_id,
		COALESCE(c.parent_id, c.id) as parent_id,
		COALESCE(c.start_date, c.created_at) as start_date,
		c.end_date,
		c.oa_balance,
		c.sa_balance,
		c.ma_balance,
		c.ra_balance,
		c.oa_used_for_housing,
		c.housing_start_date,
		c.date_of_birth,
		c.residency_status,
		c.pr_grant_date,
		c.created_at,
		c.updated_at
	FROM cpf_accounts c
	LEFT JOIN persons p ON c.person_id = p.id
	WHERE c.user_id = $1 AND c.id = $2`

	logQuery(query, []any{userID, id})

	var cpf CPFAccount
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&cpf.ID,
		&cpf.UserID,
		&cpf.Earner,
		&cpf.PersonID,
		&cpf.ParentID,
		&cpf.StartDate,
		&cpf.EndDate,
		&cpf.OABalance,
		&cpf.SABalance,
		&cpf.MABalance,
		&cpf.RABalance,
		&cpf.OAUsedForHousing,
		&cpf.HousingStartDate,
		&cpf.DateOfBirth,
		&cpf.ResidencyStatus,
		&cpf.PRGrantDate,
		&cpf.CreatedAt,
		&cpf.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get CPF account: %w", err)
	}

	return &cpf, nil
}

// UpdateCPFAccount updates an existing CPF account record.
func (s *Store) UpdateCPFAccount(ctx context.Context, userID string, cpf CPFAccount) (*CPFAccount, error) {
	query := `
	WITH updated AS (
		UPDATE cpf_accounts
		SET earner = $3,
		    person_id = $4,
		    oa_balance = $5,
		    sa_balance = $6,
		    ma_balance = $7,
		    ra_balance = $8,
		    oa_used_for_housing = $9,
		    housing_start_date = $10,
		    date_of_birth = $11,
		    residency_status = $12,
		    pr_grant_date = $13,
		    updated_at = NOW()
		WHERE user_id = $1 AND id = $2
		RETURNING *
	)
	SELECT u.id, u.user_id, COALESCE(p.name, u.earner, '') as earner, u.person_id,
	       COALESCE(u.parent_id, u.id), COALESCE(u.start_date, u.created_at), u.end_date,
	       u.oa_balance, u.sa_balance, u.ma_balance, u.ra_balance,
	       u.oa_used_for_housing, u.housing_start_date, u.date_of_birth,
	       u.residency_status, u.pr_grant_date, u.created_at, u.updated_at
	FROM updated u
	LEFT JOIN persons p ON u.person_id = p.id`

	args := []any{
		userID, cpf.ID, cpf.Earner, cpf.PersonID, cpf.OABalance, cpf.SABalance, cpf.MABalance, cpf.RABalance,
		cpf.OAUsedForHousing, cpf.HousingStartDate, cpf.DateOfBirth,
		cpf.ResidencyStatus, cpf.PRGrantDate,
	}

	logQuery(query, args)

	var updated CPFAccount
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Earner,
		&updated.PersonID,
		&updated.ParentID,
		&updated.StartDate,
		&updated.EndDate,
		&updated.OABalance,
		&updated.SABalance,
		&updated.MABalance,
		&updated.RABalance,
		&updated.OAUsedForHousing,
		&updated.HousingStartDate,
		&updated.DateOfBirth,
		&updated.ResidencyStatus,
		&updated.PRGrantDate,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update CPF account: %w", err)
	}

	return &updated, nil
}

// DeleteCPFAccount deletes a CPF account and all its descendant versions.
func (s *Store) DeleteCPFAccount(ctx context.Context, userID, id string) error {
	// Delete the row AND all descendant rows recursively (any version chains)
	query := `
	WITH RECURSIVE descendants AS (
		SELECT id FROM cpf_accounts WHERE user_id = $1 AND id = $2
		UNION ALL
		SELECT c.id FROM cpf_accounts c
		INNER JOIN descendants d ON c.parent_id = d.id
		WHERE c.user_id = $1
	)
	DELETE FROM cpf_accounts WHERE id IN (SELECT id FROM descendants)`

	logQuery(query, []any{userID, id})

	tag, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete CPF account: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// StopCPFAccount sets the end_date on a CPF account (soft delete).
func (s *Store) StopCPFAccount(ctx context.Context, userID, id string, endDate time.Time) (*CPFAccount, error) {
	query := `
	WITH updated AS (
		UPDATE cpf_accounts
		SET end_date = $3, updated_at = NOW()
		WHERE user_id = $1 AND id = $2
		RETURNING *
	)
	SELECT u.id, u.user_id, COALESCE(p.name, u.earner, '') as earner, u.person_id,
	       COALESCE(u.parent_id, u.id), COALESCE(u.start_date, u.created_at), u.end_date,
	       u.oa_balance, u.sa_balance, u.ma_balance, u.ra_balance,
	       u.oa_used_for_housing, u.housing_start_date, u.date_of_birth,
	       u.residency_status, u.pr_grant_date, u.created_at, u.updated_at
	FROM updated u
	LEFT JOIN persons p ON u.person_id = p.id`

	logQuery(query, []any{userID, id, endDate})

	var updated CPFAccount
	err := s.pool.QueryRow(ctx, query, userID, id, endDate).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Earner,
		&updated.PersonID,
		&updated.ParentID,
		&updated.StartDate,
		&updated.EndDate,
		&updated.OABalance,
		&updated.SABalance,
		&updated.MABalance,
		&updated.RABalance,
		&updated.OAUsedForHousing,
		&updated.HousingStartDate,
		&updated.DateOfBirth,
		&updated.ResidencyStatus,
		&updated.PRGrantDate,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to stop CPF account: %w", err)
	}

	return &updated, nil
}

// FindCPFAccountByParentAndStartDate finds a CPF account version with the given parentID and startDate.
// Used for upsert logic in versioned updates.
func (s *Store) FindCPFAccountByParentAndStartDate(
	ctx context.Context,
	userID, parentID string,
	startDate time.Time,
) (*CPFAccount, error) {
	query := `
	SELECT
		c.id,
		c.user_id,
		COALESCE(p.name, c.earner, '') as earner,
		c.person_id,
		COALESCE(c.parent_id, c.id) as parent_id,
		COALESCE(c.start_date, c.created_at) as start_date,
		c.end_date,
		c.oa_balance,
		c.sa_balance,
		c.ma_balance,
		c.ra_balance,
		c.oa_used_for_housing,
		c.housing_start_date,
		c.date_of_birth,
		c.residency_status,
		c.pr_grant_date,
		c.created_at,
		c.updated_at
	FROM cpf_accounts c
	LEFT JOIN persons p ON c.person_id = p.id
	WHERE c.user_id = $1 AND c.parent_id = $2 AND DATE(c.start_date) = DATE($3)`

	logQuery(query, []any{userID, parentID, startDate})

	var cpf CPFAccount
	err := s.pool.QueryRow(ctx, query, userID, parentID, startDate).Scan(
		&cpf.ID,
		&cpf.UserID,
		&cpf.Earner,
		&cpf.PersonID,
		&cpf.ParentID,
		&cpf.StartDate,
		&cpf.EndDate,
		&cpf.OABalance,
		&cpf.SABalance,
		&cpf.MABalance,
		&cpf.RABalance,
		&cpf.OAUsedForHousing,
		&cpf.HousingStartDate,
		&cpf.DateOfBirth,
		&cpf.ResidencyStatus,
		&cpf.PRGrantDate,
		&cpf.CreatedAt,
		&cpf.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find CPF account by parent and start date: %w", err)
	}

	return &cpf, nil
}

// CreateCPFAccount creates a new CPF account record.
// For new accounts (no parent_id), inserts with NULL parent_id first,
// then the RETURNING clause returns COALESCE(parent_id, id) as parent_id.
func (s *Store) CreateCPFAccount(ctx context.Context, userID string, cpf CPFAccount) (CPFAccount, error) {
	startDate := cpf.StartDate
	if startDate.IsZero() {
		startDate = time.Now().UTC()
	}

	// For new CPF accounts, parent_id should be NULL (self-referencing is handled in RETURNING).
	// For versioned updates, parent_id will be set to the original record's ID.
	query := `
		WITH inserted AS (
			INSERT INTO cpf_accounts (
				user_id, earner, person_id, parent_id, start_date, end_date,
				oa_balance, sa_balance, ma_balance, ra_balance,
				oa_used_for_housing, housing_start_date, date_of_birth,
				residency_status, pr_grant_date
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			RETURNING *
		)
		SELECT i.id, i.user_id, COALESCE(p.name, i.earner, '') as earner, i.person_id,
		       COALESCE(i.parent_id, i.id), i.start_date, i.end_date,
		       i.oa_balance, i.sa_balance, i.ma_balance, i.ra_balance,
		       i.oa_used_for_housing, i.housing_start_date, i.date_of_birth,
		       i.residency_status, i.pr_grant_date, i.created_at, i.updated_at
		FROM inserted i
		LEFT JOIN persons p ON i.person_id = p.id`

	args := []any{
		userID, cpf.Earner, cpf.PersonID, nullIfEmpty(cpf.ParentID), startDate, cpf.EndDate,
		cpf.OABalance, cpf.SABalance, cpf.MABalance, cpf.RABalance,
		cpf.OAUsedForHousing, cpf.HousingStartDate, cpf.DateOfBirth,
		cpf.ResidencyStatus, cpf.PRGrantDate,
	}

	logQuery(query, args)
	row := s.pool.QueryRow(ctx, query, args...)

	var created CPFAccount
	if err := row.Scan(
		&created.ID,
		&created.UserID,
		&created.Earner,
		&created.PersonID,
		&created.ParentID,
		&created.StartDate,
		&created.EndDate,
		&created.OABalance,
		&created.SABalance,
		&created.MABalance,
		&created.RABalance,
		&created.OAUsedForHousing,
		&created.HousingStartDate,
		&created.DateOfBirth,
		&created.ResidencyStatus,
		&created.PRGrantDate,
		&created.CreatedAt,
		&created.UpdatedAt,
	); err != nil {
		return CPFAccount{}, fmt.Errorf("failed to create CPF account: %w", err)
	}

	return created, nil
}

// ListCPFAccounts returns all CPF account versions for a user.
func (s *Store) ListCPFAccounts(
	ctx context.Context,
	userID string,
	dateRangeOpts DateRangeOptions,
) ([]CPFAccount, error) {
	query := `
	SELECT
		c.id,
		c.user_id,
		COALESCE(p.name, c.earner, '') as earner,
		c.person_id,
		COALESCE(c.parent_id, c.id) as parent_id,
		COALESCE(c.start_date, c.created_at) as start_date,
		c.end_date,
		c.oa_balance,
		c.sa_balance,
		c.ma_balance,
		c.ra_balance,
		c.oa_used_for_housing,
		c.housing_start_date,
		c.date_of_birth,
		c.residency_status,
		c.pr_grant_date,
		c.created_at,
		c.updated_at
	FROM cpf_accounts c
	LEFT JOIN persons p ON c.person_id = p.id
	WHERE c.user_id = $1`

	args := []any{userID}
	argIdx := 2

	// Add dynamic date range filtering
	dateRangeSubQuery, _ := addDateRangeFilterQuery(dateRangeOpts, argIdx)
	if dateRangeSubQuery != "" {
		query += " AND " + dateRangeSubQuery
		if dateRangeOpts.StartDate != nil {
			args = append(args, *dateRangeOpts.StartDate)
		}
		if dateRangeOpts.EndDate != nil {
			args = append(args, *dateRangeOpts.EndDate)
		}
	}

	query += ` ORDER BY COALESCE(c.parent_id, c.id), c.start_date`

	logQuery(query, args)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list CPF accounts: %w", err)
	}
	defer rows.Close()

	cpfAccounts := []CPFAccount{}
	for rows.Next() {
		var cpf CPFAccount
		err := rows.Scan(
			&cpf.ID,
			&cpf.UserID,
			&cpf.Earner,
			&cpf.PersonID,
			&cpf.ParentID,
			&cpf.StartDate,
			&cpf.EndDate,
			&cpf.OABalance,
			&cpf.SABalance,
			&cpf.MABalance,
			&cpf.RABalance,
			&cpf.OAUsedForHousing,
			&cpf.HousingStartDate,
			&cpf.DateOfBirth,
			&cpf.ResidencyStatus,
			&cpf.PRGrantDate,
			&cpf.CreatedAt,
			&cpf.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan CPF account: %w", err)
		}
		cpfAccounts = append(cpfAccounts, cpf)
	}

	return cpfAccounts, nil
}
