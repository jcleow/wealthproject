package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// DevHandler provides development-only endpoints
type DevHandler struct{}

// NewDevHandler creates a new dev handler
func NewDevHandler() *DevHandler {
	return &DevHandler{}
}

// isDevMode checks if the server is running in development mode
func isDevMode() bool {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	return env == "" || env == "development" || env == "dev"
}

// TokenResponse is returned by the dev token endpoint
type TokenResponse struct {
	Token   string `json:"token"`
	UserID  string `json:"userId"`
	Expires string `json:"expires"`
	Usage   string `json:"usage"`
}

// HandleDevToken generates a signed JWT for a given user ID (dev only)
// @Summary Generate dev auth token
// @Description Generates a signed JWT for testing. Only available in development mode.
// @Tags Dev
// @Produce json
// @Param user_id query string true "User ID to generate token for"
// @Success 200 {object} TokenResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} nil
// @Router /dev/token [get]
func (h *DevHandler) HandleDevToken(w http.ResponseWriter, r *http.Request) {
	// Block in production
	if !isDevMode() {
		http.NotFound(w, r)
		return
	}

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "user_id query parameter is required",
			"usage": "GET /api/dev/token?user_id=<uuid>",
		})
		return
	}

	secret := os.Getenv("BACKEND_SHARED_SECRET")
	if secret == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "BACKEND_SHARED_SECRET not configured",
		})
		return
	}

	// Create JWT with same structure as the BFF
	now := time.Now()
	expires := now.Add(5 * time.Minute)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"iat": now.Unix(),
		"exp": expires.Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to sign token",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TokenResponse{
		Token:   tokenString,
		UserID:  userID,
		Expires: expires.Format(time.RFC3339),
		Usage:   `curl -H "X-Auth-Token: ` + tokenString + `" http://localhost:8080/api/v2/cash-accounts`,
	})
}
