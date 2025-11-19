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

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	// TODO: Add chat and dispatch handlers in B6-B7

	// Register routes
	v1Router.HandleFunc("/health", healthHandler.HandleHealth).Methods("GET")
	v1Router.HandleFunc("/tools", healthHandler.HandleTools).Methods("GET")
	// TODO: Add /chat and /financial/actions/dispatch routes in B6-B7

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Starting server on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}