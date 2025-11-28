package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"
)

type userContextKey struct{}

// UserContext represents authenticated request metadata
type UserContext struct {
	UserID string
	Token  string
}

// Authenticate extracts basic auth headers and injects context
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		token := parseBearerToken(authHeader)
		if token == "" {
			token = "anonymous"
		}

		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			userID = r.Header.Get("X-Session-ID")
		}
		// Dev convenience: allow anonymous fallback when explicitly enabled.
		if userID == "" && strings.ToLower(strings.TrimSpace(os.Getenv("ALLOW_ANON_USER"))) == "true" {
			userID = defaultUserID()
		}

		ctx := context.WithValue(r.Context(), userContextKey{}, UserContext{
			UserID: userID,
			Token:  token,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserContext retrieves user metadata from context
func GetUserContext(ctx context.Context) UserContext {
	if ctx == nil {
		return UserContext{}
	}
	if val, ok := ctx.Value(userContextKey{}).(UserContext); ok {
		return val
	}
	return UserContext{}
}

func parseBearerToken(header string) string {
	if header == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return strings.TrimSpace(header)
}

// defaultUserID returns the configured fallback user ID, or a stable dev default.
func defaultUserID() string {
	if val := strings.TrimSpace(os.Getenv("DEFAULT_USER_ID")); val != "" {
		return val
	}
	// Legacy default used by chat/session seeds and local runs.
	return "550e8400-e29b-41d4-a716-446655440000"
}
