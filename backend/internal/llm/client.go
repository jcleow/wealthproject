package llm

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ClientManager manages multiple LLM providers
type ClientManager struct {
	providers map[string]LLMClient
	primary   string
	fallbacks []string
}

// NewClientManager creates a new client manager
func NewClientManager() *ClientManager {
	return &ClientManager{
		providers: make(map[string]LLMClient),
	}
}

// RegisterProvider registers an LLM provider
func (cm *ClientManager) RegisterProvider(name string, client LLMClient) {
	cm.providers[name] = client
}

// SetPrimary sets the primary provider
func (cm *ClientManager) SetPrimary(provider string) error {
	if _, exists := cm.providers[provider]; !exists {
		return fmt.Errorf("provider %s not registered", provider)
	}
	cm.primary = provider
	return nil
}

// SetFallbacks sets fallback providers
func (cm *ClientManager) SetFallbacks(providers []string) error {
	for _, provider := range providers {
		if _, exists := cm.providers[provider]; !exists {
			return fmt.Errorf("provider %s not registered", provider)
		}
	}
	cm.fallbacks = providers
	return nil
}

// GenerateToolCalls generates tool calls using the primary provider with fallbacks
func (cm *ClientManager) GenerateToolCalls(ctx context.Context, req ChatRequest) (*ToolCallResponse, error) {
	// Try primary provider first
	if cm.primary != "" {
		if client, exists := cm.providers[cm.primary]; exists {
			response, err := cm.executeWithTimeout(ctx, client, req)
			if err == nil {
				response.Provider = cm.primary
				return response, nil
			}

			// Log error and try fallbacks
			fmt.Printf("Primary provider %s failed: %v\n", cm.primary, err)
		}
	}

	// Try fallback providers
	for _, providerName := range cm.fallbacks {
		if client, exists := cm.providers[providerName]; exists {
			response, err := cm.executeWithTimeout(ctx, client, req)
			if err == nil {
				response.Provider = providerName
				return response, nil
			}

			fmt.Printf("Fallback provider %s failed: %v\n", providerName, err)
		}
	}

	return nil, fmt.Errorf("all LLM providers failed")
}

// executeWithTimeout executes the LLM request with timeout tracking
func (cm *ClientManager) executeWithTimeout(ctx context.Context, client LLMClient, req ChatRequest) (*ToolCallResponse, error) {
	start := time.Now()

	// Add request ID if not present
	if req.Messages == nil {
		req.Messages = []ChatMessage{}
	}

	response, err := client.GenerateToolCalls(ctx, req)
	if err != nil {
		return nil, err
	}

	// Add processing time and request ID
	response.ProcessingTime = time.Since(start)
	if response.RequestID == "" {
		response.RequestID = uuid.New().String()
	}

	return response, nil
}

// GetAvailableProviders returns list of registered providers
func (cm *ClientManager) GetAvailableProviders() []string {
	providers := make([]string, 0, len(cm.providers))
	for name := range cm.providers {
		providers = append(providers, name)
	}
	return providers
}

// GetProvider returns a specific provider client
func (cm *ClientManager) GetProvider(name string) (LLMClient, bool) {
	client, exists := cm.providers[name]
	return client, exists
}

// HealthCheck checks the health of all registered providers
func (cm *ClientManager) HealthCheck(ctx context.Context) map[string]error {
	results := make(map[string]error)

	for name, client := range cm.providers {
		// Simple health check with minimal request
		testReq := ChatRequest{
			Messages: []ChatMessage{
				{
					Role:    "user",
					Content: "test",
				},
			},
			Model:       "gpt-3.5-turbo", // Use a lightweight model for health checks
			MaxTokens:   1,
			Temperature: 0,
		}

		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		_, err := client.GenerateToolCalls(ctx, testReq)
		cancel()

		results[name] = err
	}

	return results
}

// FormatChatHistory formats conversation history for LLM consumption
func FormatChatHistory(messages []ChatMessage, maxMessages int) []ChatMessage {
	if len(messages) <= maxMessages {
		return messages
	}

	// Keep system messages and recent messages
	var systemMessages []ChatMessage
	var recentMessages []ChatMessage

	for i, msg := range messages {
		if msg.Role == "system" {
			systemMessages = append(systemMessages, msg)
		} else if i >= len(messages)-maxMessages+len(systemMessages) {
			recentMessages = append(recentMessages, msg)
		}
	}

	// Combine system messages with recent messages
	result := make([]ChatMessage, 0, len(systemMessages)+len(recentMessages))
	result = append(result, systemMessages...)
	result = append(result, recentMessages...)

	return result
}

// ValidateToolDefinitions validates tool definitions for common issues
func ValidateToolDefinitions(tools []ToolDefinition) error {
	if len(tools) > 20 {
		return fmt.Errorf("too many tools: %d (maximum 20 recommended)", len(tools))
	}

	names := make(map[string]bool)
	for _, tool := range tools {
		if tool.Type != "function" {
			return fmt.Errorf("unsupported tool type: %s", tool.Type)
		}

		if tool.Function.Name == "" {
			return fmt.Errorf("tool function name cannot be empty")
		}

		if names[tool.Function.Name] {
			return fmt.Errorf("duplicate tool name: %s", tool.Function.Name)
		}
		names[tool.Function.Name] = true

		if tool.Function.Description == "" {
			return fmt.Errorf("tool function description cannot be empty for: %s", tool.Function.Name)
		}
	}

	return nil
}