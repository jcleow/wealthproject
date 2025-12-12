package handlers

import (
	"errors"
	"net/http"
	"strings"

	timeline_v2 "financial-chat-system/backend/internal/financial_v2/timeline"
	"financial-chat-system/backend/internal/middleware"
)

// TimelineV2Handler serves financial timeline v2 endpoints.
type TimelineV2Handler struct {
	svc *timeline_v2.Service
}

// NewTimelineV2Handler constructs a timeline v2 handler.
func NewTimelineV2Handler(svc *timeline_v2.Service) *TimelineV2Handler {
	return &TimelineV2Handler{svc: svc}
}

// HandleGetTimelineChart returns the timeline chart data (summary only)
// @Summary Get financial timeline chart (v2)
// @Description Returns the simplified financial timeline chart with net worth projections
// @Tags Timeline V2
// @Produce json
// @Param resolution query string false "Resolution (yearly or monthly)" default(yearly)
// @Success 200 {object} timeline_v2.TimelineAnnualChartResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /api/v2/financial/timeline/chart [get]
func (h *TimelineV2Handler) HandleGetTimelineChart(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	resolution := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("resolution")))
	if resolution == "" {
		resolution = "yearly" // Default
	}
	if resolution != "yearly" && resolution != "monthly" {
		badRequest(w, errors.New("resolution must be 'yearly' or 'monthly'"))
		return
	}

	// Get user ID from context (set by middleware)
	userCtx := middleware.GetUserContext(r.Context())

	// Call service method
	resp, err := h.svc.GetTimeline(r.Context(), userCtx.UserID, resolution)
	if err != nil {
		internalError(w, err)
		return
	}

	// Return JSON response
	writeJSON(w, resp)
}
