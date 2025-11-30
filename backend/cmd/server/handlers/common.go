package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/middleware"
)

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error      string `json:"error"`
	Message    string `json:"message"`
	StatusCode int    `json:"status_code"`
}

// writeError writes an error response to the client
func writeError(w http.ResponseWriter, statusCode int, errorCode string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	w.WriteHeader(statusCode)

	response := ErrorResponse{
		Error:      errorCode,
		Message:    message,
		StatusCode: statusCode,
	}

	json.NewEncoder(w).Encode(response)
}

// writeSuccess writes a success response to the client
func writeSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(data)
}

func methodNotAllowed(w http.ResponseWriter) {
	w.WriteHeader(http.StatusMethodNotAllowed)
}

func notFound(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
}

func badRequest(w http.ResponseWriter, err error) {
	writeError(w, http.StatusBadRequest, "bad_request", err.Error())
}

func internalError(w http.ResponseWriter) {
	writeError(w, http.StatusInternalServerError, "internal_error", "internal server error")
}

func errMissingFields(fields string) error {
	return &fieldError{fields: fields}
}

type fieldError struct {
	fields string
}

func (e *fieldError) Error() string {
	return "missing required fields: " + strings.TrimSpace(e.fields)
}

// getUserID extracts the userID from the request context.
// Returns empty string if not authenticated.
func getUserID(r *http.Request) string {
	return middleware.GetUserContext(r.Context()).UserID
}

// requireUserID extracts userID and writes 401 if missing.
// Returns the userID and true if present, or empty string and false if missing.
func requireUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID := getUserID(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
		return "", false
	}
	return userID, true
}
