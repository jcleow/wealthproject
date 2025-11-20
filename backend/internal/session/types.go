package session

import (
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/google/uuid"
)

// SessionState represents the current state of a chat session
type SessionState struct {
	SessionID        string             `json:"session_id"`
	ChatID           string             `json:"chat_id"`
	UserID           string             `json:"user_id"`
	LastAssetID      *string            `json:"last_asset_id,omitempty"`
	LastLiabilityID  *string            `json:"last_liability_id,omitempty"`
	LastPropertyPlan *string            `json:"last_property_plan_id,omitempty"`
	ConversationFlow []ConversationStep `json:"conversation_flow"`
	PendingActions   []PendingToolCall  `json:"pending_actions"`
	Messages         []llm.ChatMessage  `json:"messages"`
	Metadata         map[string]string  `json:"metadata,omitempty"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
}

// ConversationStep represents a step in the conversation flow
type ConversationStep struct {
	StepID    string                 `json:"step_id"`
	Type      string                 `json:"type,omitempty"` // "user_message", "llm_response", "tool_execution"
	ToolName  string                 `json:"tool_name,omitempty"`
	Content   string                 `json:"content,omitempty"`
	Result    map[string]interface{} `json:"result,omitempty"`
	ToolCalls []string               `json:"tool_calls,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// PendingToolCall represents a tool call awaiting user approval
type PendingToolCall struct {
	CallID              string                 `json:"call_id"`
	ToolName            string                 `json:"tool_name"`
	FriendlyDescription string                 `json:"friendly_description,omitempty"`
	Parameters          map[string]interface{} `json:"parameters"`
	Preview             string                 `json:"preview,omitempty"`
	Dependencies        []string               `json:"dependencies,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
}

// SessionMetadata contains additional session information
type SessionMetadata struct {
	SessionID    string    `json:"session_id"`
	UserID       string    `json:"user_id"`
	ClientInfo   string    `json:"client_info,omitempty"`
	IPAddress    string    `json:"ip_address,omitempty"`
	UserAgent    string    `json:"user_agent,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	LastActivity time.Time `json:"last_activity"`
	IsActive     bool      `json:"is_active"`
}

// NewSessionState returns a default session state
func NewSessionState(sessionID, chatID, userID string) *SessionState {
	now := time.Now().UTC()
	return &SessionState{
		SessionID:        sessionID,
		ChatID:           chatID,
		UserID:           userID,
		ConversationFlow: make([]ConversationStep, 0),
		PendingActions:   make([]PendingToolCall, 0),
		Messages:         make([]llm.ChatMessage, 0),
		Metadata:         make(map[string]string),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

// SetPendingActions replaces the pending action list
func (s *SessionState) SetPendingActions(actions []PendingToolCall) {
	s.PendingActions = make([]PendingToolCall, len(actions))
	copy(s.PendingActions, actions)
	s.touch()
}

// ClearPendingActions removes pending actions
func (s *SessionState) ClearPendingActions() {
	s.PendingActions = make([]PendingToolCall, 0)
	s.touch()
}

// AppendConversationStep appends a step ensuring identifiers exist
func (s *SessionState) AppendConversationStep(step ConversationStep) {
	if step.StepID == "" {
		step.StepID = uuid.New().String()
	}
	if step.Timestamp.IsZero() {
		step.Timestamp = time.Now().UTC()
	}
	s.ConversationFlow = append(s.ConversationFlow, step)
	s.touch()
}

// touch updates the UpdatedAt timestamp
func (s *SessionState) touch() {
	s.UpdatedAt = time.Now().UTC()
}
