package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type userContextKey struct{}

// UserContext represents authenticated request metadata
type UserContext struct {
	UserID     string
	Token      string
	IsVerified bool // true if request was verified via HMAC signature from BFF
}

// Authenticate verifies HMAC-signed requests from the BFF and extracts user context
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		authToken := r.Header.Get("X-Auth-Token")

		var isVerified bool
		var verifyErr error

		// If we have both user ID and auth token, verify the HMAC signature
		if userID != "" && authToken != "" {
			isVerified, verifyErr = verifyBFFToken(authToken, userID)
			if verifyErr != nil {
				if !isDevMode() {
					// In production, reject invalid tokens
					log.Printf("Auth error: %v", verifyErr)
					http.Error(w, "Invalid authentication token", http.StatusUnauthorized)
					return
				}
				// In dev mode, log warning but continue
				log.Printf("Auth warning (dev mode): %v", verifyErr)
			}
		}

		// Fallback for legacy session-based auth (dev only)
		if userID == "" {
			userID = r.Header.Get("X-Session-ID")
		}

		// In production, require verified authentication for requests with user context
		if !isDevMode() && userID != "" && !isVerified {
			http.Error(w, "Request signature required", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey{}, UserContext{
			UserID:     userID,
			Token:      authToken,
			IsVerified: isVerified,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// verifyBFFToken verifies the HMAC-signed JWT from the Next.js BFF
func verifyBFFToken(tokenString, expectedUserID string) (bool, error) {
	secret := os.Getenv("BACKEND_SHARED_SECRET")
	if secret == "" {
		return false, fmt.Errorf("BACKEND_SHARED_SECRET not configured")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return false, fmt.Errorf("token parse error: %w", err)
	}

	if !token.Valid {
		return false, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false, fmt.Errorf("invalid claims format")
	}

	// Verify the subject (user ID) matches the header
	sub, ok := claims["sub"].(string)
	if !ok || sub != expectedUserID {
		return false, fmt.Errorf("user ID mismatch: token=%s, header=%s", sub, expectedUserID)
	}

	return true, nil
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

// RequireAuth middleware rejects requests without a verified user
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userCtx := GetUserContext(r.Context())

		if userCtx.UserID == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// In production, also require verification
		if !isDevMode() && !userCtx.IsVerified {
			http.Error(w, "Valid authentication required", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func isDevMode() bool {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	return env == "" || env == "development" || env == "dev"
}

