package session

import (
	"time"

	"financial-chat-system/backend/internal/llm"
)

// SessionState represents the current state of a chat session
type SessionState struct {
	SessionID        string                 `json:"session_id"`
	UserID           string                 `json:"user_id"`
	LastAssetID      *string                `json:"last_asset_id,omitempty"`
	LastLiabilityID  *string                `json:"last_liability_id,omitempty"`
	ConversationFlow []ConversationStep     `json:"conversation_flow"`
	PendingActions   []PendingToolCall      `json:"pending_actions"`
	Messages         []llm.ChatMessage      `json:"messages"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// ConversationStep represents a step in the conversation flow
type ConversationStep struct {
	StepID      string    `json:"step_id"`
	Type        string    `json:"type"` // "user_message", "llm_response", "tool_execution"
	Content     string    `json:"content"`
	ToolCalls   []string  `json:"tool_calls,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
}

// PendingToolCall represents a tool call awaiting user approval
type PendingToolCall struct {
	CallID     string                 `json:"call_id"`
	ToolName   string                 `json:"tool_name"`
	Parameters map[string]interface{} `json:"parameters"`
	Preview    string                 `json:"preview,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
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