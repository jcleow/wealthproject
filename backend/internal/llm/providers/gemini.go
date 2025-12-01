package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GeminiProvider implements the LLMClient interface for Google Gemini
type GeminiProvider struct {
	client      *genai.Client
	config      GeminiConfig
	rateLimiter *RateLimiter
}

// GeminiConfig contains Gemini-specific configuration
type GeminiConfig struct {
	APIKey      string  `json:"api_key"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	Timeout     int     `json:"timeout"`
}

// NewGeminiProvider creates a new Gemini provider
func NewGeminiProvider(config GeminiConfig) (*GeminiProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Gemini API key is required")
	}

	if config.Model == "" {
		config.Model = "gemini-2.5-flash"
	} else {
		config.Model = normalizeGeminiModel(config.Model)
	}

	if config.Temperature == 0 {
		config.Temperature = 0.1 // Low temperature for structured output
	}

	// MaxTokens: <=0 means let the API default; otherwise enforce limit

	if config.Timeout == 0 {
		config.Timeout = 30
	}

	// Create Gemini client
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(config.APIKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	// Create rate limiter (60 requests per minute for Gemini)
	rateLimiter := &RateLimiter{
		requests: make(chan struct{}, 60),
		interval: time.Minute,
	}

	// Initialize rate limiter
	go rateLimiter.run()

	return &GeminiProvider{
		client:      client,
		config:      config,
		rateLimiter: rateLimiter,
	}, nil
}

// GenerateToolCalls implements the LLMClient interface
func (p *GeminiProvider) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	// Apply rate limiting
	select {
	case p.rateLimiter.requests <- struct{}{}:
		// Request allowed
	case <-ctx.Done():
		return nil, fmt.Errorf("request cancelled while waiting for rate limit")
	}

	// Add timeout to context
	ctx, cancel := context.WithTimeout(ctx, time.Duration(p.config.Timeout)*time.Second)
	defer cancel()

	// Get the model
	model := p.client.GenerativeModel(p.config.Model)

	// Configure model settings
	model.SetTemperature(float32(p.config.Temperature))
	if p.config.MaxTokens > 0 {
		model.SetMaxOutputTokens(int32(p.config.MaxTokens))
	}

	// Convert tools to Gemini format if present
	if len(req.Tools) > 0 {
		tools := p.convertTools(req.Tools)
		model.Tools = tools
	}

	// Extract system message and set as SystemInstruction (Gemini's proper way to handle system prompts)
	var nonSystemMessages []llm.ChatMessage
	for _, msg := range req.Messages {
		if msg.Role == "system" {
			// Set system instruction on the model
			model.SystemInstruction = &genai.Content{
				Parts: []genai.Part{genai.Text(msg.Content)},
			}
		} else {
			nonSystemMessages = append(nonSystemMessages, msg)
		}
	}

	// Convert non-system messages to Gemini format
	parts := p.convertMessages(nonSystemMessages)

	// Start chat session
	cs := model.StartChat()

	// Add history messages (all but the last one)
	if len(parts) > 1 {
		cs.History = parts[:len(parts)-1]
	}

	// Send the last message as the current message
	var currentMessage []genai.Part
	if len(parts) > 0 {
		currentMessage = parts[len(parts)-1].Parts
	}

	// Make request to Gemini
	start := time.Now()
	response, err := cs.SendMessage(ctx, currentMessage...)
	if err != nil {
		return nil, p.handleError(err)
	}

	// Convert Gemini response to our format
	result, err := p.convertResponse(response, time.Since(start))
	if err != nil {
		return nil, fmt.Errorf("failed to convert response: %w", err)
	}

	return result, nil
}

// convertTools converts our tool definitions to Gemini format
func (p *GeminiProvider) convertTools(tools []llm.ToolDefinition) []*genai.Tool {
	var geminiTools []*genai.Tool

	for _, tool := range tools {
		if tool.Type != "function" {
			continue
		}

		params := tool.Function.Parameters
		geminiTool := &genai.Tool{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        tool.Function.Name,
					Description: tool.Function.Description,
					Parameters: &genai.Schema{
						Type:       genai.TypeObject,
						Properties: make(map[string]*genai.Schema),
						Required:   params.Required,
					},
				},
			},
		}

		// Convert properties from typed schema
		for propName, propDef := range params.Properties {
			geminiTool.FunctionDeclarations[0].Parameters.Properties[propName] = p.convertPropertySchema(propDef)
		}

		geminiTools = append(geminiTools, geminiTool)
	}

	return geminiTools
}

// convertPropertySchema converts a typed PropertySchema to Gemini schema format
func (p *GeminiProvider) convertPropertySchema(prop *llm.PropertySchema) *genai.Schema {
	result := &genai.Schema{
		Description: prop.Description,
	}

	switch prop.Type {
	case "string":
		result.Type = genai.TypeString
		if len(prop.Enum) > 0 {
			result.Enum = prop.Enum
		}
	case "number":
		result.Type = genai.TypeNumber
	case "integer":
		result.Type = genai.TypeInteger
	case "boolean":
		result.Type = genai.TypeBoolean
	case "array":
		result.Type = genai.TypeArray
		if prop.Items != nil {
			result.Items = &genai.Schema{Type: p.convertTypeString(prop.Items.Type)}
		}
	case "object":
		result.Type = genai.TypeObject
	}

	return result
}

// convertTypeString converts a type string to Gemini type
func (p *GeminiProvider) convertTypeString(typeStr string) genai.Type {
	switch typeStr {
	case "string":
		return genai.TypeString
	case "number":
		return genai.TypeNumber
	case "integer":
		return genai.TypeInteger
	case "boolean":
		return genai.TypeBoolean
	default:
		return genai.TypeString
	}
}

// convertMessages converts our messages to Gemini format
func (p *GeminiProvider) convertMessages(messages []llm.ChatMessage) []*genai.Content {
	var contents []*genai.Content

	for _, msg := range messages {
		content := &genai.Content{
			Role: p.mapRole(msg.Role),
		}

		// Add text content
		if msg.Content != "" {
			content.Parts = append(content.Parts, genai.Text(msg.Content))
		}

		// Add function calls if present
		if len(msg.ToolCalls) > 0 {
			for _, tc := range msg.ToolCalls {
				// Parse arguments as JSON
				var args map[string]interface{}
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
					args = map[string]interface{}{"raw": tc.Function.Arguments}
				}

				content.Parts = append(content.Parts, genai.FunctionCall{
					Name: tc.Function.Name,
					Args: args,
				})
			}
		}

		// Add function responses if this is a tool message
		if msg.Role == "tool" && msg.ToolCallID != "" {
			// Extract function name from tool call ID or use a default
			functionName := strings.Split(msg.ToolCallID, "_")[0]
			if functionName == "" {
				functionName = "function"
			}

			var responseData map[string]interface{}
			if err := json.Unmarshal([]byte(msg.Content), &responseData); err != nil {
				responseData = map[string]interface{}{"result": msg.Content}
			}

			content.Parts = append(content.Parts, genai.FunctionResponse{
				Name:     functionName,
				Response: responseData,
			})
		}

		contents = append(contents, content)
	}

	return contents
}

// mapRole maps our role strings to Gemini roles
func (p *GeminiProvider) mapRole(role string) string {
	switch role {
	case "user":
		return "user"
	case "assistant":
		return "model"
	case "system":
		return "user" // Gemini doesn't have system role, map to user
	case "tool":
		return "function"
	default:
		return "user"
	}
}

// convertResponse converts Gemini response to our format
func (p *GeminiProvider) convertResponse(response *genai.GenerateContentResponse, processingTime time.Duration) (*llm.ToolCallResponse, error) {
	if len(response.Candidates) == 0 {
		return nil, fmt.Errorf("no candidates in Gemini response")
	}

	candidate := response.Candidates[0]

	// Check if Content is nil (can happen with certain finish reasons)
	if candidate.Content == nil {
		// Return empty response with appropriate finish reason
		finishReason := "stop"
		if candidate.FinishReason == genai.FinishReasonSafety {
			finishReason = "safety"
			return nil, fmt.Errorf("response blocked by safety filter")
		}
		return &llm.ToolCallResponse{
			Message:        llm.ChatMessage{Role: "assistant", Content: ""},
			ToolCalls:      nil,
			FinishReason:   finishReason,
			RequestID:      fmt.Sprintf("gemini_%d", time.Now().UnixNano()),
			Provider:       "gemini",
			Model:          p.config.Model,
			ProcessingTime: processingTime,
		}, nil
	}

	// Create assistant message
	assistantMsg := llm.ChatMessage{
		Role: "assistant",
	}

	var toolCalls []llm.ToolCall
	var textContent []string

	// Process parts
	for _, part := range candidate.Content.Parts {
		switch p := part.(type) {
		case genai.Text:
			textContent = append(textContent, string(p))
		case genai.FunctionCall:
			// Convert function call to tool call
			argsJSON, err := json.Marshal(p.Args)
			if err != nil {
				argsJSON = []byte("{}")
			}

			tc := llm.ToolCall{
				ID:   fmt.Sprintf("call_%s_%d", p.Name, time.Now().UnixNano()),
				Type: "function",
				Function: llm.FunctionCall{
					Name:      p.Name,
					Arguments: string(argsJSON),
				},
			}

			toolCalls = append(toolCalls, tc)
			assistantMsg.ToolCalls = append(assistantMsg.ToolCalls, tc)
		}
	}

	// Combine text content
	if len(textContent) > 0 {
		assistantMsg.Content = strings.Join(textContent, "\n")
	}

	// Calculate token usage (approximate for Gemini)
	var usage *llm.TokenUsage
	if candidate.TokenCount > 0 {
		usage = &llm.TokenUsage{
			CompletionTokens: int(candidate.TokenCount),
			TotalTokens:      int(candidate.TokenCount), // Gemini doesn't provide prompt tokens separately
		}
	}

	// Map finish reason
	finishReason := "stop"
	if candidate.FinishReason == genai.FinishReasonMaxTokens {
		finishReason = "max_tokens"
	} else if candidate.FinishReason == genai.FinishReasonSafety {
		finishReason = "safety"
	}

	return &llm.ToolCallResponse{
		Message:        assistantMsg,
		ToolCalls:      toolCalls,
		FinishReason:   finishReason,
		Usage:          usage,
		RequestID:      fmt.Sprintf("gemini_%d", time.Now().UnixNano()),
		Provider:       "gemini",
		Model:          p.config.Model,
		ProcessingTime: processingTime,
	}, nil
}

// handleError converts Gemini errors to our error format
func (p *GeminiProvider) handleError(err error) error {
	errorType := llm.ErrorTypeServerError
	message := err.Error()

	// Check for common error patterns
	if strings.Contains(message, "API key") || strings.Contains(message, "authentication") {
		errorType = llm.ErrorTypeAuthentication
	} else if strings.Contains(message, "rate limit") || strings.Contains(message, "quota") {
		errorType = llm.ErrorTypeRateLimit
	} else if strings.Contains(message, "invalid") || strings.Contains(message, "bad request") {
		errorType = llm.ErrorTypeInvalidRequest
	} else if strings.Contains(message, "model") && strings.Contains(message, "not found") {
		errorType = llm.ErrorTypeModelNotFound
	} else if err == context.DeadlineExceeded {
		errorType = llm.ErrorTypeTimeout
		message = "Request timed out"
	}

	return llm.LLMError{
		Type:     errorType,
		Message:  message,
		Provider: "gemini",
	}
}

// SupportedModels returns list of supported Gemini models
func (p *GeminiProvider) SupportedModels() []string {
	return []string{
		"gemini-2.5-flash",
		"gemini-2.5-pro",
		"gemini-1.5-flash-latest",
		"gemini-pro",
		"gemini-pro-vision",
		"gemini-1.5-pro-latest",
		"gemini-1.5-pro",
		"gemini-1.5-flash",
		"gemini-2.0-flash-exp",
	}
}

// ProviderName returns the name of this provider
func (p *GeminiProvider) ProviderName() string {
	return "gemini"
}

// ValidateGeminiConfig validates Gemini configuration
func ValidateGeminiConfig(config GeminiConfig) error {
	if config.APIKey == "" {
		return fmt.Errorf("API key is required")
	}

	if config.Temperature < 0 || config.Temperature > 2 {
		return fmt.Errorf("temperature must be between 0 and 2")
	}

	if config.MaxTokens < 1 || config.MaxTokens > 8192 {
		return fmt.Errorf("max_tokens must be between 1 and 8192")
	}

	return nil
}

// normalizeGeminiModel maps legacy or shorthand model names to the currently supported variants.
func normalizeGeminiModel(model string) string {
	name := strings.TrimPrefix(strings.TrimSpace(model), "models/")
	switch strings.ToLower(name) {
	case "gemini-1.5-flash":
		return "gemini-1.5-flash-latest"
	case "gemini-1.5-pro":
		return "gemini-1.5-pro-latest"
	default:
		return name
	}
}
