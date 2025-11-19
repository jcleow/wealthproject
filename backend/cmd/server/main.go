package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"financial-chat-system/backend/internal/config"
	"financial-chat-system/backend/internal/database"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/cmd/server/handlers"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/llm/providers"
	"financial-chat-system/backend/internal/financial"
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

	// Initialize LLM client manager
	llmManager := llm.NewClientManager()

	// Register OpenAI provider
	openAIConfig := providers.OpenAIConfig{
		APIKey:      os.Getenv("OPENAI_API_KEY"),
		Model:       os.Getenv("OPENAI_MODEL"),
		Temperature: 0.7,
		MaxTokens:   2000,
	}

	if openAIConfig.APIKey != "" {
		openAIProvider, err := providers.NewOpenAIProvider(openAIConfig)
		if err != nil {
			log.Printf("Failed to initialize OpenAI provider: %v", err)
		} else {
			llmManager.RegisterProvider("openai", openAIProvider)
			llmManager.SetPrimary("openai")
		}
	}

	// Register Anthropic provider if API key is available
	anthropicConfig := providers.AnthropicConfig{
		APIKey:      os.Getenv("ANTHROPIC_API_KEY"),
		Model:       os.Getenv("ANTHROPIC_MODEL"),
		Temperature: 0.1,
		MaxTokens:   2000,
		Version:     "2023-06-01",
	}

	if anthropicConfig.APIKey != "" {
		anthropicProvider, err := providers.NewAnthropicProvider(anthropicConfig)
		if err != nil {
			log.Printf("Failed to initialize Anthropic provider: %v", err)
		} else {
			llmManager.RegisterProvider("anthropic", anthropicProvider)
			// If no OpenAI provider is available, make Anthropic primary
			if openAIConfig.APIKey == "" {
				llmManager.SetPrimary("anthropic")
			}
		}
	}

	// Initialize session store
	sessionStore := session.NewStore(db)

	// Initialize financial services
	financialClient := financial.NewClient()
	previewService := financial.NewActionPreviewService(financialClient)

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
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Starting server on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}