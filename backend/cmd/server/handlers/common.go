package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	repoV2 "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/middleware"
)

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error      string `json:"error"`
	Message    string `json:"message"`
	StatusCode int    `json:"status_code"`
}

// stopInput is the JSON input for stopping a financial entity (soft delete)
type stopInput struct {
	EndDate string `json:"endDate"`
}

// writeError writes an error response to the client
func writeError(w http.ResponseWriter, statusCode int, errorCode string, message string) {
	requestID := w.Header().Get("X-Request-ID")
	if requestID == "" {
		requestID = "unknown"
	}

	// Log stack trace only for server errors (5xx)
	if statusCode >= 500 {
		log.Printf("ERROR [%d] RequestID: %s | Error: %s | Message: %s\nStack trace:\n%s",
			statusCode, requestID, errorCode, message, string(debug.Stack()))
	} else if statusCode >= 400 {
		// Just log the error without stack trace for client errors (4xx)
		log.Printf("WARN [%d] RequestID: %s | Error: %s | Message: %s",
			statusCode, requestID, errorCode, message)
	}

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

func methodNotAllowed(w http.ResponseWriter) {
	w.WriteHeader(http.StatusMethodNotAllowed)
}

// jsonResponse writes a JSON response with the given status code and data.
func jsonResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func notFound(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
}

func badRequest(w http.ResponseWriter, err error) {
	writeError(w, http.StatusBadRequest, "bad_request", err.Error())
}

func internalError(w http.ResponseWriter, err error) {
	errMsg := "internal server error"
	if err != nil {
		log.Printf("Internal error details: %v", err)
		errMsg = err.Error()
	}
	writeError(w, http.StatusInternalServerError, "internal_error", errMsg)
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

// =============================================================================
// Query Parameter Helpers
// =============================================================================

// queryDate parses a required date query parameter in DD-MM-YYYY format.
func queryDate(r *http.Request, key string) (time.Time, error) {
	v := r.URL.Query().Get(key)
	if v == "" {
		return time.Time{}, fmt.Errorf("%s is required", key)
	}
	t, err := time.Parse("02-01-2006", v)
	if err != nil {
		return time.Time{}, fmt.Errorf("%s must be a valid date (DD-MM-YYYY)", key)
	}
	return t, nil
}

// queryDateOpt parses an optional date query parameter in DD-MM-YYYY format.
// Returns the default if the parameter is missing.
func queryDateOpt(r *http.Request, key string, defaultVal time.Time) (time.Time, error) {
	v := r.URL.Query().Get(key)
	if v == "" {
		return defaultVal, nil
	}
	t, err := time.Parse("02-01-2006", v)
	if err != nil {
		return time.Time{}, fmt.Errorf("%s must be a valid date (DD-MM-YYYY)", key)
	}
	return t, nil
}

// parsePagination extracts limit and offset from query parameters.
// Use limit=-1 to return all results (no limit).
func parsePagination(r *http.Request) repository.PaginationParams {
	p := repository.DefaultPagination()

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			p.Limit = limit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			p.Offset = offset
		}
	}

	return repository.NormalizePagination(p)
}

// parsePaginationV2 extracts limit and offset from query parameters for v2 repository.
// Defaults to limit=20 if not specified. Use limit=-1 to return all results (no limit).
func parsePaginationV2(r *http.Request) repoV2.PaginationParams {
	defaultLimit := 20
	limit := &defaultLimit
	var offset *int

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = &l
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = &o
		}
	}

	return repoV2.PaginationParams{Limit: limit, Offset: offset}
}
