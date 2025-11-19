package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewAnthropicProvider(t *testing.T) {
	tests := []struct {
		name        string
		config      AnthropicConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Model:       "claude-3-haiku-20240307",
				Temperature: 0.1,
				MaxTokens:   1000,
			},
			expectError: false,
		},
		{
			name: "missing API key",
			config: AnthropicConfig{
				Model:       "claude-3-haiku-20240307",
				Temperature: 0.1,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "Anthropic API key is required",
		},
		{
			name: "config with defaults",
			config: AnthropicConfig{
				APIKey: "test-key",
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, err := NewAnthropicProvider(tt.config)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, provider)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, provider)
				assert.Equal(t, "anthropic", provider.ProviderName())
			}
		})
	}
}

func TestAnthropicProvider_SupportedModels(t *testing.T) {
	config := AnthropicConfig{
		APIKey: "test-key",
	}
	provider, err := NewAnthropicProvider(config)
	require.NoError(t, err)

	models := provider.SupportedModels()
	assert.Contains(t, models, "claude-3-haiku-20240307")
	assert.Contains(t, models, "claude-3-sonnet-20240229")
	assert.Contains(t, models, "claude-3-opus-20240229")
	assert.Contains(t, models, "claude-3-5-sonnet-20241022")
	assert.Greater(t, len(models), 0)
}

