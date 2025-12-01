package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"financial-chat-system/backend/internal/llm"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewOpenAIProvider(t *testing.T) {
	tests := []struct {
		name        string
		config      OpenAIConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Model:       "gpt-4",
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: false,
		},
		{
			name: "missing API key",
			config: OpenAIConfig{
				Model:       "gpt-4",
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "OpenAI API key is required",
		},
		{
			name: "config with defaults",
			config: OpenAIConfig{
				APIKey: "test-key",
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, err := NewOpenAIProvider(tt.config)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, provider)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, provider)
				assert.Equal(t, "openai", provider.ProviderName())
			}
		})
	}
}

func TestOpenAIProvider_SupportedModels(t *testing.T) {
	config := OpenAIConfig{
		APIKey: "test-key",
	}
	provider, err := NewOpenAIProvider(config)
	require.NoError(t, err)

	models := provider.SupportedModels()
	assert.Contains(t, models, "gpt-4")
	assert.Contains(t, models, "gpt-3.5-turbo")
	assert.Greater(t, len(models), 0)
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name        string
		config      OpenAIConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: false,
		},
		{
			name: "missing API key",
			config: OpenAIConfig{
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "API key is required",
		},
		{
			name: "invalid temperature - too high",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Temperature: 3.0,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "temperature must be between 0 and 2",
		},
		{
			name: "invalid temperature - negative",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Temperature: -0.5,
				MaxTokens:   1000,
			},
			expectError: true,
			errorMsg:    "temperature must be between 0 and 2",
		},
		{
			name: "invalid max tokens - too high",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Temperature: 0.7,
				MaxTokens:   5000,
			},
			expectError: true,
			errorMsg:    "max_tokens must be between 1 and 4096",
		},
		{
			name: "invalid max tokens - zero",
			config: OpenAIConfig{
				APIKey:      "test-key",
				Temperature: 0.7,
				MaxTokens:   0,
			},
			expectError: true,
			errorMsg:    "max_tokens must be between 1 and 4096",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateConfig(tt.config)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestOpenAIProvider_GenerateToolCalls_MockServer(t *testing.T) {
	t.Skip("Disabled in sandbox: local httptest listener not permitted")

	// Create mock OpenAI server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request method and path
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/chat/completions", r.URL.Path)

		// Verify headers
		assert.Contains(t, r.Header.Get("Content-Type"), "application/json")
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer test-key")

		// Mock successful response with tool calls
		response := map[string]interface{}{
			"id":      "test-response-id",
			"object":  "chat.completion",
			"created": time.Now().Unix(),
			"model":   "gpt-4",
			"choices": []map[string]interface{}{
				{
					"index": 0,
					"message": map[string]interface{}{
						"role":    "assistant",
						"content": "I'll help you create a financial asset.",
						"tool_calls": []map[string]interface{}{
							{
								"id":   "call_test123",
								"type": "function",
								"function": map[string]interface{}{
									"name":      "createAsset",
									"arguments": `{"name": "Test Asset", "category": "cash_savings", "currentValue": 5000}`,
								},
							},
						},
					},
					"finish_reason": "tool_calls",
				},
			},
			"usage": map[string]interface{}{
				"prompt_tokens":     50,
				"completion_tokens": 30,
				"total_tokens":      80,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create provider with mock server URL
	config := OpenAIConfig{
		APIKey:  "test-key",
		BaseURL: server.URL,
		Model:   "gpt-4",
		Timeout: 5,
	}

	provider, err := NewOpenAIProvider(config)
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
					Parameters: llm.JSONSchema{
						Type: "object",
						Properties: map[string]*llm.PropertySchema{
							"name": {
								Type:     "string",
								Required: true,
							},
							"category": {
								Type:     "string",
								Required: true,
							},
							"currentValue": {
								Type:     "number",
								Required: true,
							},
						},
					},
				},
			},
		},
		Model:       "gpt-4",
		Temperature: 0.1,
		MaxTokens:   1000,
	}

	// Test GenerateToolCalls
	ctx := context.Background()
	response, err := provider.GenerateToolCalls(ctx, request)

	// Verify response
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "openai", response.Provider)
	assert.Equal(t, "gpt-4", response.Model)
	assert.Equal(t, "test-response-id", response.RequestID)
	assert.Equal(t, "tool_calls", response.FinishReason)

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

