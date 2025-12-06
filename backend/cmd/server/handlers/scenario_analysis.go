package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"financial-chat-system/backend/internal/financial/timeline"
	"financial-chat-system/backend/internal/middleware"
)

type scenarioAnalysisTimeline interface {
	GetTimeline(ctx context.Context, opts timeline.TimelineOptions) (timeline.TimelineResponse, error)
}

// ScenarioAnalysisHandler serves /scenario-analysis for baseline vs scenario comparisons.
type ScenarioAnalysisHandler struct {
	timeline scenarioAnalysisTimeline
}

func NewScenarioAnalysisHandler(tl scenarioAnalysisTimeline) *ScenarioAnalysisHandler {
	return &ScenarioAnalysisHandler{timeline: tl}
}

type scenarioAnalysisRequest struct {
	ScenarioIDs []string `json:"scenario_ids,omitempty"`
}

type scenarioAnalysisResponse struct {
	Baseline timeline.TimelineResponse `json:"baseline"`
	Scenario timeline.TimelineResponse `json:"scenario"`
}

func (h *ScenarioAnalysisHandler) Handle(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserContext(r.Context())
	if strings.TrimSpace(userCtx.UserID) == "" {
		badRequest(w, errMissingFields("user context"))
		return
	}

	var payload scenarioAnalysisRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&payload) // tolerate empty body
	}

	// Get baseline timeline (no scenarios)
	baseline, err := h.timeline.GetTimeline(r.Context(), timeline.TimelineOptions{})
	if err != nil {
		internalError(w)
		return
	}

	// Get timeline with scenarios applied
	scResp, err := h.timeline.GetTimeline(r.Context(), timeline.TimelineOptions{
		IncludeScenarios: true,
		SelectedIDs:      payload.ScenarioIDs,
	})
	if err != nil {
		internalError(w)
		return
	}

	writeJSON(w, scenarioAnalysisResponse{
		Baseline: baseline,
		Scenario: scResp,
	})
}
