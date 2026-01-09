// Package persons provides person management and persistence.
// Persons are individuals tracked in the system (user, spouse, children, etc.)
// and are referenced by cpf_accounts and finance_incomes.
package persons

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// ErrNotFound indicates a missing record.
var ErrNotFound = errors.New("person not found")

// Person represents an individual tracked in the system.
type Person struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	Name            string     `json:"name"`
	DisplayColor    *string    `json:"displayColor,omitempty"`
	IsIncluded      bool       `json:"isIncluded"`
	DateOfBirth     time.Time  `json:"dateOfBirth"`
	ResidencyStatus string     `json:"residencyStatus"`
	PRGrantDate     *time.Time `json:"prGrantDate,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Repository handles person persistence.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new persons repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const selectColumns = `
	id, user_id, name, display_color, is_included,
	date_of_birth, residency_status, pr_grant_date,
	created_at, updated_at
`

// scanPerson scans a row into a Person struct.
func scanPerson(row interface{ Scan(...any) error }) (*Person, error) {
	var p Person
	var displayColor sql.NullString
	var prGrantDate sql.NullTime
	var residencyStatus sql.NullString

	err := row.Scan(
		&p.ID, &p.UserID, &p.Name, &displayColor, &p.IsIncluded,
		&p.DateOfBirth, &residencyStatus, &prGrantDate,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if displayColor.Valid {
		p.DisplayColor = &displayColor.String
	}
	if prGrantDate.Valid {
		p.PRGrantDate = &prGrantDate.Time
	}
	p.ResidencyStatus = "citizen"
	if residencyStatus.Valid {
		p.ResidencyStatus = residencyStatus.String
	}

	return &p, nil
}

// GetByID retrieves a person by their ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*Person, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+selectColumns+`
		FROM persons
		WHERE id = $1`, id)

	return scanPerson(row)
}

// GetByName retrieves a person by user ID and name.
func (r *Repository) GetByName(ctx context.Context, userID, name string) (*Person, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT `+selectColumns+`
		FROM persons
		WHERE user_id = $1 AND LOWER(name) = LOWER($2)`, userID, name)

	return scanPerson(row)
}

// ListByUser retrieves all persons for a user.
func (r *Repository) ListByUser(ctx context.Context, userID string) ([]*Person, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+selectColumns+`
		FROM persons
		WHERE user_id = $1
		ORDER BY name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []*Person
	for rows.Next() {
		p, err := scanPerson(rows)
		if err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}

	return persons, rows.Err()
}

// ListIncludedByUser retrieves all included persons for a user.
func (r *Repository) ListIncludedByUser(ctx context.Context, userID string) ([]*Person, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+selectColumns+`
		FROM persons
		WHERE user_id = $1 AND is_included = true
		ORDER BY name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var persons []*Person
	for rows.Next() {
		p, err := scanPerson(rows)
		if err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}

	return persons, rows.Err()
}

// CreateInput contains the data needed to create a person.
type CreateInput struct {
	UserID          string
	Name            string
	DisplayColor    *string
	IsIncluded      bool
	DateOfBirth     time.Time
	ResidencyStatus string
	PRGrantDate     *time.Time
}

// Create creates a new person.
func (r *Repository) Create(ctx context.Context, input CreateInput) (*Person, error) {
	residency := input.ResidencyStatus
	if residency == "" {
		residency = "citizen"
	}

	row := r.db.QueryRowContext(ctx, `
		INSERT INTO persons (
			user_id, name, display_color, is_included,
			date_of_birth, residency_status, pr_grant_date
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`,
		input.UserID, input.Name, input.DisplayColor, input.IsIncluded,
		input.DateOfBirth, residency, input.PRGrantDate,
	)

	var id string
	if err := row.Scan(&id); err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// UpdateInput contains fields that can be updated.
type UpdateInput struct {
	Name            *string
	DisplayColor    *string
	IsIncluded      *bool
	DateOfBirth     *time.Time
	ResidencyStatus *string
	PRGrantDate     *time.Time
}

// Update updates a person's details.
func (r *Repository) Update(ctx context.Context, id string, input UpdateInput) (*Person, error) {
	_, err := r.db.ExecContext(ctx, `
		UPDATE persons
		SET name = COALESCE($2, name),
		    display_color = COALESCE($3, display_color),
		    is_included = COALESCE($4, is_included),
		    date_of_birth = COALESCE($5, date_of_birth),
		    residency_status = COALESCE($6, residency_status),
		    pr_grant_date = COALESCE($7, pr_grant_date),
		    updated_at = NOW()
		WHERE id = $1`,
		id,
		input.Name, input.DisplayColor, input.IsIncluded,
		input.DateOfBirth, input.ResidencyStatus, input.PRGrantDate,
	)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

// Delete removes a person by ID.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM persons WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// GetOrCreate gets a person by name, or creates one if not found.
// This is useful for API compatibility where users provide a name.
func (r *Repository) GetOrCreate(ctx context.Context, userID, name string, defaults CreateInput) (*Person, error) {
	// Try to find existing
	existing, err := r.GetByName(ctx, userID, name)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	// Create new person
	defaults.UserID = userID
	defaults.Name = name
	return r.Create(ctx, defaults)
}