func TestValidateAnthropicConfig(t *testing.T) {
	tests := []struct {
		name        string
		config      AnthropicConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: false,
		},
		{
			name: "missing API key",
			config: AnthropicConfig{
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "API key is required",
		},
		{
			name: "invalid temperature - too high",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Temperature: 1.5,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "temperature must be between 0 and 1",
		},
		{
			name: "invalid temperature - negative",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Temperature: -0.1,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "temperature must be between 0 and 1",
		},
		{
			name: "invalid max tokens - too high",
			config: AnthropicConfig{
				APIKey:      "test-key",
				Temperature: 0.7,
				MaxTokens:   5000,
			},
			expectError: true,
			errorMsg:    "max_tokens must be between 1 and 4096",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateAnthropicConfig(tt.config)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestAnthropicProvider_GenerateToolCalls_MockServer(t *testing.T) {
	// Create mock Anthropic server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request method and path
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/v1/messages", r.URL.Path)

		// Verify headers
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "test-key", r.Header.Get("x-api-key"))
		assert.Equal(t, "2023-06-01", r.Header.Get("anthropic-version"))

		// Mock successful response with tool use
		response := AnthropicResponse{
			ID:   "test-response-id",
			Type: "message",
			Role: "assistant",
			Content: []AnthropicResponseContent{
				{
					Type: "text",
					Text: "I'll help you create a financial asset.",
				},
				{
					Type: "tool_use",
					ID:   "call_test123",
					Name: "createAsset",
					Input: map[string]interface{}{
						"name":         "Test Asset",
						"category":     "cash_savings",
						"currentValue": float64(5000),
					},
				},
			},
			Model:      "claude-3-haiku-20240307",
			StopReason: "tool_use",
			Usage: AnthropicUsage{
				InputTokens:  50,
				OutputTokens: 30,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create provider with mock server URL
	config := AnthropicConfig{
		APIKey:  "test-key",
		BaseURL: server.URL,
		Model:   "claude-3-haiku-20240307",
		Timeout: 5,
		Version: "2023-06-01",
	}

	provider, err := NewAnthropicProvider(config)
	require.NoError(t, err)

	// Create test request
	request := llm.ChatRequest{
		Messages: []llm.ChatMessage{
			{
				Role:    "user",
				Content: "I have $5000 in savings",
			},
		},
		Tools: []llm.ToolDefinition{
			{
				Type: "function",
				Function: llm.FunctionSchema{
					Name:        "createAsset",
					Description: "Create a financial asset",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"name": map[string]interface{}{
								"type": "string",
							},
							"category": map[string]interface{}{
								"type": "string",
							},
							"currentValue": map[string]interface{}{
								"type": "number",
							},
						},
						"required": []string{"name", "category", "currentValue"},
					},
				},
			},
		},
		Model:       "claude-3-haiku-20240307",
		Temperature: 0.1,
		MaxTokens:   1000,
	}

	// Test GenerateToolCalls
	ctx := context.Background()
	response, err := provider.GenerateToolCalls(ctx, request)

	// Verify response
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "anthropic", response.Provider)
	assert.Equal(t, "claude-3-haiku-20240307", response.Model)
	assert.Equal(t, "test-response-id", response.RequestID)
	assert.Equal(t, llm.FinishReasonToolCalls, response.FinishReason)

	// Verify message content
	assert.Equal(t, "I'll help you create a financial asset.", response.Message.Content)

	// Verify tool calls
	require.Len(t, response.ToolCalls, 1)
	toolCall := response.ToolCalls[0]
	assert.Equal(t, "call_test123", toolCall.ID)
	assert.Equal(t, "function", toolCall.Type)
	assert.Equal(t, "createAsset", toolCall.Function.Name)

	// Parse and verify arguments
	var args map[string]interface{}
	err = json.Unmarshal([]byte(toolCall.Function.Arguments), &args)
	require.NoError(t, err)
	assert.Equal(t, "Test Asset", args["name"])
	assert.Equal(t, "cash_savings", args["category"])
	assert.Equal(t, float64(5000), args["currentValue"])

	// Verify usage
	require.NotNil(t, response.Usage)
	assert.Equal(t, 50, response.Usage.PromptTokens)
	assert.Equal(t, 30, response.Usage.CompletionTokens)
	assert.Equal(t, 80, response.Usage.TotalTokens)
}

func TestAnthropicProvider_ConvertRequest(t *testing.T) {
	config := AnthropicConfig{
		APIKey: "test-key",
		Model:  "claude-3-haiku-20240307",
	}

	provider, err := NewAnthropicProvider(config)
	require.NoError(t, err)

	// Test request with system message, user message, and tools
	request := llm.ChatRequest{
		Messages: []llm.ChatMessage{
			{
				Role:    "system",
				Content: "You are a helpful financial assistant.",
			},
			{
				Role:    "user",
				Content: "Create an asset for me",
			},
			{
				Role:    "assistant",
				Content: "",
				ToolCalls: []llm.ToolCall{
					{
						ID:   "call_123",
						Type: "function",
						Function: llm.FunctionCall{
							Name:      "createAsset",
							Arguments: `{"name": "Test Asset", "category": "cash_savings", "currentValue": 1000}`,
						},
					},
				},
			},
			{
				Role:       "tool",
				Content:    "Asset created successfully",
				ToolCallID: "call_123",
			},
		},
		Tools: []llm.ToolDefinition{
			{
				Type: "function",
				Function: llm.FunctionSchema{
					Name:        "createAsset",
					Description: "Create a financial asset",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"name": map[string]interface{}{
								"type": "string",
							},
							"category": map[string]interface{}{
								"type": "string",
							},
							"currentValue": map[string]interface{}{
								"type": "number",
							},
						},
						"required": []string{"name", "category", "currentValue"},
					},
				},
			},
		},
		Model:       "claude-3-sonnet-20240229",
		Temperature: 0.3,
		MaxTokens:   1500,
	}

	anthropicReq, err := provider.convertRequest(request)
	require.NoError(t, err)

	// Verify basic request properties
	assert.Equal(t, "claude-3-sonnet-20240229", anthropicReq.Model)
	assert.Equal(t, 0.3, anthropicReq.Temperature)
	assert.Equal(t, 1500, anthropicReq.MaxTokens)

	// Verify system message was extracted
	assert.Equal(t, "You are a helpful financial assistant.", anthropicReq.System)

	// Verify messages (system should be removed from messages array)
	assert.Len(t, anthropicReq.Messages, 3) // user, assistant, tool

	// Verify user message
	assert.Equal(t, "user", anthropicReq.Messages[0].Role)
	assert.Len(t, anthropicReq.Messages[0].Content, 1)
	assert.Equal(t, "text", anthropicReq.Messages[0].Content[0].Type)
	assert.Equal(t, "Create an asset for me", anthropicReq.Messages[0].Content[0].Text)

	// Verify assistant message with tool use
	assert.Equal(t, "assistant", anthropicReq.Messages[1].Role)
	assert.Len(t, anthropicReq.Messages[1].Content, 1)
	assert.Equal(t, "tool_use", anthropicReq.Messages[1].Content[0].Type)
	assert.Equal(t, "call_123", anthropicReq.Messages[1].Content[0].ID)
	assert.Equal(t, "createAsset", anthropicReq.Messages[1].Content[0].Name)

	// Verify tool result message
	assert.Equal(t, "user", anthropicReq.Messages[2].Role) // tool messages become user messages in Anthropic
	assert.Len(t, anthropicReq.Messages[2].Content, 1)
	assert.Equal(t, "tool_result", anthropicReq.Messages[2].Content[0].Type)
	assert.Equal(t, "call_123", anthropicReq.Messages[2].Content[0].ToolUseId)
	assert.Equal(t, "Asset created successfully", anthropicReq.Messages[2].Content[0].Text)

	// Verify tools
	assert.Len(t, anthropicReq.Tools, 1)
	assert.Equal(t, "createAsset", anthropicReq.Tools[0].Name)
	assert.Equal(t, "Create a financial asset", anthropicReq.Tools[0].Description)

	// Verify tool input schema
	assert.Equal(t, "object", anthropicReq.Tools[0].InputSchema.Type)
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Properties, "name")
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Properties, "category")
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Properties, "currentValue")
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Required, "name")
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Required, "category")
	assert.Contains(t, anthropicReq.Tools[0].InputSchema.Required, "currentValue")
}

