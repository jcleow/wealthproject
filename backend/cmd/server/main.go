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
	finRepo "financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
	"financial-chat-system/backend/internal/financial/timeline"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/llm/providers"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/internal/session"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables (try repo root and backend dir so it works regardless of cwd)
	if err := godotenv.Load(".env", "../.env"); err != nil {
		log.Println("No .env file found in current or parent directory")
	}

	// Initialize configuration
	cfg := config.New()
	log.Printf("CONFIG: PRIMARY_LLM=%s GEMINI_MODEL=%s OPENAI_MODEL=%s ANTHROPIC_MODEL=%s", cfg.PrimaryLLM, cfg.GeminiModel, cfg.OpenAIModel, cfg.AnthropicModel)

	// Initialize database connection
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	log.Printf("Starting migrations...")
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}
	log.Printf("Migrations completed...")

	finStore := finRepo.NewStore(db)
	if err := financial.InitializeRegistry(); err != nil {
		log.Fatal("Failed to initialize financial tools:", err)
	}

	// Initialize services
	financialClient := financial.NewClient(finStore)
	previewService := financial.NewActionPreviewService(financialClient)
	sessionTTL := time.Duration(cfg.SessionTTLHours) * time.Hour
	sessionStore := session.NewStore(db, sessionTTL)
	scenarioService := scenario.NewService(finStore)
	timelineService := timeline.NewServiceWithScenario(finStore, scenarioService)

	// Initialize middleware
	versionMiddleware := middleware.NewVersionMiddleware()

	// Create main router
	router := mux.NewRouter()
	// Apply CORS at the top-level so even 404/validation errors include headers
	router.Use(middleware.CORS)
	// Ensure OPTIONS at top-level (covers any non-/api paths)
	router.Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// API v1 router with versioning middleware
	v1Router := router.PathPrefix("/api/v1").Subrouter()
	v1Router.Use(versionMiddleware.ValidateVersion)
	v1Router.Use(middleware.RequestID)
	v1Router.Use(middleware.Logging)
	v1Router.Use(middleware.Authenticate)

	// Handle CORS preflight for all API routes
	v1Router.PathPrefix("/").Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

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
	log.Printf("DEBUG: Raw Gemini API key from config: '%s'", cfg.GeminiAPIKey)
	log.Printf("DEBUG: Trimmed Gemini API key: '%s'", geminiKey)
	log.Printf("DEBUG: Is placeholder key: %v", isPlaceholderKey(geminiKey))
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
	log.Printf("DEBUG: About to check Gemini key registration - key empty: %v", geminiKey == "")
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
			llmManager.RegisterProvider(geminiProvider.ProviderName(), geminiProvider)
			providerCount++
			registered = append(registered, geminiProvider.ProviderName())
			log.Printf("DEBUG: Successfully registered Gemini provider")
		}
	} else {
		log.Printf("DEBUG: Gemini key is empty, skipping registration")
	}

	if providerCount == 0 {
		log.Printf("No LLM providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to enable chat; proceeding without LLM.")
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
	if primary != "" {
		if err := llmManager.SetPrimary(primary); err != nil {
			log.Printf("Failed to set primary LLM provider: %v", err)
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
	} else {
		log.Printf("LLM disabled (no providers). Chat endpoints will return an error until a provider key is set.")
	}

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
	timelineHandler := handlers.NewTimelineHandler(timelineService)
	growthHandler := handlers.NewGrowthHandler(timelineService)
	scenarioAnalysisHandler := handlers.NewScenarioAnalysisHandler(timelineService)

	// Background session cleanup
	startSessionCleanup(sessionStore, sessionTTL, time.Duration(cfg.SessionCleanupIntervalMinutes)*time.Minute)

	// Register routes
	v1Router.HandleFunc("/health", healthHandler.HandleHealth).Methods("GET")
	v1Router.HandleFunc("/tools", healthHandler.HandleTools).Methods("GET")

	// Chat endpoints
	v1Router.HandleFunc("/chat", chatHandler.HandleChat).Methods("POST", "OPTIONS")
	v1Router.HandleFunc("/chat/history/{sessionId}", chatHandler.GetChatHistory).Methods("GET")

	// Financial CRUD endpoints
	assetHandler := handlers.NewAssetHandler(finStore)
	liabilityHandler := handlers.NewLiabilityHandler(finStore)
	incomeHandler := handlers.NewIncomeHandler(finStore)
	expenseHandler := handlers.NewExpenseHandler(finStore)
	propertyHandler := handlers.NewPropertyScenarioHandler(finStore)
	propertyLinkHandler := handlers.NewPropertyLinkHandler(finStore)
	scenarioHandler := handlers.NewScenarioEventHandler(finStore)
	v1Router.PathPrefix("/assets").Handler(handlerToHTTPMux("/api/v1", assetHandler.RegisterRoutes))
	v1Router.PathPrefix("/liabilities").Handler(handlerToHTTPMux("/api/v1", liabilityHandler.RegisterRoutes))
	v1Router.PathPrefix("/cashflow/incomes").Handler(handlerToHTTPMux("/api/v1", incomeHandler.RegisterRoutes))
	v1Router.PathPrefix("/cashflow/expenses").Handler(handlerToHTTPMux("/api/v1", expenseHandler.RegisterRoutes))
	v1Router.PathPrefix("/property-planner/scenarios").Handler(handlerToHTTPMux("/api/v1", propertyHandler.RegisterRoutes))
	v1Router.PathPrefix("/property-links").Handler(handlerToHTTPMux("/api/v1", propertyLinkHandler.RegisterRoutes))
	v1Router.PathPrefix("/scenario-events").Handler(handlerToHTTPMux("/api/v1", scenarioHandler.RegisterRoutes))
	v1Router.HandleFunc("/financial/timeline", timelineHandler.HandleGetTimeline).Methods("GET")
	v1Router.HandleFunc("/financial/timeline/{year}", timelineHandler.HandleUpsertYear).Methods("PUT", "OPTIONS")
	v1Router.HandleFunc("/financial/growth", growthHandler.HandleGetGrowth).Methods("GET")
	v1Router.HandleFunc("/financial/growth", growthHandler.HandlePutGrowth).Methods("PUT")
	v1Router.HandleFunc("/scenario-analysis", scenarioAnalysisHandler.Handle).Methods("POST")

	// Financial action endpoints
	v1Router.HandleFunc("/financial/actions/dispatch", dispatchHandler.HandleDispatch).Methods("POST", "OPTIONS")

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
	if strings.Contains(lower, "your-gemini-key") || strings.Contains(lower, "your-google-key") {
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

// handlerToHTTPMux wraps a register func (net/http mux) to satisfy gorilla.Router Handler and strips the API prefix.
func handlerToHTTPMux(prefix string, register func(mux *http.ServeMux)) http.Handler {
	m := http.NewServeMux()
	register(m)
	return http.StripPrefix(prefix, m)
}
