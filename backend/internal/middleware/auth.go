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
			userID = "00000000-0000-0000-0000-000000000000"
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
