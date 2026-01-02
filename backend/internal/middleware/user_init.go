package middleware

import (
	"context"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// UserInitializer ensures user has required financial setup on first request
type UserInitializer struct {
	store *repository.Store
}

// NewUserInitializer creates a new user initializer middleware
func NewUserInitializer(store *repository.Store) *UserInitializer {
	return &UserInitializer{store: store}
}

// EnsureFinancialSetup middleware checks if user has cash accumulator and creates it if missing
func (ui *UserInitializer) EnsureFinancialSetup(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userCtx := GetUserContext(r.Context())
		if userCtx.UserID == "" {
			// No user context, skip initialization
			next.ServeHTTP(w, r)
			return
		}

		// Check if user has cash accumulator account
		if err := ui.ensureCashAccumulator(r.Context(), userCtx.UserID); err != nil {
			log.Printf("[UserInit] Failed to ensure cash accumulator for user %s: %v", userCtx.UserID, err)
			// Don't fail the request, just log and continue
		}

		next.ServeHTTP(w, r)
	})
}

// firstOfMonth returns the first day of the month in UTC for a given date.
func firstOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}

func (ui *UserInitializer) ensureCashAccumulator(ctx context.Context, userID string) error {
	// Check if accumulator already exists
	_, err := ui.store.GetAccumulatorAccount(ctx, userID)
	if err == nil {
		// Accumulator exists, nothing to do
		return nil
	}

	// Normalize start date to first of current month to avoid timeline anchor issues
	now := time.Now().UTC()
	startDate := firstOfMonth(now)

	// Create default cash accumulator account
	_, err = ui.store.CreateCashAccount(ctx, repository.CashAccount{
		UserID:        userID,
		Name:          "Cash",
		Balance:       0,
		InterestRate:  1.5,
		IsAccumulator: true,
		StartDate:     startDate,
		StartYear:     now.Year(),
	})
	if err != nil {
		return err
	}

	log.Printf("[UserInit] Created default cash accumulator for user: %s", userID)
	return nil
}
