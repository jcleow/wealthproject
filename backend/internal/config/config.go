package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	PrimaryLLM  string

	// LLM Provider configs
	OpenAIAPIKey       string
	OpenAIModel        string
	OpenAIMaxTokens    int
	AnthropicAPIKey    string
	AnthropicModel     string
	AnthropicMaxTokens int
	GeminiAPIKey       string
	GeminiModel        string
	GeminiTemperature  float64
	GeminiMaxTokens    int

	// API Configuration
	APIVersion     string
	RequestTimeout int
	MaxRequestSize int64

	// Session management
	SessionTTLHours               int
	SessionCleanupIntervalMinutes int
}

func New() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		PrimaryLLM:  getEnv("PRIMARY_LLM", "openai"),

		// LLM Providers
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:        getEnv("OPENAI_MODEL", "gpt-4"),
		OpenAIMaxTokens:    getEnvAsInt("OPENAI_MAX_TOKENS", 0),
		AnthropicAPIKey:    getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel:     getEnv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
		AnthropicMaxTokens: getEnvAsInt("ANTHROPIC_MAX_TOKENS", 0),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-1.5-flash"),
		GeminiTemperature:  getEnvAsFloat64("GEMINI_TEMPERATURE", 0.1),
		GeminiMaxTokens:    getEnvAsInt("GEMINI_MAX_TOKENS", 0),

		// API Config
		APIVersion:     getEnv("API_VERSION", "v1"),
		RequestTimeout: getEnvAsInt("REQUEST_TIMEOUT", 30),
		MaxRequestSize: getEnvAsInt64("MAX_REQUEST_SIZE", 10*1024*1024), // 10MB

		// Session management
		SessionTTLHours:               getEnvAsInt("SESSION_TTL_HOURS", 24),
		SessionCleanupIntervalMinutes: getEnvAsInt("SESSION_CLEANUP_INTERVAL_MINUTES", 60),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsFloat64(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}
