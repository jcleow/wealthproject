package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	repo "financial-chat-system/backend/internal/financial_v2/repository"
)

// personV2CreateInput is the JSON-friendly input struct for creating a person.
type personV2CreateInput struct {
	Name            string  `json:"name"`
	DisplayColor    string  `json:"displayColor"`
	DateOfBirth     string  `json:"dateOfBirth"`     // Required, format: "2006-01-02"
	Gender          string  `json:"gender"`          // Required: 'male' or 'female' for CPF LIFE calculations
	ResidencyStatus string  `json:"residencyStatus"` // 'citizen' or 'pr' (PR year is computed from prGrantDate)
	PRGrantDate     *string `json:"prGrantDate"`     // Required if residencyStatus='pr', format: "2006-01-02"
	Relationship    string  `json:"relationship"`    // 'self', 'spouse', 'child', 'parent', 'sibling', 'other'
}

// personV2UpdateInput is the JSON-friendly input struct for updating a person.
type personV2UpdateInput struct {
	Name            string  `json:"name"`
	DisplayColor    string  `json:"displayColor"`
	IsIncluded      *bool   `json:"isIncluded"`
	DateOfBirth     *string `json:"dateOfBirth"`     // Optional for updates, format: "2006-01-02"
	Gender          string  `json:"gender"`          // Optional: 'male' or 'female'
	ResidencyStatus string  `json:"residencyStatus"` // 'citizen' or 'pr'
	PRGrantDate     *string `json:"prGrantDate"`     // Required if residencyStatus='pr', format: "2006-01-02"
	Relationship    string  `json:"relationship"`    // Optional: 'self', 'spouse', 'child', 'parent', 'sibling', 'other'
}

// PersonV2Handler serves person v2 endpoints.
type PersonV2Handler struct {
	store *repo.Store
}

// NewPersonV2Handler creates a new v2 person handler.
func NewPersonV2Handler(store *repo.Store) *PersonV2Handler {
	return &PersonV2Handler{
		store: store,
	}
}

// GET /api/v2/persons
// HandleList returns all persons for the user with income/CPF counts.
// @Summary List all persons (v2)
// @Description Returns all persons for the authenticated user with stats
// @Tags Persons V2
// @Produce json
// @Success 200 {array} repo.Person
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons [get]
func (h *PersonV2Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	persons, err := h.store.ListPersonsWithStats(r.Context(), userID)
	if err != nil {
		internalError(w, err)
		return
	}

	// Return empty array instead of null
	if persons == nil {
		persons = []repo.Person{}
	}

	jsonResponse(w, http.StatusOK, persons)
}

// POST /api/v2/persons
// HandleCreate creates a new person.
// @Summary Create a person (v2)
// @Description Creates a new person for the authenticated user
// @Tags Persons V2
// @Accept json
// @Produce json
// @Param person body personV2CreateInput true "Person data"
// @Success 200 {object} repo.Person
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons [post]
func (h *PersonV2Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input personV2CreateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	if input.Name == "" {
		badRequest(w, errMissingFields("name"))
		return
	}

	// Parse date of birth (required)
	if input.DateOfBirth == "" {
		badRequest(w, errMissingFields("dateOfBirth"))
		return
	}
	dob, err := time.Parse("2006-01-02", input.DateOfBirth)
	if err != nil {
		badRequest(w, err)
		return
	}

	// Parse optional PR grant date
	var prGrantDate *time.Time
	if input.PRGrantDate != nil && *input.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *input.PRGrantDate)
		if err == nil {
			prGrantDate = &t
		}
	}

	// Validate gender (required)
	if input.Gender == "" {
		badRequest(w, errMissingFields("gender"))
		return
	}
	if input.Gender != "male" && input.Gender != "female" {
		badRequest(w, errors.New("invalid gender: must be 'male' or 'female'"))
		return
	}

	// Default residency status to 'citizen' if not provided
	residencyStatus := input.ResidencyStatus
	if residencyStatus == "" {
		residencyStatus = "citizen"
	}

	person := repo.Person{
		Name:            input.Name,
		DateOfBirth:     dob,
		Gender:          input.Gender,
		ResidencyStatus: residencyStatus,
		PRGrantDate:     prGrantDate,
		Relationship:    input.Relationship,
	}
	if input.DisplayColor != "" {
		person.DisplayColor = &input.DisplayColor
	}

	created, err := h.store.CreatePerson(r.Context(), userID, person)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, created)
}

