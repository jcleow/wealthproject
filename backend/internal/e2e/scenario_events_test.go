//go:build e2e
// +build e2e

package e2e

import (
	"testing"

	"financial-chat-system/backend/internal/testutil"

	"github.com/stretchr/testify/require"
)

func TestV2ScenarioEvents_List_Empty(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/scenario-events").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	items, ok := result["items"].([]interface{})
	require.True(t, ok, "expected items to be an array")
	require.Empty(t, items)
}

func TestV2ScenarioEvents_Create_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an income to target with the impact
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Base Salary")

	payload := map[string]interface{}{
		"name":        "Job Promotion",
		"description": "Expected promotion in June",
		"occursOn":    "2025-06-01",
		"displayIcon": "briefcase",
		"isIncluded":  true,
		"impacts": []map[string]interface{}{
			{
				"targetIncomeId": incomeID,
				"impactKind":     "delta",
				"amount":         100000, // $1000.00 raise
				"cadence":        "monthly",
				"startDate":      "2025-06-01",
			},
		},
	}

	resp := ts.Request("POST", "/api/v2/scenario-events").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.NotEmpty(t, result["id"])
	require.Equal(t, "Job Promotion", result["name"])
	require.Equal(t, true, result["isIncluded"])
}

func TestV2ScenarioEvents_Create_MissingName(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"description": "No name provided",
		"occursOn":    "2025-06-01T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/scenario-events").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertBadRequest(t, resp)
}

func TestV2ScenarioEvents_Create_Unauthorized(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"name":     "Test Event",
		"occursOn": "2025-06-01T00:00:00Z",
	}

	resp := ts.Request("POST", "/api/v2/scenario-events").
		WithoutAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertUnauthorized(t, resp)
}

func TestV2ScenarioEvents_List_WithData(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create fixtures
	testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Event 1")
	testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Event 2")

	resp := ts.Request("GET", "/api/v2/scenario-events").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	items, ok := result["items"].([]interface{})
	require.True(t, ok, "expected items to be an array")
	require.Len(t, items, 2)
}

func TestV2ScenarioEvents_Get_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	event := testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Test Event")

	resp := ts.Request("GET", "/api/v2/scenario-events/"+event.ID).
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, event.ID, result["id"])
	require.Equal(t, "Test Event", result["name"])
}

func TestV2ScenarioEvents_Get_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("GET", "/api/v2/scenario-events/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2ScenarioEvents_Update_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an income to target with the impact
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Base Salary")

	// Create scenario event with an impact
	event := testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Original Event")

	payload := map[string]interface{}{
		"name":        "Updated Event",
		"description": "Updated description",
		"occursOn":    "2025-07-01",
		"displayIcon": "star",
		"isIncluded":  false,
		"impacts": []map[string]interface{}{
			{
				"targetIncomeId": incomeID,
				"impactKind":     "delta",
				"amount":         50000, // $500.00
				"cadence":        "monthly",
				"startDate":      "2025-07-01",
			},
		},
	}

	resp := ts.Request("PUT", "/api/v2/scenario-events/"+event.ID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, "Updated Event", result["name"])
	require.Equal(t, false, result["isIncluded"])
}

func TestV2ScenarioEvents_Update_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create an income to have a valid impact target
	incomeID := testutil.CreateIncomeFixture(t, ts.Pool, ts.UserID, "Base Salary")

	payload := map[string]interface{}{
		"name":        "Updated Name",
		"occursOn":    "2025-07-01",
		"displayIcon": "star",
		"isIncluded":  true,
		"impacts": []map[string]interface{}{
			{
				"targetIncomeId": incomeID,
				"impactKind":     "delta",
				"amount":         50000,
				"cadence":        "monthly",
				"startDate":      "2025-07-01",
			},
		},
	}

	resp := ts.Request("PUT", "/api/v2/scenario-events/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2ScenarioEvents_Delete_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture
	event := testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "To Delete")

	resp := ts.Request("DELETE", "/api/v2/scenario-events/"+event.ID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertOK(t, resp, nil)

	// Verify it's deleted
	resp = ts.Request("GET", "/api/v2/scenario-events").
		WithDefaultAuth().
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	items := result["items"].([]interface{})
	require.Empty(t, items)
}

func TestV2ScenarioEvents_Delete_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	resp := ts.Request("DELETE", "/api/v2/scenario-events/"+testutil.NonexistentUUID).
		WithDefaultAuth().
		Do(t)

	testutil.AssertNotFound(t, resp)
}

func TestV2ScenarioEvents_Toggle_Success(t *testing.T) {
	ts := testutil.NewTestServer(t)

	// Create a fixture (starts as included)
	event := testutil.CreateScenarioEventFixture(t, ts.Store, ts.UserID, "Toggle Test")

	// Toggle to excluded
	payload := map[string]interface{}{
		"isIncluded": false,
	}

	resp := ts.Request("PATCH", "/api/v2/scenario-events/"+event.ID+"/toggle").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	var result map[string]interface{}
	testutil.AssertOK(t, resp, &result)

	require.Equal(t, false, result["isIncluded"])

	// Toggle back to included
	payload["isIncluded"] = true

	resp = ts.Request("PATCH", "/api/v2/scenario-events/"+event.ID+"/toggle").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertOK(t, resp, &result)
	require.Equal(t, true, result["isIncluded"])
}

func TestV2ScenarioEvents_Toggle_NotFound(t *testing.T) {
	ts := testutil.NewTestServer(t)

	payload := map[string]interface{}{
		"isIncluded": false,
	}

	resp := ts.Request("PATCH", "/api/v2/scenario-events/"+testutil.NonexistentUUID+"/toggle").
		WithDefaultAuth().
		WithJSON(payload).
		Do(t)

	testutil.AssertNotFound(t, resp)
}
