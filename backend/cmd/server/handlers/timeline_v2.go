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

// GET /api/v2/financial/timeline/chart
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
// @Router /v2/financial/timeline/chart [get]
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

// GET /api/v2/financial/timeline/snapshot
// HandleGetSnapshot returns monthly financial snapshots with optional range filtering
// @Summary Get monthly financial snapshots (v2)
// @Description Returns detailed monthly snapshots with all financial items, balances, and summaries. startDate is required (DD-MM-YYYY format). If endDate is not provided, returns only items matching startDate.
// @Tags Timeline V2
// @Produce json
// @Param startDate query string true "Start date (DD-MM-YYYY, required)"
// @Param endDate query string false "End date (DD-MM-YYYY). Defaults to startDate if not provided."
// @Param includeScenarios query bool false "Include scenario impacts in adjBalance/adjAmount (default: false)"
// @Success 200 {object} timeline_v2.TimelineV2Response
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/financial/timeline/snapshot [get]
func (h *TimelineV2Handler) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())

	// Parse required startDate
	startDate, err := queryDate(r, "startDate")
	if err != nil {
		badRequest(w, err)
		return
	}

	// Parse optional endDate (defaults to startDate)
	endDate, err := queryDateOpt(r, "endDate", startDate)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Validate: end must be >= start
	if endDate.Before(startDate) {
		badRequest(w, errors.New("endDate must be after or equal to startDate"))
		return
	}

	// Parse optional includeScenarios flag
	includeScenarios := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("includeScenarios"))) == "true"

	opts := timeline_v2.TimelineOptions{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeScenarios: includeScenarios,
	}

	// Call service to compute financial snapshot
	response, err := h.svc.ComputeFinancialSnapshot(r.Context(), userCtx.UserID, opts)
	if err != nil {
		internalError(w, err)
		return
	}

	writeJSON(w, response)
}
