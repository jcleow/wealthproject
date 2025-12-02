package usage

import (
	"time"
)

// UsageLog represents a single LLM API call log entry
type UsageLog struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	SessionID        *string   `json:"session_id,omitempty"`
	RequestID        string    `json:"request_id"`
	Provider         string    `json:"provider"`
	Model            string    `json:"model"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	CachedTokens     int       `json:"cached_tokens"`
	ThoughtsTokens   int       `json:"thoughts_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	InputCostUSD     float64   `json:"input_cost_usd"`
	OutputCostUSD    float64   `json:"output_cost_usd"`
	TotalCostUSD     float64   `json:"total_cost_usd"`
	ProcessingTimeMs int       `json:"processing_time_ms"`
	ToolCallsCount   int       `json:"tool_calls_count"`
	CreatedAt        time.Time `json:"created_at"`
}

// DailyUsage represents aggregated usage for a user on a specific day
type DailyUsage struct {
	UserID           string    `json:"user_id"`
	Date             time.Time `json:"date"`
	RequestCount     int       `json:"request_count"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	CachedTokens     int       `json:"cached_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	TotalCostUSD     float64   `json:"total_cost_usd"`
}

// MonthlyUsage represents aggregated usage for a user in a specific month
type MonthlyUsage struct {
	UserID           string    `json:"user_id"`
	Month            time.Time `json:"month"`
	RequestCount     int       `json:"request_count"`
	UniqueSessiones  int       `json:"unique_sessions"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	TotalCostUSD     float64   `json:"total_cost_usd"`
}

// Cost represents calculated costs for a single request
type Cost struct {
	InputCostUSD  float64 `json:"input_cost_usd"`
	OutputCostUSD float64 `json:"output_cost_usd"`
	TotalCostUSD  float64 `json:"total_cost_usd"`
}
