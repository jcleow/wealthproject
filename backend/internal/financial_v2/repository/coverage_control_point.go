package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// coverageControlPointColumns is the SELECT column list for coverage control point queries.
const coverageControlPointColumns = `
	cp.id, cp.user_id, cp.person_id, COALESCE(p.name, '') as person_name,
	cp.age, cp.life_tpd, cp.critical_illness, cp.personal_accident,
	cp.reason, cp.created_at, cp.updated_at`

// scanCoverageControlPoint scans a row into a CoverageControlPoint struct.
func scanCoverageControlPoint(row pgx.Row) (*CoverageControlPoint, error) {
	var cp CoverageControlPoint
	err := row.Scan(
		&cp.ID, &cp.UserID, &cp.PersonID, &cp.PersonName,
		&cp.Age, &cp.LifeTpd, &cp.CriticalIllness, &cp.PersonalAccident,
		&cp.Reason, &cp.CreatedAt, &cp.UpdatedAt,
	)
	return &cp, err
}

// ListCoverageControlPoints retrieves all coverage control points for a user with optional person filter.
func (s *Store) ListCoverageControlPoints(ctx context.Context, userID string, personID *string) ([]CoverageControlPoint, error) {
	query := `SELECT ` + coverageControlPointColumns + `
	FROM coverage_control_points cp
	LEFT JOIN persons p ON cp.person_id = p.id
	WHERE cp.user_id = $1`

	args := []any{userID}
	argIdx := 2

	if personID != nil {
		query += fmt.Sprintf(` AND cp.person_id = $%d`, argIdx)
		args = append(args, *personID)
	}

	query += ` ORDER BY cp.person_id, cp.age ASC`

	logQuery(query, args)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list coverage control points: %w", err)
	}
	defer rows.Close()

	var points []CoverageControlPoint
	for rows.Next() {
		var cp CoverageControlPoint
		if err := rows.Scan(
			&cp.ID, &cp.UserID, &cp.PersonID, &cp.PersonName,
			&cp.Age, &cp.LifeTpd, &cp.CriticalIllness, &cp.PersonalAccident,
			&cp.Reason, &cp.CreatedAt, &cp.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan coverage control point: %w", err)
		}
		points = append(points, cp)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return points, nil
}

// CreateCoverageControlPoint creates a new coverage control point.
func (s *Store) CreateCoverageControlPoint(ctx context.Context, userID string, point CoverageControlPoint) (*CoverageControlPoint, error) {
	query := `
	INSERT INTO coverage_control_points (user_id, person_id, age, life_tpd, critical_illness, personal_accident, reason)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING ` + `id, user_id, person_id, '',
		age, life_tpd, critical_illness, personal_accident,
		reason, created_at, updated_at`

	args := []any{userID, point.PersonID, point.Age, point.LifeTpd, point.CriticalIllness, point.PersonalAccident, point.Reason}

	logQuery(query, args)

	created, err := scanCoverageControlPoint(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		return nil, fmt.Errorf("failed to create coverage control point: %w", err)
	}

	return created, nil
}

// UpdateCoverageControlPoint updates an existing coverage control point (full replacement).
func (s *Store) UpdateCoverageControlPoint(ctx context.Context, userID, id string, point CoverageControlPoint) (*CoverageControlPoint, error) {
	query := `
	UPDATE coverage_control_points SET
		person_id = $3, age = $4, life_tpd = $5,
		critical_illness = $6, personal_accident = $7, reason = $8,
		updated_at = NOW()
	WHERE user_id = $1 AND id = $2
	RETURNING ` + `id, user_id, person_id, '',
		age, life_tpd, critical_illness, personal_accident,
		reason, created_at, updated_at`

	args := []any{userID, id, point.PersonID, point.Age, point.LifeTpd, point.CriticalIllness, point.PersonalAccident, point.Reason}

	logQuery(query, args)

	updated, err := scanCoverageControlPoint(s.pool.QueryRow(ctx, query, args...))
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update coverage control point: %w", err)
	}

	return updated, nil
}

// DeleteCoverageControlPoint deletes a single coverage control point.
func (s *Store) DeleteCoverageControlPoint(ctx context.Context, userID, id string) error {
	query := `DELETE FROM coverage_control_points WHERE user_id = $1 AND id = $2`
	logQuery(query, []any{userID, id})

	result, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete coverage control point: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteCoverageControlPointsByPerson deletes all coverage control points for a specific person.
func (s *Store) DeleteCoverageControlPointsByPerson(ctx context.Context, userID, personID string) (int64, error) {
	query := `DELETE FROM coverage_control_points WHERE user_id = $1 AND person_id = $2`
	logQuery(query, []any{userID, personID})

	tag, err := s.pool.Exec(ctx, query, userID, personID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete coverage control points by person: %w", err)
	}
	return tag.RowsAffected(), nil
}

// BulkUpsertCoverageControlPoints replaces all control points for a person within a transaction.
// Deletes existing points for the person, then inserts all new points.
func (s *Store) BulkUpsertCoverageControlPoints(ctx context.Context, userID, personID string, points []CoverageControlPoint) ([]CoverageControlPoint, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete existing control points for this person
	deleteQuery := `DELETE FROM coverage_control_points WHERE user_id = $1 AND person_id = $2`
	logQuery(deleteQuery, []any{userID, personID})
	if _, err := tx.Exec(ctx, deleteQuery, userID, personID); err != nil {
		return nil, fmt.Errorf("failed to delete existing control points: %w", err)
	}

	// Insert all new points
	insertQuery := `
	INSERT INTO coverage_control_points (user_id, person_id, age, life_tpd, critical_illness, personal_accident, reason)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id, user_id, person_id, '',
		age, life_tpd, critical_illness, personal_accident,
		reason, created_at, updated_at`

	var results []CoverageControlPoint
	for _, point := range points {
		args := []any{userID, personID, point.Age, point.LifeTpd, point.CriticalIllness, point.PersonalAccident, point.Reason}
		logQuery(insertQuery, args)

		var cp CoverageControlPoint
		err := tx.QueryRow(ctx, insertQuery, args...).Scan(
			&cp.ID, &cp.UserID, &cp.PersonID, &cp.PersonName,
			&cp.Age, &cp.LifeTpd, &cp.CriticalIllness, &cp.PersonalAccident,
			&cp.Reason, &cp.CreatedAt, &cp.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to insert control point at age %d: %w", point.Age, err)
		}
		results = append(results, cp)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return results, nil
}
