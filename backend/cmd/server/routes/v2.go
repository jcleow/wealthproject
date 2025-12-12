package routes

import (
	"net/http"

	"financial-chat-system/backend/cmd/server/handlers"
	"financial-chat-system/backend/internal/middleware"
	finRepoV2 "financial-chat-system/backend/internal/financial_v2/repository"
	timeline_v2 "financial-chat-system/backend/internal/financial_v2/timeline"

	"github.com/gorilla/mux"
)

// V2Dependencies holds all dependencies needed to create v2 handlers
type V2Dependencies struct {
	FinStore        *finRepoV2.Store
	TimelineService *timeline_v2.Service
	// Add more v2 dependencies as needed
}

// SetupV2Router creates and configures the v2 API router with all middleware and routes
func SetupV2Router(mainRouter *mux.Router, deps V2Dependencies) *mux.Router {
	// Create v2 subrouter
	v2Router := mainRouter.PathPrefix("/api/v2").Subrouter()

	// Apply middleware
	versionMiddleware := middleware.NewVersionMiddleware()
	v2Router.Use(versionMiddleware.ValidateVersion)
	v2Router.Use(middleware.RequestID)
	v2Router.Use(middleware.Logging)
	v2Router.Use(middleware.Authenticate)

	// Handle CORS preflight for all API routes
	v2Router.PathPrefix("/").Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Register all routes
	RegisterV2Routes(v2Router, deps)

	return v2Router
}

// RegisterV2Routes registers all v2 API routes
func RegisterV2Routes(router *mux.Router, deps V2Dependencies) {
	// Timeline v2 endpoints
	timelineHandler := handlers.NewTimelineV2Handler(deps.TimelineService)
	router.HandleFunc("/financial/timeline/chart", timelineHandler.HandleGetTimelineChart).Methods("GET")

	// Future v2 endpoints will go here
}
