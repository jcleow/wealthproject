package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	startTime time.Time
}

// NewHealthHandler creates a new health handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{
		startTime: time.Now(),
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Uptime    string                 `json:"uptime"`
	Version   string                 `json:"version"`
	Services  map[string]interface{} `json:"services"`
}

// HandleHealth returns the health status of the application
// @Summary Health check
// @Description Get the health status of the application
// @Tags Health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /v1/health [get]
func (h *HealthHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(h.startTime)

	// Check financial tools registry
	registry := financial.GetRegistry()
	registryStats := registry.GetStats()

	services := map[string]interface{}{
		"financial_tools": map[string]interface{}{
			"status":      "healthy",
			"total_tools": registryStats.TotalTools,
			"tool_names":  registryStats.ToolNames,
		},
		"database": map[string]interface{}{
			"status": "healthy", // TODO: Add real database health check in B8
		},
		"llm_providers": map[string]interface{}{
			"openai": map[string]string{
				"status": "configured", // TODO: Add real provider health checks
			},
		},
	}

	response := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Uptime:    uptime.String(),
		Version:   "v1.0.0-dev",
		Services:  services,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// HandleTools returns the available financial tools
// @Summary Get available financial tools
// @Description Returns a list of all available financial tools and their metadata
// @Tags Health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /v1/tools [get]
func (h *HealthHandler) HandleTools(w http.ResponseWriter, r *http.Request) {
	registry := financial.GetRegistry()
	tools := registry.GetTools()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"tools":      tools,
		"total":      len(tools),
		"categories": registry.GetStats().CategoryCounts,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
