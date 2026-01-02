package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// ListPersons retrieves all persons for a user.
func (s *Store) ListPersons(ctx context.Context, userID string) ([]Person, error) {
	query := `
	SELECT id, user_id, name, display_color, is_included,
	       date_of_birth, residency_status, pr_grant_date,
	       created_at, updated_at
	FROM persons
	WHERE user_id = $1
	ORDER BY created_at ASC`

	logQuery(query, []any{userID})

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list persons: %w", err)
	}
	defer rows.Close()

	var persons []Person
	for rows.Next() {
		var p Person
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Name, &p.DisplayColor, &p.IsIncluded,
			&p.DateOfBirth, &p.ResidencyStatus, &p.PRGrantDate,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan person: %w", err)
		}
		persons = append(persons, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return persons, nil
}

// ListPersonsWithStats retrieves all persons for a user with income/CPF counts.
func (s *Store) ListPersonsWithStats(ctx context.Context, userID string) ([]Person, error) {
	query := `
	SELECT
		p.id, p.user_id, p.name, p.display_color, p.is_included,
		p.date_of_birth, p.residency_status, p.pr_grant_date,
		p.created_at, p.updated_at,
		COALESCE(income_counts.count, 0) as income_count,
		COALESCE(cpf_counts.count, 0) as cpf_count
	FROM persons p
	LEFT JOIN (
		SELECT person_id, COUNT(*) as count
		FROM finance_incomes
		WHERE user_id = $1 AND person_id IS NOT NULL AND end_date IS NULL
		GROUP BY person_id
	) income_counts ON p.id = income_counts.person_id
	LEFT JOIN (
		SELECT person_id, COUNT(*) as count
		FROM cpf_accounts
		WHERE user_id = $1 AND person_id IS NOT NULL AND end_date IS NULL
		GROUP BY person_id
	) cpf_counts ON p.id = cpf_counts.person_id
	WHERE p.user_id = $1
	ORDER BY p.created_at ASC`

	logQuery(query, []any{userID})

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list persons with stats: %w", err)
	}
	defer rows.Close()

	var persons []Person
	for rows.Next() {
		var p Person
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Name, &p.DisplayColor, &p.IsIncluded,
			&p.DateOfBirth, &p.ResidencyStatus, &p.PRGrantDate,
			&p.CreatedAt, &p.UpdatedAt, &p.IncomeCount, &p.CPFCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan person with stats: %w", err)
		}
		persons = append(persons, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return persons, nil
}

// GetPerson retrieves a single person by ID.
func (s *Store) GetPerson(ctx context.Context, userID, id string) (*Person, error) {
	query := `
	SELECT id, user_id, name, display_color, is_included,
	       date_of_birth, residency_status, pr_grant_date,
	       created_at, updated_at
	FROM persons
	WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	var p Person
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&p.ID, &p.UserID, &p.Name, &p.DisplayColor, &p.IsIncluded,
		&p.DateOfBirth, &p.ResidencyStatus, &p.PRGrantDate,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get person: %w", err)
	}

	return &p, nil
}

// CreatePerson creates a new person.
func (s *Store) CreatePerson(ctx context.Context, userID string, p Person) (*Person, error) {
	query := `
	INSERT INTO persons (user_id, name, display_color, is_included,
	                     date_of_birth, residency_status, pr_grant_date,
	                     created_at, updated_at)
	VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, NOW(), NOW())
	RETURNING id, user_id, name, display_color, is_included,
	          date_of_birth, residency_status, pr_grant_date,
	          created_at, updated_at`

	displayColor := ""
	if p.DisplayColor != nil {
		displayColor = *p.DisplayColor
	}

	// Default residency status to 'citizen' if not provided
	residencyStatus := p.ResidencyStatus
	if residencyStatus == "" {
		residencyStatus = "citizen"
	}

	args := []any{userID, p.Name, displayColor, true, p.DateOfBirth, residencyStatus, p.PRGrantDate}

	logQuery(query, args)

	var created Person
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&created.ID, &created.UserID, &created.Name, &created.DisplayColor,
		&created.IsIncluded, &created.DateOfBirth, &created.ResidencyStatus, &created.PRGrantDate,
		&created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create person: %w", err)
	}

	return &created, nil
}

// UpdatePerson updates an existing person.
func (s *Store) UpdatePerson(ctx context.Context, userID, id string, p Person) (*Person, error) {
	query := `
	UPDATE persons
	SET name = COALESCE(NULLIF($3, ''), name),
	    display_color = CASE WHEN $4 = '' THEN display_color ELSE NULLIF($4, '') END,
	    is_included = $5,
	    date_of_birth = COALESCE($6, date_of_birth),
	    residency_status = COALESCE(NULLIF($7, ''), residency_status),
	    pr_grant_date = $8,
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, user_id, name, display_color, is_included,
	          date_of_birth, residency_status, pr_grant_date,
	          created_at, updated_at`

	displayColor := ""
	if p.DisplayColor != nil {
		displayColor = *p.DisplayColor
	}

	// For date_of_birth, we need to handle zero value - pass nil if zero
	var dateOfBirth interface{}
	if !p.DateOfBirth.IsZero() {
		dateOfBirth = p.DateOfBirth
	}

	args := []any{userID, id, p.Name, displayColor, p.IsIncluded, dateOfBirth, p.ResidencyStatus, p.PRGrantDate}

	logQuery(query, args)

	var updated Person
	err := s.pool.QueryRow(ctx, query, args...).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.DisplayColor,
		&updated.IsIncluded, &updated.DateOfBirth, &updated.ResidencyStatus, &updated.PRGrantDate,
		&updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update person: %w", err)
	}

	return &updated, nil
}

// DeletePerson deletes a person. Linked incomes/CPF accounts will have person_id set to NULL.
func (s *Store) DeletePerson(ctx context.Context, userID, id string) error {
	query := `DELETE FROM persons WHERE user_id = $1 AND id = $2`

	logQuery(query, []any{userID, id})

	result, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete person: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// TogglePersonIncluded toggles the is_included flag for a person.
func (s *Store) TogglePersonIncluded(ctx context.Context, userID, id string) (*Person, error) {
	query := `
	UPDATE persons
	SET is_included = NOT is_included,
	    updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING id, user_id, name, display_color, is_included,
	          date_of_birth, residency_status, pr_grant_date,
	          created_at, updated_at`

	logQuery(query, []any{userID, id})

	var updated Person
	err := s.pool.QueryRow(ctx, query, userID, id).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.DisplayColor,
		&updated.IsIncluded, &updated.DateOfBirth, &updated.ResidencyStatus, &updated.PRGrantDate,
		&updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to toggle person included: %w", err)
	}

	return &updated, nil
}

// GetExcludedPersonIDs returns IDs of persons where is_included = false.
// Used to filter incomes and CPF accounts from excluded persons in timeline calculations.
func (s *Store) GetExcludedPersonIDs(ctx context.Context, userID string) (map[string]struct{}, error) {
	query := `SELECT id FROM persons WHERE user_id = $1 AND is_included = false`

	logQuery(query, []any{userID})

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get excluded person IDs: %w", err)
	}
	defer rows.Close()

	result := make(map[string]struct{})
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("failed to scan excluded person ID: %w", err)
		}
		result[id] = struct{}{}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return result, nil
}
