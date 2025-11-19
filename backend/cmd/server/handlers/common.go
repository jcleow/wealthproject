package handlers

import (
	"encoding/json"
	"net/http"
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