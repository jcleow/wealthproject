package repository

import (
	"context"
	"fmt"
)

// deleteByID deletes a single row by user_id and id from the given table.
// This is an unexported helper to prevent SQL injection via the public API.
// Callers must pass a hardcoded table name constant.
func (s *Store) deleteByID(ctx context.Context, tableName, userID, id string) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE user_id = $1 AND id = $2`, tableName)
	logQuery(query, []any{userID, id})

	result, err := s.pool.Exec(ctx, query, userID, id)
	if err != nil {
		return fmt.Errorf("failed to delete from %s: %w", tableName, err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// deleteAllByUser deletes all rows for a user from the given table.
// This is an unexported helper to prevent SQL injection via the public API.
// Callers must pass a hardcoded table name constant.
func (s *Store) deleteAllByUser(ctx context.Context, tableName, userID string) (int64, error) {
	query := fmt.Sprintf(`DELETE FROM %s WHERE user_id = $1`, tableName)
	logQuery(query, []any{userID})

	tag, err := s.pool.Exec(ctx, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all from %s: %w", tableName, err)
	}
	return tag.RowsAffected(), nil
}
