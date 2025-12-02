package usage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/google/uuid"
)

// Repository handles usage logging and querying
type Repository struct {
	db      *sql.DB
	enabled bool
}

// NewRepository creates a new usage repository
func NewRepository(db *sql.DB, enabled bool) *Repository {
	return &Repository{
		db:      db,
		enabled: enabled,
	}
}

// IsEnabled returns whether usage tracking is enabled
func (r *Repository) IsEnabled() bool {
	return r.enabled
}

// LogUsage logs a single LLM API call
func (r *Repository) LogUsage(ctx context.Context, userID string, sessionID *string, response *llm.ToolCallResponse) error {
	if !r.enabled || response == nil {
		return nil
	}

	// Calculate cost
	cost := CalculateCost(response.Provider, response.Model, response.Usage)

	// Prepare token values
	var promptTokens, completionTokens, cachedTokens, thoughtsTokens, totalTokens int
	if response.Usage != nil {
		promptTokens = response.Usage.PromptTokens
		completionTokens = response.Usage.CompletionTokens
		cachedTokens = response.Usage.CachedTokens
		thoughtsTokens = response.Usage.ThoughtsTokens
		totalTokens = response.Usage.TotalTokens
	}

	query := `
		INSERT INTO llm_usage_log (
			id, user_id, session_id, request_id, provider, model,
			prompt_tokens, completion_tokens, cached_tokens, thoughts_tokens, total_tokens,
			input_cost_usd, output_cost_usd, total_cost_usd,
			processing_time_ms, tool_calls_count, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	id := uuid.New().String()
	processingTimeMs := int(response.ProcessingTime.Milliseconds())
	toolCallsCount := len(response.ToolCalls)

	_, err := r.db.ExecContext(ctx, query,
		id, userID, sessionID, response.RequestID, response.Provider, response.Model,
		promptTokens, completionTokens, cachedTokens, thoughtsTokens, totalTokens,
		cost.InputCostUSD, cost.OutputCostUSD, cost.TotalCostUSD,
		processingTimeMs, toolCallsCount, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to log usage: %w", err)
	}

	return nil
}

// GetUserDailyUsage retrieves aggregated usage for a user on a specific day
func (r *Repository) GetUserDailyUsage(ctx context.Context, userID string, date time.Time) (*DailyUsage, error) {
	query := `
		SELECT
			user_id,
			DATE(created_at) as date,
			COUNT(*) as request_count,
			COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) as completion_tokens,
			COALESCE(SUM(cached_tokens), 0) as cached_tokens,
			COALESCE(SUM(total_tokens), 0) as total_tokens,
			COALESCE(SUM(total_cost_usd), 0) as total_cost_usd
		FROM llm_usage_log
		WHERE user_id = $1 AND DATE(created_at) = DATE($2)
		GROUP BY user_id, DATE(created_at)
	`

	var usage DailyUsage
	err := r.db.QueryRowContext(ctx, query, userID, date).Scan(
		&usage.UserID,
		&usage.Date,
		&usage.RequestCount,
		&usage.PromptTokens,
		&usage.CompletionTokens,
		&usage.CachedTokens,
		&usage.TotalTokens,
		&usage.TotalCostUSD,
	)

	if err == sql.ErrNoRows {
		// Return empty usage for the day
		return &DailyUsage{
			UserID: userID,
			Date:   date,
		}, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get daily usage: %w", err)
	}

	return &usage, nil
}

// GetUserMonthlyUsage retrieves aggregated usage for a user in a specific month
func (r *Repository) GetUserMonthlyUsage(ctx context.Context, userID string, month time.Time) (*MonthlyUsage, error) {
	// Get first day of month
	firstOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())
	// Get first day of next month
	firstOfNextMonth := firstOfMonth.AddDate(0, 1, 0)

	query := `
		SELECT
			user_id,
			DATE_TRUNC('month', created_at) as month,
			COUNT(*) as request_count,
			COUNT(DISTINCT session_id) as unique_sessions,
			COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) as completion_tokens,
			COALESCE(SUM(total_tokens), 0) as total_tokens,
			COALESCE(SUM(total_cost_usd), 0) as total_cost_usd
		FROM llm_usage_log
		WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
		GROUP BY user_id, DATE_TRUNC('month', created_at)
	`

	var usage MonthlyUsage
	err := r.db.QueryRowContext(ctx, query, userID, firstOfMonth, firstOfNextMonth).Scan(
		&usage.UserID,
		&usage.Month,
		&usage.RequestCount,
		&usage.UniqueSessiones,
		&usage.PromptTokens,
		&usage.CompletionTokens,
		&usage.TotalTokens,
		&usage.TotalCostUSD,
	)

	if err == sql.ErrNoRows {
		// Return empty usage for the month
		return &MonthlyUsage{
			UserID: userID,
			Month:  firstOfMonth,
		}, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get monthly usage: %w", err)
	}

	return &usage, nil
}

// GetTotalCostForPeriod returns total cost for all users in a date range
func (r *Repository) GetTotalCostForPeriod(ctx context.Context, start, end time.Time) (float64, error) {
	query := `
		SELECT COALESCE(SUM(total_cost_usd), 0)
		FROM llm_usage_log
		WHERE created_at >= $1 AND created_at < $2
	`

	var totalCost float64
	err := r.db.QueryRowContext(ctx, query, start, end).Scan(&totalCost)
	if err != nil {
		return 0, fmt.Errorf("failed to get total cost: %w", err)
	}

	return totalCost, nil
}
