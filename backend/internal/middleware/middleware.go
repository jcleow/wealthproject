package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RequestID middleware adds a unique request ID to each request
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		w.Header().Set("X-Request-ID", requestID)
		ctx := context.WithValue(r.Context(), "request_id", requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// getAllowedOrigins returns the list of allowed CORS origins from environment or defaults
func getAllowedOrigins() []string {
	originsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	if originsEnv != "" {
		origins := strings.Split(originsEnv, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
		return origins
	}
	// Default allowed origins for development
	return []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://localhost:3000",
	}
}

// isOriginAllowed checks if the given origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}
	return false
}

// CORS middleware handles Cross-Origin Resource Sharing
// SECURITY: Only allows whitelisted origins instead of "*" to prevent CSRF attacks
func CORS(next http.Handler) http.Handler {
	allowedOrigins := getAllowedOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Only set CORS headers if origin is in the allowed list
		if origin != "" && isOriginAllowed(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, API-Version, X-Auth-Token, X-Request-ID")
		w.Header().Set("Access-Control-Expose-Headers", "API-Version, X-API-Deprecation-Warning, X-Request-ID, X-Response-Time")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware logs HTTP requests
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a response writer wrapper to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

		// Log request details
		requestID := r.Context().Value("request_id")
		log.Printf("REQUEST START: %s %s | RequestID: %v | Content-Length: %d | User-Agent: %s",
			r.Method, r.URL.Path, requestID, r.ContentLength, r.Header.Get("User-Agent"))

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		w.Header().Set("X-Response-Time", duration.String())

		// Enhanced logging with status categories
		statusCategory := "INFO"
		if wrapped.statusCode >= 400 && wrapped.statusCode < 500 {
			statusCategory = "WARN"
		} else if wrapped.statusCode >= 500 {
			statusCategory = "ERROR"
		}

		log.Printf("REQUEST %s: %s %s | Status: %d | Duration: %v | RequestID: %v",
			statusCategory, r.Method, r.URL.Path, wrapped.statusCode, duration, requestID)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ErrorResponse represents a structured error response
type ErrorResponse struct {
	Error     string      `json:"error"`
	Message   string      `json:"message"`
	Details   interface{} `json:"details,omitempty"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id"`
}

// writeErrorResponse writes a structured error response
func writeErrorResponse(w http.ResponseWriter, statusCode int, errorType string, message string, details interface{}) {
	requestID := "unknown"
	if ctx := w.Header().Get("X-Request-ID"); ctx != "" {
		requestID = ctx
	}

	response := ErrorResponse{
		Error:     errorType,
		Message:   message,
		Details:   details,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		RequestID: requestID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}
