package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"financial-chat-system/backend/cmd/server/handlers"
	"financial-chat-system/backend/internal/config"
	"financial-chat-system/backend/internal/database"
	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/llm/providers"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/internal/session"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize configuration
	cfg := config.New()

	// Initialize database connection
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	if err := financial.InitializeRegistry(); err != nil {
		log.Fatal("Failed to initialize financial tools:", err)
	}

	// Initialize services
	financialClient := financial.NewClient()
	previewService := financial.NewActionPreviewService(financialClient)
	sessionTTL := time.Duration(cfg.SessionTTLHours) * time.Hour
	sessionStore := session.NewStore(db, sessionTTL)

	// Initialize middleware
	versionMiddleware := middleware.NewVersionMiddleware()

	// Create main router
	router := mux.NewRouter()

	// API v1 router with versioning middleware
	v1Router := router.PathPrefix("/api/v1").Subrouter()
	v1Router.Use(versionMiddleware.ValidateVersion)
	v1Router.Use(middleware.CORS)
	v1Router.Use(middleware.RequestID)
	v1Router.Use(middleware.Logging)
	v1Router.Use(middleware.Authenticate)

	// Initialize LLM client manager
	llmManager := llm.NewClientManager()
	providerCount := 0
	registered := []string{}

	openAIKey := strings.TrimSpace(cfg.OpenAIAPIKey)
	if isPlaceholderKey(openAIKey) {
		openAIKey = ""
	}

	anthropicKey := strings.TrimSpace(cfg.AnthropicAPIKey)
	if isPlaceholderKey(anthropicKey) {
		anthropicKey = ""
	}

	geminiKey := strings.TrimSpace(cfg.GeminiAPIKey)
	if isPlaceholderKey(geminiKey) {
		geminiKey = ""
	}

	// Register OpenAI provider using config
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
		llmManager.RegisterProvider(openaiProvider.ProviderName(), openaiProvider)
		providerCount++
		registered = append(registered, openaiProvider.ProviderName())
	}

	// Register Anthropic provider if configured
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
			llmManager.RegisterProvider("anthropic", anthropicProvider)
			providerCount++
			registered = append(registered, "anthropic")
		}
	}

	// Register Gemini provider if configured
	if geminiKey != "" {
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
			llmManager.RegisterProvider(geminiProvider.ProviderName(), geminiProvider)
			providerCount++
			registered = append(registered, geminiProvider.ProviderName())
		}
	}

	if providerCount == 0 {
		log.Fatal("No LLM providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.")
	}

	// Determine primary provider based on env preference and availability
	preferred := strings.ToLower(cfg.PrimaryLLM)
	primary := ""
	if preferred != "" {
		for _, p := range registered {
			if strings.ToLower(p) == preferred {
				primary = p
				break
			}
		}
	}
	if primary == "" && len(registered) > 0 {
		primary = registered[0]
		log.Printf("PRIMARY_LLM=%s not available, defaulting to %s", cfg.PrimaryLLM, primary)
	}
	if err := llmManager.SetPrimary(primary); err != nil {
		log.Fatalf("Failed to set primary LLM provider: %v", err)
	}
	// Set fallbacks to any remaining providers in order
	fallbacks := []string{}
	for _, p := range registered {
		if p != primary {
			fallbacks = append(fallbacks, p)
		}
	}
	if err := llmManager.SetFallbacks(fallbacks); err != nil {
		log.Printf("Failed to set fallback LLM providers: %v", err)
	}

	log.Printf("Registered LLM providers: %v (primary: %s, fallbacks: %v)", registered, primary, fallbacks)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
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
	chatHandler := handlers.NewChatHandler(llmManager, previewService, sessionStore, defaultModel, defaultMaxTokens)
	dispatchHandler := handlers.NewDispatchHandler(financialClient, sessionStore, previewService)

	// Background session cleanup
	startSessionCleanup(sessionStore, sessionTTL, time.Duration(cfg.SessionCleanupIntervalMinutes)*time.Minute)

	// Register routes
	v1Router.HandleFunc("/health", healthHandler.HandleHealth).Methods("GET")
	v1Router.HandleFunc("/tools", healthHandler.HandleTools).Methods("GET")

	// Chat endpoints
	v1Router.HandleFunc("/chat", chatHandler.HandleChat).Methods("POST", "OPTIONS")
	v1Router.HandleFunc("/chat/history/{sessionId}", chatHandler.GetChatHistory).Methods("GET")

	// Financial action endpoints
	v1Router.HandleFunc("/financial/actions/dispatch", dispatchHandler.HandleDispatch).Methods("POST")

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Starting server on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func isPlaceholderKey(key string) bool {
	if key == "" {
		return false
	}
	lower := strings.ToLower(key)
	if strings.Contains(lower, "your-openai-key") || strings.Contains(lower, "sk-your-openai-key-here") {
		return true
	}
	if strings.Contains(lower, "sk-ant-your") || strings.Contains(lower, "your-anthropic-key") {
		return true
	}
	return false
}

func startSessionCleanup(store *session.Store, maxAge time.Duration, interval time.Duration) {
	if maxAge <= 0 || interval <= 0 {
		return
	}

	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			removed, err := store.CleanupExpiredSessions(context.Background(), maxAge)
			if err != nil {
				log.Printf("session cleanup failed: %v", err)
				continue
			}
			if removed > 0 {
				log.Printf("session cleanup removed %d expired sessions", removed)
			}
		}
	}()
}
