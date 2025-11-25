package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

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

// NewTimelineHandler constructs a timeline handler.
func NewTimelineHandler(svc *timeline.Service) *TimelineHandler {
	return &TimelineHandler{svc: svc}
}

// NewGrowthHandler constructs a growth handler.
func NewGrowthHandler(svc *timeline.Service) *GrowthHandler {
	return &GrowthHandler{svc: svc}
}

// HandleGetTimeline returns the full 0..20 timeline.
func (h *TimelineHandler) HandleGetTimeline(w http.ResponseWriter, r *http.Request) {
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

	var resp timeline.TimelineResponse
	var err error
	if includeScenarios && userCtx.UserID != "" {
		resp, err = h.svc.GetTimelineWithScenarios(r.Context(), userCtx.UserID, true, selected)
	} else {
		resp, err = h.svc.GetTimeline(r.Context())
	}
	if err != nil {
		internalError(w)
		return
	}
	writeJSON(w, resp)
}

// HandleUpsertYear upserts overrides/new items for a given year and returns refreshed timeline.
func (h *TimelineHandler) HandleUpsertYear(w http.ResponseWriter, r *http.Request) {
	yearStr := mux.Vars(r)["year"]
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		badRequest(w, errMissingFields("year must be an integer"))
		return
	}

	var payload struct {
		Year  int                    `json:"year"`
		Edits []timeline.EditRequest `json:"edits"`
		Note  string                 `json:"note,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		badRequest(w, err)
		return
	}
	if payload.Year != 0 && payload.Year != year {
		badRequest(w, errMissingFields("path year must match body year"))
		return
	}
	if len(payload.Edits) == 0 {
		badRequest(w, errMissingFields("edits"))
		return
	}

	for i := range payload.Edits {
		payload.Edits[i].Frequency = timeline.Frequency(strings.ToLower(string(payload.Edits[i].Frequency)))
	}

	resp, err := h.svc.UpsertYear(r.Context(), year, payload.Edits)
	if err != nil {
		if err.Error() == "year must be between 0 and 20" {
			badRequest(w, err)
			return
		}
		if errorsIsNotFound(err) {
			notFound(w)
			return
		}
		badRequest(w, err)
		return
	}
	writeJSON(w, resp)
}

// HandleGetGrowth returns growth config.
func (h *GrowthHandler) HandleGetGrowth(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.svc.GetGrowthConfig(r.Context())
	if err != nil {
		internalError(w)
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
