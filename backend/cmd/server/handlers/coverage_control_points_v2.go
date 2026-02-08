package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// controlPointInput is the JSON-friendly input for creating/updating a coverage control point.
type controlPointInput struct {
	PersonID         string  `json:"personId"`
	Age              int     `json:"age"`
	LifeTpd          *string `json:"lifeTpd"`
	CriticalIllness  *string `json:"criticalIllness"`
	PersonalAccident *string `json:"personalAccident"`
	Reason           *string `json:"reason"`
}

// controlPointBulkInput is the JSON input for bulk upsert of control points.
type controlPointBulkInput struct {
	PersonID string              `json:"personId"`
	Points   []controlPointInput `json:"points"`
}

// toControlPoint converts input to a repository CoverageControlPoint struct.
func (input *controlPointInput) toControlPoint() (repo.CoverageControlPoint, error) {
	lifeTpd, err := parseOptionalDecimal(input.LifeTpd)
	if err != nil {
		return repo.CoverageControlPoint{}, err
	}
	criticalIllness, err := parseOptionalDecimal(input.CriticalIllness)
	if err != nil {
		return repo.CoverageControlPoint{}, err
	}
	personalAccident, err := parseOptionalDecimal(input.PersonalAccident)
	if err != nil {
		return repo.CoverageControlPoint{}, err
	}

	return repo.CoverageControlPoint{
		PersonID:         input.PersonID,
		Age:              input.Age,
		LifeTpd:          lifeTpd,
		CriticalIllness:  criticalIllness,
		PersonalAccident: personalAccident,
		Reason:           input.Reason,
	}, nil
}

// CoverageControlPointV2Handler serves coverage control point v2 endpoints.
type CoverageControlPointV2Handler struct {
	store *repo.Store
}

// NewCoverageControlPointV2Handler creates a new coverage control point handler.
func NewCoverageControlPointV2Handler(store *repo.Store) *CoverageControlPointV2Handler {
	return &CoverageControlPointV2Handler{store: store}
}

// HandleList returns all coverage control points for the user.
func (h *CoverageControlPointV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var personID *string
	if pid := r.URL.Query().Get("personId"); pid != "" {
		personID = &pid
	}

	points, err := h.store.ListCoverageControlPoints(r.Context(), userID, personID)
	if err != nil {
		log.Printf("coverageControlPoints.List error: %v", err)
		internalError(w, err)
		return
	}

	if points == nil {
		points = []repo.CoverageControlPoint{}
	}

	jsonResponse(w, http.StatusOK, points)
}

// HandleCreate creates a new coverage control point.
func (h *CoverageControlPointV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input controlPointInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.PersonID == "" {
		badRequest(w, errMissingFields("personId"))
		return
	}

	point, err := input.toControlPoint()
	if err != nil {
		badRequest(w, err)
		return
	}

	created, err := h.store.CreateCoverageControlPoint(r.Context(), userID, point)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, created)
}

// HandleUpdate updates an existing coverage control point.
func (h *CoverageControlPointV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input controlPointInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	point, err := input.toControlPoint()
	if err != nil {
		badRequest(w, err)
		return
	}

	updated, err := h.store.UpdateCoverageControlPoint(r.Context(), userID, id, point)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, updated)
}

// HandleDelete deletes a single coverage control point.
func (h *CoverageControlPointV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeleteCoverageControlPoint(r.Context(), userID, id)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleBulkUpsert replaces all control points for a person.
func (h *CoverageControlPointV2Handler) HandleBulkUpsert(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input controlPointBulkInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.PersonID == "" {
		badRequest(w, errMissingFields("personId"))
		return
	}

	var points []repo.CoverageControlPoint
	for _, pointInput := range input.Points {
		pointInput.PersonID = input.PersonID
		point, err := pointInput.toControlPoint()
		if err != nil {
			badRequest(w, err)
			return
		}
		points = append(points, point)
	}

	results, err := h.store.BulkUpsertCoverageControlPoints(r.Context(), userID, input.PersonID, points)
	if err != nil {
		internalError(w, err)
		return
	}

	if results == nil {
		results = []repo.CoverageControlPoint{}
	}

	jsonResponse(w, http.StatusOK, results)
}

// HandleDeleteByPerson deletes all control points for a specific person.
func (h *CoverageControlPointV2Handler) HandleDeleteByPerson(w http.ResponseWriter, r *http.Request, personID string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	count, err := h.store.DeleteCoverageControlPointsByPerson(r.Context(), userID, personID)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]int64{"deleted": count})
}
