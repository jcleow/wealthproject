package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"github.com/golang-jwt/jwt/v5"
)

type userContextKey struct{}

var (
	// Cache of users who have been initialized (cash accumulator created)
	initializedUsers sync.Map
	// Store reference for creating cash accounts
	finStore *repository.Store
)

// SetFinancialStore sets the repository store for user initialization
func SetFinancialStore(store *repository.Store) {
	finStore = store
}

// UserContext represents authenticated request metadata
type UserContext struct {
	UserID     string
	Token      string
	IsVerified bool // true if request was verified via HMAC signature from BFF
}

// Authenticate verifies HMAC-signed requests from the BFF and extracts user context
// It also ensures new users have a cash accumulator account created (onboarding)
func Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authToken := r.Header.Get("X-Auth-Token")

		var userID string
		var isVerified bool

		// Extract user ID from JWT if auth token is present
		if authToken != "" {
			var verifyErr error
			userID, isVerified, verifyErr = verifyBFFToken(authToken)
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

		// Ensure user has cash accumulator account (onboarding)
		if userID != "" && finStore != nil {
			ensureCashAccumulator(r.Context(), userID)
		}

		ctx := context.WithValue(r.Context(), userContextKey{}, UserContext{
			UserID:     userID,
			Token:      authToken,
			IsVerified: isVerified,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ensureCashAccumulator creates a default cash accumulator for new users (cached)
func ensureCashAccumulator(ctx context.Context, userID string) {
	// Check cache first - avoid DB query if already initialized
	if _, exists := initializedUsers.Load(userID); exists {
		return
	}

	// Check if accumulator exists in database
	_, err := finStore.GetAccumulatorAccount(ctx, userID)
	if err == nil {
		// Accumulator exists, cache and return
		initializedUsers.Store(userID, true)
		return
	}

	// Create default cash accumulator account (onboarding)
	_, err = finStore.CreateCashAccount(ctx, repository.CashAccount{
		UserID:        userID,
		Name:          "Cash",
		Balance:       0,
		InterestRate:  1.5,
		IsAccumulator: true,
		StartYear:     time.Now().Year(),
	})
	if err != nil {
		log.Printf("[Auth] Failed to create cash accumulator for user %s: %v", userID, err)
		return
	}

	log.Printf("[Auth] Created cash accumulator for new user: %s", userID)
	initializedUsers.Store(userID, true)
}

// verifyBFFToken verifies the HMAC-signed JWT from the Next.js BFF and extracts the user ID
func verifyBFFToken(tokenString string) (userID string, verified bool, err error) {
	secret := os.Getenv("BACKEND_SHARED_SECRET")
	if secret == "" {
		return "", false, fmt.Errorf("BACKEND_SHARED_SECRET not configured")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return "", false, fmt.Errorf("token parse error: %w", err)
	}

	if !token.Valid {
		return "", false, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", false, fmt.Errorf("invalid claims format")
	}

	// Extract user ID from the subject claim
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", false, fmt.Errorf("missing or empty sub claim")
	}

	return sub, true, nil
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

// WithUserContext returns a new context with the given UserContext set.
// This is primarily useful for testing.
func WithUserContext(ctx context.Context, uc UserContext) context.Context {
	return context.WithValue(ctx, userContextKey{}, uc)
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

