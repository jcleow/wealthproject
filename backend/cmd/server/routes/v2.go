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
	v2Router.Use(middleware.RequireAuth)

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
	router.HandleFunc("/financial/timeline/snapshot", timelineHandler.HandleGetSnapshot).Methods("GET")

	// Bulk delete v2 endpoints (for delete all data functionality)
	// These must be registered BEFORE the /{id} routes to avoid route conflicts
	bulkDeleteHandler := handlers.NewBulkDeleteV2Handler(deps.FinStore)
	router.HandleFunc("/assets", bulkDeleteHandler.HandleDeleteAllAssets).Methods("DELETE")
	router.HandleFunc("/cash-accounts", bulkDeleteHandler.HandleDeleteAllCashAccounts).Methods("DELETE")
	router.HandleFunc("/liabilities", bulkDeleteHandler.HandleDeleteAllLiabilities).Methods("DELETE")
	router.HandleFunc("/cashflow/incomes", bulkDeleteHandler.HandleDeleteAllIncomes).Methods("DELETE")
	router.HandleFunc("/investments", bulkDeleteHandler.HandleDeleteAllInvestments).Methods("DELETE")
	router.HandleFunc("/cpf/accounts", bulkDeleteHandler.HandleDeleteAllCPFAccounts).Methods("DELETE")

	// Expense v2 endpoints (full CRUD with versioning)
	expenseHandler := handlers.NewExpenseV2Handler(deps.FinStore)
	router.HandleFunc("/cashflow/expenses", expenseHandler.HandleList).Methods("GET")
	router.HandleFunc("/cashflow/expenses", expenseHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/cashflow/expenses", expenseHandler.HandleDeleteAll).Methods("DELETE")
	router.HandleFunc("/cashflow/expenses/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			expenseHandler.HandleUpdate(w, r, id)
		case "DELETE":
			expenseHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/cashflow/expenses/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		expenseHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Liability v2 endpoints (with auto-linked expense creation and versioning)
	liabilityHandler := handlers.NewLiabilityV2Handler(deps.FinStore)
	router.HandleFunc("/liabilities", liabilityHandler.HandleList).Methods("GET")
	router.HandleFunc("/liabilities", liabilityHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/liabilities/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			liabilityHandler.HandleUpdate(w, r, id)
		case "DELETE":
			liabilityHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/liabilities/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		liabilityHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Scenario events v2 endpoints (with typed FK columns)
	scenarioHandler := handlers.NewScenarioEventV2Handler(deps.FinStore)
	router.HandleFunc("/scenario-events", scenarioHandler.HandleList).Methods("GET")
	router.HandleFunc("/scenario-events", scenarioHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/scenario-events/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "GET":
			scenarioHandler.HandleGet(w, r, id)
		case "PUT":
			scenarioHandler.HandleUpdate(w, r, id)
		case "DELETE":
			scenarioHandler.HandleDelete(w, r, id)
		}
	}).Methods("GET", "PUT", "DELETE")
	router.HandleFunc("/scenario-events/{id}/toggle", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		scenarioHandler.HandleToggle(w, r, id)
	}).Methods("PATCH")

	// Income v2 endpoints (versioned update/delete/stop)
	incomeHandler := handlers.NewIncomeV2Handler(deps.FinStore)
	router.HandleFunc("/cashflow/incomes", incomeHandler.HandleList).Methods("GET")
	router.HandleFunc("/cashflow/incomes", incomeHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/cashflow/incomes/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			incomeHandler.HandleUpdate(w, r, id)
		case "DELETE":
			incomeHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/cashflow/incomes/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		incomeHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Income allocations v2 endpoints
	allocHandler := handlers.NewIncomeAllocationV2Handler(deps.FinStore)
	router.HandleFunc("/income-allocations", allocHandler.HandleListAll).Methods("GET")
	router.HandleFunc("/incomes/{incomeId}/allocations", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		incomeID := vars["incomeId"]
		switch r.Method {
		case "GET":
			allocHandler.HandleListByIncome(w, r, incomeID)
		case "POST":
			allocHandler.HandleCreate(w, r, incomeID)
		}
	}).Methods("GET", "POST")
	router.HandleFunc("/incomes/{incomeId}/allocations/{allocId}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		incomeID := vars["incomeId"]
		allocID := vars["allocId"]
		switch r.Method {
		case "PUT":
			allocHandler.HandleUpdate(w, r, incomeID, allocID)
		case "DELETE":
			allocHandler.HandleDelete(w, r, incomeID, allocID)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/incomes/{incomeId}/allocations/{allocId}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		incomeID := vars["incomeId"]
		allocID := vars["allocId"]
		allocHandler.HandleStop(w, r, incomeID, allocID)
	}).Methods("POST")

	// Asset v2 endpoints (versioned update/delete/stop)
	assetHandler := handlers.NewAssetV2Handler(deps.FinStore)
	router.HandleFunc("/assets", assetHandler.HandleList).Methods("GET")
	router.HandleFunc("/assets", assetHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/assets/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			assetHandler.HandleUpdate(w, r, id)
		case "DELETE":
			assetHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/assets/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		assetHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Investment v2 endpoints (versioned update/delete/stop with cascade to allocations)
	investmentHandler := handlers.NewInvestmentV2Handler(deps.FinStore)
	router.HandleFunc("/investments", investmentHandler.HandleList).Methods("GET")
	router.HandleFunc("/investments", investmentHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/investments/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			investmentHandler.HandleUpdate(w, r, id)
		case "DELETE":
			investmentHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/investments/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		investmentHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Cash account v2 endpoints (versioned update/delete/stop with cascade to allocations)
	cashAccountHandler := handlers.NewCashAccountV2Handler(deps.FinStore)
	router.HandleFunc("/cash-accounts", cashAccountHandler.HandleList).Methods("GET")
	router.HandleFunc("/cash-accounts/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			cashAccountHandler.HandleUpdate(w, r, id)
		case "DELETE":
			cashAccountHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/cash-accounts/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		cashAccountHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// CPF account v2 endpoints (versioned update/delete/stop)
	cpfHandler := handlers.NewCPFV2Handler(deps.FinStore)
	router.HandleFunc("/cpf/account", cpfHandler.HandleGet).Methods("GET")
	router.HandleFunc("/cpf/account", cpfHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/cpf/account/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "PUT":
			cpfHandler.HandleUpdate(w, r, id)
		case "DELETE":
			cpfHandler.HandleDelete(w, r, id)
		}
	}).Methods("PUT", "DELETE")
	router.HandleFunc("/cpf/account/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		cpfHandler.HandleStop(w, r, id)
	}).Methods("POST")

	// Property planner v2 endpoints (with computed values)
	propertyPlannerHandler := handlers.NewPropertyPlannerV2Handler(deps.FinStore)
	router.HandleFunc("/property-planner/scenarios", propertyPlannerHandler.HandleList).Methods("GET")
	router.HandleFunc("/property-planner/scenarios", propertyPlannerHandler.HandleCreate).Methods("POST")
	router.HandleFunc("/property-planner/scenarios/{id}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		switch r.Method {
		case "GET":
			propertyPlannerHandler.HandleGet(w, r, id)
		case "PUT":
			propertyPlannerHandler.HandleUpdate(w, r, id)
		case "DELETE":
			propertyPlannerHandler.HandleDelete(w, r, id)
		}
	}).Methods("GET", "PUT", "DELETE")

	// Property planner grants (nested under scenarios)
	router.HandleFunc("/property-planner/scenarios/{id}/grants", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		scenarioID := vars["id"]
		switch r.Method {
		case "GET":
			propertyPlannerHandler.HandleListGrants(w, r, scenarioID)
		case "POST":
			propertyPlannerHandler.HandleCreateGrant(w, r, scenarioID)
		}
	}).Methods("GET", "POST")
	router.HandleFunc("/property-planner/scenarios/{id}/grants/{grantId}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		scenarioID := vars["id"]
		grantID := vars["grantId"]
		switch r.Method {
		case "PUT":
			propertyPlannerHandler.HandleUpdateGrant(w, r, scenarioID, grantID)
		case "DELETE":
			propertyPlannerHandler.HandleDeleteGrant(w, r, scenarioID, grantID)
		}
	}).Methods("PUT", "DELETE")
}
