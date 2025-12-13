package setup

import (
	"log"
	"strings"

	"financial-chat-system/backend/internal/config"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/llm/providers"
)

// LLMConfig holds the LLM manager and default model settings
type LLMConfig struct {
	Manager          *llm.ClientManager
	PrimaryProvider  string
	DefaultModel     string
	DefaultMaxTokens int
}

// InitializeLLM sets up all LLM providers and returns the configured manager
func InitializeLLM(cfg *config.Config) LLMConfig {
	manager := llm.NewClientManager()
	registered := []string{}

	// Clean up API keys
	openAIKey := cleanAPIKey(cfg.OpenAIAPIKey)
	anthropicKey := cleanAPIKey(cfg.AnthropicAPIKey)
	geminiKey := cleanAPIKey(cfg.GeminiAPIKey)

	// Register OpenAI provider
	if openAIKey != "" {
		openaiProvider, err := providers.NewOpenAIProvider(providers.OpenAIConfig{
			APIKey:      openAIKey,
			Model:       cfg.OpenAIModel,
			Temperature: 0.15,
			MaxTokens:   cfg.OpenAIMaxTokens,
			Timeout:     cfg.RequestTimeout,
		})
		if err != nil {
			log.Fatalf("Failed to initialize OpenAI provider: %v", err)
		}
		manager.RegisterProvider(openaiProvider.ProviderName(), openaiProvider)
		registered = append(registered, openaiProvider.ProviderName())
	}

	// Register Anthropic provider
	if anthropicKey != "" {
		anthropicProvider, err := providers.NewAnthropicProvider(providers.AnthropicConfig{
			APIKey:      anthropicKey,
			Model:       cfg.AnthropicModel,
			Temperature: 0.1,
			MaxTokens:   cfg.AnthropicMaxTokens,
			Version:     "2023-06-01",
		})
		if err != nil {
			log.Printf("Failed to initialize Anthropic provider: %v", err)
		} else {
			manager.RegisterProvider("anthropic", anthropicProvider)
			registered = append(registered, "anthropic")
		}
	}

	// Register Gemini provider
	if geminiKey != "" {
		log.Printf("DEBUG: Registering Gemini provider with key: %s", geminiKey[:10]+"...")
		geminiProvider, err := providers.NewGeminiProvider(providers.GeminiConfig{
			APIKey:      geminiKey,
			Model:       cfg.GeminiModel,
			Temperature: cfg.GeminiTemperature,
			MaxTokens:   cfg.GeminiMaxTokens,
			Timeout:     cfg.RequestTimeout,
		})
		if err != nil {
			log.Printf("Failed to initialize Gemini provider: %v", err)
		} else {
			manager.RegisterProvider(geminiProvider.ProviderName(), geminiProvider)
			registered = append(registered, geminiProvider.ProviderName())
			log.Printf("DEBUG: Successfully registered Gemini provider")
		}
	}

	if len(registered) == 0 {
		log.Printf("No LLM providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to enable chat; proceeding without LLM.")
		return LLMConfig{Manager: manager}
	}

	// Set primary provider
	primary := determinePrimaryProvider(cfg.PrimaryLLM, registered)
	if primary != "" {
		if err := manager.SetPrimary(primary); err != nil {
			log.Printf("Failed to set primary LLM provider: %v", err)
		}

		// Set fallbacks
		fallbacks := []string{}
		for _, p := range registered {
			if p != primary {
				fallbacks = append(fallbacks, p)
			}
		}
		if err := manager.SetFallbacks(fallbacks); err != nil {
			log.Printf("Failed to set fallback LLM providers: %v", err)
		}
		log.Printf("Registered LLM providers: %v (primary: %s, fallbacks: %v)", registered, primary, fallbacks)
	}

	// Determine default model and tokens based on primary provider
	defaultModel := cfg.OpenAIModel
	defaultMaxTokens := cfg.OpenAIMaxTokens
	switch primary {
	case "anthropic":
		defaultModel = cfg.AnthropicModel
		defaultMaxTokens = cfg.AnthropicMaxTokens
	case "gemini":
		defaultModel = cfg.GeminiModel
		defaultMaxTokens = cfg.GeminiMaxTokens
	}

	return LLMConfig{
		Manager:          manager,
		PrimaryProvider:  primary,
		DefaultModel:     defaultModel,
		DefaultMaxTokens: defaultMaxTokens,
	}
}

// cleanAPIKey removes whitespace and filters out placeholder values
func cleanAPIKey(key string) string {
	key = strings.TrimSpace(key)
	if key == "" || isPlaceholderKey(key) {
		return ""
	}
	return key
}

// isPlaceholderKey checks if a key is a placeholder value
func isPlaceholderKey(key string) bool {
	if key == "" {
		return false
	}
	lower := strings.ToLower(key)
	placeholders := []string{
		"your-openai-key",
		"sk-your-openai-key-here",
		"sk-ant-your",
		"your-anthropic-key",
		"your-gemini-key",
		"your-google-key",
	}
	for _, placeholder := range placeholders {
		if strings.Contains(lower, placeholder) {
			return true
		}
	}
	return false
}

// determinePrimaryProvider selects the primary provider based on preference and availability
func determinePrimaryProvider(preferred string, registered []string) string {
	preferred = strings.ToLower(preferred)
	for _, p := range registered {
		if strings.ToLower(p) == preferred {
			return p
		}
	}
	if len(registered) > 0 {
		if preferred != "" {
			log.Printf("PRIMARY_LLM=%s not available, defaulting to %s", preferred, registered[0])
		}
		return registered[0]
	}
	return ""
}
