package usage

import (
	"financial-chat-system/backend/internal/llm"
)

// ModelPricing defines the cost per million tokens for a model
type ModelPricing struct {
	InputPerMillion  float64 // Cost per 1M input tokens
	OutputPerMillion float64 // Cost per 1M output tokens
	CachedPerMillion float64 // Cost per 1M cached tokens (usually discounted)
}

// GeminiPricing contains pricing for Gemini models (as of Dec 2024)
var GeminiPricing = map[string]ModelPricing{
	"gemini-2.5-flash": {
		InputPerMillion:  0.30,
		OutputPerMillion: 2.50,
		CachedPerMillion: 0.03, // 90% discount
	},
	"gemini-2.5-pro": {
		InputPerMillion:  1.25,
		OutputPerMillion: 10.00,
		CachedPerMillion: 0.125, // 90% discount
	},
	"gemini-2.0-flash": {
		InputPerMillion:  0.10,
		OutputPerMillion: 0.40,
		CachedPerMillion: 0.01,
	},
	"gemini-2.0-flash-exp": {
		InputPerMillion:  0.10,
		OutputPerMillion: 0.40,
		CachedPerMillion: 0.01,
	},
	"gemini-1.5-flash": {
		InputPerMillion:  0.075,
		OutputPerMillion: 0.30,
		CachedPerMillion: 0.0075,
	},
	"gemini-1.5-flash-latest": {
		InputPerMillion:  0.075,
		OutputPerMillion: 0.30,
		CachedPerMillion: 0.0075,
	},
	"gemini-1.5-pro": {
		InputPerMillion:  1.25,
		OutputPerMillion: 5.00,
		CachedPerMillion: 0.125,
	},
	"gemini-1.5-pro-latest": {
		InputPerMillion:  1.25,
		OutputPerMillion: 5.00,
		CachedPerMillion: 0.125,
	},
}

// OpenAIPricing contains pricing for OpenAI models
var OpenAIPricing = map[string]ModelPricing{
	"gpt-4": {
		InputPerMillion:  30.00,
		OutputPerMillion: 60.00,
	},
	"gpt-4-turbo": {
		InputPerMillion:  10.00,
		OutputPerMillion: 30.00,
	},
	"gpt-4o": {
		InputPerMillion:  2.50,
		OutputPerMillion: 10.00,
	},
	"gpt-4o-mini": {
		InputPerMillion:  0.15,
		OutputPerMillion: 0.60,
	},
}

// AnthropicPricing contains pricing for Anthropic models
var AnthropicPricing = map[string]ModelPricing{
	"claude-3-opus-20240229": {
		InputPerMillion:  15.00,
		OutputPerMillion: 75.00,
	},
	"claude-3-sonnet-20240229": {
		InputPerMillion:  3.00,
		OutputPerMillion: 15.00,
	},
	"claude-3-haiku-20240307": {
		InputPerMillion:  0.25,
		OutputPerMillion: 1.25,
	},
}

// DefaultPricing is used when model is not found
var DefaultPricing = ModelPricing{
	InputPerMillion:  1.00,
	OutputPerMillion: 3.00,
	CachedPerMillion: 0.10,
}

// GetPricing returns the pricing for a given provider and model
func GetPricing(provider, model string) ModelPricing {
	var pricing ModelPricing
	var found bool

	switch provider {
	case "gemini":
		pricing, found = GeminiPricing[model]
	case "openai":
		pricing, found = OpenAIPricing[model]
	case "anthropic":
		pricing, found = AnthropicPricing[model]
	}

	if !found {
		return DefaultPricing
	}
	return pricing
}

// CalculateCost calculates the cost for a given usage
func CalculateCost(provider, model string, usage *llm.TokenUsage) Cost {
	if usage == nil {
		return Cost{}
	}

	pricing := GetPricing(provider, model)

	// Calculate costs (tokens / 1M * price per M)
	// Subtract cached tokens from input cost calculation (they're charged at cached rate)
	regularInputTokens := usage.PromptTokens - usage.CachedTokens
	if regularInputTokens < 0 {
		regularInputTokens = 0
	}

	inputCost := float64(regularInputTokens) / 1_000_000 * pricing.InputPerMillion
	cachedCost := float64(usage.CachedTokens) / 1_000_000 * pricing.CachedPerMillion
	outputCost := float64(usage.CompletionTokens) / 1_000_000 * pricing.OutputPerMillion

	return Cost{
		InputCostUSD:  inputCost + cachedCost,
		OutputCostUSD: outputCost,
		TotalCostUSD:  inputCost + cachedCost + outputCost,
	}
}
