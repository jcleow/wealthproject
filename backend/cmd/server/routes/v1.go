package routes

import (
	"net/http"

	"financial-chat-system/backend/cmd/server/handlers"
	"financial-chat-system/backend/internal/financial"
	finRepo "financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/timeline"
	finRepoV2 "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/internal/session"
	"financial-chat-system/backend/internal/usage"

	"github.com/gorilla/mux"
)

// V1Dependencies holds all dependencies needed to create v1 handlers
type V1Dependencies struct {
	LLMManager       *llm.ClientManager
	PreviewService   *financial.ActionPreviewService
	SessionStore     *session.Store
	FinancialClient  *financial.Client
	UsageRepo        *usage.Repository
	DefaultModel     string
	DefaultMaxTokens int
	TimelineService  *timeline.Service
	FinStore         *finRepo.Store
	FinStoreV2       *finRepoV2.Store // V2 store for migrated handlers
}

// SetupV1Router creates and configures the v1 API router with all middleware and routes
func SetupV1Router(mainRouter *mux.Router, deps V1Dependencies) *mux.Router {
	// Create v1 subrouter
	v1Router := mainRouter.PathPrefix("/api/v1").Subrouter()

	// Apply base middleware (version, request ID, logging)
	versionMiddleware := middleware.NewVersionMiddleware()
	v1Router.Use(versionMiddleware.ValidateVersion)
	v1Router.Use(middleware.RequestID)
	v1Router.Use(middleware.Logging)

	// Handle CORS preflight for all API routes
	v1Router.PathPrefix("/").Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Register public routes (no auth required) - health check must be public for monitoring
	healthHandler := handlers.NewHealthHandler()
	v1Router.HandleFunc("/health", healthHandler.HandleHealth).Methods("GET")

	// Create authenticated subrouter for protected routes
	authRouter := v1Router.PathPrefix("").Subrouter()
	middleware.SetFinancialStore(deps.FinStore)
	authRouter.Use(middleware.Authenticate)
	authRouter.Use(middleware.RequireAuth)

	// Register protected routes (including /tools which requires auth)
	authRouter.HandleFunc("/tools", healthHandler.HandleTools).Methods("GET")
	RegisterV1ProtectedRoutes(authRouter, deps)

	return v1Router
}

// RegisterV1ProtectedRoutes registers all v1 API routes that require authentication
func RegisterV1ProtectedRoutes(router *mux.Router, deps V1Dependencies) {
	// Chat endpoints
	chatHandler := handlers.NewChatHandler(
		deps.LLMManager,
		deps.PreviewService,
		deps.SessionStore,
		deps.FinancialClient,
		deps.UsageRepo,
		deps.DefaultModel,
		deps.DefaultMaxTokens,
	)
	router.HandleFunc("/chat", chatHandler.HandleChat).Methods("POST", "OPTIONS")
	router.HandleFunc("/chat/history/{sessionId}", chatHandler.GetChatHistory).Methods("GET")

	// Financial action endpoints
	dispatchHandler := handlers.NewDispatchHandler(deps.FinancialClient, deps.SessionStore, deps.PreviewService)
	router.HandleFunc("/financial/actions/dispatch", dispatchHandler.HandleDispatch).Methods("POST", "OPTIONS")

	// Financial CRUD endpoints (using RegisterRoutes pattern)
	assetHandler := handlers.NewAssetHandler(deps.FinStore)
	investmentHandler := handlers.NewInvestmentHandler(deps.FinStore)
	liabilityHandler := handlers.NewLiabilityHandler(deps.FinStore)
	incomeHandler := handlers.NewIncomeHandler(deps.FinStore)
	// Expense endpoints moved to v2 routes only
	propertyHandler := handlers.NewPropertyScenarioHandler(deps.FinStore)
	propertyLinkHandler := handlers.NewPropertyLinkHandler(deps.FinStore)
	cashAccountHandler := handlers.NewCashAccountHandler(deps.FinStore)

	router.PathPrefix("/assets").Handler(handlerToHTTPMux("/api/v1", assetHandler.RegisterRoutes))
	router.PathPrefix("/investments").Handler(handlerToHTTPMux("/api/v1", investmentHandler.RegisterRoutes))
	router.PathPrefix("/liabilities").Handler(handlerToHTTPMux("/api/v1", liabilityHandler.RegisterRoutes))
	router.PathPrefix("/cashflow/incomes").Handler(handlerToHTTPMux("/api/v1", incomeHandler.RegisterRoutes))
	// Expense routes are now handled by v2 router
	router.PathPrefix("/property-planner/scenarios").Handler(handlerToHTTPMux("/api/v1", propertyHandler.RegisterRoutes))
	router.PathPrefix("/property-links").Handler(handlerToHTTPMux("/api/v1", propertyLinkHandler.RegisterRoutes))
	router.PathPrefix("/cash-accounts").Handler(handlerToHTTPMux("/api/v1", cashAccountHandler.RegisterRoutes))
	// scenario-events and cpf endpoints moved to v2 routes only

	// Timeline endpoints
	timelineHandler := handlers.NewTimelineHandler(deps.TimelineService)
	growthHandler := handlers.NewGrowthHandler(deps.TimelineService)
	settingsHandler := handlers.NewSettingsHandler(deps.TimelineService)
	scenarioAnalysisHandler := handlers.NewScenarioAnalysisHandler(deps.TimelineService)

	router.HandleFunc("/financial/timeline", timelineHandler.HandleGetTimeline).Methods("GET")
	router.HandleFunc("/financial/timeline/{year}", timelineHandler.HandleUpsertYear).Methods("PUT", "OPTIONS")
	router.HandleFunc("/financial/growth", growthHandler.HandleGetGrowth).Methods("GET")
	router.HandleFunc("/financial/growth", growthHandler.HandlePutGrowth).Methods("PUT")
	router.HandleFunc("/settings", settingsHandler.HandleGetSettings).Methods("GET")
	router.HandleFunc("/settings", settingsHandler.HandlePutSettings).Methods("PUT")
	router.HandleFunc("/scenario-analysis", scenarioAnalysisHandler.Handle).Methods("POST")
}

// handlerToHTTPMux wraps a register func (net/http mux) to satisfy gorilla.Router Handler and strips the API prefix.
func handlerToHTTPMux(prefix string, register func(mux *http.ServeMux)) http.Handler {
	m := http.NewServeMux()
	register(m)
	return http.StripPrefix(prefix, m)
}
