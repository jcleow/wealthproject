package main

import (
	"fmt"
	"log"
	"net/http"

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
	sessionStore := session.NewStore(db)

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

	// Register OpenAI provider using config
	if cfg.OpenAIAPIKey != "" {
		openaiProvider, err := providers.NewOpenAIProvider(providers.OpenAIConfig{
			APIKey:      cfg.OpenAIAPIKey,
			Model:       cfg.OpenAIModel,
			Temperature: 0.15,
			MaxTokens:   1200,
			Timeout:     cfg.RequestTimeout,
		})
		if err != nil {
			log.Fatalf("Failed to initialize OpenAI provider: %v", err)
		}
		llmManager.RegisterProvider(openaiProvider.ProviderName(), openaiProvider)
		if err := llmManager.SetPrimary(openaiProvider.ProviderName()); err != nil {
			log.Fatalf("Failed to set primary LLM provider: %v", err)
		}
		providerCount++
	}

	// Register Anthropic provider if configured
	if cfg.AnthropicAPIKey != "" {
		anthropicProvider, err := providers.NewAnthropicProvider(providers.AnthropicConfig{
			APIKey:      cfg.AnthropicAPIKey,
			Model:       cfg.AnthropicModel,
			Temperature: 0.1,
			MaxTokens:   2000,
			Version:     "2023-06-01",
		})
		if err != nil {
			log.Printf("Failed to initialize Anthropic provider: %v", err)
		} else {
			llmManager.RegisterProvider("anthropic", anthropicProvider)
			if providerCount == 0 {
				if err := llmManager.SetPrimary("anthropic"); err != nil {
					log.Fatalf("Failed to set Anthropic as primary provider: %v", err)
				}
			}
			providerCount++
		}
	}

	if providerCount == 0 {
		log.Fatal("No LLM providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")
	}

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	chatHandler := handlers.NewChatHandler(llmManager, previewService, sessionStore)
	dispatchHandler := handlers.NewDispatchHandler(financialClient, sessionStore, previewService)

	// Register routes
	v1Router.HandleFunc("/health", healthHandler.HandleHealth).Methods("GET")
	v1Router.HandleFunc("/tools", healthHandler.HandleTools).Methods("GET")

	// Chat endpoints
	v1Router.HandleFunc("/chat", chatHandler.HandleChat).Methods("POST")
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