func TestAnthropicProvider_ConvertResponse(t *testing.T) {
	config := AnthropicConfig{
		APIKey: "test-key",
	}

	provider, err := NewAnthropicProvider(config)
	require.NoError(t, err)

	// Test response with text and tool use
	anthropicResp := &AnthropicResponse{
		ID:   "resp_test123",
		Type: "message",
		Role: "assistant",
		Content: []AnthropicResponseContent{
			{
				Type: "text",
				Text: "I'll create that asset for you.",
			},
			{
				Type: "tool_use",
				ID:   "call_abc123",
				Name: "createAsset",
				Input: map[string]interface{}{
					"name":         "Savings Account",
					"category":     "cash_savings",
					"currentValue": float64(10000),
				},
			},
		},
		Model:      "claude-3-haiku-20240307",
		StopReason: "tool_use",
		Usage: AnthropicUsage{
			InputTokens:  100,
			OutputTokens: 50,
		},
	}

	processingTime := 250 * time.Millisecond
	response, err := provider.convertResponse(anthropicResp, processingTime)

	require.NoError(t, err)
	assert.NotNil(t, response)

	// Verify basic response properties
	assert.Equal(t, "anthropic", response.Provider)
	assert.Equal(t, "claude-3-haiku-20240307", response.Model)
	assert.Equal(t, "resp_test123", response.RequestID)
	assert.Equal(t, llm.FinishReasonToolCalls, response.FinishReason)
	assert.Equal(t, processingTime, response.ProcessingTime)

	// Verify message content (should use first text content)
	assert.Equal(t, "I'll create that asset for you.", response.Message.Content)
	assert.Equal(t, "assistant", response.Message.Role)

	// Verify tool calls
	require.Len(t, response.ToolCalls, 1)
	toolCall := response.ToolCalls[0]
	assert.Equal(t, "call_abc123", toolCall.ID)
	assert.Equal(t, "function", toolCall.Type)
	assert.Equal(t, "createAsset", toolCall.Function.Name)

	// Parse and verify arguments
	var args map[string]interface{}
	err = json.Unmarshal([]byte(toolCall.Function.Arguments), &args)
	require.NoError(t, err)
	assert.Equal(t, "Savings Account", args["name"])
	assert.Equal(t, "cash_savings", args["category"])
	assert.Equal(t, float64(10000), args["currentValue"])

	// Verify usage
	require.NotNil(t, response.Usage)
	assert.Equal(t, 100, response.Usage.PromptTokens)
	assert.Equal(t, 50, response.Usage.CompletionTokens)
	assert.Equal(t, 150, response.Usage.TotalTokens)

	// Verify message tool calls match response tool calls
	require.Len(t, response.Message.ToolCalls, 1)
	assert.Equal(t, toolCall, response.Message.ToolCalls[0])
}

func TestAnthropicProvider_StopReasonMapping(t *testing.T) {
	config := AnthropicConfig{
		APIKey: "test-key",
	}

	provider, err := NewAnthropicProvider(config)
	require.NoError(t, err)

	tests := []struct {
		name               string
		anthropicStopReason string
		expectedFinishReason string
	}{
		{
			name:               "end_turn maps to stop",
			anthropicStopReason: "end_turn",
			expectedFinishReason: llm.FinishReasonStop,
		},
		{
			name:               "max_tokens maps to length",
			anthropicStopReason: "max_tokens",
			expectedFinishReason: llm.FinishReasonLength,
		},
		{
			name:               "tool_use maps to tool_calls",
			anthropicStopReason: "tool_use",
			expectedFinishReason: llm.FinishReasonToolCalls,
		},
		{
			name:               "unknown reason stays as-is",
			anthropicStopReason: "unknown_reason",
			expectedFinishReason: "unknown_reason",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			anthropicResp := &AnthropicResponse{
				ID:   "test_id",
				Type: "message",
				Role: "assistant",
				Content: []AnthropicResponseContent{
					{
						Type: "text",
						Text: "Test response",
					},
				},
				Model:      "claude-3-haiku-20240307",
				StopReason: tt.anthropicStopReason,
				Usage: AnthropicUsage{
					InputTokens:  10,
					OutputTokens: 5,
				},
			}

			response, err := provider.convertResponse(anthropicResp, time.Millisecond)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedFinishReason, response.FinishReason)
		})
	}
}