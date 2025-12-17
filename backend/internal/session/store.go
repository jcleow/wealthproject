package session

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Common errors
var (
	ErrSessionNotFound = errors.New("session not found")
)

// Store manages session persistence in PostgreSQL
type Store struct {
	db     *sql.DB
	maxAge time.Duration
}

// PendingActionMetadata holds additional details for pending tool calls
type PendingActionMetadata struct {
	FriendlyDescription string   `json:"friendly_description,omitempty"`
	Dependencies        []string `json:"dependencies,omitempty"`
}

// NewStore creates a new session store
func NewStore(db *sql.DB, maxAge time.Duration) *Store {
	return &Store{
		db:     db,
		maxAge: maxAge,
	}
}

// CreateSession creates a new session with an optional provided sessionID.
// If sessionID is empty, a new UUID is generated.
func (s *Store) CreateSession(ctx context.Context, userID string, sessionID string) (*SessionState, error) {
	if sessionID == "" {
		sessionID = uuid.New().String()
	} else {
		if _, err := uuid.Parse(sessionID); err != nil {
			return nil, fmt.Errorf("invalid session id: %w", err)
		}
	}
	now := time.Now().UTC()

	session := &SessionState{
		SessionID:        sessionID,
		UserID:           userID,
		ConversationFlow: []ConversationStep{},
		PendingActions:   []PendingToolCall{},
		Messages:         []llm.ChatMessage{},
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	stateJSON, err := json.Marshal(session)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal session state: %w", err)
	}

	query := `
		INSERT INTO chat_sessions (session_id, user_id, state, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err = s.db.ExecContext(ctx, query, sessionID, userID, stateJSON, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

// GetSession retrieves a session by ID
func (s *Store) GetSession(ctx context.Context, sessionID string) (*SessionState, error) {
	query := `
		SELECT state FROM chat_sessions
		WHERE session_id = $1
	`

	var stateJSON []byte
	err := s.db.QueryRowContext(ctx, query, sessionID).Scan(&stateJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("session not found: %s", sessionID)
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var session SessionState
	if err := json.Unmarshal(stateJSON, &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session state: %w", err)
	}

	if s.maxAge > 0 && time.Since(session.UpdatedAt) > s.maxAge {
		return nil, fmt.Errorf("session expired: %s", sessionID)
	}

	return &session, nil
}

// UpdateSession updates an existing session
func (s *Store) UpdateSession(ctx context.Context, session *SessionState) error {
	session.UpdatedAt = time.Now().UTC()

	stateJSON, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session state: %w", err)
	}

	query := `
		UPDATE chat_sessions
		SET state = $1, updated_at = $2
		WHERE session_id = $3
	`

	result, err := s.db.ExecContext(ctx, query, stateJSON, session.UpdatedAt, session.SessionID)
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("session not found: %s", session.SessionID)
	}

	return nil
}

// AddMessage adds a message to the conversation history
func (s *Store) AddMessage(ctx context.Context, sessionID string, message llm.ChatMessage) error {
	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}

	session.Messages = append(session.Messages, message)

	// Add to conversation flow
	step := ConversationStep{
		StepID:    uuid.New().String(),
		Type:      fmt.Sprintf("%s_message", message.Role),
		Content:   message.Content,
		Timestamp: time.Now().UTC(),
	}

	if len(message.ToolCalls) > 0 {
		for _, tc := range message.ToolCalls {
			step.ToolCalls = append(step.ToolCalls, tc.ID)
		}
	}

	session.ConversationFlow = append(session.ConversationFlow, step)

	return s.UpdateSession(ctx, session)
}

// AddPendingActions adds pending tool calls to the session
func (s *Store) AddPendingActions(ctx context.Context, sessionID string, toolCalls []llm.ToolCall) error {
	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	for _, tc := range toolCalls {
		// Parse the arguments JSON string into a map
		var parameters map[string]interface{}
		if tc.Function.Arguments != "" {
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &parameters); err != nil {
				// If parsing fails, store as a single value
				parameters = map[string]interface{}{
					"raw": tc.Function.Arguments,
				}
			}
		}

		pending := PendingToolCall{
			CallID:     tc.ID,
			ToolName:   tc.Function.Name,
			Parameters: parameters,
			CreatedAt:  now,
		}
		session.PendingActions = append(session.PendingActions, pending)
	}

	return s.UpdateSession(ctx, session)
}

// UpdatePendingActionMetadata enriches pending actions with friendly details and dependencies
func (s *Store) UpdatePendingActionMetadata(ctx context.Context, sessionID string, metadata map[string]PendingActionMetadata) error {
	if len(metadata) == 0 {
		return nil
	}

	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}

	updated := false
	for i, action := range session.PendingActions {
		if meta, ok := metadata[action.CallID]; ok {
			if meta.FriendlyDescription != "" {
				session.PendingActions[i].FriendlyDescription = meta.FriendlyDescription
			}
			if len(meta.Dependencies) > 0 {
				session.PendingActions[i].Dependencies = meta.Dependencies
			}
			updated = true
		}
	}

	if !updated {
		return nil
	}

	return s.UpdateSession(ctx, session)
}

// GetPendingActions retrieves pending actions for a session
func (s *Store) GetPendingActions(ctx context.Context, sessionID string) ([]PendingToolCall, error) {
	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	return session.PendingActions, nil
}

// ClearPendingActions removes pending actions after execution
func (s *Store) ClearPendingActions(ctx context.Context, sessionID string, callIDs []string) error {
	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}

	// Create a map for quick lookup
	toRemove := make(map[string]bool)
	for _, id := range callIDs {
		toRemove[id] = true
	}

	// Filter out the cleared actions
	var remaining []PendingToolCall
	for _, action := range session.PendingActions {
		if !toRemove[action.CallID] {
			remaining = append(remaining, action)
		}
	}

	session.PendingActions = remaining
	return s.UpdateSession(ctx, session)
}

// UpdateEntityReferences updates the last created entity IDs
func (s *Store) UpdateEntityReferences(ctx context.Context, sessionID string, assetID, liabilityID *string) error {
	session, err := s.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}

	if assetID != nil {
		session.LastAssetID = assetID
	}
	if liabilityID != nil {
		session.LastLiabilityID = liabilityID
	}

	return s.UpdateSession(ctx, session)
}

// ListActiveSessions lists active sessions for a user
func (s *Store) ListActiveSessions(ctx context.Context, userID string) ([]*SessionMetadata, error) {
	query := `
		SELECT session_id, user_id, created_at, updated_at
		FROM chat_sessions
		WHERE user_id = $1 AND updated_at > $2
		ORDER BY updated_at DESC
	`

	// Consider sessions active if updated in the last 24 hours
	cutoff := time.Now().UTC().Add(-24 * time.Hour)

	rows, err := s.db.QueryContext(ctx, query, userID, cutoff)
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*SessionMetadata
	for rows.Next() {
		var meta SessionMetadata
		err := rows.Scan(&meta.SessionID, &meta.UserID, &meta.CreatedAt, &meta.LastActivity)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		meta.IsActive = true
		sessions = append(sessions, &meta)
	}

	return sessions, nil
}

// CleanupExpiredSessions removes old sessions
func (s *Store) CleanupExpiredSessions(ctx context.Context, maxAge time.Duration) (int, error) {
	cutoff := time.Now().UTC().Add(-maxAge)

	query := `
		DELETE FROM chat_sessions
		WHERE updated_at < $1
	`

	result, err := s.db.ExecContext(ctx, query, cutoff)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup sessions: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return int(rows), nil
}

// SaveConversationHistory saves the full conversation history separately
func (s *Store) SaveConversationHistory(ctx context.Context, sessionID string, messages []llm.ChatMessage) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO conversation_history (id, session_id, role, content, tool_calls, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	for _, msg := range messages {
		msgID := uuid.New().String()

		var toolCallsJSON []byte
		if len(msg.ToolCalls) > 0 {
			toolCallsJSON, err = json.Marshal(msg.ToolCalls)
			if err != nil {
				return fmt.Errorf("failed to marshal tool calls: %w", err)
			}
		}

		_, err = tx.ExecContext(ctx, query, msgID, sessionID, msg.Role, msg.Content, toolCallsJSON, time.Now().UTC())
		if err != nil {
			return fmt.Errorf("failed to save message: %w", err)
		}
	}

	return tx.Commit()
}

// GetConversationHistory retrieves the conversation history for a session
func (s *Store) GetConversationHistory(ctx context.Context, sessionID string, limit int) ([]llm.ChatMessage, error) {
	query := `
		SELECT role, content, tool_calls
		FROM conversation_history
		WHERE session_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := s.db.QueryContext(ctx, query, sessionID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation history: %w", err)
	}
	defer rows.Close()

	var messages []llm.ChatMessage
	for rows.Next() {
		var msg llm.ChatMessage
		var toolCallsJSON []byte

		err := rows.Scan(&msg.Role, &msg.Content, &toolCallsJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}

		if toolCallsJSON != nil {
			var toolCalls []llm.ToolCall
			if err := json.Unmarshal(toolCallsJSON, &toolCalls); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tool calls: %w", err)
			}
			msg.ToolCalls = toolCalls
		}

		messages = append(messages, msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
