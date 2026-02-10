//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"financial-chat-system/backend/internal/testutil"
)

// personResponse mirrors the Person JSON response from the API.
type personResponse struct {
	ID              string  `json:"id"`
	UserID          string  `json:"userId"`
	Name            string  `json:"name"`
	Gender          string  `json:"gender"`
	DateOfBirth     string  `json:"dateOfBirth"`
	ResidencyStatus string  `json:"residencyStatus"`
	PRGrantDate     *string `json:"prGrantDate,omitempty"`
	DisplayColor    *string `json:"displayColor,omitempty"`
	Relationship    string  `json:"relationship"`
	IsIncluded      bool    `json:"isIncluded"`
	IncomeCount     int     `json:"incomeCount,omitempty"`
	CPFCount        int     `json:"cpfCount,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
}

type paginatedPersonsResponse struct {
	Data   []personResponse `json:"data"`
	Count  int              `json:"count"`
	Limit  *int             `json:"limit"`
	Offset *int             `json:"offset"`
}

func parsePersonResponse(t *testing.T, resp *http.Response) personResponse {
	t.Helper()
	var person personResponse
	testutil.AssertOK(t, resp, &person)
	return person
}

func parsePersonsListResponse(t *testing.T, resp *http.Response) paginatedPersonsResponse {
	t.Helper()
	var result paginatedPersonsResponse
	testutil.AssertOK(t, resp, &result)
	return result
}

func createTestPerson(t *testing.T, ts *testutil.TestServer, name string) personResponse {
	t.Helper()
	resp := ts.Request("POST", "/api/v2/persons").
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"name":        name,
			"dateOfBirth": "1990-06-15",
			"gender":      "male",
		}).
		Do(t)
	return parsePersonResponse(t, resp)
}

// --------------------------------------------------------------------------
// 1. Full CRUD Lifecycle
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_CRUD_FullLifecycle(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// CREATE
	createPayload := map[string]interface{}{
		"name":            "Alice Tan",
		"dateOfBirth":     "1990-03-15",
		"gender":          "female",
		"residencyStatus": "citizen",
		"displayColor":    "#3b82f6",
		"relationship":    "self",
	}
	resp := ts.Request("POST", "/api/v2/persons").
		WithDefaultAuth().
		WithJSON(createPayload).
		Do(t)

	created := parsePersonResponse(t, resp)

	if created.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if created.Name != "Alice Tan" {
		t.Errorf("name = %q, want %q", created.Name, "Alice Tan")
	}
	if created.Gender != "female" {
		t.Errorf("gender = %q, want %q", created.Gender, "female")
	}
	if !created.IsIncluded {
		t.Error("expected isIncluded to default to true")
	}
	if created.Relationship != "self" {
		t.Errorf("relationship = %q, want %q", created.Relationship, "self")
	}
	if created.CreatedAt == "" || created.UpdatedAt == "" {
		t.Error("expected timestamps to be set")
	}

	personID := created.ID

	// GET
	resp = ts.Request("GET", "/api/v2/persons/"+personID).
		WithDefaultAuth().
		Do(t)

	fetched := parsePersonResponse(t, resp)
	if fetched.Name != "Alice Tan" {
		t.Errorf("GET name = %q, want %q", fetched.Name, "Alice Tan")
	}
	if fetched.Gender != "female" {
		t.Errorf("GET gender = %q, want %q", fetched.Gender, "female")
	}

	// UPDATE
	updatePayload := map[string]interface{}{
		"name":         "Alice Lim",
		"displayColor": "#10b981",
		"relationship": "spouse",
	}
	resp = ts.Request("PUT", "/api/v2/persons/"+personID).
		WithDefaultAuth().
		WithJSON(updatePayload).
		Do(t)

	updated := parsePersonResponse(t, resp)
	if updated.Name != "Alice Lim" {
		t.Errorf("updated name = %q, want %q", updated.Name, "Alice Lim")
	}
	if updated.Relationship != "spouse" {
		t.Errorf("updated relationship = %q, want %q", updated.Relationship, "spouse")
	}
	if updated.UpdatedAt == created.UpdatedAt {
		t.Error("expected updatedAt to change after update")
	}

	// LIST
	resp = ts.Request("GET", "/api/v2/persons").
		WithDefaultAuth().
		Do(t)

	listResult := parsePersonsListResponse(t, resp)
	if listResult.Count < 1 {
		t.Fatalf("expected at least 1 person in list, got %d", listResult.Count)
	}
	foundInList := false
	for _, p := range listResult.Data {
		if p.ID == personID {
			foundInList = true
			break
		}
	}
	if !foundInList {
		t.Error("created person not found in list response")
	}

	// TOGGLE OFF
	resp = ts.Request("PATCH", "/api/v2/persons/"+personID+"/toggle").
		WithDefaultAuth().
		Do(t)

	toggled := parsePersonResponse(t, resp)
	if toggled.IsIncluded {
		t.Error("expected isIncluded to be false after first toggle")
	}

	// TOGGLE BACK ON
	resp = ts.Request("PATCH", "/api/v2/persons/"+personID+"/toggle").
		WithDefaultAuth().
		Do(t)

	toggledBack := parsePersonResponse(t, resp)
	if !toggledBack.IsIncluded {
		t.Error("expected isIncluded to be true after second toggle")
	}

	// DELETE
	resp = ts.Request("DELETE", "/api/v2/persons/"+personID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNoContent(t, resp)

	// VERIFY DELETED
	resp = ts.Request("GET", "/api/v2/persons/"+personID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNotFound(t, resp)
}

// --------------------------------------------------------------------------
// 2. Create Validation (table-driven)
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_Create_Validation(t *testing.T) {
	ts := testutil.NewTestServer(t)

	validationCases := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
		bodyContains   string // optional: check response body contains this string
	}{
		{
			name:           "missing name",
			payload:        map[string]interface{}{"dateOfBirth": "1990-01-01", "gender": "male"},
			expectedStatus: http.StatusBadRequest,
			bodyContains:   "name",
		},
		{
			name:           "missing dateOfBirth",
			payload:        map[string]interface{}{"name": "Test", "gender": "male"},
			expectedStatus: http.StatusBadRequest,
			bodyContains:   "dateOfBirth",
		},
		{
			name:           "missing gender",
			payload:        map[string]interface{}{"name": "Test", "dateOfBirth": "1990-01-01"},
			expectedStatus: http.StatusBadRequest,
			bodyContains:   "gender",
		},
		{
			name:           "invalid gender value",
			payload:        map[string]interface{}{"name": "Test", "dateOfBirth": "1990-01-01", "gender": "unknown"},
			expectedStatus: http.StatusBadRequest,
			bodyContains:   "must be 'male' or 'female'",
		},
		{
			name:           "invalid dateOfBirth format",
			payload:        map[string]interface{}{"name": "Test", "dateOfBirth": "1990/01/01", "gender": "male"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "valid minimal payload defaults to citizen",
			payload:        map[string]interface{}{"name": "Minimal Valid", "dateOfBirth": "1990-01-01", "gender": "female"},
			expectedStatus: http.StatusOK,
		},
		{
			name: "valid PR with grant date",
			payload: map[string]interface{}{
				"name": "PR Person", "dateOfBirth": "1985-05-20", "gender": "male",
				"residencyStatus": "pr", "prGrantDate": "2020-01-01",
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range validationCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := ts.Request("POST", "/api/v2/persons").
				WithDefaultAuth().
				WithJSON(tc.payload).
				Do(t)

			if tc.expectedStatus == http.StatusOK {
				var person personResponse
				testutil.AssertOK(t, resp, &person)
				if person.ID == "" {
					t.Error("expected non-empty ID for valid create")
				}
			} else {
				testutil.AssertStatus(t, resp, tc.expectedStatus)
				if tc.bodyContains != "" {
					testutil.AssertBodyContains(t, resp, tc.bodyContains)
				}
			}
		})
	}
}

// --------------------------------------------------------------------------
// 3. Update Partial Fields
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_Update_PartialFields(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a base person
	created := createTestPerson(t, ts, "Update Target")

	// Update only name — other fields should be preserved
	resp := ts.Request("PUT", "/api/v2/persons/"+created.ID).
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"name": "Renamed Person",
		}).
		Do(t)

	updated := parsePersonResponse(t, resp)
	if updated.Name != "Renamed Person" {
		t.Errorf("name = %q, want %q", updated.Name, "Renamed Person")
	}
	if updated.Gender != created.Gender {
		t.Errorf("gender changed: got %q, want %q (preserved)", updated.Gender, created.Gender)
	}

	// Update gender from male to female
	resp = ts.Request("PUT", "/api/v2/persons/"+created.ID).
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"gender": "female",
		}).
		Do(t)

	updated2 := parsePersonResponse(t, resp)
	if updated2.Gender != "female" {
		t.Errorf("gender = %q, want %q", updated2.Gender, "female")
	}
	// Name should be preserved from last update
	if updated2.Name != "Renamed Person" {
		t.Errorf("name lost after gender update: got %q", updated2.Name)
	}

	// Update with invalid gender → 400
	resp = ts.Request("PUT", "/api/v2/persons/"+created.ID).
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"gender": "nonbinary",
		}).
		Do(t)
	testutil.AssertBadRequest(t, resp)

	// Update isIncluded via PUT
	isIncludedFalse := false
	resp = ts.Request("PUT", "/api/v2/persons/"+created.ID).
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"isIncluded": isIncludedFalse,
		}).
		Do(t)

	updated3 := parsePersonResponse(t, resp)
	if updated3.IsIncluded {
		t.Error("expected isIncluded to be false after PUT update")
	}
}

// --------------------------------------------------------------------------
// 4. List Pagination
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_List_Pagination(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create 5 persons
	for i := 0; i < 5; i++ {
		createTestPerson(t, ts, fmt.Sprintf("Pagination Person %d", i))
	}

	// Default list — all returned
	resp := ts.Request("GET", "/api/v2/persons").
		WithDefaultAuth().
		Do(t)

	allPersons := parsePersonsListResponse(t, resp)
	if allPersons.Count != 5 {
		t.Errorf("expected 5 persons, got %d", allPersons.Count)
	}

	// Limit=2
	resp = ts.Request("GET", "/api/v2/persons?limit=2").
		WithDefaultAuth().
		Do(t)

	page1 := parsePersonsListResponse(t, resp)
	if page1.Count != 2 {
		t.Errorf("limit=2: expected count=2, got %d", page1.Count)
	}
	if len(page1.Data) != 2 {
		t.Errorf("limit=2: expected 2 items in data, got %d", len(page1.Data))
	}

	// Limit=2, Offset=2
	resp = ts.Request("GET", "/api/v2/persons?limit=2&offset=2").
		WithDefaultAuth().
		Do(t)

	page2 := parsePersonsListResponse(t, resp)
	if len(page2.Data) != 2 {
		t.Errorf("limit=2&offset=2: expected 2 items, got %d", len(page2.Data))
	}

	// Beyond available data
	resp = ts.Request("GET", "/api/v2/persons?limit=2&offset=10").
		WithDefaultAuth().
		Do(t)

	empty := parsePersonsListResponse(t, resp)
	if len(empty.Data) != 0 {
		t.Errorf("offset beyond range: expected 0 items, got %d", len(empty.Data))
	}
}

// --------------------------------------------------------------------------
// 5. List With Stats (income/CPF counts)
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_List_WithStats(t *testing.T) {
	ts := testutil.NewTestServer(t)
	ctx := context.Background()

	// Create person A via API
	personA := createTestPerson(t, ts, "Person With Stats")

	// Create person B via API (no linked data)
	personB := createTestPerson(t, ts, "Person No Stats")

	// Insert 2 incomes linked to person A directly via SQL
	for i := 0; i < 2; i++ {
		_, err := ts.Pool.Exec(ctx, `
			INSERT INTO finance_incomes (user_id, name, amount, currency, category, growth_rate, type, cpf_wage_type, person_id, created_at, updated_at)
			VALUES ($1, $2, 5000, 'SGD', 'salary', 3.0, 'salary', 'ow', $3, NOW(), NOW())
		`, testutil.E2ETestUserID, fmt.Sprintf("Test Income %d", i), personA.ID)
		if err != nil {
			t.Fatalf("failed to insert income fixture: %v", err)
		}
	}

	// Insert 1 CPF account linked to person A
	_, err := ts.Pool.Exec(ctx, `
		INSERT INTO cpf_accounts (user_id, oa_balance, sa_balance, ma_balance, ra_balance, residency_status, person_id, created_at, updated_at)
		VALUES ($1, 50000, 30000, 20000, 0, 'citizen', $2, NOW(), NOW())
	`, testutil.E2ETestUserID, personA.ID)
	if err != nil {
		t.Fatalf("failed to insert CPF fixture: %v", err)
	}

	// List persons and verify stats
	resp := ts.Request("GET", "/api/v2/persons").
		WithDefaultAuth().
		Do(t)

	listResult := parsePersonsListResponse(t, resp)

	for _, person := range listResult.Data {
		if person.ID == personA.ID {
			if person.IncomeCount != 2 {
				t.Errorf("person A incomeCount = %d, want 2", person.IncomeCount)
			}
			if person.CPFCount != 1 {
				t.Errorf("person A cpfCount = %d, want 1", person.CPFCount)
			}
		}
		if person.ID == personB.ID {
			if person.IncomeCount != 0 {
				t.Errorf("person B incomeCount = %d, want 0", person.IncomeCount)
			}
			if person.CPFCount != 0 {
				t.Errorf("person B cpfCount = %d, want 0", person.CPFCount)
			}
		}
	}
}

// --------------------------------------------------------------------------
// 6. Delete Unlinks Related Records
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_Delete_UnlinksRelatedRecords(t *testing.T) {
	ts := testutil.NewTestServer(t)
	ctx := context.Background()

	// Create person
	person := createTestPerson(t, ts, "Person To Delete")

	// Insert income linked to person via SQL
	var incomeID string
	err := ts.Pool.QueryRow(ctx, `
		INSERT INTO finance_incomes (user_id, name, amount, currency, category, growth_rate, type, cpf_wage_type, person_id, created_at, updated_at)
		VALUES ($1, 'Linked Income', 5000, 'SGD', 'salary', 3.0, 'salary', 'ow', $2, NOW(), NOW())
		RETURNING id
	`, testutil.E2ETestUserID, person.ID).Scan(&incomeID)
	if err != nil {
		t.Fatalf("failed to insert income: %v", err)
	}

	// Delete person
	resp := ts.Request("DELETE", "/api/v2/persons/"+person.ID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNoContent(t, resp)

	// Verify income still exists but person_id is NULL
	var personIDAfterDelete *string
	err = ts.Pool.QueryRow(ctx,
		`SELECT person_id FROM finance_incomes WHERE id = $1`, incomeID,
	).Scan(&personIDAfterDelete)
	if err != nil {
		t.Fatalf("failed to query income after delete: %v", err)
	}
	if personIDAfterDelete != nil {
		t.Errorf("expected person_id to be NULL after person delete, got %q", *personIDAfterDelete)
	}

	// Verify person is gone
	resp = ts.Request("GET", "/api/v2/persons/"+person.ID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNotFound(t, resp)
}

// --------------------------------------------------------------------------
// 7. Not Found (table-driven)
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	notFoundCases := []struct {
		name   string
		method string
		path   string
	}{
		{"GET nonexistent", "GET", "/api/v2/persons/" + testutil.NonexistentUUID},
		{"PUT nonexistent", "PUT", "/api/v2/persons/" + testutil.NonexistentUUID},
		{"DELETE nonexistent", "DELETE", "/api/v2/persons/" + testutil.NonexistentUUID},
		{"TOGGLE nonexistent", "PATCH", "/api/v2/persons/" + testutil.NonexistentUUID + "/toggle"},
	}

	for _, tc := range notFoundCases {
		t.Run(tc.name, func(t *testing.T) {
			req := ts.Request(tc.method, tc.path).WithDefaultAuth()
			if tc.method == "PUT" {
				req = req.WithJSON(map[string]interface{}{"name": "ghost"})
			}
			resp := req.Do(t)
			testutil.AssertNotFound(t, resp)
		})
	}
}

// --------------------------------------------------------------------------
// 8. User Isolation
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_UserIsolation(t *testing.T) {
	ts := testutil.NewTestServer(t)

	otherUserID := "other-user-isolation-test-0001"

	// User A creates a person
	resp := ts.Request("POST", "/api/v2/persons").
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"name":        "User A Person",
			"dateOfBirth": "1985-01-01",
			"gender":      "male",
		}).
		Do(t)

	var personA personResponse
	testutil.AssertOK(t, resp, &personA)

	// User B tries to GET user A's person → 404
	resp = ts.Request("GET", "/api/v2/persons/"+personA.ID).
		WithAuth(otherUserID).
		Do(t)
	testutil.AssertNotFound(t, resp)

	// User B lists persons → empty
	resp = ts.Request("GET", "/api/v2/persons").
		WithAuth(otherUserID).
		Do(t)

	var userBList paginatedPersonsResponse
	testutil.AssertOK(t, resp, &userBList)
	if len(userBList.Data) != 0 {
		t.Errorf("user B should see 0 persons, got %d", len(userBList.Data))
	}

	// User B tries to DELETE user A's person → 404
	resp = ts.Request("DELETE", "/api/v2/persons/"+personA.ID).
		WithAuth(otherUserID).
		Do(t)
	testutil.AssertNotFound(t, resp)

	// User A can still see their person
	resp = ts.Request("GET", "/api/v2/persons").
		WithDefaultAuth().
		Do(t)

	var userAList paginatedPersonsResponse
	testutil.AssertOK(t, resp, &userAList)
	if len(userAList.Data) != 1 {
		t.Errorf("user A should see 1 person, got %d", len(userAList.Data))
	}
}

// --------------------------------------------------------------------------
// 9. Defaults
// --------------------------------------------------------------------------

func TestE2E_PersonsV2_Defaults(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create with minimal fields — no residencyStatus, no relationship, no displayColor
	resp := ts.Request("POST", "/api/v2/persons").
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"name":        "Minimal Person",
			"dateOfBirth": "2000-01-01",
			"gender":      "female",
		}).
		Do(t)

	person := parsePersonResponse(t, resp)

	if person.ResidencyStatus != "citizen" {
		t.Errorf("default residencyStatus = %q, want %q", person.ResidencyStatus, "citizen")
	}
	if person.Relationship != "self" {
		t.Errorf("default relationship = %q, want %q", person.Relationship, "self")
	}
	if person.DisplayColor != nil {
		t.Errorf("expected displayColor to be nil/omitted, got %v", *person.DisplayColor)
	}
	if !person.IsIncluded {
		t.Error("expected isIncluded to default to true")
	}

	// Verify JSON response includes proper fields
	resp2 := ts.Request("GET", "/api/v2/persons/"+person.ID).
		WithDefaultAuth().
		Do(t)

	body := make(map[string]interface{})
	if err := json.NewDecoder(resp2.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if _, ok := body["id"]; !ok {
		t.Error("response missing 'id' field")
	}
	if _, ok := body["createdAt"]; !ok {
		t.Error("response missing 'createdAt' field")
	}
}
