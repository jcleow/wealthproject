//go:build e2e
// +build e2e

package e2e

import (
	"net/http"
	"testing"

	"financial-chat-system/backend/internal/testutil"
)

// insurancePolicyResponse mirrors the InsurancePolicy JSON response.
type insurancePolicyResponse struct {
	ID               string  `json:"id"`
	UserID           string  `json:"userId"`
	PersonID         *string `json:"personId,omitempty"`
	PersonName       string  `json:"personName,omitempty"`
	Name             string  `json:"name"`
	Category         string  `json:"category"`
	CoverageAmount   string  `json:"coverageAmount"`
	PremiumAmount    string  `json:"premiumAmount"`
	PremiumFrequency string  `json:"premiumFrequency"`
	StartDate        string  `json:"startDate"`
	IsActive         bool    `json:"isActive"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type paginatedPoliciesResponse struct {
	Data   []insurancePolicyResponse `json:"data"`
	Count  int                       `json:"count"`
	Limit  *int                      `json:"limit"`
	Offset *int                      `json:"offset"`
}

func parsePolicyResponse(t *testing.T, resp *http.Response) insurancePolicyResponse {
	t.Helper()
	var policy insurancePolicyResponse
	testutil.AssertOK(t, resp, &policy)
	return policy
}

func parsePoliciesListResponse(t *testing.T, resp *http.Response) paginatedPoliciesResponse {
	t.Helper()
	var result paginatedPoliciesResponse
	testutil.AssertOK(t, resp, &result)
	return result
}

// TestInsurancePolicyCRUD exercises the full insurance policy lifecycle:
// create person → create policy → list → get → update → delete → verify 404
func TestInsurancePolicyCRUD(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Step 1: Create a person (needed as FK for insurance policies)
	person := createTestPerson(t, ts, "Insurance Test Person")

	// Step 2: Create an insurance policy linked to the person
	createPayload := map[string]interface{}{
		"personId":         person.ID,
		"name":             "Term Life 30",
		"category":         "life",
		"coverageAmount":   "500000",
		"premiumAmount":    "150",
		"premiumFrequency": "monthly",
		"startDate":        "2024-01-01",
		"insurerName":      "Great Eastern",
		"policyNumber":     "TL-2024-001",
	}
	resp := ts.Request("POST", "/api/v2/insurance/policies").
		WithDefaultAuth().
		WithJSON(createPayload).
		Do(t)

	created := parsePolicyResponse(t, resp)

	if created.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if created.Name != "Term Life 30" {
		t.Errorf("name = %q, want %q", created.Name, "Term Life 30")
	}
	if created.Category != "life" {
		t.Errorf("category = %q, want %q", created.Category, "life")
	}
	if !created.IsActive {
		t.Error("expected isActive to default to true")
	}

	policyID := created.ID

	// Step 3: List policies and verify count
	resp = ts.Request("GET", "/api/v2/insurance/policies").
		WithDefaultAuth().
		Do(t)

	listResult := parsePoliciesListResponse(t, resp)
	if listResult.Count < 1 {
		t.Fatalf("expected at least 1 policy in list, got %d", listResult.Count)
	}
	foundInList := false
	for _, p := range listResult.Data {
		if p.ID == policyID {
			foundInList = true
			break
		}
	}
	if !foundInList {
		t.Error("created policy not found in list response")
	}

	// Step 3b: List with personId filter
	resp = ts.Request("GET", "/api/v2/insurance/policies?personId="+person.ID).
		WithDefaultAuth().
		Do(t)

	filteredResult := parsePoliciesListResponse(t, resp)
	if filteredResult.Count != 1 {
		t.Errorf("filtered list count = %d, want 1", filteredResult.Count)
	}

	// Step 4: Get policy by ID and verify fields
	resp = ts.Request("GET", "/api/v2/insurance/policies/"+policyID).
		WithDefaultAuth().
		Do(t)

	fetched := parsePolicyResponse(t, resp)
	if fetched.Name != "Term Life 30" {
		t.Errorf("GET name = %q, want %q", fetched.Name, "Term Life 30")
	}
	if fetched.PersonID == nil || *fetched.PersonID != person.ID {
		t.Errorf("GET personId = %v, want %q", fetched.PersonID, person.ID)
	}

	// Step 5: Update the policy
	updatePayload := map[string]interface{}{
		"personId":         person.ID,
		"name":             "Updated Term Life",
		"category":         "life",
		"coverageAmount":   "750000",
		"premiumAmount":    "200",
		"premiumFrequency": "monthly",
		"startDate":        "2024-01-01",
		"endDate":          "2054-01-01",
	}
	resp = ts.Request("PUT", "/api/v2/insurance/policies/"+policyID).
		WithDefaultAuth().
		WithJSON(updatePayload).
		Do(t)

	updated := parsePolicyResponse(t, resp)
	if updated.Name != "Updated Term Life" {
		t.Errorf("updated name = %q, want %q", updated.Name, "Updated Term Life")
	}
	if updated.UpdatedAt == created.UpdatedAt {
		t.Error("expected updatedAt to change after update")
	}

	// Step 6: Delete the policy
	resp = ts.Request("DELETE", "/api/v2/insurance/policies/"+policyID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNoContent(t, resp)

	// Step 7: Verify 404 on get
	resp = ts.Request("GET", "/api/v2/insurance/policies/"+policyID).
		WithDefaultAuth().
		Do(t)
	testutil.AssertNotFound(t, resp)
}

// TestInsurancePolicyCreateValidation tests validation on policy creation.
func TestInsurancePolicyCreateValidation(t *testing.T) {
	ts := testutil.NewTestServer(t)

	validationCases := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
	}{
		{
			name:           "missing name",
			payload:        map[string]interface{}{"category": "life", "premiumAmount": "100", "startDate": "2024-01-01"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing category",
			payload:        map[string]interface{}{"name": "Test", "premiumAmount": "100", "startDate": "2024-01-01"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing startDate",
			payload:        map[string]interface{}{"name": "Test", "category": "life", "premiumAmount": "100"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid startDate format",
			payload:        map[string]interface{}{"name": "Test", "category": "life", "premiumAmount": "100", "startDate": "01-01-2024"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "valid minimal payload",
			payload:        map[string]interface{}{"name": "Basic Policy", "category": "life", "premiumAmount": "50", "startDate": "2024-06-01"},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range validationCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := ts.Request("POST", "/api/v2/insurance/policies").
				WithDefaultAuth().
				WithJSON(tc.payload).
				Do(t)
			testutil.AssertStatus(t, resp, tc.expectedStatus)
		})
	}
}

// TestInsurancePolicyDeleteAll tests bulk deletion of all policies.
func TestInsurancePolicyDeleteAll(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create 3 policies
	for i := 0; i < 3; i++ {
		resp := ts.Request("POST", "/api/v2/insurance/policies").
			WithDefaultAuth().
			WithJSON(map[string]interface{}{
				"name":         "Bulk Policy",
				"category":     "life",
				"premiumAmount": "100",
				"startDate":    "2024-01-01",
			}).
			Do(t)
		testutil.AssertStatus(t, resp, http.StatusOK)
	}

	// Verify 3 exist
	resp := ts.Request("GET", "/api/v2/insurance/policies").
		WithDefaultAuth().
		Do(t)
	listResult := parsePoliciesListResponse(t, resp)
	if listResult.Count != 3 {
		t.Fatalf("expected 3 policies before bulk delete, got %d", listResult.Count)
	}

	// Delete all
	resp = ts.Request("DELETE", "/api/v2/insurance/policies").
		WithDefaultAuth().
		Do(t)
	var deleteResult map[string]interface{}
	testutil.AssertOK(t, resp, &deleteResult)

	// Verify empty
	resp = ts.Request("GET", "/api/v2/insurance/policies").
		WithDefaultAuth().
		Do(t)
	emptyResult := parsePoliciesListResponse(t, resp)
	if emptyResult.Count != 0 {
		t.Errorf("expected 0 policies after bulk delete, got %d", emptyResult.Count)
	}
}

// TestInsurancePolicyNotFound tests 404 responses for nonexistent policies.
func TestInsurancePolicyNotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	notFoundCases := []struct {
		name   string
		method string
		path   string
	}{
		{"GET nonexistent", "GET", "/api/v2/insurance/policies/" + testutil.NonexistentUUID},
		{"PUT nonexistent", "PUT", "/api/v2/insurance/policies/" + testutil.NonexistentUUID},
		{"DELETE nonexistent", "DELETE", "/api/v2/insurance/policies/" + testutil.NonexistentUUID},
	}

	for _, tc := range notFoundCases {
		t.Run(tc.name, func(t *testing.T) {
			req := ts.Request(tc.method, tc.path).WithDefaultAuth()
			if tc.method == "PUT" {
				req = req.WithJSON(map[string]interface{}{
					"name":         "ghost",
					"category":     "life",
					"premiumAmount": "0",
					"startDate":    "2024-01-01",
				})
			}
			resp := req.Do(t)
			testutil.AssertNotFound(t, resp)
		})
	}
}

// TestInsurancePolicyUserIsolation verifies that users cannot see each other's policies.
func TestInsurancePolicyUserIsolation(t *testing.T) {
	ts := testutil.NewTestServer(t)

	otherUserID := "other-user-insurance-test-0001"

	// User A creates a policy
	resp := ts.Request("POST", "/api/v2/insurance/policies").
		WithDefaultAuth().
		WithJSON(map[string]interface{}{
			"name":         "User A Policy",
			"category":     "life",
			"premiumAmount": "100",
			"startDate":    "2024-01-01",
		}).
		Do(t)

	policyA := parsePolicyResponse(t, resp)

	// User B tries to GET user A's policy → 404
	resp = ts.Request("GET", "/api/v2/insurance/policies/"+policyA.ID).
		WithAuth(otherUserID).
		Do(t)
	testutil.AssertNotFound(t, resp)

	// User B lists policies → empty
	resp = ts.Request("GET", "/api/v2/insurance/policies").
		WithAuth(otherUserID).
		Do(t)

	var userBList paginatedPoliciesResponse
	testutil.AssertOK(t, resp, &userBList)
	if len(userBList.Data) != 0 {
		t.Errorf("user B should see 0 policies, got %d", len(userBList.Data))
	}

	// User B tries to DELETE user A's policy → 404
	resp = ts.Request("DELETE", "/api/v2/insurance/policies/"+policyA.ID).
		WithAuth(otherUserID).
		Do(t)
	testutil.AssertNotFound(t, resp)
}
