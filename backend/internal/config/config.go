package config

import (
	"log"
	"os"
	"strconv"
	"strings"
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

	// Usage tracking
	UsageTrackingEnabled bool
}

func New() *Config {
	// SECURITY: JWT secret validation is the DEFAULT behavior.
	// Only skip validation when GO_ENV is explicitly set to dev/development/local.
	// This ensures production and any unknown environments require strong secrets.
	jwtSecret := getEnv("JWT_SECRET", "your-secret-key")
	if !isDevelopment() {
		if jwtSecret == "" || jwtSecret == "your-secret-key" || len(jwtSecret) < 32 {
			log.Fatal("SECURITY ERROR: JWT_SECRET must be set to a strong secret (at least 32 characters)")
		}
	}

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://financial_user:${DB_PASSWORD}@localhost:5432/financial_chat?sslmode=disable"),
		JWTSecret:   jwtSecret,
		PrimaryLLM:  getEnv("PRIMARY_LLM", "openai"),

		// LLM Providers
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:        getEnv("OPENAI_MODEL", "gpt-4"),
		OpenAIMaxTokens:    getEnvAsInt("OPENAI_MAX_TOKENS", 0),
		AnthropicAPIKey:    getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel:     getEnv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
		AnthropicMaxTokens: getEnvAsInt("ANTHROPIC_MAX_TOKENS", 0),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-1.5-flash-latest"),
		GeminiTemperature:  getEnvAsFloat64("GEMINI_TEMPERATURE", 0.1),
		GeminiMaxTokens:    getEnvAsInt("GEMINI_MAX_TOKENS", 0),

		// API Config
		APIVersion:     getEnv("API_VERSION", "v1"),
		RequestTimeout: getEnvAsInt("REQUEST_TIMEOUT", 30),
		MaxRequestSize: getEnvAsInt64("MAX_REQUEST_SIZE", 10*1024*1024), // 10MB

		// Session management
		SessionTTLHours:               getEnvAsInt("SESSION_TTL_HOURS", 24),
		SessionCleanupIntervalMinutes: getEnvAsInt("SESSION_CLEANUP_INTERVAL_MINUTES", 60),

		// Usage tracking
		UsageTrackingEnabled: getEnvAsBool("USAGE_TRACKING_ENABLED", true),
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

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

// isProduction returns true if the application is running in production mode
func isProduction() bool {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	return env == "production" || env == "prod"
}

// isDevelopment returns true if the application is running in development mode
func isDevelopment() bool {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	return env == "development" || env == "dev" || env == "local"
}

// IsProduction is the exported version for use by other packages
func IsProduction() bool {
	return isProduction()
}
