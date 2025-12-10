package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/timeline"
	"financial-chat-system/backend/internal/middleware"

	"github.com/gorilla/mux"
)

// TimelineHandler serves financial timeline endpoints.
type TimelineHandler struct {
	svc *timeline.Service
}

// GrowthHandler serves growth config endpoints.
type GrowthHandler struct {
	svc *timeline.Service
}

// SettingsHandler serves user settings endpoints.
type SettingsHandler struct {
	svc *timeline.Service
}

// NewTimelineHandler constructs a timeline handler.
func NewTimelineHandler(svc *timeline.Service) *TimelineHandler {
	return &TimelineHandler{svc: svc}
}

// NewGrowthHandler constructs a growth handler.
func NewGrowthHandler(svc *timeline.Service) *GrowthHandler {
	return &GrowthHandler{svc: svc}
}

// NewSettingsHandler constructs a settings handler.
func NewSettingsHandler(svc *timeline.Service) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

// HandleGetTimeline returns the full timeline with optional resolution override.
// @Summary Get financial timeline
// @Description Returns the full financial timeline with optional resolution and scenario filtering
// @Tags Timeline
// @Produce json
// @Param resolution query string false "Resolution override (yearly or monthly)"
// @Param include_scenarios query boolean false "Include scenario impacts"
// @Param scenario_ids query string false "Comma-separated list of scenario IDs"
// @Success 200 {object} timeline.TimelineResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /financial/timeline [get]
func (h *TimelineHandler) HandleGetTimeline(w http.ResponseWriter, r *http.Request) {
	// Parse optional resolution override
	resolution := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("resolution")))
	if resolution != "" && resolution != "yearly" && resolution != "monthly" {
		badRequest(w, errors.New("resolution must be 'yearly' or 'monthly'"))
		return
	}

	includeScenarios := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("include_scenarios"))) == "true"
	var selected []string
	if raw := strings.TrimSpace(r.URL.Query().Get("scenario_ids")); raw != "" {
		for _, id := range strings.Split(raw, ",") {
			id = strings.TrimSpace(id)
			if id != "" {
				selected = append(selected, id)
			}
		}
	}
	userCtx := middleware.GetUserContext(r.Context())

	// Build TimelineOptions from query parameters
	opts := timeline.TimelineOptions{
		Resolution:       resolution,
		IncludeScenarios: includeScenarios,
		SelectedIDs:      selected,
	}

	log.Printf("[Timeline] Request: resolution='%s', includeScenarios=%v, selectedIDs=%v, userID='%s'",
		opts.Resolution, opts.IncludeScenarios, opts.SelectedIDs, userCtx.UserID)

	resp, err := h.svc.GetTimeline(r.Context(), opts)
	if err != nil {
		log.Printf("[Timeline] GetTimeline error: %v", err)
		internalError(w, err)
		return
	}

	// DEBUG: Log first year's data
	if len(resp.Years) > 0 {
		year0 := resp.Years[0]
		log.Printf("[Timeline] Year 0 (Year=%d): Assets=%d, Liabilities=%d, Income=%d, Expenses=%d",
			year0.Year, len(year0.Assets), len(year0.Liabilities), len(year0.Income), len(year0.Expenses))
	}

	writeJSON(w, resp)
}

// HandleUpsertYear upserts overrides/new items for a given year and returns refreshed timeline.
// @Summary Update financial data for a specific year
// @Description Upserts financial data edits for a given year
// @Tags Timeline
// @Accept json
// @Produce json
// @Param year path int true "Year (absolute)"
// @Param body body map[string]interface{} true "Year edits"
// @Success 200 {object} timeline.TimelineResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /financial/timeline/{year} [put]
func (h *TimelineHandler) HandleUpsertYear(w http.ResponseWriter, r *http.Request) {
	yearStr := mux.Vars(r)["year"]
	absoluteYear, err := strconv.Atoi(yearStr)
	if err != nil {
		badRequest(w, errMissingFields("year must be an integer"))
		return
	}

	// Convert absolute year to relative year (offset from current year)
	// Frontend sends absolute year (e.g., 2025), backend expects relative (e.g., 0)
	baseYear := time.Now().Year()
	year := absoluteYear - baseYear

	log.Printf("[HandleUpsertYear] Absolute year: %d, Base year: %d, Relative year: %d", absoluteYear, baseYear, year)

	var payload struct {
		Year  int                    `json:"year"`
		Edits []timeline.EditRequest `json:"edits"`
		Note  string                 `json:"note,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("[HandleUpsertYear] JSON decode error: %v", err)
		badRequest(w, err)
		return
	}
	log.Printf("[HandleUpsertYear] Received payload: Year=%d (path=%d), Edits count=%d", payload.Year, year, len(payload.Edits))
	// Allow payload.Year to be either 0 (not set), relative year, or absolute year
	if payload.Year != 0 && payload.Year != year && payload.Year != absoluteYear {
		log.Printf("[HandleUpsertYear] Year mismatch: payload.Year=%d, path relative year=%d, path absolute year=%d", payload.Year, year, absoluteYear)
		badRequest(w, errMissingFields("path year must match body year"))
		return
	}
	if len(payload.Edits) == 0 {
		log.Printf("[HandleUpsertYear] No edits provided")
		badRequest(w, errMissingFields("edits"))
		return
	}

	for i := range payload.Edits {
		payload.Edits[i].Frequency = timeline.Frequency(strings.ToLower(string(payload.Edits[i].Frequency)))
	}

	resp, err := h.svc.UpsertYear(r.Context(), year, payload.Edits)
	if err != nil {
		log.Printf("[HandleUpsertYear] UpsertYear error: %v", err)
		if errorsIsNotFound(err) {
			notFound(w)
			return
		}
		// Handle validation errors (including year out of range) as bad requests
		badRequest(w, err)
		return
	}
	writeJSON(w, resp)
}

// HandleGetGrowth returns growth config.
func (h *GrowthHandler) HandleGetGrowth(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.svc.GetGrowthConfig(r.Context())
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, map[string]interface{}{
		"growth":  cfg,
		"version": "v1",
	})
}

// HandlePutGrowth updates growth config.
func (h *GrowthHandler) HandlePutGrowth(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Growth []repository.GrowthConfig `json:"growth"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if len(payload.Growth) == 0 {
		badRequest(w, errMissingFields("growth"))
		return
	}

	for i := range payload.Growth {
		payload.Growth[i].Category = strings.ToLower(payload.Growth[i].Category)
	}

	cfg, err := h.svc.UpdateGrowthConfig(r.Context(), payload.Growth)
	if err != nil {
		badRequest(w, err)
		return
	}
	writeJSON(w, map[string]interface{}{
		"growth":  cfg,
		"version": "v1",
	})
}

func errorsIsNotFound(err error) bool {
	return errors.Is(err, repository.ErrNotFound)
}

// HandleGetSettings returns user settings.
func (h *SettingsHandler) HandleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.svc.GetUserSettings(r.Context())
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, settings)
}

// HandlePutSettings updates user settings.
func (h *SettingsHandler) HandlePutSettings(w http.ResponseWriter, r *http.Request) {
	var payload repository.UserSettings
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}

	settings, err := h.svc.UpdateUserSettings(r.Context(), payload)
	if err != nil {
		badRequest(w, err)
		return
	}
	writeJSON(w, settings)
}