// GET /api/v2/persons/{id}
// HandleGet returns a single person by ID.
// @Summary Get a person (v2)
// @Description Returns a single person by ID
// @Tags Persons V2
// @Produce json
// @Param id path string true "Person ID"
// @Success 200 {object} repo.Person
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons/{id} [get]
func (h *PersonV2Handler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	person, err := h.store.GetPerson(r.Context(), userID, id)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, person)
}

// PUT /api/v2/persons/{id}
// HandleUpdate updates an existing person.
// @Summary Update a person (v2)
// @Description Updates an existing person
// @Tags Persons V2
// @Accept json
// @Produce json
// @Param id path string true "Person ID"
// @Param person body personV2UpdateInput true "Person data"
// @Success 200 {object} repo.Person
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons/{id} [put]
func (h *PersonV2Handler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var input personV2UpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		badRequest(w, err)
		return
	}

	// Get current person to preserve fields not being updated
	current, err := h.store.GetPerson(r.Context(), userID, id)
	if err == repo.ErrNotFound {
		notFound(w)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}

	// Parse optional date of birth
	var dob time.Time
	if input.DateOfBirth != nil && *input.DateOfBirth != "" {
		dob, err = time.Parse("2006-01-02", *input.DateOfBirth)
		if err != nil {
			badRequest(w, err)
			return
		}
	}

	// Parse optional PR grant date
	var prGrantDate *time.Time
	if input.PRGrantDate != nil && *input.PRGrantDate != "" {
		t, err := time.Parse("2006-01-02", *input.PRGrantDate)
		if err == nil {
			prGrantDate = &t
		}
	} else if input.PRGrantDate != nil && *input.PRGrantDate == "" {
		// Explicitly set to nil if empty string provided (to clear the value)
		prGrantDate = nil
	} else {
		// Preserve existing value if not provided
		prGrantDate = current.PRGrantDate
	}

	// Validate gender if provided
	gender := current.Gender
	if input.Gender != "" {
		if input.Gender != "male" && input.Gender != "female" {
			badRequest(w, errors.New("invalid gender: must be 'male' or 'female'"))
			return
		}
		gender = input.Gender
	}

	// Build updated person
	person := repo.Person{
		Name:            input.Name,
		IsIncluded:      current.IsIncluded,
		DateOfBirth:     dob,
		Gender:          gender,
		ResidencyStatus: input.ResidencyStatus,
		PRGrantDate:     prGrantDate,
		Relationship:    input.Relationship,
	}
	if input.DisplayColor != "" {
		person.DisplayColor = &input.DisplayColor
	}
	if input.IsIncluded != nil {
		person.IsIncluded = *input.IsIncluded
	}

	updated, err := h.store.UpdatePerson(r.Context(), userID, id, person)
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

// DELETE /api/v2/persons/{id}
// HandleDelete deletes a person. Linked incomes/CPF accounts will be unassigned.
// @Summary Delete a person (v2)
// @Description Deletes a person. Linked incomes/CPF accounts will have their person_id set to NULL.
// @Tags Persons V2
// @Param id path string true "Person ID"
// @Success 204 "No Content"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons/{id} [delete]
func (h *PersonV2Handler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	err := h.store.DeletePerson(r.Context(), userID, id)
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

// PATCH /api/v2/persons/{id}/toggle
// HandleToggle toggles the is_included flag for a person.
// @Summary Toggle person inclusion (v2)
// @Description Toggles the is_included flag for a person
// @Tags Persons V2
// @Produce json
// @Param id path string true "Person ID"
// @Success 200 {object} repo.Person
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Security SessionID
// @Security AuthToken
// @Router /v2/persons/{id}/toggle [patch]
func (h *PersonV2Handler) HandleToggle(w http.ResponseWriter, r *http.Request, id string) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	updated, err := h.store.TogglePersonIncluded(r.Context(), userID, id)
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
