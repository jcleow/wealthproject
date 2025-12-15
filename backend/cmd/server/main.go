package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/cmd/server/routes"
	"financial-chat-system/backend/cmd/server/setup"
	"financial-chat-system/backend/internal/config"
	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/database"
	"financial-chat-system/backend/internal/financial"
	finRepo "financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
	"financial-chat-system/backend/internal/financial/timeline"
	finRepoV2 "financial-chat-system/backend/internal/financial_v2/repository"
	timeline_v2 "financial-chat-system/backend/internal/financial_v2/timeline"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/internal/session"
	"financial-chat-system/backend/internal/usage"

	_ "financial-chat-system/backend/cmd/server/docs"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger"
)

// @title Financial Chat System API
// @version 1.0
// @description API for managing financial data, chat interactions, and scenario planning
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@example.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api
// @schemes http https

// @securityDefinitions.apikey AuthToken
// @in header
// @name X-Auth-Token
// @description JWT token for production authentication (HMAC-signed with BACKEND_SHARED_SECRET)

// @securityDefinitions.apikey SessionID
// @in header
// @name X-Session-ID
// @description User/Session ID for development mode authentication

func main() {
	// Load environment variables
	if err := godotenv.Load(".env", "../.env"); err != nil {
		log.Println("No .env file found in current or parent directory")
	}

	// Initialize configuration
	cfg := config.New()
	log.Printf("CONFIG: PRIMARY_LLM=%s GEMINI_MODEL=%s OPENAI_MODEL=%s ANTHROPIC_MODEL=%s",
		cfg.PrimaryLLM, cfg.GeminiModel, cfg.OpenAIModel, cfg.AnthropicModel)

	// Initialize database (sql.DB for legacy packages)
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	log.Printf("Starting migrations...")
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}
	log.Printf("Migrations completed")

	// Initialize pgxpool for financial_v2 package
	ctx := context.Background()
	pool, err := database.ConnectPgx(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database with pgx:", err)
	}
	defer pool.Close()
	log.Printf("pgxpool initialized for financial_v2")

	// Suppress unused variable warning during transition
	_ = pgxpool.Pool{}

	// Initialize repositories
	finStore := finRepo.NewStore(db)
	finStoreV2 := finRepoV2.NewStore(pool)
	cpfAccountRepo := account.NewRepository(db)
	usageRepo := usage.NewRepository(db, cfg.UsageTrackingEnabled)

	// Initialize financial registry
	if err := financial.InitializeRegistry(); err != nil {
		log.Fatal("Failed to initialize financial tools:", err)
	}

	// Initialize v1 services
	financialClient := financial.NewClient(finStore)
	previewService := financial.NewActionPreviewService(financialClient)
	sessionTTL := time.Duration(cfg.SessionTTLHours) * time.Hour
	sessionStore := session.NewStore(db, sessionTTL)
	scenarioService := scenario.NewService(finStore)
	timelineService := timeline.NewServiceWithScenario(finStore, scenarioService)
	financialClient.SetTimelineService(timelineService)

	// Initialize v2 services
	timelineV2Service := timeline_v2.NewService(finStoreV2)

	// Initialize LLM providers
	llmCfg := setup.InitializeLLM(cfg)
	log.Printf("CONFIG: Usage tracking enabled: %v", cfg.UsageTrackingEnabled)

	// Start background session cleanup
	startSessionCleanup(sessionStore, sessionTTL, time.Duration(cfg.SessionCleanupIntervalMinutes)*time.Minute)

	// Create main router with CORS
	router := mux.NewRouter()
	router.Use(middleware.CORS)
	router.Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Setup v1 API routes
	routes.SetupV1Router(router, routes.V1Dependencies{
		LLMManager:       llmCfg.Manager,
		PreviewService:   previewService,
		SessionStore:     sessionStore,
		FinancialClient:  financialClient,
		UsageRepo:        usageRepo,
		DefaultModel:     llmCfg.DefaultModel,
		DefaultMaxTokens: llmCfg.DefaultMaxTokens,
		TimelineService:  timelineService,
		FinStore:         finStore,
		CPFAccountRepo:   cpfAccountRepo,
	})

	// Setup v2 API routes
	routes.SetupV2Router(router, routes.V2Dependencies{
		FinStore:        finStoreV2,
		TimelineService: timelineV2Service,
	})

	// Swagger UI endpoint
	router.PathPrefix("/swagger/").Handler(httpSwagger.Handler(
		httpSwagger.URL("http://localhost:8080/swagger/doc.json"),
		httpSwagger.DeepLinking(true),
		httpSwagger.DocExpansion("none"),
		httpSwagger.DomID("swagger-ui"),
	)).Methods(http.MethodGet)

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Starting server on port %s\n", port)
	fmt.Printf("Swagger UI available at http://localhost:%s/swagger/index.html\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
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
