package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

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
// @Description Returns detailed monthly snapshots with all financial items, balances, and summaries. startYear and startMonth are required. If endYear/endMonth are not provided, returns only the single month specified by startYear/startMonth.
// @Tags Timeline V2
// @Produce json
// @Param startYear query int true "Start year (inclusive, required)" minimum(2000) maximum(2100)
// @Param startMonth query int true "Start month (1-12, inclusive, required)" minimum(1) maximum(12)
// @Param endYear query int false "End year (inclusive). Defaults to startYear if not provided." minimum(2000) maximum(2100)
// @Param endMonth query int false "End month (1-12, inclusive). Defaults to startMonth if not provided." minimum(1) maximum(12)
// @Success 200 {object} timeline_v2.TimelineV2Response
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/financial/timeline/snapshot [get]
func (h *TimelineV2Handler) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())

	var opts timeline_v2.TimelineOptions

	// Parse required startYear
	startYearStr := r.URL.Query().Get("startYear")
	if startYearStr == "" {
		badRequest(w, errors.New("startYear is required"))
		return
	}
	startYear, err := strconv.Atoi(startYearStr)
	if err != nil {
		badRequest(w, errors.New("startYear must be a valid integer"))
		return
	}
	opts.StartYear = startYear

	// Parse required startMonth
	startMonthStr := r.URL.Query().Get("startMonth")
	if startMonthStr == "" {
		badRequest(w, errors.New("startMonth is required"))
		return
	}
	startMonth, err := strconv.Atoi(startMonthStr)
	if err != nil || startMonth < 1 || startMonth > 12 {
		badRequest(w, errors.New("startMonth must be an integer between 1 and 12"))
		return
	}
	opts.StartMonth = startMonth

	// Default endYear/endMonth to startYear/startMonth (single month)
	opts.EndYear = opts.StartYear
	opts.EndMonth = opts.StartMonth

	// Parse optional endYear
	if v := r.URL.Query().Get("endYear"); v != "" {
		val, err := strconv.Atoi(v)
		if err != nil {
			badRequest(w, errors.New("endYear must be a valid integer"))
			return
		}
		opts.EndYear = val
	}

	// Parse optional endMonth
	if v := r.URL.Query().Get("endMonth"); v != "" {
		val, err := strconv.Atoi(v)
		if err != nil || val < 1 || val > 12 {
			badRequest(w, errors.New("endMonth must be an integer between 1 and 12"))
			return
		}
		opts.EndMonth = val
	}

	// Validate: end must be >= start
	startDate := time.Date(opts.StartYear, time.Month(opts.StartMonth), 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(opts.EndYear, time.Month(opts.EndMonth), 1, 0, 0, 0, 0, time.UTC)
	if endDate.Before(startDate) {
		badRequest(w, errors.New("end date must be after or equal to start date"))
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