func TestOpenAIProvider_GenerateToolCalls_ErrorHandling(t *testing.T) {
	t.Skip("Disabled in sandbox: local httptest listener not permitted")

	tests := []struct {
		name           string
		serverResponse func(w http.ResponseWriter, r *http.Request)
		expectError    bool
		errorType      string
	}{
		{
			name: "401 unauthorized",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]interface{}{
						"message": "Invalid API key",
						"type":    "invalid_request_error",
						"code":    "invalid_api_key",
					},
				})
			},
			expectError: true,
			errorType:   llm.ErrorTypeAuthentication,
		},
		{
			name: "429 rate limit",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]interface{}{
						"message": "Rate limit exceeded",
						"type":    "rate_limit_error",
					},
				})
			},
			expectError: true,
			errorType:   llm.ErrorTypeRateLimit,
		},
		{
			name: "400 bad request",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]interface{}{
						"message": "Invalid request format",
						"type":    "invalid_request_error",
					},
				})
			},
			expectError: true,
			errorType:   llm.ErrorTypeInvalidRequest,
		},
		{
			name: "500 server error",
			serverResponse: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": map[string]interface{}{
						"message": "Internal server error",
						"type":    "server_error",
					},
				})
			},
			expectError: true,
			errorType:   llm.ErrorTypeServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(tt.serverResponse))
			defer server.Close()

			config := OpenAIConfig{
				APIKey:  "test-key",
				BaseURL: server.URL,
				Timeout: 5,
			}

			provider, err := NewOpenAIProvider(config)
			require.NoError(t, err)

			request := llm.ChatRequest{
				Messages: []llm.ChatMessage{
					{
						Role:    "user",
						Content: "test message",
					},
				},
			}

			ctx := context.Background()
			response, err := provider.GenerateToolCalls(ctx, request)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, response)

				// Check if error is of expected type
				if llmErr, ok := err.(llm.LLMError); ok {
					assert.Equal(t, tt.errorType, llmErr.Type)
					assert.Equal(t, "openai", llmErr.Provider)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, response)
			}
		})
	}
}

func TestOpenAIProvider_GenerateToolCalls_Timeout(t *testing.T) {
	t.Skip("Disabled in sandbox: local httptest listener not permitted")

	// Create slow server that takes longer than timeout
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second) // Longer than our 1 second timeout
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{
				{
					"message": map[string]interface{}{
						"role":    "assistant",
						"content": "response",
					},
				},
			},
		})
	}))
	defer server.Close()

	config := OpenAIConfig{
		APIKey:  "test-key",
		BaseURL: server.URL,
		Timeout: 1, // 1 second timeout
	}

	provider, err := NewOpenAIProvider(config)
	require.NoError(t, err)

	request := llm.ChatRequest{
		Messages: []llm.ChatMessage{
			{
				Role:    "user",
				Content: "test message",
			},
		},
	}

	ctx := context.Background()
	response, err := provider.GenerateToolCalls(ctx, request)

	// Should timeout
	assert.Error(t, err)
	assert.Nil(t, response)

	// Check if it's a timeout-related error (could be server_error due to context deadline)
	if llmErr, ok := err.(llm.LLMError); ok {
		// Could be timeout or server_error depending on implementation
		assert.Contains(t, []string{llm.ErrorTypeTimeout, llm.ErrorTypeServerError}, llmErr.Type)
		assert.Equal(t, "openai", llmErr.Provider)
		assert.Contains(t, strings.ToLower(llmErr.Message), "deadline")
	}
}

func TestOpenAIProvider_ConvertRequest(t *testing.T) {
	config := OpenAIConfig{
		APIKey: "test-key",
		Model:  "gpt-4",
	}

	provider, err := NewOpenAIProvider(config)
	require.NoError(t, err)

	// Test request with tools
	request := llm.ChatRequest{
		Messages: []llm.ChatMessage{
			{
				Role:    "user",
				Content: "Create an asset",
			},
			{
				Role:    "assistant",
				Content: "I'll help you create an asset.",
				ToolCalls: []llm.ToolCall{
					{
						ID:   "call_123",
						Type: "function",
						Function: llm.FunctionCall{
							Name:      "createAsset",
							Arguments: `{"name": "Test"}`,
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
					Description: "Create asset",
					Parameters: llm.JSONSchema{
						Type: "object",
						Properties: map[string]*llm.PropertySchema{
							"name": {
								Type: "string",
							},
						},
					},
				},
			},
		},
		Model:       "gpt-3.5-turbo",
		Temperature: 0.5,
		MaxTokens:   500,
	}

	openaiReq, err := provider.convertRequest(request)
	require.NoError(t, err)

	// Verify conversion
	assert.Equal(t, "gpt-3.5-turbo", openaiReq.Model)
	assert.Equal(t, float32(0.5), openaiReq.Temperature)
	assert.Equal(t, 500, openaiReq.MaxTokens)
	assert.Len(t, openaiReq.Messages, 3)
	assert.Len(t, openaiReq.Tools, 1)

	// Verify message conversion
	assert.Equal(t, "user", openaiReq.Messages[0].Role)
	assert.Equal(t, "Create an asset", openaiReq.Messages[0].Content)

	// Verify assistant message with tool calls
	assert.Equal(t, "assistant", openaiReq.Messages[1].Role)
	assert.Len(t, openaiReq.Messages[1].ToolCalls, 1)
	assert.Equal(t, "call_123", openaiReq.Messages[1].ToolCalls[0].ID)

	// Verify tool response message
	assert.Equal(t, "tool", openaiReq.Messages[2].Role)
	assert.Equal(t, "call_123", openaiReq.Messages[2].ToolCallID)

	// Verify tool definition
	assert.Equal(t, "function", string(openaiReq.Tools[0].Type))
	assert.Equal(t, "createAsset", openaiReq.Tools[0].Function.Name)
}
