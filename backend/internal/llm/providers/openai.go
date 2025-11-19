package providers

import (
	"context"
<<<<<<< HEAD
	"encoding/json"
=======
>>>>>>> da61af971f3ab52ee610e7c4d2b358440c006849
	"fmt"
	"time"

	"financial-chat-system/backend/internal/llm"

	openai "github.com/sashabaranov/go-openai"
)

// OpenAIProvider implements the LLMClient interface for OpenAI
type OpenAIProvider struct {
	client      *openai.Client
	config      OpenAIConfig
	rateLimiter *RateLimiter
}

// OpenAIConfig contains OpenAI-specific configuration
type OpenAIConfig struct {
	APIKey      string  `json:"api_key"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	BaseURL     string  `json:"base_url,omitempty"`
	Timeout     int     `json:"timeout"`
}

// RateLimiter implements basic rate limiting
type RateLimiter struct {
	requests chan struct{}
	interval time.Duration
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider(config OpenAIConfig) (*OpenAIProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("OpenAI API key is required")
	}

	if config.Model == "" {
		config.Model = openai.GPT4
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

	// Create OpenAI client
	clientConfig := openai.DefaultConfig(config.APIKey)
	if config.BaseURL != "" {
		clientConfig.BaseURL = config.BaseURL
	}

	client := openai.NewClientWithConfig(clientConfig)

	// Create rate limiter (60 requests per minute for GPT-4)
	rateLimiter := &RateLimiter{
		requests: make(chan struct{}, 60),
		interval: time.Minute,
	}

	// Initialize rate limiter
	go rateLimiter.run()

	return &OpenAIProvider{
		client:      client,
		config:      config,
		rateLimiter: rateLimiter,
	}, nil
}

// GenerateToolCalls implements the LLMClient interface
func (p *OpenAIProvider) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	// Apply rate limiting
	select {
	case p.rateLimiter.requests <- struct{}{}:
		// Request allowed
	case <-ctx.Done():
		return nil, fmt.Errorf("request cancelled while waiting for rate limit")
	}

	// Convert our request format to OpenAI format
	openaiReq, err := p.convertRequest(req)
	if err != nil {
		return nil, fmt.Errorf("failed to convert request: %w", err)
	}

	// Add timeout to context
	ctx, cancel := context.WithTimeout(ctx, time.Duration(p.config.Timeout)*time.Second)
	defer cancel()

	// Make request to OpenAI
	start := time.Now()
	response, err := p.client.CreateChatCompletion(ctx, openaiReq)
	if err != nil {
		return nil, p.handleError(err)
	}

	// Convert OpenAI response to our format
	result, err := p.convertResponse(response, time.Since(start))
	if err != nil {
		return nil, fmt.Errorf("failed to convert response: %w", err)
	}

	return result, nil
}

// convertRequest converts our ChatRequest to OpenAI format
func (p *OpenAIProvider) convertRequest(req llm.ChatRequest) (openai.ChatCompletionRequest, error) {
	// Convert messages
	messages := make([]openai.ChatCompletionMessage, len(req.Messages))
	for i, msg := range req.Messages {
		openaiMsg := openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
			Name:    msg.Name,
		}

		// Convert tool calls if present
		if len(msg.ToolCalls) > 0 {
			openaiMsg.ToolCalls = make([]openai.ToolCall, len(msg.ToolCalls))
			for j, tc := range msg.ToolCalls {
				openaiMsg.ToolCalls[j] = openai.ToolCall{
					ID:   tc.ID,
					Type: openai.ToolType(tc.Type),
					Function: openai.FunctionCall{
						Name:      tc.Function.Name,
						Arguments: tc.Function.Arguments,
					},
				}
			}
		}

		// Set tool call ID if present
		if msg.ToolCallID != "" {
			openaiMsg.ToolCallID = msg.ToolCallID
		}

		messages[i] = openaiMsg
	}

	// Convert tools
	var tools []openai.Tool
	if len(req.Tools) > 0 {
		tools = make([]openai.Tool, len(req.Tools))
		for i, tool := range req.Tools {
			tools[i] = openai.Tool{
				Type: openai.ToolType(tool.Type),
				Function: openai.FunctionDefinition{
					Name:        tool.Function.Name,
					Description: tool.Function.Description,
					Parameters:  tool.Function.Parameters,
				},
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

	openaiReq := openai.ChatCompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: float32(temperature),
		MaxTokens:   maxTokens,
		Tools:       tools,
	}

	// If tools are provided, ensure tool choice is auto
	if len(tools) > 0 {
		openaiReq.ToolChoice = "auto"
	}

	return openaiReq, nil
}

// convertResponse converts OpenAI response to our format
func (p *OpenAIProvider) convertResponse(response openai.ChatCompletionResponse, processingTime time.Duration) (*llm.ToolCallResponse, error) {
	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no choices in OpenAI response")
	}

	choice := response.Choices[0]
	message := choice.Message

	// Convert assistant message
	assistantMsg := llm.ChatMessage{
		Role:    message.Role,
		Content: message.Content,
		Name:    message.Name,
	}

	// Convert tool calls
	var toolCalls []llm.ToolCall
	if len(message.ToolCalls) > 0 {
		toolCalls = make([]llm.ToolCall, len(message.ToolCalls))
		assistantMsg.ToolCalls = make([]llm.ToolCall, len(message.ToolCalls))

		for i, tc := range message.ToolCalls {
			convertedTC := llm.ToolCall{
				ID:   tc.ID,
				Type: string(tc.Type),
				Function: llm.FunctionCall{
					Name:      tc.Function.Name,
					Arguments: tc.Function.Arguments,
				},
			}

			toolCalls[i] = convertedTC
			assistantMsg.ToolCalls[i] = convertedTC
		}
	}

	// Convert usage information
	var usage *llm.TokenUsage
	if response.Usage.TotalTokens > 0 {
		usage = &llm.TokenUsage{
			PromptTokens:     response.Usage.PromptTokens,
			CompletionTokens: response.Usage.CompletionTokens,
			TotalTokens:      response.Usage.TotalTokens,
		}
	}

	return &llm.ToolCallResponse{
		Message:        assistantMsg,
		ToolCalls:      toolCalls,
		FinishReason:   string(choice.FinishReason),
		Usage:          usage,
		RequestID:      response.ID,
		Provider:       "openai",
		Model:          response.Model,
		ProcessingTime: processingTime,
	}, nil
}

// handleError converts OpenAI errors to our error format
func (p *OpenAIProvider) handleError(err error) error {
	// Try to parse as OpenAI API error
	if apiError, ok := err.(*openai.APIError); ok {
		errorType := llm.ErrorTypeServerError

		switch apiError.HTTPStatusCode {
		case 401:
			errorType = llm.ErrorTypeAuthentication
		case 429:
			errorType = llm.ErrorTypeRateLimit
		case 400:
			errorType = llm.ErrorTypeInvalidRequest
		case 404:
			errorType = llm.ErrorTypeModelNotFound
		}

<<<<<<< HEAD
		return llm.LLMError{
			Type:     errorType,
			Message:  apiError.Message,
			Code:     apiError.Code,
=======
		var code string
		if codeVal, ok := apiError.Code.(string); ok {
			code = codeVal
		} else if apiError.Code != nil {
			code = fmt.Sprintf("%v", apiError.Code)
		}

		return llm.LLMError{
			Type:     errorType,
			Message:  apiError.Message,
			Code:     code,
>>>>>>> da61af971f3ab52ee610e7c4d2b358440c006849
			Provider: "openai",
		}
	}

	// Handle request errors
	if err == context.DeadlineExceeded {
		return llm.LLMError{
			Type:     llm.ErrorTypeTimeout,
			Message:  "Request timed out",
			Provider: "openai",
		}
	}

	// Generic error
	return llm.LLMError{
		Type:     llm.ErrorTypeServerError,
		Message:  err.Error(),
		Provider: "openai",
	}
}

// SupportedModels returns list of supported OpenAI models
func (p *OpenAIProvider) SupportedModels() []string {
	return []string{
		openai.GPT4,
<<<<<<< HEAD
		openai.GPT4Turbo,
		openai.GPT4TurboPreview,
		openai.GPT3Dot5Turbo,
		openai.GPT3Dot5Turbo16K,
=======
		"gpt-4-turbo",
		openai.GPT4TurboPreview,
		openai.GPT3Dot5Turbo,
		"gpt-3.5-turbo-16k",
>>>>>>> da61af971f3ab52ee610e7c4d2b358440c006849
	}
}

// ProviderName returns the name of this provider
func (p *OpenAIProvider) ProviderName() string {
	return "openai"
}

// run starts the rate limiter
func (rl *RateLimiter) run() {
	ticker := time.NewTicker(rl.interval / 60) // 60 requests per minute = 1 per second
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Try to drain one request from the channel
			select {
			case <-rl.requests:
				// Drained one request
			default:
				// Channel is empty
			}
		}
	}
}

// ValidateConfig validates OpenAI configuration
func ValidateConfig(config OpenAIConfig) error {
	if config.APIKey == "" {
		return fmt.Errorf("API key is required")
	}

	if config.Temperature < 0 || config.Temperature > 2 {
		return fmt.Errorf("temperature must be between 0 and 2")
	}

	if config.MaxTokens < 1 || config.MaxTokens > 4096 {
		return fmt.Errorf("max_tokens must be between 1 and 4096")
	}

	return nil
}