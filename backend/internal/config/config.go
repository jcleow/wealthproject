package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string

	// LLM Provider configs
	OpenAIAPIKey     string
	OpenAIModel      string
	AnthropicAPIKey  string
	AnthropicModel   string

	// API Configuration
	APIVersion       string
	RequestTimeout   int
	MaxRequestSize   int64
}

func New() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://localhost/financial_chat?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),

		// LLM Providers
		OpenAIAPIKey:    getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:     getEnv("OPENAI_MODEL", "gpt-4"),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel:  getEnv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),

		// API Config
		APIVersion:     getEnv("API_VERSION", "v1"),
		RequestTimeout: getEnvAsInt("REQUEST_TIMEOUT", 30),
		MaxRequestSize: getEnvAsInt64("MAX_REQUEST_SIZE", 10*1024*1024), // 10MB
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