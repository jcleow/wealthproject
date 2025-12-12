package handlers

import (
	"errors"
	"net/http"
	"strconv"
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

// HandleGetSnapshot returns monthly financial snapshots with optional range filtering
// @Summary Get monthly financial snapshots (v2)
// @Description Returns detailed monthly snapshots with all financial items, balances, and summaries. Month indices are relative to the base year (current year). For example, relativeStartMonth=0 is January of current year, relativeStartMonth=12 is January of next year. The range is half-open: [relativeStartMonth, relativeEndMonth).
// @Tags Timeline V2
// @Produce json
// @Param relativeStartMonth query int false "Start month index relative to base year (0-indexed, inclusive). 0 = January of current year, 12 = January of next year." default(0) minimum(0) maximum(419)
// @Param relativeEndMonth query int false "End month index relative to base year (0-indexed, exclusive). Must be >= relativeStartMonth. 0 or omitted = 420 (35 years). Max 420." default(420) minimum(0) maximum(420)
// @Success 200 {object} timeline_v2.TimelineV2Response
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/financial/timeline/snapshot [get]
func (h *TimelineV2Handler) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())

	// Parse optional query params for range filtering
	opts := timeline_v2.TimelineOptions{}

	if startStr := r.URL.Query().Get("relativeStartMonth"); startStr != "" {
		start, err := strconv.Atoi(startStr)
		if err != nil {
			badRequest(w, errors.New("relativeStartMonth must be a valid integer"))
			return
		}
		opts.RelativeStartMonth = start
	}

	if endStr := r.URL.Query().Get("relativeEndMonth"); endStr != "" {
		end, err := strconv.Atoi(endStr)
		if err != nil {
			badRequest(w, errors.New("relativeEndMonth must be a valid integer"))
			return
		}
		opts.RelativeEndMonth = end
	}

	// Validate range: endMonth must be >= startMonth (when both are specified)
	if opts.RelativeEndMonth > 0 && opts.RelativeEndMonth < opts.RelativeStartMonth {
		badRequest(w, errors.New("relativeEndMonth must be greater than or equal to relativeStartMonth"))
		return
	}

	// Call service to compute financial snapshot
	response, err := h.svc.ComputeFinancialSnapshot(r.Context(), userCtx.UserID, opts)
	if err != nil {
		internalError(w, err)
		return
	}

	writeJSON(w, response)
}
