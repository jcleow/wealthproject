package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/llm"
)

// AnthropicProvider implements the LLMClient interface for Anthropic Claude
type AnthropicProvider struct {
	client      *http.Client
	config      AnthropicConfig
	rateLimiter *RateLimiter
}

// AnthropicConfig contains Anthropic-specific configuration
type AnthropicConfig struct {
	APIKey      string  `json:"api_key"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	BaseURL     string  `json:"base_url,omitempty"`
	Timeout     int     `json:"timeout"`
	Version     string  `json:"version"`
}

// AnthropicRequest represents the request format for Anthropic API
type AnthropicRequest struct {
	Model       string                 `json:"model"`
	MaxTokens   int                    `json:"max_tokens"`
	Temperature float64                `json:"temperature,omitempty"`
	Messages    []AnthropicMessage     `json:"messages"`
	Tools       []AnthropicTool        `json:"tools,omitempty"`
	System      string                 `json:"system,omitempty"`
}

// AnthropicMessage represents a message in Anthropic format
type AnthropicMessage struct {
	Role    string                 `json:"role"`
	Content []AnthropicContent     `json:"content"`
}

// AnthropicContent represents content within a message
type AnthropicContent struct {
	Type     string                 `json:"type"`
	Text     string                 `json:"text,omitempty"`
	ID       string                 `json:"id,omitempty"`
	Name     string                 `json:"name,omitempty"`
	Input    map[string]interface{} `json:"input,omitempty"`
	ToolUseId string                `json:"tool_use_id,omitempty"`
}

// AnthropicTool represents a tool definition in Anthropic format
type AnthropicTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema AnthropicInputSchema   `json:"input_schema"`
}

// AnthropicInputSchema represents the input schema for a tool
type AnthropicInputSchema struct {
	Type       string                            `json:"type"`
	Properties map[string]map[string]interface{} `json:"properties"`
	Required   []string                          `json:"required,omitempty"`
}

// AnthropicResponse represents the response from Anthropic API
type AnthropicResponse struct {
	ID           string                    `json:"id"`
	Type         string                    `json:"type"`
	Role         string                    `json:"role"`
	Content      []AnthropicResponseContent `json:"content"`
	Model        string                    `json:"model"`
	StopReason   string                    `json:"stop_reason"`
	StopSequence string                    `json:"stop_sequence,omitempty"`
	Usage        AnthropicUsage            `json:"usage"`
}

// AnthropicResponseContent represents content in the response
type AnthropicResponseContent struct {
	Type  string                 `json:"type"`
	Text  string                 `json:"text,omitempty"`
	ID    string                 `json:"id,omitempty"`
	Name  string                 `json:"name,omitempty"`
	Input map[string]interface{} `json:"input,omitempty"`
}

// AnthropicUsage represents token usage information
type AnthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// AnthropicError represents an error response from Anthropic API
type AnthropicError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider(config AnthropicConfig) (*AnthropicProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Anthropic API key is required")
	}

	if config.Model == "" {
		config.Model = "claude-3-haiku-20240307"
	}

	if config.Temperature == 0 {
		config.Temperature = 0.1 // Low temperature for structured output
	}

	if config.MaxTokens == 0 {
		config.MaxTokens = 2000
	}

	if config.Timeout == 0 {
		config.Timeout = 30
	}

	if config.Version == "" {
		config.Version = "2023-06-01"
	}

	if config.BaseURL == "" {
		config.BaseURL = "https://api.anthropic.com"
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: time.Duration(config.Timeout) * time.Second,
	}

	// Create rate limiter (similar to OpenAI)
	rateLimiter := &RateLimiter{
		requests: make(chan struct{}, 50), // Conservative rate limit
		interval: time.Minute,
	}

	// Initialize rate limiter
	go rateLimiter.run()

	return &AnthropicProvider{
		client:      client,
		config:      config,
		rateLimiter: rateLimiter,
	}, nil
}

// GenerateToolCalls implements the LLMClient interface
func (p *AnthropicProvider) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	// Apply rate limiting
	select {
	case p.rateLimiter.requests <- struct{}{}:
		// Request allowed
	case <-ctx.Done():
		return nil, fmt.Errorf("request cancelled while waiting for rate limit")
	}

	// Convert our request format to Anthropic format
	anthropicReq, err := p.convertRequest(req)
	if err != nil {
		return nil, fmt.Errorf("failed to convert request: %w", err)
	}

	// Make request to Anthropic
	start := time.Now()
	response, err := p.makeRequest(ctx, anthropicReq)
	if err != nil {
		return nil, p.handleError(err)
	}

	// Convert Anthropic response to our format
	result, err := p.convertResponse(response, time.Since(start))
	if err != nil {
		return nil, fmt.Errorf("failed to convert response: %w", err)
	}

	return result, nil
}

// convertRequest converts our ChatRequest to Anthropic format
func (p *AnthropicProvider) convertRequest(req llm.ChatRequest) (*AnthropicRequest, error) {
	var messages []AnthropicMessage
	var systemPrompt string

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			// Anthropic uses a separate system parameter
			systemPrompt = msg.Content
			continue
		}

		anthropicMsg := AnthropicMessage{
			Role: msg.Role,
		}

		// Handle different types of content
		if len(msg.ToolCalls) > 0 {
			// Message with tool calls
			var content []AnthropicContent

			// Add text content if present
			if msg.Content != "" {
				content = append(content, AnthropicContent{
					Type: "text",
					Text: msg.Content,
				})
			}

			// Add tool calls as tool_use content
			for _, tc := range msg.ToolCalls {
				var input map[string]interface{}
				if tc.Function.Arguments != "" {
					if err := json.Unmarshal([]byte(tc.Function.Arguments), &input); err != nil {
						return nil, fmt.Errorf("failed to parse tool arguments: %w", err)
					}
				}

				content = append(content, AnthropicContent{
					Type:  "tool_use",
					ID:    tc.ID,
					Name:  tc.Function.Name,
					Input: input,
				})
			}

			anthropicMsg.Content = content
		} else if msg.ToolCallID != "" {
			// Tool result message
			anthropicMsg.Content = []AnthropicContent{
				{
					Type:      "tool_result",
					ToolUseId: msg.ToolCallID,
					Text:      msg.Content,
				},
			}
		} else {
			// Regular text message
			anthropicMsg.Content = []AnthropicContent{
				{
					Type: "text",
					Text: msg.Content,
				},
			}
		}

		messages = append(messages, anthropicMsg)
	}

	// Convert tools
	var tools []AnthropicTool
	if len(req.Tools) > 0 {
		tools = make([]AnthropicTool, len(req.Tools))
		for i, tool := range req.Tools {
			params := tool.Function.Parameters
			inputSchema := AnthropicInputSchema{
				Type:       "object",
				Properties: make(map[string]map[string]interface{}),
				Required:   params.Required,
			}

			// Convert typed PropertySchema to map format for Anthropic API
			for name, prop := range params.Properties {
				propMap := make(map[string]interface{})
				propMap["type"] = prop.Type
				if prop.Description != "" {
					propMap["description"] = prop.Description
				}
				if len(prop.Enum) > 0 {
					propMap["enum"] = prop.Enum
				}
				if prop.Minimum != nil {
					propMap["minimum"] = *prop.Minimum
				}
				if prop.Maximum != nil {
					propMap["maximum"] = *prop.Maximum
				}
				if prop.MinLength != nil {
					propMap["minLength"] = *prop.MinLength
				}
				if prop.MaxLength != nil {
					propMap["maxLength"] = *prop.MaxLength
				}
				if prop.Default != nil {
					propMap["default"] = prop.Default
				}
				if prop.Items != nil {
					propMap["items"] = map[string]interface{}{"type": prop.Items.Type}
				}
				inputSchema.Properties[name] = propMap
			}

			tools[i] = AnthropicTool{
				Name:        tool.Function.Name,
				Description: tool.Function.Description,
				InputSchema: inputSchema,
			}
		}
	}

	// Use model from request if specified, otherwise use config default
	model := req.Model
	if model == "" {
		model = p.config.Model
	}

	// Use temperature from request if specified, otherwise use config default
	temperature := req.Temperature
	if temperature == 0 {
		temperature = p.config.Temperature
	}

	// Use max tokens from request if specified, otherwise use config default
	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = p.config.MaxTokens
	}

	anthropicReq := &AnthropicRequest{
		Model:       model,
		MaxTokens:   maxTokens,
		Temperature: temperature,
		Messages:    messages,
		Tools:       tools,
		System:      systemPrompt,
	}

	return anthropicReq, nil
}

// makeRequest makes HTTP request to Anthropic API
func (p *AnthropicProvider) makeRequest(ctx context.Context, req *AnthropicRequest) (*AnthropicResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.config.BaseURL+"/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.config.APIKey)
	httpReq.Header.Set("anthropic-version", p.config.Version)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiError AnthropicError
		if err := json.Unmarshal(body, &apiError); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("API error: %s", apiError.Message)
	}

	var anthropicResp AnthropicResponse
	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &anthropicResp, nil
}

// convertResponse converts Anthropic response to our format
func (p *AnthropicProvider) convertResponse(response *AnthropicResponse, processingTime time.Duration) (*llm.ToolCallResponse, error) {
	// Convert assistant message
	assistantMsg := llm.ChatMessage{
		Role: "assistant",
	}

	var toolCalls []llm.ToolCall
	var textContent []string

	// Process response content
	for _, content := range response.Content {
		switch content.Type {
		case "text":
			textContent = append(textContent, content.Text)
		case "tool_use":
			// Convert tool use to our format
			argumentsJSON, err := json.Marshal(content.Input)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal tool arguments: %w", err)
			}

			toolCall := llm.ToolCall{
				ID:   content.ID,
				Type: "function",
				Function: llm.FunctionCall{
					Name:      content.Name,
					Arguments: string(argumentsJSON),
				},
			}

			toolCalls = append(toolCalls, toolCall)
		}
	}

	// Set content and tool calls
	if len(textContent) > 0 {
		assistantMsg.Content = textContent[0] // Use first text content
	}
	assistantMsg.ToolCalls = toolCalls

	// Convert usage information
	var usage *llm.TokenUsage
	if response.Usage.InputTokens > 0 || response.Usage.OutputTokens > 0 {
		usage = &llm.TokenUsage{
			PromptTokens:     response.Usage.InputTokens,
			CompletionTokens: response.Usage.OutputTokens,
			TotalTokens:      response.Usage.InputTokens + response.Usage.OutputTokens,
		}
	}

	// Map stop reasons
	finishReason := response.StopReason
	switch finishReason {
	case "end_turn":
		finishReason = llm.FinishReasonStop
	case "max_tokens":
		finishReason = llm.FinishReasonLength
	case "tool_use":
		finishReason = llm.FinishReasonToolCalls
	}

	return &llm.ToolCallResponse{
		Message:        assistantMsg,
		ToolCalls:      toolCalls,
		FinishReason:   finishReason,
		Usage:          usage,
		RequestID:      response.ID,
		Provider:       "anthropic",
		Model:          response.Model,
		ProcessingTime: processingTime,
	}, nil
}

// handleError converts Anthropic errors to our error format
func (p *AnthropicProvider) handleError(err error) error {
	// Handle timeout
	if err == context.DeadlineExceeded {
		return llm.LLMError{
			Type:     llm.ErrorTypeTimeout,
			Message:  "Request timed out",
			Provider: "anthropic",
		}
	}

	// Try to parse error message
	errorMessage := err.Error()
	errorType := llm.ErrorTypeServerError

	// Parse common Anthropic error patterns
	if bytes.Contains([]byte(errorMessage), []byte("authentication")) {
		errorType = llm.ErrorTypeAuthentication
	} else if bytes.Contains([]byte(errorMessage), []byte("rate")) {
		errorType = llm.ErrorTypeRateLimit
	} else if bytes.Contains([]byte(errorMessage), []byte("quota")) {
		errorType = llm.ErrorTypeQuotaExceeded
	} else if bytes.Contains([]byte(errorMessage), []byte("invalid")) {
		errorType = llm.ErrorTypeInvalidRequest
	}

	return llm.LLMError{
		Type:     errorType,
		Message:  errorMessage,
		Provider: "anthropic",
	}
}

// SupportedModels returns list of supported Anthropic models
func (p *AnthropicProvider) SupportedModels() []string {
	return []string{
		"claude-3-opus-20240229",
		"claude-3-sonnet-20240229",
		"claude-3-haiku-20240307",
		"claude-3-5-sonnet-20241022",
	}
}

// ProviderName returns the name of this provider
func (p *AnthropicProvider) ProviderName() string {
	return "anthropic"
}

// ValidateConfig validates Anthropic configuration
func ValidateAnthropicConfig(config AnthropicConfig) error {
	if config.APIKey == "" {
		return fmt.Errorf("API key is required")
	}

	if config.Temperature < 0 || config.Temperature > 1 {
		return fmt.Errorf("temperature must be between 0 and 1")
	}

	if config.MaxTokens < 1 || config.MaxTokens > 4096 {
		return fmt.Errorf("max_tokens must be between 1 and 4096")
	}

	return nil
}