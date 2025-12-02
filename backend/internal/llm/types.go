package llm

import (
	"context"
	"time"
)

// LLMClient defines the interface for LLM providers
type LLMClient interface {
	GenerateToolCalls(ctx context.Context, req ChatRequest) (*ToolCallResponse, error)
	SupportedModels() []string
	ProviderName() string
}

// ChatMessage represents a message in the conversation
type ChatMessage struct {
	Role       string     `json:"role"`                 // "user", "assistant", "system", "tool"
	Content    string     `json:"content"`              // Message content
	Name       string     `json:"name,omitempty"`       // Optional name for tool messages
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"` // Tool calls in this message
	ToolCallID string     `json:"tool_call_id,omitempty"` // ID of tool call this message responds to
}

// ToolCall represents a function call request from the LLM
type ToolCall struct {
	ID       string       `json:"id"`       // Unique identifier for this tool call
	Type     string       `json:"type"`     // Always "function" for function calls
	Function FunctionCall `json:"function"` // Function details
}

// FunctionCall represents the function being called
type FunctionCall struct {
	Name      string `json:"name"`      // Function name (e.g., "create_asset")
	Arguments string `json:"arguments"` // JSON string of function arguments
}

// ToolDefinition defines available tools for the LLM
type ToolDefinition struct {
	Type     string         `json:"type"`     // Always "function"
	Function FunctionSchema `json:"function"` // Function schema
}

// FunctionSchema defines the schema for a function
type FunctionSchema struct {
	Name        string     `json:"name"`        // Function name
	Description string     `json:"description"` // Human-readable description
	Parameters  JSONSchema `json:"parameters"`  // JSON Schema object
}

// ChatRequest represents a request to generate tool calls
type ChatRequest struct {
	Messages    []ChatMessage    `json:"messages"`              // Conversation history
	Tools       []ToolDefinition `json:"tools,omitempty"`       // Available tools
	Model       string           `json:"model"`                 // Model to use
	Temperature float64          `json:"temperature,omitempty"` // Sampling temperature (0-1)
	MaxTokens   int              `json:"max_tokens,omitempty"`  // Maximum tokens to generate
}

// ToolCallResponse represents the LLM's response with potential tool calls
type ToolCallResponse struct {
	Message     ChatMessage      `json:"message"`      // Assistant's response message
	ToolCalls   []ToolCall       `json:"tool_calls"`   // Extracted tool calls
	FinishReason string          `json:"finish_reason"` // Why generation stopped
	Usage       *TokenUsage      `json:"usage,omitempty"` // Token usage information
	RequestID   string           `json:"request_id"`    // Unique request identifier
	Provider    string           `json:"provider"`      // LLM provider used
	Model       string           `json:"model"`         // Model used
	ProcessingTime time.Duration `json:"processing_time"` // Time taken to process
}

// TokenUsage tracks token consumption
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	CachedTokens     int `json:"cached_tokens,omitempty"`
	ThoughtsTokens   int `json:"thoughts_tokens,omitempty"`
	TotalTokens      int `json:"total_tokens"`
}

// LLMConfig represents configuration for an LLM provider
type LLMConfig struct {
	APIKey      string  `json:"api_key"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	BaseURL     string  `json:"base_url,omitempty"` // Custom base URL if needed
	Timeout     int     `json:"timeout"`            // Request timeout in seconds
}

// ConversationContext represents the context for a conversation
type ConversationContext struct {
	SessionID string            `json:"session_id"`
	UserID    string            `json:"user_id,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// LLMError represents an error from the LLM provider
type LLMError struct {
	Type     string `json:"type"`     // Error type (rate_limit, invalid_request, etc.)
	Message  string `json:"message"`  // Error message
	Code     string `json:"code,omitempty"` // Provider-specific error code
	Provider string `json:"provider"` // Which provider caused the error
}

func (e LLMError) Error() string {
	return e.Message
}

// Common error types
const (
	ErrorTypeRateLimit      = "rate_limit"
	ErrorTypeInvalidRequest = "invalid_request"
	ErrorTypeAuthentication = "authentication"
	ErrorTypeModelNotFound  = "model_not_found"
	ErrorTypeServerError    = "server_error"
	ErrorTypeTimeout        = "timeout"
	ErrorTypeQuotaExceeded  = "quota_exceeded"
)

// Common finish reasons
const (
	FinishReasonStop       = "stop"
	FinishReasonLength     = "length"
	FinishReasonToolCalls  = "tool_calls"
	FinishReasonContentFilter = "content_filter"
)